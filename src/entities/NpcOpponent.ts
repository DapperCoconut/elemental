import Phaser from 'phaser';
import { Fighter } from './Fighter';
import { Element } from '../elements/Element';
import { CastContext } from '../elements/Ability';
import { Projectile } from '../combat/Projectile';
import { slimeElement } from '../elements/slime';
import { HP_SCALE } from '../data/Balance';

type AiState = 'chase' | 'attack' | 'retreat';

/**
 * How a bot of a given element wants to fight. The archetype decides what "in range"
 * looks like: a brawler keeps walking into you the way Earth always has, a zoner
 * back-pedals the moment you push inside its band, an assassin orbits tight and fast.
 * The band is a *movement* preference only — every ability keeps its own range checks
 * in the do*Abilities routines, so a zoner still fires everything it has while it kites.
 */
interface MovementProfile {
  archetype: 'brawler' | 'skirmisher' | 'zoner' | 'summoner' | 'assassin';
  /** Preferred distance band [min, max]: outside it approach, inside min back off. */
  range: [number, number];
  /** HP ratio under which the bot briefly disengages to let cooldowns breathe. */
  retreatHp: number;
}

const ARCHETYPE_DEFAULTS: Record<MovementProfile['archetype'], { weave: number; strafe: number; backSpeed: number }> = {
  brawler:    { weave: 0.25, strafe: 0.62, backSpeed: 0.0  },
  skirmisher: { weave: 0.45, strafe: 0.65, backSpeed: 0.55 },
  zoner:      { weave: 0.50, strafe: 0.70, backSpeed: 0.75 },
  summoner:   { weave: 0.40, strafe: 0.60, backSpeed: 0.60 },
  assassin:   { weave: 0.65, strafe: 0.80, backSpeed: 0.45 },
};

const DEFAULT_PROFILE: MovementProfile = { archetype: 'skirmisher', range: [160, 300], retreatHp: 0.28 };

/**
 * Per-element movement personalities. Rough first pass — each element's Phase-3 AI
 * batch tunes its own entry alongside its ability rewrite. Anything missing runs the
 * default skirmisher.
 */
const MOVEMENT_PROFILES: Record<string, MovementProfile> = {
  fire:        { archetype: 'skirmisher', range: [120, 260], retreatHp: 0.25 },
  water:       { archetype: 'zoner',      range: [260, 420], retreatHp: 0.35 },
  life:        { archetype: 'summoner',   range: [220, 380], retreatHp: 0.30 },
  air:         { archetype: 'skirmisher', range: [140, 280], retreatHp: 0.30 },
  earth:       { archetype: 'brawler',    range: [40, 140],  retreatHp: 0.12 },
  oil:         { archetype: 'summoner',   range: [220, 380], retreatHp: 0.30 },
  shadow:      { archetype: 'zoner',      range: [200, 360], retreatHp: 0.30 },
  ice:         { archetype: 'zoner',      range: [240, 400], retreatHp: 0.32 },
  growth:      { archetype: 'summoner',   range: [200, 360], retreatHp: 0.30 },
  crystal:     { archetype: 'zoner',      range: [260, 420], retreatHp: 0.32 },
  soul:        { archetype: 'summoner',   range: [240, 400], retreatHp: 0.32 },
  hunt:        { archetype: 'skirmisher', range: [100, 240], retreatHp: 0.20 },
  sand:        { archetype: 'zoner',      range: [240, 400], retreatHp: 0.30 },
  gravity:     { archetype: 'zoner',      range: [240, 400], retreatHp: 0.30 },
  creation:    { archetype: 'summoner',   range: [220, 380], retreatHp: 0.30 },
  electricity: { archetype: 'skirmisher', range: [100, 220], retreatHp: 0.20 },
  slime:       { archetype: 'skirmisher', range: [140, 280], retreatHp: 0.28 },
  fate:        { archetype: 'zoner',      range: [240, 400], retreatHp: 0.32 },
  sound:       { archetype: 'skirmisher', range: [70, 150],  retreatHp: 0.25 },
  light:       { archetype: 'skirmisher', range: [160, 320], retreatHp: 0.25 },
  magnet:      { archetype: 'skirmisher', range: [150, 290], retreatHp: 0.28 },
  metal:       { archetype: 'brawler',    range: [60, 160],  retreatHp: 0.15 },
  plasma:      { archetype: 'skirmisher', range: [150, 290], retreatHp: 0.28 },
  gunpowder:   { archetype: 'zoner',      range: [260, 420], retreatHp: 0.32 },
  rubber:      { archetype: 'brawler',    range: [60, 170],  retreatHp: 0.15 },
  magic:       { archetype: 'zoner',      range: [240, 400], retreatHp: 0.32 },
  technology:  { archetype: 'zoner',      range: [260, 420], retreatHp: 0.32 },
  silence:     { archetype: 'assassin',   range: [50, 150],  retreatHp: 0.22 },
  echo:        { archetype: 'skirmisher', range: [160, 300], retreatHp: 0.28 },
  subterfuge:  { archetype: 'skirmisher', range: [180, 320], retreatHp: 0.30 },
  justice:     { archetype: 'skirmisher', range: [140, 280], retreatHp: 0.25 },
  dream:       { archetype: 'assassin',   range: [100, 240], retreatHp: 0.25 },
  chalk:       { archetype: 'zoner',      range: [240, 400], retreatHp: 0.32 },
  wax:         { archetype: 'brawler',    range: [100, 180], retreatHp: 0.30 },
  clay:        { archetype: 'skirmisher', range: [140, 300], retreatHp: 0.24 },
  magma:       { archetype: 'summoner',   range: [220, 380], retreatHp: 0.30 },
  illusion:    { archetype: 'zoner',      range: [220, 380], retreatHp: 0.30 },
  depths:      { archetype: 'skirmisher', range: [160, 300], retreatHp: 0.28 },
  conquest:    { archetype: 'summoner',   range: [260, 420], retreatHp: 0.32 },
  passion:     { archetype: 'skirmisher', range: [150, 290], retreatHp: 0.28 },
  ruin:        { archetype: 'zoner',      range: [220, 380], retreatHp: 0.30 },
  dune:        { archetype: 'skirmisher', range: [160, 300], retreatHp: 0.28 },
  paper:       { archetype: 'skirmisher', range: [160, 300], retreatHp: 0.28 },
  death:       { archetype: 'brawler',    range: [70, 170],  retreatHp: 0.15 },
  fortune:     { archetype: 'skirmisher', range: [150, 300], retreatHp: 0.3 },
  cloth:      { archetype: 'brawler',    range: [90, 200],  retreatHp: 0.18 },
  marrow:     { archetype: 'brawler',    range: [90, 200],  retreatHp: 0.18 },
  tempest:    { archetype: 'skirmisher', range: [130, 300], retreatHp: 0.25 },
  myth:       { archetype: 'skirmisher', range: [110, 240], retreatHp: 0.22 },
  psychic:     { archetype: 'zoner',      range: [240, 400], retreatHp: 0.32 },
  radiation:   { archetype: 'skirmisher', range: [150, 290], retreatHp: 0.28 },
  bind:        { archetype: 'summoner',   range: [220, 380], retreatHp: 0.30 },
  gum:         { archetype: 'brawler',    range: [50, 150],  retreatHp: 0.15 },
  gluttony:    { archetype: 'brawler',    range: [90, 240],  retreatHp: 0.2 },
};

/**
 * Reaction tick per difficulty level: ability decisions run on this cadence rather than
 * every frame, so a bot commits to a beat of play instead of twitch-evaluating at 60hz.
 * Movement, dodging, charge release and the seek overrides all stay per-frame — only
 * the "what do I press next" question waits for the tick.
 */
const DECISION_MS: Record<number, number> = { 1: 420, 2: 320, 3: 230, 4: 160, 5: 110 };
const TRUE_NIGHTMARE_DECISION_MS = 85;

/** Psychic: the bot throws pawns from inside this — one step plus a diagonal capture. */
const PSYCHIC_PAWN_RANGE = 200;

/** True Nightmare — chance a cast's effect happens a second time. */
const TRUE_NIGHTMARE_DOUBLE_CHANCE = 0.25;
/** ...and the beat between the two, so the echo reads as an echo rather than a rendering bug. */
const TRUE_NIGHTMARE_ECHO_MS = 180;
/** True Nightmare dash: how long it lasts, how fast it goes, and how often it is available. */
const TRUE_DODGE_MS = 220;
const TRUE_DODGE_SPEED_MULT = 3.4;
const TRUE_DODGE_COOLDOWN_MS = 900;

export interface DifficultyConfig {
  level: number;
  label: string;
  hp: number;
  speed: number;
  aimOffsetDeg: number; // max random angular offset on aimed shots (degrees)
  dodgeRange: number;   // 0 = no dodge; else detection radius in px
  castSkipChance: number; // 0–1: chance to skip special abilities each decision
}

export const DIFFICULTY_PRESETS: DifficultyConfig[] = [
  { level: 1, label: 'Easy',      hp:  80 * HP_SCALE, speed: 100, aimOffsetDeg: 50, dodgeRange:   0, castSkipChance: 0.70 },
  { level: 2, label: 'Normal',    hp: 140 * HP_SCALE, speed: 130, aimOffsetDeg: 30, dodgeRange:   0, castSkipChance: 0.45 },
  { level: 3, label: 'Hard',      hp: 200 * HP_SCALE, speed: 148, aimOffsetDeg: 14, dodgeRange:   0, castSkipChance: 0.20 },
  { level: 4, label: 'Expert',    hp: 280 * HP_SCALE, speed: 162, aimOffsetDeg:  5, dodgeRange: 100, castSkipChance: 0.05 },
  { level: 5, label: 'Nightmare', hp: 360 * HP_SCALE, speed: 175, aimOffsetDeg:  1, dodgeRange: 160, castSkipChance: 0    },
];

/**
 * Everything the kits tell the bot about the world this frame.
 *
 * ## The synergy contract
 *
 * Every kit has internal synergies — casts that are only worth making because of
 * something else the kit already put on the field (Silence rituals a matured watcher
 * into a grabber; a Click+ stab through its own stalker detonates the Sacrifice).
 * Bots must execute these deliberately, never by accident:
 *
 * - The KIT computes each opportunity owner-side and publishes it here as a field —
 *   a position to cast at, or a flag saying the combo is live. It owns the geometry
 *   and the upgrade checks; the AI should never re-derive either.
 * - `do[Element]Abilities` checks opportunity fields FIRST, before its generic
 *   rotation, so a live combo always outranks an ordinary cast.
 * - Reads must be side-effect-free (getters may not consume charges or gates).
 *
 * When adding or reworking an element, enumerate its kit's synergies ("X enables Y")
 * and wire each one through this pattern. A kit whose bot never plays its synergies
 * is incomplete.
 */
export interface NpcAiState {
  isLocked: boolean;
  hasActiveGeyser: boolean;
  flameBodyActive: boolean;
  /** Fire (Alcohol): plant a Pressure Bomb here — it lights the bot's own booze with the target in it. */
  npcFireBoozeBombAt?: { x: number; y: number };
  /** Fire (Blaze + Melt): the bot has no click to fall back on. */
  npcFireNoClick?: boolean;
  projectiles: Phaser.Physics.Arcade.Group;
  plantCount: number;
  thornDragActive: boolean;
  enemyNearPlant: boolean;
  /** Life: where (and, inside the kit, which seed) the bot's next planting goes; absent = don't. */
  npcLifePlantAt?: { x: number; y: number };
  /** Life: two or more of its plants sit inside Fertilize's wave. */
  npcLifeFertilize?: boolean;
  /** Life: a half-dead plant with the enemy on it — Root Shield it. */
  npcLifeShieldAt?: { x: number; y: number };
  /** Life: a ripe Lotus orb of its own close enough to go and eat. */
  lifeSeekPoint?: { x: number; y: number };
  /** Air: the NPC's own Wind Breaker is up, so it should be holding the player, not chasing. */
  airTornadoActive: boolean;
  /** Air: wind dodge the NPC has banked — high enough and it can afford to dance in close. */
  airWindDodge: number;
  earthShieldHp: number;
  /** Biome Builder quarters the bot currently has standing. */
  npcEarthBiomes?: number;
  /**
   * Biome Builder: the target is standing on the bot's own Mountain quarter. A Quake cast there
   * does its ordinary work *and* brings the ceiling down for its whole duration — the only way
   * the rockfall is ever triggered, so it outranks every other cast while it is live.
   */
  earthMountainQuakePoint?: { x: number; y: number };
  /**
   * Biome Builder: a Mountain spike sits inside the plate's launch reach along the shield's
   * facing. The kit turns the next Bash into a 30-damage spike shot — a bot that does not press
   * Click now walks past free ammunition.
   */
  npcEarthSpikeReady?: boolean;
  /**
   * Symbiosis (Q+): the nearest of the bot's own quarters when it is standing outside all of
   * them. The blessings are only ever paid for standing in the weather, so the kit hands the
   * point over rather than hoping the fight drifts into it.
   */
  earthBiomePoint?: { x: number; y: number };
  npcEarthRocksActive?: boolean;
  oilDroneCount?: number;
  shadowPlayerSnared?: boolean;
  playerFrostStacks?: number;
  iceBlockActive?: boolean;
  npcGrowthDna?: number;
  npcGrowthHasNestOrClone?: boolean;
  crystalNodeCount?: number;
  npcSoulCorpseCount?: number;
  npcSoulAmalgamCount?: number;
  npcSoulGraveCount?: number;
  /** Soul: the npc's nearest own grave zombie in lantern range — kills + corpses (SoulKit-owned). */
  npcSoulLanternTarget?: { x: number; y: number } | null;
  /** Soul: a beam aim lining up 2+ targets, or a Soul Lord hemorrhage setup; null when not worth it. */
  npcSoulBeamAim?: { x: number; y: number } | null;
  /** Soul: hostile bodies a Turn cast right now would take, weighted (enemy Amalgams count double). */
  npcSoulTurnValue?: number;
  npcHuntBeastForm?: boolean;
  npcHuntTrailActive?: boolean;
  /** Blast is charge-gated inside HuntKit; its ability cooldown says nothing about that. */
  npcHuntBlastCharges?: number;
  playerBleeding?: boolean;
  npcTimeRemainActive?: boolean;
  npcTimeHaltActive?: boolean;
  npcTimeBountyAuraActive?: boolean;
  npcTimeBounty?: number;
  npcTimeTimelessReady?: boolean;
  // Fate (alt-life)
  fateNpcHandTypes?: string[];
  // Metal
  npcMetalHasFlail?: boolean;
  npcMetalFlailSwinging?: boolean;
  npcMetalBlood?: number;
  // Gunpowder
  npcGunpowderArsenalSize?: number;
  // Rubber
  npcRubberBounceFormActive?: boolean;
  npcRubberageActive?: boolean;
  npcRubberBandActive?: boolean;
  // Magic
  magicAnchorPlaced?: boolean;
  magicMeditating?: boolean;
  // Silence (remaster)
  /** The NPC's target (usually the player) is invisible — wander, don't fight. */
  targetInvisible?: boolean;
  /** Invisible silence player has stalkers out — fire blindly to hunt them. */
  silenceStalkersPresent?: boolean;
  npcSilenceStealth?: number;
  npcSilenceStalkers?: number;
  npcSilenceMatureStalker?: { x: number; y: number } | null;
  npcSilenceInvisible?: boolean;
  /** R+ Night Terror: the bar is full, and a ritual cast on itself becomes the Striker. */
  npcSilenceTerrorFull?: boolean;
  /** Transformed: the click is a slash, E is Boggle, R is Allure — play it as a melee monster. */
  npcSilenceStriker?: boolean;
  /** Click+ synergy: stab AT this own stalker — the lane detonates it onto the adjacent player. */
  npcSilenceSacrificeStab?: { x: number; y: number };
  /** E+ synergy: re-cast Watch onto this own watcher to grow it into a seeker. */
  npcSilenceMutateWatcher?: { x: number; y: number };
  /** F synergy: the target is close enough to hold inside a Stalk aura — cast it now. */
  npcSilenceStalkOpen?: boolean;
  /** F → Click synergy: the target is Stalked and we are in their back shadow — stab here. */
  npcSilenceBackstabAim?: { x: number; y: number };
  // Echo — no persistent ai state needed
  echoAttachActive?: boolean;
  // Quantum
  subMoney?: number;
  subBullets?: number;
  subLackeys?: number;
  // Justice
  npcJusticeWill?: number;
  npcJusticeFlying?: boolean;
  npcJusticeSheer?: boolean;
  /** A Bind chain is sunk into a wall and waiting on the recast that rips it out. */
  npcJusticeAnchored?: boolean;
  /**
   * X of the nearest hostile Pillar of Flame, and how wide a berth to give it. Read by
   * the movement pass so the AI walks around a wall of fire instead of standing in it.
   */
  justicePillarX?: number;
  justicePillarHalfWidth?: number;
  // Dream
  /**
   * The Dream kit's read of its own position, built owner-side by `DreamKit.npcAiInfo`: the
   * dream the bot is in, whether a sleeper is in Delve range, the guns, Nightmare's 50 line,
   * and whether the pillow would pay its bigger dose. The AI never re-derives any of it.
   */
  npcDream?: {
    inDream: boolean;
    targetDrowsy: number;
    targetAsleep: boolean;
    canFire: boolean;
    delveReady: boolean;
    shouldSurface: boolean;
    nightmareReady: boolean;
    pillowFresh: boolean;
    leechOut: boolean;
  };
  /** Walk to a sleeper to Delve into its dream, or to a leech of ours to pull it back out. */
  dreamSeekPoint?: { x: number; y: number };
  // Clay
  npcClayFused?: boolean;
  npcClayFusing?: boolean;
  npcClayFuseHits?: number;
  npcClaySlinking?: boolean;
  npcClaySlinkBursts?: number;
  npcClayShieldPieces?: number;
  /**
   * Clay synergy: the golem stands on the target. The golem walks to the enemy on its own, so
   * a Slam pressed while this is true lands — pressed otherwise it slams empty floor.
   */
  npcClayGolemOnTarget?: boolean;
  /**
   * Clay synergy: hostile shots within 260px of the bot. A Clot drawn now will meet them, and
   * with Protector every one it meets is three shards back.
   */
  npcClayShotsIncoming?: number;
  /**
   * Clay Mastery: the slot Give Life was bound over. The kit casts the enhancement itself off
   * its own timer; the AI only has to stop spending a key that no longer belongs to it.
   */
  npcClayGiveLifeSlot?: string;
  // Wax
  /** Candles the bot has planted, and whether it is standing in one's light right now. */
  npcWaxCandles?: number;
  npcWaxInCandle?: boolean;
  /**
   * Wax synergy: an own candle the bot is not standing in. The light is 15% armour and 2s
   * on every bee it looses, so it steers there between casts (soft seek, like Passion's cloud).
   */
  waxCandlePoint?: { x: number; y: number };
  npcWaxHives?: number;
  /**
   * Wax synergy: an own hive with empty cells inside Swarm range. Bees fired *through* it are
   * stored, and five come back for each — so Swarm is aimed at the hive, not the target.
   */
  waxHiveFeedPoint?: { x: number; y: number };
  /**
   * Wax synergy: an own hive worth cashing in (three cells, or enough honey). The kit redeems
   * it the moment the bot arrives; the AI only has to walk there.
   */
  waxHiveRedeemPoint?: { x: number; y: number };
  /** Bombs in flight or stuck — Q is a detonation, which the kit presses, not a launch. */
  npcWaxBombsOut?: number;
  /** An own hive still filling sits in the lane to the target: a bomb now would cash it in early. */
  npcWaxBombLaneBlocked?: boolean;
  /** Rule Beetanica is strapped on: stop kiting and carry the payload into blast range. */
  npcWaxSelfBombs?: boolean;
  /** The target is poisoned: every bee bites for one more, so the swarm is worth most now. */
  npcWaxTargetPoisoned?: boolean;
  /** Click+ is ranged, so the foil may be pressed outside its melee reach. */
  npcWaxRangedClick?: boolean;
  // Chalk
  /** A drawing window is already open — starting a second one would throw the first away. */
  npcChalkDrawing?: boolean;
  npcChalkShieldHp?: number;
  npcChalkMasterpiece?: boolean;
  /** No blue line on the floor, so Perma-Chalk is worth spending. */
  npcChalkMayPerma?: boolean;
  /**
   * Chalk Mastery — the slot Living Chalk has taken over. The enhancement is not in
   * `element.abilities`, so the kit casts it off its own timer; all the AI has to do is stop
   * spending a key that no longer belongs to it.
   */
  npcChalkLivingSlot?: 'e' | 'r' | 'f' | 'q' | null;
  // Magma
  npcMagmaBloat?: boolean;
  npcMagmaVolcanoes?: number;
  /** Blunder-Boil charges in hand. Zero means F is a reload message, not a shot. */
  npcMagmaBlunderCharges?: number;
  /** Pressure Gauge (F+): 0–1 on the gun. Past 0.6 the recoil flight itself hits people. */
  npcMagmaGaugePressure?: number;
  /** Pressure Gauge (F+): the next F bursts for 35 on the bot too — only worth it point blank. */
  npcMagmaGaugeOver?: boolean;
  /** Molten Mutiny's pendant is on and skimming. */
  npcMagmaPendant?: boolean;
  /** The ship is up. Q is unavailable until it sinks. */
  npcMagmaShip?: boolean;
  /** At the helm: the click is a broadside, movement is the kit's, F would throw it overboard. */
  npcMagmaMounted?: boolean;
  /**
   * Magma synergy: a volcano of its own standing next to the player that one cannonball would
   * light on the spot. The kit owns the geometry; aim the broadside here instead of at the body.
   */
  npcMagmaCannonVolcano?: { x: number; y: number };
  // Illusion
  /** The dance is running: it is untouchable and hopping, so it should just be shooting. */
  npcIllusionDancing?: boolean;
  /** A pane is already hanging — a second would only bend its own bullets twice. */
  npcIllusionHasVeil?: boolean;
  /** Its Guise is up: the clone is drawing the fire, so this is the time to just shoot. */
  npcIllusionGuised?: boolean;
  /**
   * F+ Re-Trick is worth taking now — the clone is about to fade, or the player has found the
   * real body. The kit owns the geometry and the upgrade check; the AI only acts on it.
   */
  npcIllusionRetrick?: boolean;
  /**
   * E+ Duplication: one of its own unspent panes, close enough to walk through for doubled
   * shots (and doubled Dance bombs). The kit owns the geometry and the upgrade check.
   */
  illusionSeekPoint?: { x: number; y: number };
  /** Q+ Bomb Dance: mid-Dance, a Relocate now throws a free volley of bombs. */
  npcIllusionDanceBombs?: boolean;
  /** The player is behind an Illusion Guise: their shots cannot be seen, so none are dodged. */
  playerShotsUnseen?: boolean;
  /**
   * The slot Masquerade is bound over for this bot, if any. The mask itself is put on by the
   * kit on a blind timer — the AI's only job is to stop casting the base ability it replaced.
   */
  npcIllusionMaskSlot?: 'e' | 'r' | 'f' | 'q' | null;
  /**
   * The vessel the AI should be charging, or undefined when it has nothing left to fill.
   * Magma's summons are fed by its own attacks, so this is what it aims *at* — the one
   * element in the game whose AI sometimes deliberately shoots away from you.
   */
  npcMagmaChargeTarget?: { x: number; y: number };
  /**
   * Magma Mastery: a saw is out. The kit runs the whole thing off its own timer, so all the
   * routine has to do is stop layering casts on top of a tool it is already holding.
   */
  npcMagmaSawOut?: boolean;
  /**
   * Magma Mastery: the slot Magma Saw was bound over. The base ability underneath it is gone
   * for the bot exactly as it is for a player, so the routine has to stop asking for it.
   */
  npcMagmaSawSlot?: string;
  /**
   * Magma Mastery: a critical cone of the bot's own with overfill banked in it. Standing in
   * that collapse is the only way an Obsidian Coat is ever earned, so the kit hands the point
   * over rather than hoping the fight drifts back through it.
   */
  magmaObsidianPoint?: { x: number; y: number };
  // Depths
  /**
   * Somewhere the AI has to physically be, overriding chase/strafe entirely: the air pocket
   * it is drowning without, a healing algae orb it can still use, or the anglerfish lure —
   * which it has no way of telling apart from the orb, and that is the whole passive.
   */
  depthsSeekPoint?: { x: number; y: number };
  /** The line is out. Standing still is the ability, so nothing may interrupt it. */
  npcDepthsFishing?: boolean;
  /** A fish is in its mouth; the kit throws it, so the AI must not re-cast F. */
  npcDepthsHasFish?: boolean;
  npcDepthsSharkOut?: boolean;
  /** Piranhas already on the target — five is the cap, and a sixth click is wasted. */
  npcDepthsTargetLatches?: number;
  /** The AI is the one drowning: everything except running for air can wait. */
  npcDepthsDrowning?: boolean;
  /** Depths Mastery: the slot Release the Kraken was dropped on, so the base ability is skipped. */
  npcDepthsKrakenSlot?: string;
  /**
   * Somebody one of the bot's own tentacles is holding right now. A Lungfish Strike aimed at a
   * body that cannot move always connects — and a strike that connects is the only thing that
   * ever starts a drowning, so this is the combination the kraken exists to set up.
   */
  npcDepthsKrakenStun?: { x: number; y: number };
  /**
   * One of the bot's own skele-fish, close enough to be eaten off the end of a slash — offered
   * only while the fifty health is actually worth the sixteen seconds.
   */
  npcDepthsSkeleMeal?: { x: number; y: number };
  /** Camo Fade has finished: the line is reaching the two fish only a hidden angler can land. */
  npcDepthsCamoed?: boolean;

  // Harvest (element id `gluttony`)
  /** The middle of the bot's own mold, while the target is close but off it — lure them onto the rot. */
  harvestSeekPoint?: { x: number; y: number };
  /** One of the bot's own corrupt hearts within sickle reach: aim the loop's far side through it. */
  npcHarvestHeartAim?: { x: number; y: number };
  /** The target is standing on the bot's rotting mold. */
  npcHarvestTargetOnMold?: boolean;
  /** Corruption on the target, 0–100 — the crows and the scythe both scale off it. */
  npcHarvestTargetCorruption?: number;
  /** Reaping Hour would put the target under its execute line. */
  npcHarvestCanExecute?: boolean;
  /** The bot's Corrupt HP is at least its health: Consume floods the target with corruption. */
  npcHarvestBiteHeavy?: boolean;
  /** The target carries something Consume can steal. */
  npcHarvestTargetBuffed?: boolean;
  /** Mature cells of the bot's own mold — sow again when this is thin. */
  npcHarvestMatureMold?: number;
  /** Harvest Mastery: which of R/F/Q Corrupt Predation was bound over. The kit fires it; the rotation leaves that key alone. */
  npcHarvestPredationSlot?: 'r' | 'f' | 'q';

  // Ruin
  /** A spike ring is already counting down; a second F would only replace it with itself. */
  npcRuinRingUp?: boolean;
  /** One skewer per side is in the air — the kit refuses a second, so the cast would be eaten. */
  npcRuinSkewerOut?: boolean;
  /** Stacks of rot already down. At the cap, Q says so instead of spending itself. */
  npcRuinDecayStacks?: number;
  /** The target has actually used something that isn't already locked. */
  npcRuinCanLock?: boolean;
  /**
   * Mastery: the slot Second Skin was bound over, so the rotation stops casting an ability that
   * is no longer on the tray. The kit fires the shed itself off its own timer — see
   * `RuinKit.updateNpcSecondSkin` — because the burst has no aim to pass through here.
   */
  npcRuinSkinSlot?: 'e' | 'r' | 'f' | 'q' | null;

  // Sand (element id `dune`)
  /** A course is standing and unclaimed — the kit is flying the body up it, so stay off the keys. */
  npcDuneOnCourse?: boolean;
  /** The flintlock has finished reloading. Its ability cooldown says nothing about that. */
  npcDuneReloaded?: boolean;
  /** A Final Trail is already running; a second Q would be refused by the kit anyway. */
  npcDuneTrailUp?: boolean;
  /** The idol is awake and already shooting, so R has nothing left to buy. */
  npcDunePyramidAwake?: boolean;

  // Death
  /** Mid-handshake: the kit owns the body and refuses every key until it lets go. */
  npcDeathBusy?: boolean;
  /** The katana is already held out — a second Riposte would only restart a live guard. */
  npcDeathGuarding?: boolean;
  /** A deal is running. The kit refuses a second one, so the cast would be eaten. */
  npcDeathDealing?: boolean;
  /** Limbs already off the target. Two is all a body has to give, and the third cast is wasted. */
  npcDeathLimbsTaken?: number;
  /** Styx stacks already on the target. Three is the cap and a fourth shot is wasted. */
  npcDeathTargetStyx?: number;
  /** Seconds left before midnight — the bot plays for time once it is close. */
  npcDeathClock?: number;
  /**
   * Mastery: the slot Delay The Inevitable was bound over, so the base ability under it is no
   * longer there to press. The kit casts the delay itself off its own read of the fight.
   */
  npcDeathDelaySlot?: 'e' | 'r' | 'f';
  /**
   * Its own weapon, lying where a Death's Disarm upgrade put it. Nothing it presses works until
   * it is standing on this, so fetching it overrides chase/strafe the way Depths' air does.
   */
  deathWeaponPoint?: { x: number; y: number };

  // Gold (element id `fortune`)
  /** Gold in the purse. Advance is the only thing that spends it. */
  npcGoldCoins?: number;
  /** Ten gold and no cards already open — published so a refused (and audible) E is never pressed. */
  npcGoldCanAdvance?: boolean;
  /** The cane lunge is carrying the body; nothing else is worth pressing until it lands. */
  npcGoldLunging?: boolean;
  /** Synergy: the target wears the bot's gold heart, so a plume on top of them makes them walk. */
  npcGoldHeartLive?: boolean;
  /** Synergy: Midas is laying gold floor under the target — worth chasing them across it. */
  npcGoldMidasLive?: boolean;
  /** Q+ Full Metal Alchemy: the bot's statue is up and it wants the three coins it melts into — hold fire. */
  npcGoldStatueHold?: boolean;
  /** Fray falls: the kit's gravity-corrected aim point that puts the clump through the target. */
  npcGoldFrayAim?: { x: number; y: number };
  /** Where the plume should land: on a hearted target, otherwise at the bot's own feet toward them. */
  npcGoldPlumeAt?: { x: number; y: number };
  /** Its own plume to stand in, loot to collect, or gold floor to run on. Soft seek. */
  goldSeekPoint?: { x: number; y: number };
  /** Gold Mastery: which of R/F/Q Rags to Riches was bound over. The kit fires it; the rotation leaves that key alone. */
  npcGoldRagsSlot?: 'r' | 'f' | 'q';

  // Creation
  /** Synergy: the player is inside the blast of one of the bot's own builds (or the Nexus) — Self-Destruct now. */
  npcCreationDetonate?: boolean;

  // Magnet
  /** Gathering scrap or piloting the mech — hands off (the kit pilots the mech itself). */
  npcMagnetBusy?: boolean;
  /** Synergy: a Repulse at this point fires something worth firing (coins, a spike, a nail coming home, a shard to dash on). */
  npcMagnetRepulseAt?: { x: number; y: number };
  /** Synergy: a nail has sat in the target long enough — rip it out, then meet it with Repulse. */
  npcMagnetRecall?: boolean;
  /** Synergy: a planted spike to ride to — closes the gap (or opens it when hurt). */
  npcMagnetZipTo?: { x: number; y: number };
  /** Where to hang a Steel Spike: where the target is heading. */
  npcMagnetSpikeAt?: { x: number; y: number };
  /** Toss coins a short way toward the target so they hang inside the next Repulse cone. */
  npcMagnetCoinAim?: { x: number; y: number };
  /** Synergy: hold the coins in the air — a Repulse is nearly back and there are coins worth keeping. */
  npcMagnetHover?: boolean;
  /** Magnet Mastery: which of R/F/Q Mag-Lev was bound over. The kit fires it; the rotation leaves that key alone. */
  npcMagnetMagLevSlot?: 'r' | 'f' | 'q';

  // Cloth
  /** A long pin is in a body or a wall: E is now the reel-in, not a throw. */
  npcClothPinPlanted?: boolean;
  /** A safety anchor is down: R is now the bail-out, not a placement. */
  npcClothAnchored?: boolean;
  /** 0–1 of the 75 damage that fires the safety line by itself. */
  npcClothAnchorPressure?: number;
  /** 0–1 toward the grapple spin. Near 1, staying in click range is worth more than anything. */
  npcClothCombo?: number;
  /** Pinned HP in the pool right now — the thorns only pay while there is some. */
  npcClothPinned?: number;
  /** Something is webbed: it cannot move, so this is the free-damage window. */
  npcClothWebbed?: boolean;

  // Marrow
  /** Occupied sockets on the bone bar, 0–5. A sixth cell is refused outright. */
  npcMarrowCells?: number;
  /** Mast cells still on their fuse — a second Mastacre on top of a live one is wasted. */
  npcMarrowMasts?: number;
  /** The fever, 0–100. High enough and the bot is happy to trade hits. */
  npcMarrowInflammation?: number;
  /** Dendricles has transformed: F is a T-cell summon, not a strike. */
  npcMarrowTcellArmed?: boolean;

  // Tempest
  /** Off the floor: every key is its airborne form, and F does nothing. */
  npcTempestAirborne?: boolean;
  /** Gale Burst charges in hand, 0–2. A click with none is refused. */
  npcTempestCharges?: number;
  /** Live fronts of its own on the floor, 0–2. */
  npcTempestFronts?: number;
  /**
   * Airborne with a front of its own to drop onto: R is a slam that destroys the front and
   * bounces the bot higher than it started, which is the only way its height ever goes *up*
   * without a key being spent — the combination the flight kit is built around.
   */
  npcTempestCanSlam?: boolean;
  /**
   * Falling and under 80px of height: a burst on itself *now* is the big 620 px/s lift rather
   * than the ordinary 380, so this is the one moment the click is worth spending on the floor.
   */
  npcTempestLandingSoon?: boolean;
  /** Holding someone in the sky: free damage for three seconds, nothing to aim at but them. */
  npcTempestGrabbing?: boolean;
  /** Its Storm Currents are running: the target cannot steer, so every shot is a hit. */
  npcTempestEyeLive?: boolean;
  /**
   * Somewhere the AI has to physically be, overriding chase/strafe: the current the kit wants
   * it to ride, offered on the kit's own flight schedule and only when one is in walking range.
   */
  tempestCurrentPoint?: { x: number; y: number };
  /**
   * A foe standing within 90px of a wall, with the aim point nudged so the burst throws them
   * *into* it — the passive's 12 on top of the burst's 10. The kit owns the geometry.
   */
  npcTempestWallShot?: { x: number; y: number };

  // Myth
  /** Echo Shards in hand, 0–3. The kit spends them itself; the routine only times the base casts around them. */
  npcMythShards?: number;
  /** A foe its star mace just stunned: Truth Breaker and the recast dash cannot miss. */
  npcMythTipStunLive?: boolean;
  /** The three-second recast window after a slash is open (the kit dashes through it with a shard). */
  npcMythTruthWindow?: boolean;
  /** Indomitable (a landed parry or a rift): stuns and slows do nothing — the moment to stand in and trade. */
  npcMythIndomitable?: boolean;
  /** The sword is out right now. */
  npcMythParrying?: boolean;
  /** A hit is about to land: a foe in arm's reach or a hostile shot closing — raise the sword. */
  npcMythParryCue?: boolean;
  /** Its beast is loose. */
  npcMythBeastLive?: boolean;
  /** In Final Destiny: the five keys are the five guns. */
  npcMythDestiny?: boolean;
  /** The crowd is half-way to a shard: commit damage now. */
  npcMythCheerClose?: boolean;
  /** Pistol vulnerability stacks on the target, 0–4: the shotgun's cue. */
  npcMythVulnStacks?: number;
  /**
   * Somewhere the AI has to physically be, overriding chase/strafe: the point on its beast's
   * path where it will be run over and flip for 20% speed. Offered only while the flip is possible.
   */
  mythFlipPoint?: { x: number; y: number };

  // Psychic
  /**
   * The move the kit wants the bot's click to make this tick — a piece sliding or jumping
   * through the target, a rook taking one of the bot's own pieces for its aura, or (as the
   * queen) the bot's own slide. Carried out with `ctx.psychicMovePiece(x, y)`.
   */
  npcPsychicMove?: { x: number; y: number };
  /** Crowned: no legs, no pawns — every click is a queen move. */
  npcPsychicQueen?: boolean;
  /** How many of the bot's own pieces are on the board. */
  npcPsychicPieces?: number;
  /** Where to stand each fresh piece so its first move is already lined up on the target. */
  npcPsychicBishopAt?: { x: number; y: number };
  npcPsychicKnightAt?: { x: number; y: number };
  npcPsychicRookAt?: { x: number; y: number };
  /**
   * Mastery: the slot Pre-move was dropped over, if any. The kit casts and calls it itself, so
   * this is only here to stop the AI pressing the ability that is no longer in that slot.
   */
  npcPsychicMasterySlot?: 'r' | 'f' | 'q';
  /**
   * Checkmate (Q upgrade): the target is low enough that a reign started now should end with
   * them under 15% — and the end of the reign kills them. Crown regardless of the board.
   */
  npcPsychicCheckmate?: boolean;

  // Radiation
  /** Tracers already stuck on the target. Three confirms the shot; a miss scrubs all of them. */
  npcRadiationTracers?: number;
  /** The flare gun is out — every click has to go into the same body or the ultimate is wasted. */
  npcRadiationFlares?: boolean;
  /** Barrage's cone is open (or its burst is firing). The kit steers the cone; the bot just stays in range. */
  npcRadiationBarraging?: boolean;
  /** The target carries a dose: the Rod Baton stuns instead of dosing, and Barrage hits for 8 instead of 5. */
  npcRadiationTargetDosed?: boolean;
  /** The target is stunned by the rod — a Barrage lock they cannot walk out of. */
  npcRadiationTargetStunned?: boolean;
  /** The bot's own airdrop is falling and it is not inside a bunker. A bunker round it eats the self-hit. */
  npcRadiationNeedsCover?: boolean;
  /** The bot is inside its own standing bunker — the place to stand while the airdrop lands. */
  npcRadiationSheltered?: boolean;
  /** Click+ Flick Shot: the bot turned its back within the window — a tracer now comes out barbed for 25. */
  npcRadiationFlickReady?: boolean;
  /** R+ turrets standing or a Q+ drop falling, and the target is clean: both only pay out on a dose. */
  npcRadiationWantsDose?: boolean;
  /** F+ Mutation would strip a dose the turrets or the falling drop still need — hold the hot rod. */
  npcRadiationKeepDose?: boolean;
  /** Mastery: the slot the Test Dummy was bound over. The kit throws the dummy; the rotation leaves that key alone. */
  npcRadiationDummySlot?: 'r' | 'f' | 'q';
  /** Mastery: the dummy is ready or standing — the airdrop's cover when it took the bunker's slot. */
  npcRadiationDummyCoverReady?: boolean;

  // Bind
  /** 0–100 of the patron's patience. Above 70 the bot stops spending anything at all. */
  npcBindAnger?: number;
  /** The god has turned: every ability is refused for five seconds, so it just moves. */
  npcBindForsaken?: boolean;
  /** 0–1 beam heat. The bot lets go before it tops out rather than eating 20 anger. */
  npcBindHeat?: number;
  npcBindOverheated?: boolean;
  /** Faith left in its idol, or -1 with none standing — the difference between a turret and a bill. */
  npcBindIdolFaith?: number;
  npcBindWard?: number;
  /** Chained to the middle of the arena with the sky open — the hands are the god's, not its. */
  npcBindChained?: boolean;
  /** Converts standing, or -1 with no cult unlocked. Below the cap, R buys a body, not an idol. */
  npcBindCult?: number;
  /**
   * Bind Mastery: the slot Ritual Sacrifice took, or undefined. The dagger itself is cast by the
   * kit off a private timer — an enhancement id is not in `element.abilities`, so there is nothing
   * here for `castAbility` to find — and all this routine owes it is not casting the base ability
   * out of a slot that no longer holds one. (Pathetic Stab needs no such guard: the slot the
   * ultimate takes is locked for the bot exactly as it always was, and the kit plays the lunge.)
   */
  npcBindRitualSlot?: string;

  // Slime (id: gum)
  /** Solidify threw its hand away — nothing it presses will answer until it grows back. */
  npcGumHandless?: boolean;
  /** Slimeballs lying on the floor. The click turns into a throw while it has any. */
  npcGumBalls?: number;
  /** Already swollen and open, or still digesting. A second Oozorbtion would be thrown away. */
  npcGumAbsorbArmed?: boolean;
  /** The target is already sealed in gum, so a second barrage buys nothing. */
  npcGumTargetEncased?: boolean;
  /** Slime Mastery: which of E/R/F Oobleck was bound over. That key is the kit's, not the rotation's. */
  npcGumOobleckSlot?: 'e' | 'r' | 'f';
  /**
   * Slime Mastery: a slab is standing and has not been set yet. Solidify turns it into a wall
   * neither fighter can cross — the one combo in the kit worth pressing the ultimate for on its own.
   */
  npcGumSlabSoft?: boolean;

  // Paper
  /** Which storybook is open: 0 Knight, 1 Alien, 2 Fantasy. Decides what Click and Q even are. */
  npcPaperBook?: number;
  /** The Alien book is mid-burst or mid-reload — the kit refuses the click, so don't spend it. */
  npcPaperLaserBusy?: boolean;
  /** Already gliding. The kit owns the body for the duration, so a second E is thrown away. */
  npcPaperRiding?: boolean;
  /** Monsters still lying on the floor. F is wasted while a decent field is already down. */
  npcPaperMaches?: number;
  /** Paper Mastery: the bot is in pieces — no hands, nothing to cast with. */
  npcPaperTorn?: boolean;
  /** Paper Mastery: the slot Restructure took, which no longer holds the ability under it. */
  npcPaperRestructureSlot?: 'e' | 'r' | 'f' | null;

  // Devotion (id `passion`)
  /** 0–1 of the target's faith. The whole element is this number. */
  npcDevotionFaith?: number;
  /** Carried off by its own chariot: invisible, untouchable, and not casting. */
  npcDevotionRiding?: boolean;
  /** Holy water bottles in hand — E is refused at 0, so the routine must not ask. */
  npcDevotionWaterCharges?: number;
  /**
   * Synergy cast points, computed by PassionKit (which owns the geometry): where holy water
   * should land, where the crucifix should stand (its own feet up close, a wall at range),
   * where a grenade is worth throwing (the target pinned in water or on the crucifix's rim),
   * whether the target is level for Ascendance, and the line to hold during its wind-up so the
   * chariot carries the bot down onto them.
   */
  /** Devotion Mastery: the slot the Ark took, which the rotation leaves alone (the kit casts it). */
  npcDevotionArkSlot?: 'r' | 'f' | 'q';
  npcDevotion?: {
    waterPoint?: { x: number; y: number };
    crucifixPoint?: { x: number; y: number };
    grenadePoint?: { x: number; y: number };
    ascendNow: boolean;
    holdLineY?: number;
  };

  /**
   * Sound: the kit runs the bot's metronome and baton itself. What the rotation reads is the one
   * synergy (a Fermata slam's Out of Tune is only cashed by the free recast — `npcSoundDetonate`
   * is true once the victim has been sour long enough to be worth detonating), the soul song the
   * kit wants for the situation and the one playing, and whether the bot is on stage soloing.
   */
  npcSoundDetonate?: boolean;
  npcSoundWantedSong?: string;
  npcSoundSong?: string;
  npcSoundSoloing?: boolean;
  /**
   * Sound upgrades. R+ Harmony: the baton is home and the bot wants the heal (press R → tune up),
   * and the regeneration has peaked (recast now). Q+: deaf after the gong — stand down. E+: the
   * player is dancing and cannot hit back — slam.
   */
  npcSoundHarmonyReady?: boolean;
  npcSoundHarmonyRelease?: boolean;
  npcSoundDeaf?: boolean;
  npcSoundVictimDancing?: boolean;

  /**
   * Conquest: the square the bot is walking to in order to place its next building. Every
   * placement is "stand here, then cast", so the destination has to come before the decision.
   */
  conquestSeekPoint?: { x: number; y: number };
  /** Set once it is standing on that square and can afford what it went there for. */
  npcConquestReady?: 'barracks' | 'turret' | 'barricade' | 'expansion';
  npcConquestAuthority?: number;

  // ── World Shift arenas ─────────────────────────────────────────────
  // Filled by SecretMapKit. Same shape as the seek/avoid overrides above, and
  // read in the same place, so a map can steer the bot without any map
  // knowing anything about the AI.
  /**
   * Somewhere the arena itself says the bot needs to be — the nearest campfire
   * when it is close to freezing, a potion worth crossing the room for. Wins
   * over chase and strafe, exactly like the Depths seek does.
   */
  mapSeekPoint?: { x: number; y: number } | null;
  /**
   * A vertical band the bot should not walk into (Magma Falls' lava river).
   * It will hold its side of the line unless `mapCrossBand` says the fight has
   * moved to the far bank and it has to come across to reach anything.
   */
  mapAvoidBandX?: number;
  mapAvoidBandHalfWidth?: number;
  mapCrossBand?: boolean;
}

export class NpcOpponent extends Fighter {
  private aiState: AiState = 'chase';
  private readonly profile: MovementProfile;
  private readonly attackRange: number;
  private strafeDir = 1;
  private nextStrafeDirChange = 0;
  /** Per-bot phase for the approach weave, so two bots never snake in lockstep. */
  private readonly weavePhase = Math.random() * Math.PI * 2;
  /** Low-HP disengage window, and the earliest the next one may start. */
  private retreatUntil = 0;
  private nextRetreatAt = 0;
  /** The next moment the ability-decision pass is allowed to run (see DECISION_MS). */
  private nextDecisionAt = 0;
  /**
   * Where an Expert+ bot expects the target to *be*: the target's position led by a
   * fraction of its velocity over an estimated projectile flight time. Aim fuzz still
   * applies on top. Phase-3 ability rewrites read these for projectile abilities;
   * hitscan abilities should keep aiming at the target's true position.
   */
  public leadX = 0;
  public leadY = 0;
  private lastFlameBodyToggle = -10000;
  private readonly difficulty: DifficultyConfig;
  /** When true, the NPC stays put (Boss mutation): casts abilities but never moves. */
  public stationary = false;

  /**
   * True Nightmare (the secret mode under the Nightmare plate).
   *
   * Two changes, both here: incoming shots are answered with a real dash rather
   * than a sidestep, and one cast in four fires its effect a second time.
   */
  public trueNightmare = false;
  private trueDodgeUntil = 0;
  private nextTrueDodgeAt = 0;
  private trueDodgeVx = 0;
  private trueDodgeVy = 0;

  /**
   * Psychic (Opened Eyes): the locomotion rule this bot is following right now, so a kit can
   * replay it forward and draw where it is about to walk. Exposed as one object rather than
   * three getters because the projection is only correct if all of it comes from the same tick.
   */
  public get movementPlan(): { closing: boolean; range: number; strafe: number; speed: number; frozen: boolean } {
    return {
      closing: this.aiState === 'chase',
      range: this.attackRange,
      strafe: this.strafeDir,
      speed: this.speed,
      frozen: this.stationary || this.chargeUntil > 0,
    };
  }

  // ── Charge state ──────────────────────────────────────────────────
  private chargeUntil = 0;
  private chargingAbility = '';
  private lastChargeDecision = -1; // -1 = uninitialised; set to `time` on first AI tick

  // ── Blind wander (target invisible via Silence stealth) ───────────
  private blindWanderVx = 0;
  private blindWanderVy = 0;
  private blindNextWanderAt = 0;
  private blindNextShotAt = 0;

  /** Silence hallucinations: 20% of shots wildly miss while afflicted. */
  private hallucinationMissDeg(): number {
    return Date.now() < this.hallucinatingUntil && Math.random() < 0.2 ? 50 : 0;
  }

  /**
   * True Nightmare's second barrel.
   *
   * Every route the bot has into an ability goes through `Fighter.castAbility`,
   * so overriding it here catches all of them — the ordinary per-element
   * decisions, the charge-and-release path, and the delayed Psychic queue.
   *
   * The echo is the *effect* happening again, not a second press: no second
   * cooldown stamp and no second announce, because the bot only paid once.
   */
  override castAbility(abilityId: string, ctx: CastContext): boolean {
    const fired = super.castAbility(abilityId, ctx);
    if (!fired || !this.trueNightmare) return fired;
    if (Math.random() >= TRUE_NIGHTMARE_DOUBLE_CHANCE) return fired;
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability) return fired;
    this.scene.time.delayedCall(TRUE_NIGHTMARE_ECHO_MS, () => {
      // The bout can end, or the body can be swapped out, inside that beat.
      if (!this.active || this.hp <= 0) return;
      ability.cast(ctx);
    });
    return fired;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    element: Element,
    textureKey = 'elem-water',
    difficulty: DifficultyConfig = DIFFICULTY_PRESETS[2], // default: Hard
  ) {
    super(scene, x, y, textureKey, element, difficulty.hp, difficulty.speed);
    this.difficulty = difficulty;
    this.profile = MOVEMENT_PROFILES[element.id] ?? DEFAULT_PROFILE;
    this.attackRange = this.profile.range[1];
  }

  doAI(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    aiState: NpcAiState,
  ): string | null {
    if (aiState.isLocked) return null;

    // Initialise charge cooldown on the very first tick so mastered NPCs don't
    // immediately charge before moving.
    if (this.lastChargeDecision < 0) this.lastChargeDecision = time;

    // ── Invisible target (Silence): wander naturally instead of fighting ──
    if (aiState.targetInvisible) {
      return this.doBlindBehavior(buildContext, time, aiState.silenceStalkersPresent ?? false);
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const hpRatio = this.hp / this.maxHp;
    const prof = this.profile;

    // ── State transitions ─────────────────────────────────────────
    // Retreat is a *window*, not a mode: a hurt bot peels off for a beat or two while
    // its cooldowns breathe, then finds its courage again — it never runs forever.
    if (
      time >= this.retreatUntil && time >= this.nextRetreatAt &&
      hpRatio < prof.retreatHp && dist < prof.range[1] + 80
    ) {
      this.retreatUntil = time + Phaser.Math.Between(1400, 2400);
      this.nextRetreatAt = this.retreatUntil + Phaser.Math.Between(3500, 6500);
    }
    this.aiState = time < this.retreatUntil ? 'retreat'
      : dist > prof.range[1] ? 'chase'
      : 'attack';

    // Periodically flip strafe direction
    if (time > this.nextStrafeDirChange) {
      this.strafeDir *= -1;
      this.nextStrafeDirChange = time + Phaser.Math.Between(1200, 2800);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    // ── Active charge: hold position and fire when ready ─────────
    if (this.chargeUntil > 0) {
      body.setVelocity(0, 0);
      if (time >= this.chargeUntil) {
        const abilityId = this.chargingAbility;
        this.chargeUntil = 0;
        this.chargingAbility = '';
        const aimOffsetRad2 = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0) + this.hallucinationMissDeg()) * (Math.PI / 180);
        // Devotion Mastery: an Ark in sight pulls the aim toward it, or the bot looks away.
        const aimAngle2 = this.bendGaze(angleToTarget + aimOffsetRad2);
        const aimX2 = this.x + Math.cos(aimAngle2) * dist;
        const aimY2 = this.y + Math.sin(aimAngle2) * dist;
        if (this.castAbility(abilityId, buildContext(aimX2, aimY2))) {
          return abilityId + '-charged';
        }
      }
      return null;
    }

    // ── Compute aimed target position (with difficulty offset) ────
    const aimOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0) + this.hallucinationMissDeg()) * (Math.PI / 180);
    // Devotion Mastery: an Ark in sight pulls the aim toward it, or the bot looks away.
    const aimAngle = this.bendGaze(angleToTarget + aimOffsetRad);
    const aimX = this.x + Math.cos(aimAngle) * dist;
    const aimY = this.y + Math.sin(aimAngle) * dist;

    // ── Velocity-led aim (Expert+) ────────────────────────────────
    // A partial lead over an assumed ~620px/s projectile flight. Kept in fields rather
    // than folded into aimX/aimY because hitscan abilities must keep shooting at where
    // the target *is* — projectile routines opt into these in their own rewrites.
    if (this.difficulty.level >= 4) {
      const tBody = target.body as Phaser.Physics.Arcade.Body | null;
      const leadTime = Math.min(0.5, dist / 620) * 0.6;
      this.leadX = target.x + (tBody?.velocity.x ?? 0) * leadTime;
      this.leadY = target.y + (tBody?.velocity.y ?? 0) * leadTime;
    } else {
      this.leadX = target.x;
      this.leadY = target.y;
    }

    // ── Dodge incoming projectiles ────────────────────────────────
    let dodging = false;
    // True Nightmare: a dash already in flight owns the body until it lands.
    if (time < this.trueDodgeUntil) {
      body.setVelocity(this.trueDodgeVx, this.trueDodgeVy);
      dodging = true;
    }
    if (!dodging && this.difficulty.dodgeRange > 0 && !aiState.playerShotsUnseen) {
      const projs = aiState.projectiles.getChildren();
      for (const go of projs) {
        if (!(go instanceof Projectile)) continue;
        const p = go as Projectile;
        if (!p.active || !p.isFromPlayer) continue;

        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dToBullet = Math.sqrt(dx * dx + dy * dy);
        if (dToBullet > this.difficulty.dodgeRange) continue;

        // Check if projectile is heading toward NPC
        const pb = p.body as Phaser.Physics.Arcade.Body;
        const vx = pb.velocity.x;
        const vy = pb.velocity.y;
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed < 1) continue;

        const toNpcX = this.x - p.x;
        const toNpcY = this.y - p.y;
        const toNpcLen = Math.sqrt(toNpcX * toNpcX + toNpcY * toNpcY) || 1;
        const approachDot = (vx / speed) * (toNpcX / toNpcLen) + (vy / speed) * (toNpcY / toNpcLen);
        if (approachDot < 0.4) continue; // not heading toward NPC

        // Dodge perpendicular to bullet velocity. True Nightmare upgrades the
        // sidestep into a committed dash — it clears the lane instead of drifting
        // out of it, and then holds that heading for the length of the dash.
        if (this.trueNightmare && time >= this.nextTrueDodgeAt) {
          const dash = this.speed * TRUE_DODGE_SPEED_MULT;
          // Away from the arena wall it is nearest, so a dash never pins it flat.
          const wb = this.scene.physics.world.bounds;
          const side = (this.y - wb.centerY) * (vx / speed) - (this.x - wb.centerX) * (vy / speed) > 0 ? -1 : 1;
          this.trueDodgeVx = -vy / speed * dash * side;
          this.trueDodgeVy = vx / speed * dash * side;
          this.trueDodgeUntil = time + TRUE_DODGE_MS;
          this.nextTrueDodgeAt = time + TRUE_DODGE_COOLDOWN_MS;
          body.setVelocity(this.trueDodgeVx, this.trueDodgeVy);
          dodging = true;
          break;
        }
        const dodgeSpeed = this.speed * (this.difficulty.level >= 5 ? 1.3 : 1.05);
        body.setVelocity(-vy / speed * dodgeSpeed, vx / speed * dodgeSpeed);
        dodging = true;
        break;
      }
    }
    // The bot's Space, as far as anything reading presses is concerned (Psychic's Pre-move).
    if (dodging) this.dodgingAt = Date.now();

    // ── Movement (skipped if dodge triggered) ────────────────────
    const arch = ARCHETYPE_DEFAULTS[prof.archetype];
    if (!dodging) {
      switch (this.aiState) {
        case 'chase': {
          // A curved run-in rather than a beeline: the weave makes the approach read
          // as footwork and incidentally makes the bot a worse target on the way in.
          const weave = Math.sin(time * 0.004 + this.weavePhase) * arch.weave;
          const a = angleToTarget + weave;
          body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
          break;
        }
        case 'attack': {
          if (arch.backSpeed <= 0) {
            // Brawlers keep walking into you — the old Earth rush, now an archetype.
            body.setVelocity(
              Math.cos(angleToTarget) * this.speed,
              Math.sin(angleToTarget) * this.speed,
            );
          } else if (dist < prof.range[0]) {
            // Pushed inside the band: give ground on a diagonal, still half-strafing,
            // so it back-pedals like a player rather than reversing down a rail.
            const away = angleToTarget + Math.PI + this.strafeDir * (Math.PI / 5);
            body.setVelocity(
              Math.cos(away) * this.speed * arch.backSpeed,
              Math.sin(away) * this.speed * arch.backSpeed,
            );
          } else {
            const strafeAngle = angleToTarget + this.strafeDir * (Math.PI / 2);
            body.setVelocity(
              Math.cos(strafeAngle) * this.speed * arch.strafe,
              Math.sin(strafeAngle) * this.speed * arch.strafe,
            );
          }
          break;
        }
        case 'retreat': {
          // Full-speed disengage with a wobble, so the exit line is not a free shot.
          const wob = Math.sin(time * 0.006 + this.weavePhase) * 0.35;
          const away = angleToTarget + Math.PI + wob;
          body.setVelocity(Math.cos(away) * this.speed, Math.sin(away) * this.speed);
          break;
        }
      }

      // ── Walls: slide along them, never grind into them ───────────
      // Whatever the state chose, a velocity pressing into a nearby wall is converted
      // into a slide: the into-wall component is redirected toward the middle of the
      // arena and the strafe direction flips so the orbit peels away instead of
      // pinning. This is the general cure for the bug where a bot sat vibrating in a
      // corner for the whole match.
      const wb = this.scene.physics.world.bounds;
      const margin = 48;
      const vNow = body.velocity;
      const intoLeft = this.x < wb.x + margin && vNow.x < 0;
      const intoRight = this.x > wb.right - margin && vNow.x > 0;
      const intoTop = this.y < wb.y + margin && vNow.y < 0;
      const intoBottom = this.y > wb.bottom - margin && vNow.y > 0;
      if (intoLeft || intoRight || intoTop || intoBottom) {
        if (this.aiState === 'attack') {
          this.strafeDir *= -1;
          this.nextStrafeDirChange = time + Phaser.Math.Between(1200, 2800);
        }
        let vx = vNow.x;
        let vy = vNow.y;
        if (intoLeft || intoRight) vx = Math.sign(wb.centerX - this.x) * Math.abs(vx) * 0.6;
        if (intoTop || intoBottom) vy = Math.sign(wb.centerY - this.y) * Math.abs(vy) * 0.6;
        // Cornered outright: nothing tangential left to slide on, so break for open
        // ground even if that means running the gauntlet past the player.
        const speedNow = Math.sqrt(vx * vx + vy * vy);
        if (speedNow < this.speed * 0.4) {
          const aOut = Phaser.Math.Angle.Between(this.x, this.y, wb.centerX, wb.centerY);
          vx = Math.cos(aOut) * this.speed;
          vy = Math.sin(aOut) * this.speed;
        }
        body.setVelocity(vx, vy);
      }
    }

    // ── Pillar of Flame: walk around it, not through it ──────────
    // Applied after movement so it overrides whatever chase/strafe just decided. The push
    // is sideways only, so the NPC still closes distance while it clears the band.
    if (aiState.justicePillarX !== undefined) {
      const halfW = aiState.justicePillarHalfWidth ?? 60;
      const off = this.x - aiState.justicePillarX;
      if (Math.abs(off) < halfW) {
        // Leave along whichever edge is nearer, unless the target is on the far side —
        // then commit to crossing rather than dithering on the line.
        const targetSide = Math.sign(target.x - aiState.justicePillarX) || 1;
        const out = Math.abs(off) < halfW * 0.35 ? targetSide : Math.sign(off) || targetSide;
        body.setVelocityX(out * this.speed);
      }
    }

    // ── World Shift: the arena's own destination ─────────────────
    // Same shape and the same placement as the Depths seek below: a bot that is
    // about to freeze solid, or that has spotted a potion worth crossing for,
    // has nothing to gain from strafing on the way there.
    if (aiState.mapSeekPoint) {
      const seek = aiState.mapSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 8) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    // ── World Shift: the lava river ──────────────────────────────
    // Held after the seek so a bot walking to a campfire is still not walking
    // into the river to get there. It only crosses when the map says the thing
    // it wants is genuinely on the other bank.
    if (aiState.mapAvoidBandX !== undefined && !aiState.mapCrossBand) {
      const halfW = aiState.mapAvoidBandHalfWidth ?? 60;
      const off = this.x - aiState.mapAvoidBandX;
      if (Math.abs(off) < halfW + 18) {
        // Back out the way it came in; dead-centre picks the nearer bank.
        const out = off === 0 ? (target.x > aiState.mapAvoidBandX ? -1 : 1) : Math.sign(off);
        body.setVelocityX(out * this.speed);
      }
    }

    // ── Depths: air, algae and the lure ──────────────────────────
    // Applied after movement, like the pillar, because it is a destination rather than a
    // nudge: a bot that is drowning has nothing to gain from strafing.
    if (aiState.depthsSeekPoint) {
      const seek = aiState.depthsSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 6) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    // ── Harvest: backing onto its own mold ───────────────────────
    // Same shape as the Depths seek above: the bot walks into the middle of its rot so whoever is
    // chasing it has to stand on the mold to keep swinging.
    if (aiState.harvestSeekPoint) {
      const seek = aiState.harvestSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 6) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    // ── Conquest: walking to a build site ────────────────────────
    // Same shape as the Depths seek above, and for the same reason: a bot that has decided
    // where its next barracks goes has nothing to gain from strafing on the way there.
    if (aiState.conquestSeekPoint) {
      const seek = aiState.conquestSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 6) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    // ── Life: a ripe Lotus orb ───────────────────────────────────
    // Soft, like Gold's below: a heal and a petal are worth a short detour, never the fight.
    if (aiState.lifeSeekPoint) {
      const seek = aiState.lifeSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 10) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      }
    }

    // ── Gold: its own plume, the loot, the Midas floor ───────────
    // Same soft shape as the other seeks here: worth walking into, not worth abandoning the
    // fight for, so it only steers while the bot is outside and lets the movement state run once
    // it arrives.
    if (aiState.goldSeekPoint) {
      const seek = aiState.goldSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 24) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      }
    }

    // ── Illusion: through its own Veil, for Duplication ─────────
    // Hard, like Dream's: the pane only pays if the bot's body actually crosses it, so it walks
    // to the centre and the kit stops publishing the point the moment the pane is spent.
    if (aiState.illusionSeekPoint) {
      const seek = aiState.illusionSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 4) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      }
    }

    // ── Dream: up to a sleeper, or over to a leech ───────────────
    // Hard, like Harvest's: a sleeper is the whole plan, and the kit stops publishing the point
    // once the bot is close enough to step into its dream.
    if (aiState.dreamSeekPoint) {
      const seek = aiState.dreamSeekPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 6) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      }
    }

    // ── Devotion: holding the chariot's line ─────────────────────
    // During Ascendance's wind-up the bot stays level with the line it drew, so the chariot
    // scoops it up and drops it on the target. Only the vertical is steered; it keeps strafing.
    if (aiState.npcDevotion?.holdLineY !== undefined) {
      const dy = aiState.npcDevotion.holdLineY - this.y;
      if (Math.abs(dy) > 14) body.setVelocity(body.velocity.x * 0.6, Math.sign(dy) * this.speed);
    }

    // ── Earth: going to stand in its own weather ──────────────────
    // Same soft shape as the other seeks here: Symbiosis only pays inside a quarter the bot raised,
    // so it steers there while outside and leaves the movement state alone once it arrives.
    if (aiState.earthBiomePoint) {
      const seek = aiState.earthBiomePoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 60) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      }
    }

    // ── Wax: the hive to cash in, the candle to stand in, the payload to carry ──
    // Same soft shape as the other seeks here. A hive worth redeeming outranks the candle,
    // and strapped bombs outrank both: a bot wearing eight bombs has one job.
    if (this.element.id === 'wax') {
      // The candle is only worth walking back to when the bot needs the armour — otherwise the
      // pull back into the light would fight the chase every time it stepped out to fence.
      const hurt = this.hp / this.maxHp < 0.6;
      const seek = aiState.npcWaxSelfBombs ? { x: target.x, y: target.y }
        : aiState.waxHiveRedeemPoint ?? (hurt ? aiState.waxCandlePoint : undefined);
      if (seek) {
        const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
        const stop = aiState.npcWaxSelfBombs ? 110 : 60;
        if (d > stop) {
          const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
          body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
        } else if (aiState.npcWaxSelfBombs) {
          body.setVelocity(0, 0);
        }
      }
    }

    // ── Magma: standing in its own supercritical collapse ────────
    // Same soft shape as the other seeks here, and for the same reason: the coat is worth
    // walking into, not worth abandoning the fight for. Inside the blast it goes back to
    // whatever the movement state was already doing.
    if (aiState.magmaObsidianPoint) {
      const seek = aiState.magmaObsidianPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 110) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      }
    }

    // ── Death: going to pick its weapon back up ──────────────────
    // Same shape as the Depths seek above, and the strongest of them: a disarmed bot cannot
    // cast anything at all until it is standing on the core, so nothing else is worth doing.
    if (aiState.deathWeaponPoint) {
      const seek = aiState.deathWeaponPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 6) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    // ── Tempest: walking to a current ────────────────────────────
    // Offered by the kit on its own flight schedule. Soft: it stops offering the point the
    // moment the bot launches, so this never fights the airborne drift.
    if (aiState.tempestCurrentPoint) {
      const seek = aiState.tempestCurrentPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 30) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    // ── Myth: stepping into its own beast's path ─────────────────
    // Offered only while a flip is possible and the point is on the way, so the vault for
    // 20% speed is deliberate rather than an accident of chasing.
    if (aiState.mythFlipPoint) {
      const seek = aiState.mythFlipPoint;
      const d = Phaser.Math.Distance.Between(this.x, this.y, seek.x, seek.y);
      if (d > 16) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, seek.x, seek.y);
        body.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
      } else {
        body.setVelocity(0, 0);
      }
    }

    // ── Stationary override (Boss mutation) ──────────────────────
    if (this.stationary) body.setVelocity(0, 0);

    // ── Reaction tick ─────────────────────────────────────────────
    // Everything above (movement, dodge, charge, seeks) ran per-frame; the question of
    // what to press next only gets asked on a human-ish cadence. This also means the
    // per-decision random gates in the routines below fire like choices instead of
    // like a 60hz slot machine.
    if (time < this.nextDecisionAt) return null;
    const tickMs = this.trueNightmare
      ? TRUE_NIGHTMARE_DECISION_MS
      : DECISION_MS[this.difficulty.level] ?? 230;
    this.nextDecisionAt = time + tickMs * Phaser.Math.FloatBetween(0.75, 1.25);

    // ── Ability decisions ─────────────────────────────────────────
    if (this.element.id === 'fire') {
      return this.doFireAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'water') {
      return this.doWaterAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'life') {
      return this.doLifeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'air') {
      return this.doAirAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'earth') {
      return this.doEarthAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'oil') {
      return this.doOilAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'shadow') {
      return this.doShadowAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'ice') {
      return this.doIceAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'growth') {
      return this.doGrowthAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'crystal') {
      return this.doCrystalAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'soul') {
      return this.doSoulAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'hunt') {
      return this.doHuntAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'sand') {
      return this.doTimeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'gravity') {
      return this.doGravityAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'creation') {
      return this.doCreationAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState, angleToTarget);
    }
    if (this.element.id === 'electricity') {
      return this.doElectricityAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'slime') {
      return this.doSlimeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'fate') {
      return this.doFateAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'sound') {
      return this.doSoundAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'light') {
      return this.doLightAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'magnet') {
      return this.doMagnetAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'metal') {
      return this.doMetalAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'plasma') {
      return this.doPlasmaAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'gunpowder') {
      return this.doGunpowderAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'rubber') {
      return this.doRubberAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'magic') {
      return this.doMagicAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'technology') {
      return this.doTechnologyAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'silence') {
      return this.doSilenceAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'echo') {
      return this.doEchoAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'subterfuge') {
      return this.doSubterfugeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'justice') {
      return this.doJusticeAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'dream') {
      return this.doDreamAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'wax') {
      return this.doWaxAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'clay') {
      return this.doClayAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'chalk') {
      return this.doChalkAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'magma') {
      return this.doMagmaAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'illusion') {
      return this.doIllusionAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'depths') {
      return this.doDepthsAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'conquest') {
      return this.doConquestAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'passion') {
      return this.doPassionAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'ruin') {
      return this.doRuinAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'dune') {
      return this.doDuneAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'paper') {
      return this.doPaperAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'death') {
      return this.doDeathAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'fortune') {
      return this.doFortuneAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'cloth') {
      return this.doClothAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'marrow') {
      return this.doMarrowAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'tempest') {
      return this.doTempestAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'myth') {
      return this.doMythAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'psychic') {
      return this.doPsychicAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'radiation') {
      return this.doRadiationAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'bind') {
      return this.doBindAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'gum') {
      return this.doGumAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    if (this.element.id === 'gluttony') {
      return this.doGluttonyAbilities(target, buildContext, time, dist, hpRatio, aimX, aimY, aiState);
    }
    return null;
  }

  /**
   * Harvest (element id `gluttony`). The kit's synergies are checked first, in the order they pay:
   *
   * - **Reaping Hour executes** — the kit says when the swing would put the target under the line.
   * - **Sickle → heart**: a heart of its own in reach is 75 Corrupt HP, worth more than any poke.
   * - **Corrupt HP → heavy bite**: with as much rot as health, Consume floods the target.
   * - **Consume steals**: a shielded or buffed target is bitten for what it carries.
   * - **Mold → crows**: the frenzy waits for a corrupted target (or one standing in the rot).
   *
   * Then the rotation: re-sow when its mold is thin, bite up close, scythe a corrupted target at
   * range, and keep the sickle in the air.
   */
  private doGluttonyAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const corruption = aiState.npcHarvestTargetCorruption ?? 0;
    // Mastery: the key Corrupt Predation was bound over is the kit's now.
    const bound = aiState.npcHarvestPredationSlot;
    const frenzy = bound !== 'r';
    const consume = bound !== 'f';
    const reap = bound !== 'q';

    if (reap && aiState.npcHarvestCanExecute && dist < 175) {
      if (this.castAbility('harvest-reap', buildContext(aimX, aimY))) return 'harvest-reap';
    }
    const heart = aiState.npcHarvestHeartAim;
    if (heart) {
      if (this.castAbility('harvest-sickle', buildContext(heart.x, heart.y))) return 'harvest-sickle';
    }
    if (consume && !skipSpecials && dist < 100 && (aiState.npcHarvestBiteHeavy || aiState.npcHarvestTargetBuffed)) {
      if (this.castAbility('harvest-consume', buildContext(aimX, aimY))) return 'harvest-consume';
    }
    if (frenzy && !skipSpecials && dist < 480 && (corruption >= 40 || aiState.npcHarvestTargetOnMold)) {
      if (this.castAbility('harvest-frenzy', buildContext(aimX, aimY))) return 'harvest-frenzy';
    }

    // ── Rotation ──
    if (!skipSpecials && (aiState.npcHarvestMatureMold ?? 0) < 30 && dist < 300) {
      if (this.castAbility('harvest-sow', buildContext(aimX, aimY))) return 'harvest-sow';
    }
    if (consume && !skipSpecials && dist < 90 && (hpRatio < 0.6 || Math.random() < 0.5)) {
      if (this.castAbility('harvest-consume', buildContext(aimX, aimY))) return 'harvest-consume';
    }
    if (reap && !skipSpecials && dist < 165 && corruption >= 55) {
      if (this.castAbility('harvest-reap', buildContext(aimX, aimY))) return 'harvest-reap';
    }
    if (dist < 460) {
      if (this.castAbility('harvest-sickle', buildContext(aimX, aimY))) return 'harvest-sickle';
    }
    return null;
  }

  /**
   * Slime. The bot cannot use the passive — it has no cursor to drag itself along the floor with,
   * so GumKit lurches its walk instead — but every ability is genuinely available to it, and the
   * ordering below is really "keep ammunition on the floor and something sticky on the target".
   *
   * Gumball comes before everything except the ultimate because encasing the target is what makes
   * the rest of the kit work, and re-casting it on an already-gummed body buys nothing. Slime
   * Surge is kept topped up at range, since the bot's click *is* the ball throw whenever it is too
   * far away to punch — running dry turns its whole mid-range game off. Oozorbtion is held for the
   * moment it is actually being shot at rather than opened on cooldown, and Solidify is refused
   * outright at close quarters: three seconds of total paralysis next to somebody is a death
   * sentence, however many shards it throws on the way in.
   */
  private doGumAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // No hand: the kit refuses every cast, so there is nothing to press.
    if (aiState.npcGumHandless) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const bound = aiState.npcGumOobleckSlot;

    // Mastery: a slab that is standing is worth setting, and setting it is what Solidify is for
    // now. GumKit plants the slab itself; this is the half of the combo that needs a key. The
    // distance refusal below does not apply to it: mastery is a Nightmare loadout, and a
    // Nightmare loadout owns Hand of Stone, so there is no three-second paralysis to fear.
    if (!skipSpecials && aiState.npcGumSlabSoft) {
      if (this.castAbility('gum-solidify', buildContext(aimX, aimY))) return 'gum-solidify';
    }

    // The ultimate is a three-second paralysis, so it is only ever thrown from a safe distance —
    // and it is worth far more with slimeballs and a gummed body already on the field to harden.
    if (!skipSpecials && dist > 300 && ((aiState.npcGumBalls ?? 0) > 0 || aiState.npcGumTargetEncased)) {
      if (this.castAbility('gum-solidify', buildContext(aimX, aimY))) return 'gum-solidify';
    }

    // Gum first: everything else in the kit is worth more against an encased target.
    if (!skipSpecials && bound !== 'r' && dist < 400 && !aiState.npcGumTargetEncased) {
      if (this.castAbility('gum-gumball', buildContext(aimX, aimY))) return 'gum-gumball';
    }

    // Open up while there is still range to be shot across — swallowing a shot is worth more
    // than swallowing a punch, and the swelling makes it an easier target either way.
    if (!skipSpecials && bound !== 'f' && dist > 220 && !aiState.npcGumAbsorbArmed && hpRatio < 0.8) {
      if (this.castAbility('gum-oozorbtion', buildContext(aimX, aimY))) return 'gum-oozorbtion';
    }

    // Ammunition. Out of punching range the click is the throw, so an empty floor is a mute bot.
    if (bound !== 'e' && (aiState.npcGumBalls ?? 0) < 2) {
      if (this.castAbility('gum-surge', buildContext(aimX, aimY))) return 'gum-surge';
    }

    // The click: a punch up close, a hurled slimeball otherwise. GumKit decides which.
    if (dist < 520) {
      if (this.castAbility('gum-grab', buildContext(aimX, aimY))) return 'gum-grab';
    }
    return null;
  }

  /**
   * Radiation. The bot is running the same two procedures the player is, and the ordering below
   * is really "do not break the chain" rather than a rotation.
   *
   * Three rules keep it honest. While the flare gun is out it does nothing but shoot flares, and
   * only at close range — five rounds into one body is the entire ultimate, and a flare thrown at
   * a target it might lose is the ultimate thrown away. It refuses to fire tracers past the range
   * where a miss is likely, because a miss scrubs every tracer it has already planted and the
   * click is otherwise free. And it saves the baton for a target that is *already* dosed, where
   * the ability is a 1.5-second stun rather than 15 damage.
   */
  private doRadiationAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // Mid-Barrage the kit steers the cone; anything pressed now would only distract from it, and
    // a stray tracer would scrub the board on top.
    if (aiState.npcRadiationBarraging) return null;
    // Mastery: the key the Test Dummy was bound over is the kit's now — it throws the dummy itself.
    const bound = aiState.npcRadiationDummySlot;
    const bunkerFree = bound !== 'r';
    const batonFree = bound !== 'f';
    const flaresFree = bound !== 'q';
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // ── Synergy: the airdrop is falling and the bunker eats the self-hit ──
    // Checked before everything, including the flare gun: 200 damage to ourselves is the one
    // thing in the kit that can lose the match on its own.
    if (aiState.npcRadiationNeedsCover && bunkerFree) {
      if (this.castAbility('radiation-bunker', buildContext(aimX, aimY))) return 'radiation-bunker';
    }

    // ── Synergy: turrets standing or a Q+ drop falling — both only pay out on a dosed target ──
    if (aiState.npcRadiationWantsDose && batonFree && dist < 125) {
      if (this.castAbility('radiation-baton', buildContext(aimX, aimY))) return 'radiation-baton';
    }

    // The flare gun overrides everything else. Nothing is worth a button while it is out.
    if (aiState.npcRadiationFlares) {
      if (dist < 460 && this.castAbility('radiation-railgun', buildContext(aimX, aimY))) {
        return 'radiation-railgun';
      }
      return null;
    }

    // ── Synergy: Flick Shot — a tracer thrown straight out of a retreat lands for 25 ──
    if (aiState.npcRadiationFlickReady && dist < 420) {
      if (this.castAbility('radiation-railgun', buildContext(aimX, aimY))) return 'radiation-railgun';
    }

    // ── Synergy: R+ turrets / a Q+ drop want a dose and the rod is out of reach — tracers dose ──
    if (aiState.npcRadiationWantsDose && dist < 420) {
      if (this.castAbility('radiation-railgun', buildContext(aimX, aimY))) return 'radiation-railgun';
    }

    // ── Synergy: a dosed target in reach — the rod stuns instead of dosing (and with F+ mutates,
    // unless the dose is still wanted by the turrets or the falling drop) ──
    if (aiState.npcRadiationTargetDosed && !aiState.npcRadiationKeepDose && batonFree && dist < 125) {
      if (this.castAbility('radiation-baton', buildContext(aimX, aimY))) return 'radiation-baton';
    }

    // ── Synergy: a stunned target cannot leave the cone, and a dosed one takes 8 a round ──
    if (!skipSpecials && dist < 520 && (aiState.npcRadiationTargetStunned || aiState.npcRadiationTargetDosed)) {
      if (this.castAbility('radiation-barrage', buildContext(aimX, aimY))) return 'radiation-barrage';
    }

    // The ultimate is only worth drawing where five rounds can actually be placed — and with the
    // bunker ready, so the drop it calls can be sat out.
    // With the dummy in the bunker's slot, the dummy is the cover (the kit throws it as the drop falls).
    const coverReady = bunkerFree ? this.getCooldownRatio('radiation-bunker') >= 1 : !!aiState.npcRadiationDummyCoverReady;
    if (!skipSpecials && flaresFree && dist < 380 && coverReady) {
      if (this.castAbility('radiation-extermination', buildContext(aimX, aimY))) {
        return 'radiation-extermination';
      }
    }

    // Cover when hurt and pressed, rather than as a reflex.
    if (!skipSpecials && bunkerFree && hpRatio < 0.5 && dist < 260 && !aiState.npcRadiationSheltered) {
      if (this.castAbility('radiation-bunker', buildContext(aimX, aimY))) return 'radiation-bunker';
    }

    // Too close: the rod as an opener, which doses the target for everything above.
    if (dist < 110 && batonFree) {
      if (this.castAbility('radiation-baton', buildContext(aimX, aimY))) return 'radiation-baton';
    }

    // Barrage on a clean target, at mid range where the cone is easiest to hold.
    if (!skipSpecials && dist > 160 && dist < 420) {
      if (this.castAbility('radiation-barrage', buildContext(aimX, aimY))) return 'radiation-barrage';
    }

    // The engine. Held inside the range where the tracer will actually arrive, because the whole
    // chain this bot is building dies on one stray click.
    const safeRange = (aiState.npcRadiationTracers ?? 0) > 0 ? 420 : 620;
    if (dist < safeRange) {
      if (this.castAbility('radiation-railgun', buildContext(aimX, aimY))) return 'radiation-railgun';
    }
    return null;
  }

  /**
   * Bind. The bot is managing somebody else's temper, so every branch here is really a question
   * about the anger bar rather than about the fight.
   *
   * Once the patron has turned there is nothing to press at all — the kit refuses every cast for
   * those five seconds — so the bot spends them moving. Below that, it treats 70 anger as a hard
   * ceiling: no barrage, no idol and no beam past two-thirds heat, because every one of those is
   * a bill and the punishment costs far more than any of them buys. The beam is released at 0.72
   * heat rather than run to the top, which is exactly the decision a good player makes with it.
   *
   * With Bind Mastery's Ritual Sacrifice bound, that ceiling moves: the bot has a way to buy the
   * bar back down at 25 health a stab, so it is allowed to run to 82 instead of 70. The dagger and
   * the Pathetic Stab are both played by the kit, not from here — see `npcBindRitualSlot`.
   */
  private doBindAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // Forsaken: the god is busy with its own summoner and answers nothing. Chained is the same
    // silence from the other direction — the sky is open and the bot's hands are not its own.
    if (aiState.npcBindForsaken || aiState.npcBindChained) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const anger = aiState.npcBindAnger ?? 0;
    const heat = aiState.npcBindHeat ?? 0;
    // Bind Mastery: with the dagger available the bot can *afford* a high bar, because it can pay
    // one down at 15 a stab. Its ceiling on spending goes up accordingly — 70 is where a bot with
    // no way out of the bill has to stop, not where the bar becomes dangerous.
    const ritual = aiState.npcBindRitualSlot;
    const calm = anger < (ritual ? 82 : 70);

    // The ultimate is free of anger entirely — it is paid for in abilities — so it goes first.
    if (!skipSpecials && dist < 620) {
      if (this.castAbility('bind-treachery', buildContext(aimX, aimY))) return 'bind-treachery';
    }

    // The ward is worth its anger only when there is something left to protect.
    if (!skipSpecials && ritual !== 'f' && hpRatio < 0.55 && (aiState.npcBindWard ?? 0) === 0 && anger < 85) {
      if (this.castAbility('bind-protection', buildContext(aimX, aimY))) return 'bind-protection';
    }

    // An idol is a turret while it is standing on top of you and a bill the moment it is not,
    // so the bot only ever plants one at its own feet — and only while it can afford to be wrong.
    if (!skipSpecials && ritual !== 'r' && calm && (aiState.npcBindIdolFaith ?? -1) < 0 && dist < 420) {
      if (this.castAbility('bind-idol', buildContext(this.x, this.y))) return 'bind-idol';
    }

    // With the cult unlocked the same key stops asking that question: an idol already standing
    // means the press buys a permanent body to stand in front of it instead, and three of those
    // is the difference between an idol that bills and one that pays for itself.
    const cult = aiState.npcBindCult ?? -1;
    if (!skipSpecials && ritual !== 'r' && cult >= 0 && cult < 3 && (aiState.npcBindIdolFaith ?? -1) >= 0) {
      if (this.castAbility('bind-idol', buildContext(this.x, this.y))) return 'bind-idol';
    }

    if (!skipSpecials && ritual !== 'e' && calm && dist < 560) {
      if (this.castAbility('bind-shards', buildContext(aimX, aimY))) return 'bind-shards';
    }

    // The beam, released well before the top of the bar. Overheating costs 20 anger, and 20
    // anger is a quarter of the way to being attacked by its own god.
    if (!aiState.npcBindOverheated && heat < 0.72 && (calm || heat < 0.4)) {
      if (this.castAbility('bind-summon', buildContext(aimX, aimY))) return 'bind-summon';
    }
    return null;
  }

  /**
   * Psychic — a chess player. The kit owns the board: it works out which piece can move
   * through the target this tick (`npcPsychicMove`) and where each fresh piece should stand so
   * its first move is already lined up (`npcPsychic*At`). The rotation only decides *when*.
   *
   * Synergies, all kit-planned: a piece placed on a line through the target is a slide (or a
   * knight's landing) waiting to happen; its aura is placed near the bot so the bot stands in
   * it; a rook can take one of the bot's own tired pieces to wear its aura for 30 seconds; and
   * the queen is pressed once the board is already full, because her ×3 multiplies on top.
   *
   * Upgrades, also kit-planned: Castle (F+) and Mount Protect (R+) arrive as ordinary
   * `npcPsychicMove` clicks — a castle out of melee that drops the slam on the target, or a knight
   * ridden away while hurt — and Checkmate (Q+) crowns early once the target is low enough
   * (`npcPsychicCheckmate`) that the reign's end will finish them. Insight Move and Sight Lines
   * need no decision at all.
   */
  private doPsychicAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void time;
    void target;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const taken = aiState.npcPsychicMasterySlot;
    const pieces = aiState.npcPsychicPieces ?? 0;

    // A planned move first: it is free (no cooldown) and it is where the damage is.
    const move = aiState.npcPsychicMove;
    if (move) {
      buildContext(move.x, move.y).psychicMovePiece(move.x, move.y);
      return null;
    }

    // The crown, once there is a board for it to multiply — or when the bot is in trouble.
    if (taken !== 'q' && !aiState.npcPsychicQueen && !skipSpecials && dist < 460
        && (pieces >= 2 || hpRatio < 0.45 || aiState.npcPsychicCheckmate)) {
      if (this.castAbility('psychic-queen', buildContext(aimX, aimY))) return 'psychic-queen';
    }

    // Pieces, each on a line through the target. The bishop first when it is hurting.
    const place = (id: string, at: { x: number; y: number } | undefined): string | null => {
      if (!at) return null;
      return this.castAbility(id, buildContext(at.x, at.y)) ? id : null;
    };
    if (!skipSpecials && dist < 560) {
      const order: [string, { x: number; y: number } | undefined, string | undefined][] = hpRatio < 0.7
        ? [['psychic-bishop', aiState.npcPsychicBishopAt, undefined],
          ['psychic-rook', aiState.npcPsychicRookAt, 'f'], ['psychic-knight', aiState.npcPsychicKnightAt, 'r']]
        : [['psychic-rook', aiState.npcPsychicRookAt, 'f'], ['psychic-knight', aiState.npcPsychicKnightAt, 'r'],
          ['psychic-bishop', aiState.npcPsychicBishopAt, undefined]];
      for (const [id, at, slot] of order) {
        if (slot && taken === slot) continue;
        const cast = place(id, at);
        if (cast) return cast;
      }
    }

    // Pawns while close — not as the queen, whose click is her legs.
    if (!aiState.npcPsychicQueen && dist < PSYCHIC_PAWN_RANGE) {
      if (this.castAbility('psychic-en-passant', buildContext(aimX, aimY))) return 'psychic-en-passant';
    }
    return null;
  }

  /**
   * Gold (element id `fortune`). The kit's synergies are checked first, in the order they pay:
   *
   * 1. **Heart → Plume.** A gold-hearted target standing in a burning cloud has to walk out of
   *    it, and walking is what fills the heart. So the plume goes on top of them the moment the
   *    heart is live.
   * 2. **Midas → the floor.** The curse is cast at a range the bot can follow; the floor it lays
   *    is the bot's road (the kit publishes `goldSeekPoint` and the soft seek walks it there).
   * 3. **Gold → Advance.** Ten gold is always spent — the kit gates the press and picks the card
   *    (with Artisan, a jeweled one when it can pay for it).
   * 0. **Midas → statue → coins** (Q+). The kit says when the statue is worth more melted than hit.
   * M. **Purse → Rags to Riches** (mastery). The kit fires it itself once 20 gold is banked and the
   *    bot is healthy enough not to need that gold for Gilded Augment, and `npcCanAdvance` saves
   *    every other purse for it. The rotation only leaves the bound key alone.
   *
   * After those the rotation is ordinary: the cane inside its reach, a plume at its own feet so it
   * can stand in it and earn, and grass thrown at the kit's gravity-corrected aim.
   */
  private doFortuneAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    if (aiState.npcGoldLunging) return null;
    // 0. Full Metal Alchemy: a statue left alone melts into three coins. Short of an Advance, the
    // bot leaves it be — anything it threw now would crack the statue and spend the coins.
    if (aiState.npcGoldStatueHold) return null;
    // Mastery: the key Rags to Riches was bound over is the kit's now.
    const bound = aiState.npcGoldRagsSlot;
    const plume = bound !== 'r';
    const heart = bound !== 'f';
    const midas = bound !== 'q';
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // 1. Heart → Plume.
    const plumeAt = aiState.npcGoldPlumeAt;
    if (plume && aiState.npcGoldHeartLive && plumeAt && dist < 380) {
      if (this.castAbility('fortune-plume', buildContext(plumeAt.x, plumeAt.y))) return 'fortune-plume';
    }

    // 2. Midas, at a range the bot can follow the floor it lays. Saved for a fight that is going
    // to last — a nearly dead target is not worth a 30-second ultimate.
    if (midas && !skipSpecials && !aiState.npcGoldMidasLive && dist < 420 && (target.hp / Math.max(1, target.maxHp) > 0.3 || hpRatio < 0.4)) {
      if (this.castAbility('fortune-midas', buildContext(aimX, aimY))) return 'fortune-midas';
    }

    // 3. Spend the purse.
    if (aiState.npcGoldCanAdvance) {
      if (this.castAbility('fortune-advance', buildContext(aimX, aimY))) return 'fortune-advance';
    }

    // The cane, inside its reach (150px lunge + the cane).
    if (heart && !skipSpecials && dist < 185) {
      if (this.castAbility('fortune-heart', buildContext(aimX, aimY))) return 'fortune-heart';
    }

    // A plume to stand in and earn from, between the bot and the target.
    if (plume && !skipSpecials && plumeAt && dist < 460) {
      if (this.castAbility('fortune-plume', buildContext(plumeAt.x, plumeAt.y))) return 'fortune-plume';
    }

    // Grass: the falling clump is only worth throwing inside the range it can still reach.
    const aim = aiState.npcGoldFrayAim ?? { x: aimX, y: aimY };
    if (dist < 400) {
      if (this.castAbility('fortune-fray', buildContext(aim.x, aim.y))) return 'fortune-fray';
    }
    return null;
  }

  /**
   * Cloth.
   *
   * The element is four two-press combos stacked on each other, and a bot that treats the five
   * keys as five independent buttons plays none of them. Every branch below is therefore a
   * *second* press: reel the pin it already threw, bail out on the anchor it already set, stay
   * glued while the pin counter is nearly full, and keep swinging while somebody is webbed.
   * The kit publishes all four of those states on `aiState` — the AI never re-derives geometry
   * the kit already owns.
   *
   * The one genuinely independent decision is Pin Cushion: pins are only worth having while
   * something is close enough to be hurt by the thorns coming back off them.
   */
  private doClothAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // ── Combo: the reel home ──
    // A planted pin is worth far more as a recall than as the 15 it already dealt: arriving on a
    // pinned body is another 10, a long knockback, and — with E+ — a web. Taken first, and taken
    // whether or not this tick would have skipped a special.
    if (aiState.npcClothPinPlanted && dist > 90) {
      if (this.castAbility('cloth-longpin', buildContext(aimX, aimY))) return 'cloth-longpin';
    }

    // ── Combo: bail before the line bails for you ──
    // The anchor fires itself at 75 damage. Going early is the difference between choosing to
    // leave and being dragged off mid-fight, so the bot spends it once it is hurt or once the
    // tally is nearly full.
    if (aiState.npcClothAnchored && ((aiState.npcClothAnchorPressure ?? 0) > 0.7 || hpRatio < 0.4)) {
      if (this.castAbility('cloth-safety-line', buildContext(aimX, aimY))) return 'cloth-safety-line';
    }

    // ── Combo: finish the pin count ──
    // Nearly at the grapple spin. Nothing else is worth a press — the spin parks it inside its
    // own reach for most of a second, which is more stabs than any other button buys.
    const combo = aiState.npcClothCombo ?? 0;
    if (combo > 0.5 && dist < 96) {
      if (this.castAbility('cloth-pin', buildContext(aimX, aimY))) return 'cloth-pin';
    }

    // ── Combo: a webbed target cannot leave ──
    // Free damage window. Stab, and keep stabbing.
    if (aiState.npcClothWebbed && dist < 110) {
      if (this.castAbility('cloth-pin', buildContext(aimX, aimY))) return 'cloth-pin';
    }

    // ── R ── set the anchor while it is safe to, so it exists when it is not.
    if (!aiState.npcClothAnchored && !skipSpecials && hpRatio > 0.5) {
      if (this.castAbility('cloth-safety-line', buildContext(aimX, aimY))) return 'cloth-safety-line';
    }

    // ── F ── pins are a liability at range and an engine in melee, because the thorns only
    // pay while somebody is close enough to catch them.
    if ((aiState.npcClothPinned ?? 0) < 30 && dist < 220 && hpRatio > 0.35) {
      if (this.castAbility('cloth-pin-cushion', buildContext(aimX, aimY))) return 'cloth-pin-cushion';
    }

    // ── Q ── the loom only pays off over a whole match, so it is spent the moment it is up.
    if (!skipSpecials) {
      if (this.castAbility('cloth-tapestry', buildContext(aimX, aimY))) return 'cloth-tapestry';
    }

    // ── E ── the throw. Worth it at any range: a wall pin is a free repositioning tool and a
    // body pin is 15 plus the combo above.
    if (!aiState.npcClothPinPlanted && dist > 120 && !skipSpecials) {
      if (this.castAbility('cloth-longpin', buildContext(aimX, aimY))) return 'cloth-longpin';
    }

    // ── Click ── the default, and the whole reason to be in somebody's face.
    if (dist < 110) {
      if (this.castAbility('cloth-pin', buildContext(aimX, aimY))) return 'cloth-pin';
    }
    return null;
  }

  /**
   * Myth. Two rotations: the storyteller's, and the gunslinger's once Final Destiny is up.
   *
   * The shard recasts are presses that never touch a cooldown, so the kit spends them itself
   * (`MythKit.updateBotRecasts`) off the same opportunities it publishes here; this routine's
   * job is to make the base casts *around* that. Synergies first: a foe its star mace has just
   * stunned is slashed (`npcMythTipStunLive` — 22 true, and the kit's dash follows with a shard);
   * a hit about to land is parried (`npcMythParryCue` — the kit ripostes with a shard, or
   * re-parries a whiff with R+); a crowd close
   * to cheering is pressed with the whip (`npcMythCheerClose`); the beast is loosed at mid range
   * so the kit's `mythFlipPoint` can walk the bot into its own vault. In Final Destiny: the
   * shotgun is held for pistol stacks (`npcMythVulnStacks`), the rifle for range, the rocket
   * for a stunned or held target, grenades at mid range, the pistol fills.
   */
  private doMythAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void time;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const lead = this.difficulty.level >= 4 ? { x: this.leadX, y: this.leadY } : { x: aimX, y: aimY };

    if (aiState.npcMythDestiny) {
      // ── Synergy: pistol stacks make the shotgun ──
      if ((aiState.npcMythVulnStacks ?? 0) >= 2 && dist < 190) {
        if (this.castAbility('myth-shotgun', buildContext(aimX, aimY))) return 'myth-shotgun';
      }
      // ── Synergy: a held or stunned body cannot sidestep a slow rocket ──
      if (aiState.npcMythTipStunLive || target.stunnedUntil > Date.now() || target.earthStunnedUntil > time) {
        if (this.castAbility('myth-rocket', buildContext(aimX, aimY))) return 'myth-rocket';
      }
      if (!skipSpecials && dist > 260) {
        if (this.castAbility('myth-rifle', buildContext(aimX, aimY))) return 'myth-rifle';
      }
      if (!skipSpecials && dist > 120 && dist < 300) {
        if (this.castAbility('myth-grenades', buildContext(lead.x, lead.y))) return 'myth-grenades';
      }
      if (!skipSpecials && dist < 160) {
        if (this.castAbility('myth-shotgun', buildContext(aimX, aimY))) return 'myth-shotgun';
      }
      if (dist > 320 && Math.random() < 0.5) {
        if (this.castAbility('myth-rocket', buildContext(lead.x, lead.y))) return 'myth-rocket';
      }
      if (this.castAbility('myth-pistol', buildContext(lead.x, lead.y))) return 'myth-pistol';
      return null;
    }

    // ── Synergy: a star-mace stun is a free slash ──
    if (aiState.npcMythTipStunLive && dist < 170) {
      if (this.castAbility('myth-truth', buildContext(aimX, aimY))) return 'myth-truth';
    }
    // ── Synergy: something is about to land — parry it (the kit spends the riposte) ──
    // A reaction, so it is rolled on difficulty: an Easy bot reads the swing far less often.
    if (aiState.npcMythParryCue && !aiState.npcMythParrying && !aiState.npcMythIndomitable
        && Math.random() < 0.25 + 0.15 * this.difficulty.level) {
      if (this.castAbility('myth-determination', buildContext(aimX, aimY))) return 'myth-determination';
    }
    // The ultimate: with shards banked (nothing to spend them on in there) and someone to shoot.
    if (!skipSpecials && dist < 420 && hpRatio > 0.2 && (aiState.npcMythShards ?? 0) <= 1 && !aiState.npcMythBeastLive) {
      if (this.castAbility('myth-destiny', buildContext(aimX, aimY))) return 'myth-destiny';
    }
    // The beast: mid range, aimed through the target, so the kit can walk the bot into its path.
    if (!skipSpecials && !aiState.npcMythBeastLive && dist > 120 && dist < 380) {
      if (this.castAbility('myth-beast', buildContext(aimX, aimY))) return 'myth-beast';
    }
    // The slash: inside its arc.
    if (!skipSpecials && dist < 150) {
      if (this.castAbility('myth-truth', buildContext(aimX, aimY))) return 'myth-truth';
    }
    // The whip: inside its reach, aimed so the tip lands when the crowd is close to a shard.
    if (dist < 215) {
      const tipAim = aiState.npcMythCheerClose || Math.random() < 0.5;
      const a = Phaser.Math.Angle.Between(this.x, this.y, lead.x, lead.y);
      const ax = tipAim ? this.x + Math.cos(a) * 194 : lead.x;
      const ay = tipAim ? this.y + Math.sin(a) * 194 : lead.y;
      if (this.castAbility('myth-whip', buildContext(ax, ay))) return 'myth-whip';
    }
    return null;
  }

  /**
   * Tempest. Two rotations, one per axis, and the synergies the kit publishes come first in both.
   *
   * Airborne: a front to drop onto is the best thing it can do (`npcTempestCanSlam` — damage,
   * the front's rectangle as the shockwave, and it comes back up higher); a self-burst in the
   * last 80px of a fall is the big lift (`npcTempestLandingSoon`); an empty click is refilled by
   * the hop; a target underneath is dived on, which is the only way the Eye ever opens.
   *
   * Grounded: a target by a wall is burst *into* it (`npcTempestWallShot`, 10 + 12); the roll
   * is spent inside kick range; the grapple is the ultimate and goes off at mid range; a front
   * is laid toward the target so there is something to slam onto later; F is only pressed
   * standing on the current the kit walked it to. Projectile aim uses the velocity lead.
   */
  private doTempestAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void time;
    void hpRatio;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const charges = aiState.npcTempestCharges ?? 0;
    const lead = this.difficulty.level >= 4 ? { x: this.leadX, y: this.leadY } : { x: aimX, y: aimY };

    if (aiState.npcTempestAirborne) {
      // ── Synergy: a front of its own under it ──
      if (aiState.npcTempestCanSlam && dist < 460) {
        if (this.castAbility('tempest-front', buildContext(aimX, aimY))) return 'tempest-front';
      }
      // ── Synergy: the big lift, bought in the last 80px of the fall ──
      if (aiState.npcTempestLandingSoon && charges > 0 && !aiState.npcTempestGrabbing) {
        if (this.castAbility('tempest-gale', buildContext(this.x, this.y))) return 'tempest-gale';
      }
      // Holding someone: every burst is a hit on a body that cannot move, and lifts the pair.
      if (aiState.npcTempestGrabbing) {
        if (charges > 0 && this.castAbility('tempest-gale', buildContext(this.x, this.y))) return 'tempest-gale';
        if (this.castAbility('tempest-kick', buildContext(aimX, aimY))) return 'tempest-kick';
        return null;
      }
      // An empty click: the hop refills it and buys height.
      if (charges === 0) {
        if (this.castAbility('tempest-kick', buildContext(aimX, aimY))) return 'tempest-kick';
      }
      // A target underneath: the dive, and the Eye. The only reason to come down early.
      if (!skipSpecials && dist < 150 && !aiState.npcTempestEyeLive) {
        if (this.castAbility('tempest-forecast', buildContext(aimX, aimY))) return 'tempest-forecast';
      }
      if (charges > 0 && dist < 400) {
        if (this.castAbility('tempest-gale', buildContext(lead.x, lead.y))) return 'tempest-gale';
      }
      return null;
    }

    // ── Synergy: a body by a wall ──
    if (aiState.npcTempestWallShot) {
      const w = aiState.npcTempestWallShot;
      if (this.castAbility('tempest-gale', buildContext(w.x, w.y))) return 'tempest-gale';
    }
    // F only ever where the kit walked it to.
    if (aiState.tempestCurrentPoint) {
      const c = aiState.tempestCurrentPoint;
      if (Phaser.Math.Distance.Between(this.x, this.y, c.x, c.y) <= 70) {
        if (this.castAbility('tempest-updraft', buildContext(aimX, aimY))) return 'tempest-updraft';
      }
    }
    // The kick: inside its roll, and more so when the click is empty.
    if (!skipSpecials && dist < 160 && (charges === 0 || Math.random() < 0.6)) {
      if (this.castAbility('tempest-kick', buildContext(aimX, aimY))) return 'tempest-kick';
    }
    // The grapple: mid range, where the dash lands on them rather than past them.
    if (!skipSpecials && dist > 90 && dist < 380 && !aiState.npcTempestEyeLive) {
      if (this.castAbility('tempest-forecast', buildContext(aimX, aimY))) return 'tempest-forecast';
    }
    // A front toward the target: a highway now, and something to slam onto from the air later.
    if (!skipSpecials && (aiState.npcTempestFronts ?? 0) < 2 && dist > 150 && dist < 420) {
      if (this.castAbility('tempest-front', buildContext(aimX, aimY))) return 'tempest-front';
    }
    if (charges > 0 && dist < 420) {
      if (this.castAbility('tempest-gale', buildContext(lead.x, lead.y))) return 'tempest-gale';
    }
    return null;
  }

  /**
   * Marrow. There is no aiming decision in the whole element — the cells walk themselves — so
   * the only thing worth being clever about is the bone bar. Five sockets, and the sixth cast
   * is refused and refunded rather than queued, which means a bot that spams E ends up with
   * five macrophages and no way to make a neutrophil. The order below is therefore a
   * composition: keep one macrophage up for the inflammation upkeep, spend the rest on
   * neutrophils (which are meant to die and leave webs), and save the last socket for the
   * T-cell whenever Dendricles has actually transformed.
   *
   * Mastacre is exempt from the cap and is simply the biggest button it owns, so it goes off
   * whenever anything is close enough for five homing bombs to reach.
   */
  private doMarrowAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const cells = aiState.npcMarrowCells ?? 0;
    const full = cells >= 5;

    // ── Q ──
    // Five mast cells that home and then detonate. They cost no socket, so the only question is
    // whether it is worth spending: in range it is 125 damage, and out of range it is still a
    // full fever bar — which is why a bot whose inflammation has run dry casts it anyway.
    const fever = aiState.npcMarrowInflammation ?? 0;
    if (!skipSpecials && (aiState.npcMarrowMasts ?? 0) === 0 && (dist < 520 || fever < 30)) {
      if (this.castAbility('marrow-mastacre', buildContext(aimX, aimY))) return 'marrow-mastacre';
    }

    // ── F ──
    // Armed, it is a T-cell and worth a socket. Unarmed it is a short-range strike that is only
    // worth pressing in somebody's face, where all five tentacles land and arm the next one.
    if (aiState.npcMarrowTcellArmed) {
      if (!full && this.castAbility('marrow-dendricles', buildContext(aimX, aimY))) return 'marrow-dendricles';
    } else if (dist < 150) {
      if (this.castAbility('marrow-dendricles', buildContext(aimX, aimY))) return 'marrow-dendricles';
    }

    if (full) return null;

    // ── E ──
    // The first socket always goes to a macrophage: it is the only thing in the kit that keeps
    // the fever up on its own, and everything else in the element scales off that bar.
    if (cells === 0) {
      if (this.castAbility('marrow-macrosma', buildContext(aimX, aimY))) return 'marrow-macrosma';
    }

    // ── R ──
    // Cheap, fast, hits hardest, and leaves a web where it falls. The bot's default spend.
    if (!skipSpecials) {
      if (this.castAbility('marrow-neutralize', buildContext(aimX, aimY))) return 'marrow-neutralize';
    }
    if (this.castAbility('marrow-macrosma', buildContext(aimX, aimY))) return 'marrow-macrosma';

    // ── Click ──
    // Nothing else was ready. An antibody is 12 damage and a permanent mark, and it is the only
    // thing in the kit the bot can do at range every half second.
    if (dist < 620) {
      if (this.castAbility('marrow-antibody', buildContext(aimX, aimY))) return 'marrow-antibody';
    }
    return null;
  }

  /**
   * Death. Three of its five deal no damage at all, so there is no "burst window" to build
   * toward — the bot is not trying to kill anybody, it is trying to still be standing when the
   * clock runs out. Every branch below is therefore a delaying tactic, ordered by how much time
   * it buys: the Deal is worth ten seconds off the minute outright, Hospice doubles everything
   * that follows it, Disarm buys three seconds of the target doing nothing, and the brand is
   * the thing that makes all of that survivable.
   *
   * Riposte is the only one gated on range going the *other* way — it is worth nothing in
   * somebody's face and everything at the range they are shooting from.
   */
  private doDeathAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    // Shaking hands. The kit refuses every key until it lets go, and a refused cast still
    // stamps its cooldown — see `castAbility`.
    if (aiState.npcDeathBusy) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // The only cast in the kit that moves the clock, and the ten seconds it asks for are ten
    // seconds of being 33% faster and dodging a third of everything — so it is never a bad time.
    if (!aiState.npcDeathDealing) {
      if (this.castAbility('death-deal', buildContext(aimX, aimY))) return 'death-deal';
    }

    // Whichever slot the mastery took is no longer an ability — the kit presses the delay for
    // itself out of `updateNpcMastery`, off the same two-second damage window the passive reads.
    const gone = aiState.npcDeathDelaySlot;

    // Taking a leg off is permanent and the dash closes the gap for free, so it outranks
    // everything except the deal — but only twice, because that is all the body has.
    //
    // Inside 340, not 400: the dash is clamped to a 340px reach, so a cast from further out is a
    // guaranteed whiff. It always was, but the limb is now decided by the *pass* landing rather
    // than at the cast, so a whiff spends the full 15s for nothing at all.
    if (!skipSpecials && gone !== 'f' && (aiState.npcDeathLimbsTaken ?? 0) < 2 && dist < 340) {
      if (this.castAbility('death-amputate', buildContext(aimX, aimY))) return 'death-amputate';
    }

    // A cleave, not a poke: it only exists inside its own arc. The stun is now bought with Styx
    // stacks, so swinging at an unbranded target is worth only the speed boost — still worth
    // something, just not worth committing to, hence the roll.
    if (!skipSpecials && gone !== 'e' && dist < 120
      && ((aiState.npcDeathTargetStyx ?? 0) > 0 || Math.random() < 0.3)) {
      if (this.castAbility('death-disarm', buildContext(aimX, aimY))) return 'death-disarm';
    }

    // Holding a blade out at somebody standing next to you cuts nothing — the ability is for
    // the range they are shooting from.
    if (!skipSpecials && gone !== 'r' && !aiState.npcDeathGuarding && dist > 210) {
      if (this.castAbility('death-riposte', buildContext(aimX, aimY))) return 'death-riposte';
    }

    if ((aiState.npcDeathTargetStyx ?? 0) < 3 && dist < 660) {
      if (this.castAbility('death-styx', buildContext(aimX, aimY))) return 'death-styx';
    }
    return null;
  }

  /**
   * Paper. The unusual thing here is that two of its five keys are three different abilities
   * wearing one id, so the click and the Q both have to branch on whichever book the kit says is
   * open before they can decide whether casting is even a good idea.
   *
   * The bot does not cycle books tactically — PaperKit turns the page for it on a timer, which
   * keeps the fight varied without the AI having to reason about a resource it cannot see. What
   * it does reason about is range, and it does it per book: Excalibur wants to be thrown at a
   * body it can bend toward, the laser wants a clear line and hates being interrupted mid-burst,
   * and the spike wants to connect at all because two thirds of its damage is the follow-ups.
   */
  private doPaperAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // Mid-glide the kit is flying the body; casting off it would fight the kit for control.
    if (aiState.npcPaperRiding) return null;
    // Mastery: in pieces there is nothing to cast with, and the kit is flying every one of them.
    if (aiState.npcPaperTorn) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const book = aiState.npcPaperBook ?? 0;
    // Mastery: whichever key Restructure was dropped on no longer holds the ability below it.
    // The tear itself is the kit's decision, not this one — it is spent on a health threshold
    // and needs a rebuild point, neither of which is visible from out here.
    const torn = aiState.npcPaperRestructureSlot ?? null;

    // The Climax, spent on whichever book's terms make sense. The charge wants the target out in
    // the open, the bombardment wants them anywhere at all, and the spirit is worth casting early
    // because its eight seconds are the ability rather than its damage.
    if (!skipSpecials) {
      const climaxNow = book === 0 ? dist > 120
        : book === 1 ? true
          : hpRatio < 0.85;
      if (climaxNow && this.castAbility('paper-climax', buildContext(aimX, aimY))) return 'paper-climax';
    }

    // Monsters, but only when there is a field worth having. Cast low as a panic zoning tool too:
    // six mines between you and a pursuer is the cheapest disengage in the kit.
    if (torn !== 'f' && !skipSpecials && (aiState.npcPaperMaches ?? 0) < 2 && (dist < 260 || hpRatio < 0.5)) {
      if (this.castAbility('paper-mache', buildContext(aimX, aimY))) return 'paper-mache';
    }

    // The shuriken is a straight line, so it wants a gap to cross — and the bleed is worth most
    // against a target that still has health left for 2% of it to mean something.
    if (torn !== 'r' && !skipSpecials && dist > 150 && dist < 620) {
      if (this.castAbility('paper-shuriken', buildContext(aimX, aimY))) return 'paper-shuriken';
    }

    // E is thrown at mid range for the 10 and ridden at long range to close — the kit reads which
    // one was meant off the distance, so there is nothing more to decide here.
    if (torn !== 'e' && !skipSpecials && dist > 200) {
      if (this.castAbility('paper-plane', buildContext(aimX, aimY))) return 'paper-plane';
    }

    // The click, per book. The Alien branch is the only one that has to check anything: its two
    // clocks are invisible from out here, and clicking into them is a wasted cooldown.
    const clickNow = book === 0 ? dist < 520
      : book === 1 ? !aiState.npcPaperLaserBusy && dist < 700
        : dist < 460;
    if (clickNow && this.castAbility('paper-storybook', buildContext(aimX, aimY))) return 'paper-storybook';
    return null;
  }

  /**
   * Sand. The one element whose AI has to decide between fighting and *climbing*, and the
   * ordering below is that decision: while a course is standing the kit owns the body, so the
   * only thing worth doing is pulling the trigger on the way up — which is exactly the deal the
   * player takes, and the reason the flintlock's platform bonus is worth building for.
   *
   * Everything else is gated on kit state rather than on cooldowns, because three of the five
   * spend most of their lives in a condition their ability cooldown knows nothing about: a
   * reloading gun, a standing course, a worm still in the sand.
   */
  private doDuneAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Mid-course: shoot, and nothing else. Starting a second obby on top of the first one is the
    // single worst thing this element can do to itself.
    if (aiState.npcDuneOnCourse) {
      if (aiState.npcDuneReloaded && this.castAbility('dune-striker', buildContext(aimX, aimY))) {
        return 'dune-striker';
      }
      return null;
    }

    // The race is the whole ultimate, and it is a coin-flip it can lose — so it is thrown when
    // the npc is winning the exchange anyway and 70 either way is a trade worth taking.
    if (!aiState.npcDuneTrailUp && !skipSpecials) {
      if (this.castAbility('dune-final-trail', buildContext(aimX, aimY))) return 'dune-final-trail';
    }

    // The idol out-damages anything else this kit can do standing still, so the long course is
    // worth the climb whenever there is room to build one.
    if (!skipSpecials && !aiState.npcDunePyramidAwake && dist > 220) {
      if (this.castAbility('dune-pyramid', buildContext(aimX, aimY))) return 'dune-pyramid';
    }

    // The short course is the cheap one: eight seconds of double rate of fire for four jumps.
    if (!skipSpecials && dist > 170) {
      if (this.castAbility('dune-ruins', buildContext(aimX, aimY))) return 'dune-ruins';
    }

    // Aimed at the target, so a deck cast on open floor is at least pointed the right way and
    // the conveyor closes the gap rather than opening it.
    if (!skipSpecials) {
      if (this.castAbility('dune-sandwalk', buildContext(aimX, aimY))) return 'dune-sandwalk';
    }

    if (aiState.npcDuneReloaded) {
      if (this.castAbility('dune-striker', buildContext(aimX, aimY))) return 'dune-striker';
    }
    return null;
  }

  /**
   * Ruin. Four of its five are refused outright by the kit under conditions the AI can't see
   * from here — a ring already down, a skewer already in the air, a target that has never cast
   * anything, the rot at its cap — so every branch below is gated on the matching `aiState`
   * flag rather than on a range check alone. A refused cast is not free: `castAbility` has
   * already stamped the cooldown by the time the kit gets to say no.
   *
   * The ordering is the element's own priority. The rot is permanent and therefore always
   * worth its fifteen seconds; the ring only pays inside its own radius, since it follows the
   * caster and takes two seconds to go off; the lock is worth more the longer the fight has
   * run, because there is more worth locking.
   */
  private doRuinAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    // Mastery: whichever key Second Skin was dropped on no longer holds the ability below it.
    const skin = aiState.npcRuinSkinSlot ?? null;

    // Permanent, stacking and never wasted — the first thing off cooldown every time.
    if (skin !== 'q' && (aiState.npcRuinDecayStacks ?? 0) < 10) {
      if (this.castAbility('ruin-decay', buildContext(aimX, aimY))) return 'ruin-decay';
    }

    // The ring is worn rather than thrown, so it only ever pays when the target is already
    // close enough that walking out of 122px in two seconds is a real decision.
    if (skin !== 'f' && !skipSpecials && !aiState.npcRuinRingUp && dist < 170) {
      if (this.castAbility('ruin-spikes', buildContext(aimX, aimY))) return 'ruin-spikes';
    }

    // The skewer needs room to reach a wall with somebody on it — point blank it beaches
    // itself immediately and the ride is over before it starts.
    if (skin !== 'r' && !skipSpecials && !aiState.npcRuinSkewerOut && dist > 90 && dist < 520) {
      if (this.castAbility('ruin-skewer', buildContext(aimX, aimY))) return 'ruin-skewer';
    }

    if (skin !== 'e' && !skipSpecials && aiState.npcRuinCanLock && dist < 440) {
      if (this.castAbility('ruin-lockdown', buildContext(aimX, aimY))) return 'ruin-lockdown';
    }

    if (this.castAbility('ruin-shred', buildContext(aimX, aimY))) return 'ruin-shred';
    return null;
  }

  /**
   * Devotion. Nothing it does deals damage, so the usual trading questions don't apply. Every
   * synergy is published by PassionKit as a cast point and checked first; the generic rotation
   * underneath only fills gaps.
   */
  private doPassionAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void time;
    void hpRatio;
    if (aiState.npcDevotionRiding) return null;
    const op = aiState.npcDevotion;
    const faith = aiState.npcDevotionFaith ?? 0;
    const water = aiState.npcDevotionWaterCharges ?? 0;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    // Mastery: the key the Ark was bound over is the kit's now.
    const ark = aiState.npcDevotionArkSlot;

    // ── Synergies first ──
    // Level with the target: the chariot runs them over and carries the bot down onto them.
    if (ark !== 'q' && op?.ascendNow && !skipSpecials) {
      if (this.castAbility('passion-ascendance', buildContext(target.x, target.y))) return 'passion-ascendance';
    }
    // Up close the crucifix is a sanctuary on its own feet; at range it is a wall that taxes shots.
    if (ark !== 'f' && op?.crucifixPoint && !skipSpecials) {
      const c = op.crucifixPoint;
      if (this.castAbility('passion-crucifix', buildContext(c.x, c.y))) return 'passion-crucifix';
    }
    // A target pinned in holy water or on the crucifix's rim cannot leave the blast.
    if (ark !== 'r' && op?.grenadePoint && !skipSpecials) {
      const g = op.grenadePoint;
      if (this.castAbility('passion-grenade', buildContext(g.x, g.y))) return 'passion-grenade';
    }
    if (op?.waterPoint && water > 0) {
      const w = op.waterPoint;
      if (this.castAbility('passion-holy-water', buildContext(w.x, w.y))) return 'passion-holy-water';
    }

    // ── Generic rotation ──
    if (ark !== 'r' && !skipSpecials && dist < 360 && faith >= 0.25) {
      if (this.castAbility('passion-grenade', buildContext(aimX, aimY))) return 'passion-grenade';
    }
    if (this.castAbility('passion-sermon', buildContext(aimX, aimY))) return 'passion-sermon';
    return null;
  }

  /**
   * Conquest. Almost none of the element's decision-making is here — ConquestKit runs the whole
   * economy, chooses what to build and where, buys its own upgrade paths and marches its own
   * soldiers, because all of that is board state the AI routine has no view of.
   *
   * What is left is the two things only `castAbility` can do: convert an arrived-at build site
   * into an actual placement, and throw the pike the rest of the time. `npcConquestReady` is
   * already the kit's answer to "is this legal right now", so nothing here re-checks cost or
   * ownership — a refusal at this point would burn the cooldown for nothing.
   */
  private doConquestAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    void hpRatio;

    // The build it walked across the board for outranks everything: the square is only free
    // for as long as nobody else stands on it.
    const ready = aiState.npcConquestReady;
    if (ready) {
      const id = ready === 'expansion' ? 'conquest-expansion' : `conquest-${ready}`;
      if (this.castAbility(id, buildContext(aimX, aimY))) return id;
    }

    // The pike is the only thing left, and it is a poke — there is no reason to hold it, but
    // also no reason to swing it at nothing.
    if (dist < 300) {
      if (this.castAbility('conquest-banner', buildContext(aimX, aimY))) return 'conquest-banner';
    }
    return null;
  }

  /**
   * Depths. Two of its five abilities want the AI to *stop*, which no other element asks for:
   * Angler only progresses while the body is still, and the passive only pays out once the
   * fade has finished. Both are handled inside DepthsKit — this routine's job is to not throw
   * them away, which is why every branch below bails while the line is out.
   *
   * The rest is ordinary: the shark opens, the strike starts the drowning clock, the bloom is
   * spent when it is actually worth HP, and the piranha is the filler until the target already
   * has its five.
   */
  private doDepthsAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // Fishing is a three-second commitment; casting anything else would be spending the
    // stillness it is paying for on nothing.
    if (aiState.npcDepthsFishing) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    // Depths Mastery: the kraken's own press is made kit-side (enhancement ids are not in
    // `element.abilities`, so there is nothing here for `castAbility` to find). All this
    // routine has to know is which base ability the bind took away.
    const kraken = aiState.npcDepthsKrakenSlot;

    // Drowning outranks everything — the movement pass is already sprinting for the puddle,
    // and the only thing worth doing on the way is chewing.
    if (aiState.npcDepthsDrowning) {
      if ((aiState.npcDepthsTargetLatches ?? 0) < 5
        && this.castAbility('depths-piranha', buildContext(aimX, aimY))) return 'depths-piranha';
      return null;
    }

    // ── Mastery synergies, ahead of the ordinary rotation ──
    // Both of these spend the same key, and the meal comes first: fifty health while hurt is
    // worth more than a drowning that is about to be interrupted by dying.
    if (kraken !== 'e' && !skipSpecials) {
      const meal = aiState.npcDepthsSkeleMeal;
      if (meal && this.castAbility('depths-lungfish', buildContext(meal.x, meal.y))) {
        return 'depths-lungfish';
      }
      // A body a tentacle is holding cannot dodge the slash, and the slash is what buys the
      // drown — this is the whole reason the kraken is worth a slot.
      const held = aiState.npcDepthsKrakenStun;
      if (held && this.castAbility('depths-lungfish', buildContext(held.x, held.y))) {
        return 'depths-lungfish';
      }
    }

    // The shark is an opener when the target is out in the open, and an answer when it isn't.
    if (kraken !== 'q' && !aiState.npcDepthsSharkOut && !skipSpecials
      && dist < 560 && (hpRatio < 0.7 || dist > 200)) {
      if (this.castAbility('depths-megalodon', buildContext(aimX, aimY))) return 'depths-megalodon';
    }

    // The whole ability now rides on the slash connecting, so this has to be inside the
    // blade's actual reach (96px of dash plus the dash's own travel) rather than "nearby" —
    // a whiff costs sixteen seconds and starts nothing.
    if (kraken !== 'e' && !skipSpecials && dist < 120) {
      if (this.castAbility('depths-lungfish', buildContext(aimX, aimY))) return 'depths-lungfish';
    }

    // The bloom heals both sides, so it is only ever worth casting from behind — unless the
    // mastery has finished fading the bot out, in which case every orb it walks over becomes a
    // trap on the way past, and the bloom is worth planting at any health at all.
    if (kraken !== 'r' && !skipSpecials && (hpRatio < 0.65 || (aiState.npcDepthsCamoed && hpRatio < 0.98))) {
      if (this.castAbility('depths-eutrophication', buildContext(aimX, aimY))) return 'depths-eutrophication';
    }

    // Fishing is only affordable out of reach — three seconds standing still inside 250px is
    // a gift. The kit freezes the body and throws the catch on its own, and aims that throw at
    // its own kraken whenever there is a stump to grow back.
    // While invisible the line is worth casting from much closer: nothing can aim at the bot at
    // all, and the two fish on the far side of the fade are the reason to be hidden.
    const anglerRange = aiState.npcDepthsCamoed ? 140 : 280;
    if (!aiState.npcDepthsHasFish && !skipSpecials && dist > anglerRange && hpRatio > 0.4) {
      if (this.castAbility('depths-angler', buildContext(aimX, aimY))) return 'depths-angler';
    }

    if ((aiState.npcDepthsTargetLatches ?? 0) < 5) {
      if (this.castAbility('depths-piranha', buildContext(aimX, aimY))) return 'depths-piranha';
    }
    return null;
  }

  /**
   * Illusion. The element has almost no sustained damage, so the AI's job is to keep the two
   * things that *do* pay — the bullet and the crack it leaves — landing while it is somewhere
   * the player isn't. Relocate is therefore spent as an escape rather than an opener, and so is
   * Guise — a clone to chase is the best answer to being chased. While the clone is out the
   * only job is the click, and the Re-Trick swap (F+) is read off the kit first.
   */
  private doIllusionAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    // Mastery: whichever key Masquerade was bound over is no longer that ability. The mask is
    // put on by IllusionKit rather than decided here — see the note on `npcIllusionMaskSlot`.
    const masked = aiState.npcIllusionMaskSlot ?? null;

    // Synergy: Guise → Re-Trick. The kit says when the swap is worth it; the recast skips
    // `castAbility` because the cooldown is already running from the Guise itself.
    if (aiState.npcIllusionRetrick && masked !== 'f') {
      buildContext(aimX, aimY).illusionRetrick();
      return null;
    }
    // Synergy: Dance → Relocate. With Bomb Dance every teleport mid-Dance is a volley, so the
    // escape hatch becomes the attack. The kit holds it back while a pane is there to walk
    // through first, because Duplication doubles the volley.
    if (aiState.npcIllusionDanceBombs && masked !== 'r') {
      if (this.castAbility('illusion-relocate', buildContext(aimX, aimY))) return 'illusion-relocate';
    }
    // Hidden behind the clone, every special would only be noise. Keep the bullets coming.
    if (aiState.npcIllusionGuised) {
      if (this.castAbility('illusion-crack-shot', buildContext(aimX, aimY))) return 'illusion-crack-shot';
      return null;
    }

    // Twenty seconds of bullets passing through is the answer to being caught, so it is
    // spent on being caught — and while it runs, everything else is just the click.
    if (masked !== 'q' && !aiState.npcIllusionDancing && !skipSpecials && (hpRatio < 0.45 || dist < 140)) {
      if (this.castAbility('illusion-dance', buildContext(aimX, aimY))) return 'illusion-dance';
    }

    // Guise is the other way out: being found up close, or getting low, is when a clone to
    // chase is worth the most. It also pays back a fifth of whatever the player wastes on it.
    if (masked !== 'f' && !skipSpecials && !aiState.npcIllusionDancing && (dist < 200 || hpRatio < 0.55)) {
      if (this.castAbility('illusion-guise', buildContext(aimX, aimY))) return 'illusion-guise';
    }

    // Relocate is an escape hatch. Mid-dance it is redundant — the dance hops on its own.
    if (masked !== 'r' && !aiState.npcIllusionDancing && !skipSpecials && dist < 170 && hpRatio < 0.8) {
      if (this.castAbility('illusion-relocate', buildContext(aimX, aimY))) return 'illusion-relocate';
    }

    // The pane goes up between us, and it is worth most when there is a gap for a shot to
    // cross before it arrives.
    if (masked !== 'e' && !skipSpecials && !aiState.npcIllusionHasVeil && dist > 170) {
      if (this.castAbility('illusion-veil', buildContext(aimX, aimY))) return 'illusion-veil';
    }


    // The bullet is the filler — and at range a miss still cracks off the wall for half.
    if (this.castAbility('illusion-crack-shot', buildContext(aimX, aimY))) return 'illusion-crack-shot';
    return null;
  }

  /**
   * Magma. The element's economy is that its own volcano is charged by its own attacks, so this
   * AI has a second aim point: `npcMagmaChargeTarget`. Whenever there is a vessel with room left
   * in it, the cheap abilities fire at *that* instead of at the player, which is how a volcano
   * ever reaches 100.
   *
   * The pirate half has three synergies the kit publishes and this routine spends first: a
   * broadside into its own volcano next to the player (`npcMagmaCannonVolcano`), a Blunder-Boil
   * fired while the gauge is hot enough that the recoil flight is itself a hit, and an
   * overpressured gun that is only ever vented point blank, so the 35 it costs the bot lands on
   * somebody too. At the helm the click is cannons and nothing else is pressed — F would throw
   * it off its own ship.
   */
  private doMagmaAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const charge = aiState.npcMagmaChargeTarget;
    // Magma Mastery: the saw is cast by the kit off a private timer (enhancement ids are not in
    // `element.abilities`, so there is nothing here for `castAbility` to find). All this routine
    // owes it is the slot it took, and the good sense not to pile casts on top of a live saw.
    const sawSlot = aiState.npcMagmaSawSlot;
    if (aiState.npcMagmaSawOut) return null;

    // ── At the helm ──
    if (aiState.npcMagmaMounted) {
      // Synergy: a volcano of its own beside the player goes critical on the first round.
      const lit = aiState.npcMagmaCannonVolcano;
      if (lit && this.castAbility('magma-plume', buildContext(lit.x, lit.y))) return 'magma-plume';
      if (dist < 440 && this.castAbility('magma-plume', buildContext(aimX, aimY))) return 'magma-plume';
      // A volcano placed under the player from the deck is the next broadside's fuse.
      if (!skipSpecials && sawSlot !== 'e' && (aiState.npcMagmaVolcanoes ?? 0) < 2 && dist < 380) {
        if (this.castAbility('magma-volcano', buildContext(aimX + (Math.random() - 0.5) * 40, aimY + (Math.random() - 0.5) * 40))) return 'magma-volcano';
      }
      return null;
    }

    // ── The pendant: on early, while there is a whole fight to pay for the ship with ──
    if (!skipSpecials && sawSlot !== 'q' && !aiState.npcMagmaPendant && !aiState.npcMagmaShip && hpRatio > 0.3) {
      if (this.castAbility('magma-mutiny', buildContext(this.x, this.y))) return 'magma-mutiny';
    }

    // ── Blunder-Boil ──
    const charges = aiState.npcMagmaBlunderCharges ?? 0;
    const pressure = aiState.npcMagmaGaugePressure ?? 0;
    if (sawSlot !== 'f' && charges > 0) {
      if (aiState.npcMagmaGaugeOver) {
        // Synergy: an overpressured gun bursts on the bot as well, so it is only ever vented
        // with the player inside the same 120px.
        if (dist < 110 && this.castAbility('magma-blunder', buildContext(aimX, aimY))) return 'magma-blunder';
      } else if (pressure >= 0.6 && dist < 150) {
        // Synergy: hot enough that the recoil is a second hit. Aim *away* from the player, so
        // the flight goes through them.
        const ax = this.x - (aimX - this.x);
        const ay = this.y - (aimY - this.y);
        if (this.castAbility('magma-blunder', buildContext(ax, ay))) return 'magma-blunder';
      } else if (!skipSpecials && (dist < 140 || (hpRatio < 0.4 && dist < 200))) {
        // Point blank, or hurt and close: the cone hits them and the recoil leaves.
        if (this.castAbility('magma-blunder', buildContext(aimX, aimY))) return 'magma-blunder';
      } else if (!skipSpecials && charge && pressure < 0.6 && charges >= 2
        && Phaser.Math.Distance.Between(this.x, this.y, charge.x, charge.y) < 130) {
        // A spare charge across its own volcano is 15 pressure and a free step back.
        if (this.castAbility('magma-blunder', buildContext(charge.x, charge.y))) return 'magma-blunder';
      }
    }

    // A free block is worth having up before it is needed, not after.
    if (!skipSpecials && sawSlot !== 'r' && !aiState.npcMagmaBloat && (dist < 300 || hpRatio < 0.7)) {
      if (this.castAbility('magma-bloat', buildContext(aimX, aimY))) return 'magma-bloat';
    }

    // Volcanoes go between us: close enough to the player that the lava is in the way, close
    // enough to the AI that its own plumes and cones can still reach up and charge it.
    if (!skipSpecials && sawSlot !== 'e' && (aiState.npcMagmaVolcanoes ?? 0) < 2) {
      const toX = aimX - this.x;
      const toY = aimY - this.y;
      const len = Math.hypot(toX, toY) || 1;
      const reach = Math.min(110, len * 0.5);
      const vx = this.x + (toX / len) * reach + (Math.random() - 0.5) * 50;
      const vy = this.y + (toY / len) * reach + (Math.random() - 0.5) * 50;
      if (this.castAbility('magma-volcano', buildContext(vx, vy))) return 'magma-volcano';
    }

    // Plume: at the vessel if there is one with room in it, otherwise at the player.
    const px = charge ? charge.x : aimX;
    const py = charge ? charge.y : aimY;
    if (charge || dist < 380) {
      if (this.castAbility('magma-plume', buildContext(px, py))) return 'magma-plume';
    }
    return null;
  }

  /**
   * Chalk. Only one drawing window can be open at a time and opening a second throws away
   * whatever the first had drawn, so every decision here is gated on `npcChalkDrawing` —
   * the AI commits to a stroke and lets it finish. Beyond that the order is simply cost:
   * the ward is free and constant, the fuse is worth laying at range, the blue line goes
   * down once and stays, and the shield and the Masterpiece are held for trouble.
   */
  /**
   * Wax. The kit is an economy: candles make bees live longer, hives turn bees into more bees,
   * bombs cash both in. So the rotation is build first (a candle at its feet, a hive between
   * them), feed the hive with Swarm, walk back to it when it is worth something, and spend the
   * bombs on a target that is already soft. The kit presses the two keys a bot cannot — the
   * detonation and the redemption — on its own clocks.
   */
  private doWaxAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void hpRatio;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const ranged = !!aiState.npcWaxRangedClick;
    const inReach = dist < 200;

    // ── Synergy: feed the hive ──
    // Bees fired through an own hive with room are stored and come back five to one. The
    // hive sits between the fighters, so most of a cone fired at it reaches the target anyway.
    if (aiState.waxHiveFeedPoint) {
      const h = aiState.waxHiveFeedPoint;
      if (this.castAbility('wax-swarm', buildContext(h.x, h.y))) return 'wax-swarm';
    }

    // ── Synergy: a poisoned target is a softer target ──
    // Every bee bites for one more against poison, and the vulnerability stacks with each bee.
    if (aiState.npcWaxTargetPoisoned && dist < 420) {
      if (this.castAbility('wax-swarm', buildContext(this.leadX, this.leadY))) return 'wax-swarm';
    }

    // Strapped bombs: nothing else is worth a press until they go off (the kit detonates).
    if (aiState.npcWaxSelfBombs) return null;

    if (!skipSpecials) {
      // A candle at its own feet once the fight is close enough that it will be fought in the
      // light: armour now, and longer bees later. Planted far away it would only pull the bot
      // out of the fight.
      if (!aiState.npcWaxInCandle && (aiState.npcWaxCandles ?? 0) < 2 && dist < 260) {
        if (this.castAbility('wax-candle-mount', buildContext(this.x, this.y))) return 'wax-candle-mount';
      }
      // A hive between the fighters, where the next Swarm will pass through it.
      if ((aiState.npcWaxHives ?? 0) === 0 && dist > 120) {
        const f = Math.min(0.45, 150 / Math.max(1, dist));
        if (this.castAbility('wax-hive-hearth', buildContext(this.x + (target.x - this.x) * f, this.y + (target.y - this.y) * f))) return 'wax-hive-hearth';
      }
      // Bombs want a lane short enough to stick.
      if ((aiState.npcWaxBombsOut ?? 0) === 0 && dist < 380 && !aiState.npcWaxBombLaneBlocked) {
        if (this.castAbility('wax-sticky-bombs', buildContext(this.leadX, this.leadY))) return 'wax-sticky-bombs';
      }
      if (dist < 430) {
        if (this.castAbility('wax-swarm', buildContext(this.leadX, this.leadY))) return 'wax-swarm';
      }
    }

    // The foil: in reach, or at any range with the dart upgrade.
    if (inReach || (ranged && dist < 600)) {
      if (this.castAbility('wax-stinger-strikes', buildContext(aimX, aimY))) return 'wax-stinger-strikes';
    }
    return null;
  }

  /**
   * Clay. The golem is the weapon and it walks to the target by itself, so the rotation is
   * mostly about *when*: Slam when the golem is standing on someone, Clot when shots are in
   * the air, Slink to cross a big gap and spend three barrages, Fuse when the fight has gone
   * wrong (or very right). The kit presses the two keys a bot has no finger for — the split
   * and the drop off the wall — on its own clocks.
   */
  private doClayAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    if (aiState.npcClayFusing) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const gone = aiState.npcClayGiveLifeSlot;

    // ── Synergy: shots in the air ──
    // A clot drawn into incoming fire stops it, and with Protector throws it back as shards.
    if ((aiState.npcClayShotsIncoming ?? 0) >= 2 && (aiState.npcClayShieldPieces ?? 0) < 8 && gone !== 'r') {
      if (this.castAbility('clay-clot', buildContext(aimX, aimY))) return 'clay-clot';
    }

    // ── Synergy: the golem is standing on them ──
    if (aiState.npcClayGolemOnTarget) {
      if (this.castAbility('clay-slam', buildContext(aimX, aimY))) return 'clay-slam';
    }

    if (aiState.npcClayFused) {
      // Fused: everything comes from the body, so close the gap with the dash and keep swinging.
      if (!skipSpecials && dist > 170 && gone !== 'f') {
        if (this.castAbility('clay-slink', buildContext(aimX, aimY))) return 'clay-slink';
      }
      if (dist < 360 && gone !== 'e') {
        if (this.castAbility('clay-rupture', buildContext(aimX, aimY))) return 'clay-rupture';
      }
      if (dist < 150) {
        if (this.castAbility('clay-slam', buildContext(aimX, aimY))) return 'clay-slam';
      }
      return null;
    }

    if (aiState.npcClaySlinking) {
      // On the wall the click is the barrage; the kit drops it off once the three are spent.
      if ((aiState.npcClaySlinkBursts ?? 0) > 0) {
        if (this.castAbility('clay-slam', buildContext(aimX, aimY))) return 'clay-slam';
      }
      return null;
    }

    if (!skipSpecials) {
      // Fuse is the answer to losing, and the way to finish winning.
      if (gone !== 'q' && (hpRatio < 0.45 || (hpRatio > 0.7 && target.hp / target.maxHp < 0.35))) {
        if (this.castAbility('clay-fuse', buildContext(aimX, aimY))) return 'clay-fuse';
      }
      // A shield before the trouble arrives, while it is cheap to draw.
      if (gone !== 'r' && (aiState.npcClayShieldPieces ?? 0) === 0 && (dist < 320 || hpRatio < 0.7)) {
        if (this.castAbility('clay-clot', buildContext(aimX, aimY))) return 'clay-clot';
      }
      // A big gap is what the wall run is for.
      if (gone !== 'f' && dist > 300) {
        if (this.castAbility('clay-slink', buildContext(aimX, aimY))) return 'clay-slink';
      }
      if (gone !== 'e' && dist < 360) {
        if (this.castAbility('clay-rupture', buildContext(aimX, aimY))) return 'clay-rupture';
      }
    }
    if (dist < 420) {
      if (this.castAbility('clay-slam', buildContext(aimX, aimY))) return 'clay-slam';
    }
    return null;
  }

  private doChalkAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    // Mid-stroke: hands are busy. The kit is already driving the phantom cursor.
    if (aiState.npcChalkDrawing || aiState.npcChalkMasterpiece) return null;

    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    // Chalk Mastery: whichever key Living Chalk was bound over is not this bot's to spend. The
    // kit casts the enhancement itself off a private timer.
    const taken = aiState.npcChalkLivingSlot ?? null;

    // Eight seconds of untouchable is the answer to losing, so it is spent on losing.
    if (!skipSpecials && taken !== 'q' && hpRatio < 0.4) {
      if (this.castAbility('chalk-masterpiece', buildContext(aimX, aimY))) return 'chalk-masterpiece';
    }

    // The shield is worth having up whenever something is close enough to be stopped by it.
    if (!skipSpecials && taken !== 'f' && (aiState.npcChalkShieldHp ?? 0) <= 0 && (dist < 260 || hpRatio < 0.65)) {
      if (this.castAbility('chalk-shield', buildContext(aimX, aimY))) return 'chalk-shield';
    }

    // The blue line is drawn between us, so closing the gap means walking over it.
    if (!skipSpecials && taken !== 'r' && aiState.npcChalkMayPerma) {
      if (this.castAbility('chalk-perma', buildContext(aimX, aimY))) return 'chalk-perma';
    }

    // The fuse needs the three seconds it takes to draw and burn, so it wants distance.
    if (!skipSpecials && taken !== 'e' && dist > 150) {
      if (this.castAbility('chalk-explosive', buildContext(aimX, aimY))) return 'chalk-explosive';
    }

    // The ward is the filler: short, cheap, and scribbled straight onto their feet.
    if (dist < 420) {
      if (this.castAbility('chalk-ward', buildContext(aimX, aimY))) return 'chalk-ward';
    }
    return null;
  }

  /**
   * Dream. Two games, decided by where the bot is standing.
   *
   * Out here it is a bedtime: pillow and dagger put the target under without hurting them, the
   * Sandmen shoot only while they are awake (a hit wakes a sleeper), and once they are asleep
   * the bot tops the meter up and walks over to Delve. In the dream it fights with the dream
   * versions — the leech, the claw, the pistols, a Nightmare with its stalker — and surfaces to
   * top the meter up again once too little of it is left to be worth staying.
   */
  private doDreamAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    void time;
    const info = aiState.npcDream;
    if (!info) return null;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const cast = (id: string): string | null => (this.castAbility(id, buildContext(aimX, aimY)) ? id : null);

    if (info.inDream) {
      // Synergy: the dream runs on their drowsiness — surface, top it up, come back.
      if (info.shouldSurface) return cast('dream-delve');
      // Synergy: a dream Nightmare lets its stalker loose on top of the usual one.
      if (!skipSpecials && info.nightmareReady) { const c = cast('dream-nightmare'); if (c) return c; }
      if (!info.leechOut && dist < 480) { const c = cast('dream-sleep-tight'); if (c) return c; }
      if (dist < 110) { const c = cast('dream-pillow-fight'); if (c) return c; }
      if (info.canFire && dist < 520) return cast('dream-sandmen');
      return null;
    }

    if (info.targetAsleep) {
      // Synergy: a sleeper is tucked in, never shot. The pillow and the dagger both add to the
      // meter without hurting them, and every point of it is another fifth of a second of dream.
      if (info.targetDrowsy < 75) {
        if (dist < 100) { const c = cast('dream-pillow-fight'); if (c) return c; }
        const c = cast('dream-sleep-tight'); if (c) return c;
      }
      // Synergy: asleep and in reach — step into their dream.
      if (info.delveReady) return cast('dream-delve');
      return null;
    }

    // Synergy: the pillow's big dose only lands on a fresh meter, so it opens.
    if (info.pillowFresh && dist < 100) { const c = cast('dream-pillow-fight'); if (c) return c; }
    // The dagger is worth more the sleepier they already are, and a hit halves its cooldown.
    if (dist < 560) { const c = cast('dream-sleep-tight'); if (c) return c; }
    if (dist < 100) { const c = cast('dream-pillow-fight'); if (c) return c; }
    // Out here a Nightmare costs sleep, so it is a finisher or a way out, not a rotation.
    if (!skipSpecials && info.nightmareReady && hpRatio < 0.4) { const c = cast('dream-nightmare'); if (c) return c; }
    if (info.canFire && dist < 520) return cast('dream-sandmen');
    return null;
  }

  /**
   * Justice. Two stances, so the first decision every tick is which one to be in: the
   * ground set is the bread and butter, and flight is taken when there is Willpower to
   * spare and something worth doing from the air.
   */
  private doJusticeAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const will = aiState.npcJusticeWill ?? 100;
    const flying = !!aiState.npcJusticeFlying;

    // ── Stance ──
    if (!skipSpecials && time > this.justiceNextStanceAt) {
      // Up when there is fuel and range to use it; down when the tank is low or the
      // fight has closed to spear distance.
      const wantFlight = will > 55 && dist > 220;
      if (wantFlight && !flying && this.castAbility('justice-flight', buildContext(aimX, aimY))) {
        this.justiceNextStanceAt = time + 4000;
        return 'justice-flight';
      }
      if (!wantFlight && flying && (will < 25 || dist < 160)) {
        if (this.castAbility('justice-descend', buildContext(aimX, aimY))) {
          this.justiceNextStanceAt = time + 4000;
          return 'justice-descend';
        }
      }
    }

    if (flying) {
      // A chain already hooked in wants pulling — the wall is the whole payoff.
      if (aiState.npcJusticeAnchored) {
        if (this.castAbility('justice-bind', buildContext(aimX, aimY))) return 'justice-bind';
      }
      if (!skipSpecials && this.castAbility('justice-seraphim', buildContext(aimX, aimY))) {
        return 'justice-seraphim';
      }
      // Drop the pillar between us and them, so they have to walk through it.
      if (!skipSpecials && dist > 200 && this.castAbility('justice-pillar', buildContext((this.x + aimX) / 2, aimY))) {
        return 'justice-pillar';
      }
      if (!skipSpecials && this.castAbility('justice-bind', buildContext(aimX, aimY))) return 'justice-bind';
      if (this.castAbility('justice-spear-throw', buildContext(aimX, aimY))) return 'justice-spear-throw';
      return null;
    }

    // ── Ground ──
    // Judgement Day is the closer: it only bites once they have actually hurt you.
    if (!skipSpecials && this.rawDamageTaken >= 100 && dist < 380) {
      if (this.castAbility('justice-judgement-day', buildContext(aimX, aimY))) return 'justice-judgement-day';
    }
    // Sheer Will while there is Willpower and the fight has actually started going badly.
    if (!skipSpecials && !aiState.npcJusticeSheer && will > 45 && (hpRatio < 0.8 || dist < 260)) {
      if (this.castAbility('justice-sheer-will', buildContext(aimX, aimY))) return 'justice-sheer-will';
    }
    // Coliseum: only worth raising when they are inside it with you.
    if (!skipSpecials && dist < 130) {
      if (this.castAbility('justice-coliseum', buildContext(aimX, aimY))) return 'justice-coliseum';
    }
    if (dist < 200 && this.castAbility('justice-stab', buildContext(aimX, aimY))) return 'justice-stab';
    return null;
  }

  /** Justice: the AI is not allowed to flicker between stances. */
  private justiceNextStanceAt = 0;

  private doSlimeAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target; void aiState;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Purge: a slow debuff ball, thrown occasionally at mid-range
    if (!skipSpecials && dist < 420 && (this.aiState === 'attack' || this.aiState === 'chase')) {
      if (this.castAbility('purge', buildContext(aimX, aimY))) {
        const ctx = buildContext(aimX, aimY);
        const dx = aimX - this.x;
        const dy = aimY - this.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 220;
        const proj = new Projectile(ctx.scene, this.x + (dx / len) * 32, this.y + (dy / len) * 32, 'proj-purge', 15, false);
        (proj as unknown as { purgeDurationMs: number }).purgeDurationMs = 3000;
        ctx.projectiles.add(proj);
        proj.launch((dx / len) * speed, (dy / len) * speed);
        return 'purge';
      }
    }

    // Default: a short barrage of acid whip lashes toward the player
    if (this.aiState === 'attack' || this.aiState === 'chase') {
      if (this.castAbility('poison-whip', buildContext(aimX, aimY))) {
        const ctx = buildContext(aimX, aimY);
        const dx = aimX - this.x;
        const dy = aimY - this.y;
        const baseAngle = Math.atan2(dy, dx);
        const speed = 550;
        const count = dist < 200 ? 8 : 5;
        for (let i = 0; i < count; i++) {
          ctx.scene.time.delayedCall(i * 25, () => {
            if (!this.active || this.hp <= 0) return;
            const jitter = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-6, 6));
            const ang = baseAngle + jitter;
            const proj = new Projectile(ctx.scene, this.x + Math.cos(ang) * 32, this.y + Math.sin(ang) * 32, 'proj-acid-whip', 1, false);
            ctx.projectiles.add(proj);
            proj.launch(Math.cos(ang) * speed, Math.sin(ang) * speed);
            proj.setRotation(ang);
          });
        }
        return 'poison-whip';
      }
    }
    return null;
  }

  private doFateAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const hand = aiState.fateNpcHandTypes ?? [];
    const attackTypes = ['laser', 'burst', 'barrier', 'explosion', 'infect', 'lightning'];

    if (!skip) {
      // 1. Enchant a strong attack card occasionally
      if (hand.some((t) => ['explosion', 'lightning', 'barrier'].includes(t)) && Math.random() < 0.15) {
        if (this.castAbility('fate-enchant', buildContext(this.x, this.y))) return 'fate-enchant';
      }

      // 2. All In when desperate or opportunistic and in range
      if ((hpRatio < 0.30 || Math.random() < 0.08) && dist < 300) {
        if (this.castAbility('fate-all-in', buildContext(aimX, aimY))) return 'fate-all-in';
      }

      // 3. Reroll a hand with no attack cards
      if (hand.length > 0 && !hand.some((t) => attackTypes.includes(t))) {
        if (this.castAbility('fate-reroll', buildContext(this.x, this.y))) return 'fate-reroll';
      }
    }

    // 4. Throw a card as the primary attack
    if (hand.length > 0 && (this.aiState === 'attack' || this.aiState === 'chase')) {
      if (this.castAbility('fate-card-throw', buildContext(aimX, aimY))) return 'fate-card-throw';
    }

    return null;
  }

  // suppress unused import warning — slimeElement is referenced via side-effect import for tree-shaking protection
  private _slimeRef = slimeElement.id;

  private doElectricityAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target; void aiState;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // Electro Dash — gap close when far (no-op cast, just for cooldown pacing)
      if (dist > 220) {
        if (this.castAbility('electro-dash', buildContext(aimX, aimY))) return 'electro-dash';
      }
    }

    // Default: Electro Ball
    if (this.aiState === 'attack' || this.aiState === 'chase') {
      if (this.castAbility('electro-ball', buildContext(aimX, aimY))) return 'electro-ball';
    }
    return null;
  }

  /**
   * The drum major. The kit keeps the bot's metronome and steers its baton at the player, so the
   * rotation here is the four keys. The one synergy — Fermata puts the target out of tune, and
   * the free recast detonates it — is read first, off the kit's `npcSoundDetonate`.
   */
  private doSoundAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void aimX;
    void aimY;
    // On stage the kit is playing the solo; nothing else can be pressed.
    if (aiState.npcSoundSoloing) return null;

    // ── R+ synergy: cash the Harmony recast at the regeneration's peak. Free, never skipped.
    if (aiState.npcSoundHarmonyRelease) {
      buildContext(target.x, target.y).soundCast('harmony-release', target.x, target.y);
      return null;
    }

    // ── Synergy: detonate the Out of Tune the last slam left. Free, so it is never skipped.
    if (aiState.npcSoundDetonate) {
      buildContext(target.x, target.y).soundCast('fermata-detonate', target.x, target.y);
      return null;
    }

    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    if (skipSpecials) return null;

    // ── R+ synergy: the kit has brought the baton home — R now tunes up instead of slamming.
    if (aiState.npcSoundHarmonyReady && this.castAbility('fermata', buildContext(target.x, target.y))) return 'fermata';

    // Hum until the song matches what the kit wants for the moment.
    if (aiState.npcSoundWantedSong && aiState.npcSoundWantedSong !== aiState.npcSoundSong
      && this.castAbility('hum', buildContext(target.x, target.y))) return 'hum';

    // ── Q+ aftermath: deaf after the gong, nothing would land — keep the cooldowns for later.
    if (aiState.npcSoundDeaf) return null;

    // ── E+ synergy: the player is dancing and cannot hit back — close in and slam.
    if (aiState.npcSoundVictimDancing && dist < 320
      && this.castAbility('fermata', buildContext(target.x, target.y))) return 'fermata';

    // Call of the Void — the solo hits wherever they are, so it is worth playing whenever it is up.
    if (this.castAbility('call-of-the-void', buildContext(target.x, target.y))) return 'call-of-the-void';

    // Fermata — dash to the baton and slam, when the target is near the baton's reach.
    if (dist < 230 && this.castAbility('fermata', buildContext(target.x, target.y))) return 'fermata';

    // Crescendo — dance in close so the wave lands at the end of it.
    if (dist < 260 && this.castAbility('crescendo', buildContext(target.x, target.y))) return 'crescendo';
    return null;
  }

  private doFireAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Synergy first — Alcohol → Pressure Bomb: the target is wading in the bot's booze, so a
    // charge on the puddle sets it alight under them. The kit owns the geometry.
    if (aiState.npcFireBoozeBombAt) {
      const at = aiState.npcFireBoozeBombAt;
      if (this.castAbility('pressure-bomb', buildContext(at.x, at.y))) return 'pressure-bomb';
    }

    if (!skipSpecials) {
      // 1. Ultimate. Supernova (alternate Q) is a rooted beam that turns slowly, so it wants a
      //    target already in its reach and the health to sit in the heat; the kit lets go for
      //    the bot if it drops low. Flame Nuke wants close range and decent HP.
      if (this.element.abilities.some((a) => a.id === 'supernova')) {
        if (hpRatio > 0.55 && dist > 90 && dist < 400) {
          if (this.castAbility('supernova', buildContext(aimX, aimY))) return 'supernova';
        }
      } else if (hpRatio > 0.50 && dist < 260) {
        if (this.castAbility('flame-nuke', buildContext(this.x, this.y))) return 'flame-nuke';
      }

      // 2. Pressure Bomb — mid range. The charge sits on a 1.5s fuse, so it is planted where
      //    the target is heading rather than where they stand; sharper NPCs lead it further.
      if (dist >= 140 && dist <= 360) {
        const tb = target.body as Phaser.Physics.Arcade.Body | null;
        const lead = 1.5 * (this.difficulty.level / 5) * 0.8;
        const leadX = aimX + (tb?.velocity.x ?? 0) * lead;
        const leadY = aimY + (tb?.velocity.y ?? 0) * lead;
        if (this.castAbility('pressure-bomb', buildContext(leadX, leadY))) return 'pressure-bomb';
      }

      // 3. Flame Dash — gap-close when far
      if (dist > 220) {
        if (this.castAbility('flame-dash', buildContext(aimX, aimY))) return 'flame-dash';
      }

      // 4. Flame Body toggle — Nightmare only
      if (this.difficulty.level >= 5) {
        const wantsFlameBody = hpRatio > 0.30;
        if (wantsFlameBody !== aiState.flameBodyActive && time - this.lastFlameBodyToggle > 2500) {
          if (this.castAbility('flame-body', buildContext(this.x, this.y))) {
            this.lastFlameBodyToggle = time;
            return 'flame-body';
          }
        }
      }
    }

    // Default: Fireball
    if ((this.aiState === 'attack' || this.aiState === 'chase') && !aiState.npcFireNoClick) {
      if (this.castAbility('fireball', buildContext(aimX, aimY))) return 'fireball';
    }

    return null;
  }

  private doWaterAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Pain Rain — medium range, decent HP
      if (dist < 380 && hpRatio > 0.25) {
        if (this.castAbility('pain-rain', buildContext(aimX, aimY))) return 'pain-rain';
      }

      // 2. Pressure Dagger — medium range (fires uncharged, level 0)
      if (dist < 320) {
        if (this.castAbility('pressure-dagger', buildContext(aimX, aimY))) return 'pressure-dagger';
      }

      // 3. Splash — close range
      if (dist < 280) {
        if (this.castAbility('splash', buildContext(aimX, aimY))) return 'splash';
      }

      // 4. Geyser — self buff when none active
      if (!aiState.hasActiveGeyser) {
        if (this.castAbility('geyser', buildContext(this.x, this.y))) return 'geyser';
      }
    }

    // Default: Water Cut
    if (this.castAbility('water-cut', buildContext(aimX, aimY))) return 'water-cut';

    return null;
  }

  private doLifeAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    // Don't use abilities while dragging — focus on the drag
    if (aiState.thornDragActive) return null;

    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Synergy — Root Shield the plant the enemy is chewing through.
      const shield = aiState.npcLifeShieldAt;
      if (shield && this.castAbility('thorns', buildContext(shield.x, shield.y))) return 'thorns';

      // 2. Synergy — Fertilize when the wave would catch two or more of its own plants.
      if (aiState.npcLifeFertilize && this.castAbility('grow', buildContext(this.x, this.y))) return 'grow';

      // 3. Plant whatever the kit's plan calls for (Helicopter when pressed, a Sprout in range,
      //    a Pitcher among its attackers, a Lotus when hurt, else the missing seed).
      const at = aiState.npcLifePlantAt;
      if (at && this.castAbility('plant', buildContext(at.x, at.y))) return 'plant';

      // 4. Thrive! — close range, with a garden to hide behind.
      if (dist < 300 && hpRatio > 0.30 && aiState.plantCount >= 2) {
        if (this.castAbility('thorn-drag', buildContext(target.x, target.y))) return 'thorn-drag';
      }
    }

    // 5. Petal Shotgun default (uses offset aim)
    if (this.castAbility('petal-shotgun', buildContext(aimX, aimY))) return 'petal-shotgun';

    return null;
  }

  /**
   * The wind dancer's opponent brain. Air is now a dancer rather than a sniper, so the AI plays
   * it as one: close the gap, spin on contact (which pays its own cooldowns back), throw the
   * glaive at range, and save Wind Breaker for someone standing near enough to be swept up.
   */
  private doAirAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void time; void aimX; void aimY;
    // Already the weather — nothing else can be cast until the funnel opens.
    if (aiState.airTornadoActive) return null;

    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Wind Breaker — only worth it with the target already inside the funnel's reach.
      if (dist < 140) {
        if (this.castAbility('wind-breaker', buildContext(target.x, target.y))) return 'wind-breaker';
      }

      // 2. Spin Dance — the tempo engine. Thrown the moment the target is in the circle, since
      //    a connecting spin hands every other ability two seconds back.
      if (dist < 120) {
        if (this.castAbility('spin-dance', buildContext(target.x, target.y))) return 'spin-dance';
      }

      // 3. Gale Glaive — parked on the target at mid range, where it has time to grind.
      if (dist > 90 && dist < 520) {
        if (this.castAbility('gale-glaive', buildContext(target.x, target.y))) return 'gale-glaive';
      }

      // 4. Sky Grapple — closing tool when far, escape when hurt. Either way it banks dodge,
      //    which is the only defence air has.
      if (dist > 260) {
        if (this.castAbility('sky-grapple', buildContext(target.x, target.y))) return 'sky-grapple';
      } else if (hpRatio < 0.35 && aiState.airWindDodge < 0.3) {
        const away = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
        if (this.castAbility('sky-grapple', buildContext(
          this.x + Math.cos(away) * 260, this.y + Math.sin(away) * 260,
        ))) return 'sky-grapple';
      }
    }

    // 5. Wind Splice — the click. Always aimed true: the shear half misses on its own if the
    //    target is moving, so no artificial miss chance is needed on top.
    if (this.castAbility('wind-splice', buildContext(target.x, target.y))) return 'wind-splice';

    return null;
  }

  private doEarthAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    _aimX: number,
    _aimY: number,
    aiState: NpcAiState,
  ): string | null {
    // NPC Earth AI delegates heavy logic to EarthKit; it only signals which ability to use and
    // the kit reacts to the returned id.
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const hasShield = aiState.earthShieldHp > 0;

    // ── Synergy: a Quake on its own mountain is a rockfall ──
    // The ceiling only ever comes down for a Quake cast on a Mountain quarter the bot raised,
    // and the target is standing on one right now. Taken first, skip roll or not.
    if (aiState.earthMountainQuakePoint) {
      const p = aiState.earthMountainQuakePoint;
      if (this.castAbility('quake', buildContext(p.x, p.y))) return 'quake';
    }

    // ── Synergy: a spike in front of the plate is a shot ──
    // The kit turns this Bash into a launched spike; at any range it beats a melee swing.
    if (aiState.npcEarthSpikeReady) {
      if (this.castAbility('bash', buildContext(target.x, target.y))) return 'bash';
    }

    if (!skipSpecials) {
      // 1. Biome Builder — reshape the room once the fight is actually underway, so the twenty
      //    seconds of weather land on a fight rather than on an opening stand-off.
      if ((aiState.npcEarthBiomes ?? 0) === 0 && (hpRatio < 0.85 || dist < 260)) {
        if (this.castAbility('biome-builder', buildContext(target.x, target.y))) return 'biome-builder';
      }
      // 2. Quake — medium range
      if (dist < 250) {
        if (this.castAbility('quake', buildContext(target.x, target.y))) return 'quake';
      }
      // 3. Rock Dance — if no rocks active
      if (!aiState.npcEarthRocksActive) {
        if (this.castAbility('rock-dance', buildContext(target.x, target.y))) return 'rock-dance';
      }
      // 4. Repair — when shield broken or low
      if (!hasShield || aiState.earthShieldHp < 25) {
        if (this.castAbility('repair', buildContext(target.x, target.y))) return 'repair';
      }
    }

    // 5. Bash — close melee
    if (dist < 160) {
      if (this.castAbility('bash', buildContext(target.x, target.y))) return 'bash';
    }

    return null;
  }

  private doLightAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    // Light Lance (car-mode) is always active for an NPC playing Light — see LightKit.update().
    // NPC Light AI just decides when to cast the other 4 abilities; LightKit reacts to npcCastId.
    void target; void aiState;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // 1. Speed 'O' Light — ultimate escape/burst when hurt
      if (hpRatio < 0.5) {
        if (this.castAbility('speed-o-light', buildContext(aimX, aimY))) return 'speed-o-light';
      }
      // 2. Light Trick — close-range burst
      if (dist < 90) {
        if (this.castAbility('light-trick', buildContext(aimX, aimY))) return 'light-trick';
      }
      // 3. Prism Ramp — lay down hazards opportunistically
      if (this.castAbility('prism-ramp', buildContext(aimX, aimY))) return 'prism-ramp';
      // 4. Blink — reposition toward the target when not already close
      if (dist > 150) {
        if (this.castAbility('blink', buildContext(aimX, aimY))) return 'blink';
      }
    }

    return null;
  }

  private doOilAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const droneCount = aiState.oilDroneCount ?? 0;
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Tight aim for drone-command (10% of normal offset)
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.1 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Summon drones (up to 4)
      if (droneCount < 4) {
        if (this.castAbility('barrel-roll', buildContext(this.x, this.y))) return 'barrel-roll';
      }

      // 2. Command drones at player — sharp aim
      if (droneCount > 0 && dist < 400) {
        if (this.castAbility('drone-command', buildContext(sharpX, sharpY))) return 'drone-command';
      }

      // 3. Launch drone bomb when close
      if (droneCount > 0 && dist < 250) {
        if (this.castAbility('drone-destroy', buildContext(target.x, target.y))) return 'drone-destroy';
      }
    }

    // Default: command drones — sharp aim
    if (droneCount > 0 && dist < 400) {
      if (this.castAbility('drone-command', buildContext(sharpX, sharpY))) return 'drone-command';
    }

    return null;
  }

  private doShadowAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Tight aim for dark-drain (10% of normal offset)
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.1 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Tentacle Wall — grow a spiked wall toward the player from mid range
      if (dist > 90 && dist < 340) {
        if (this.castAbility('tentacle-wall', buildContext(target.x, target.y))) return 'tentacle-wall';
      }

      // 2. Tentacle — extend toward player when in attack range
      if (dist < 280) {
        if (this.castAbility('tentacle', buildContext(target.x, target.y))) return 'tentacle';
      }

      // 3. Snap Trap — place at own feet occasionally
      if (dist < 200) {
        if (this.castAbility('snap-trap', buildContext(this.x, this.y))) return 'snap-trap';
      }

      // 4. Dark bomb — sharp aim
      if (dist < 400) {
        if (this.castAbility('dark-drain', buildContext(sharpX, sharpY))) return 'dark-drain';
      }
    }

    // Default: dark bomb — sharp aim
    if (dist < 500) {
      if (this.castAbility('dark-drain', buildContext(sharpX, sharpY))) return 'dark-drain';
    }

    return null;
  }

  private doIceAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Sharp aim for ice spike (15% of normal offset)
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.15 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    const playerFrostStacks = aiState.playerFrostStacks ?? 0;

    if (!skipSpecials) {
      // 1. Frozen Solid — highest priority, aim at player
      if (dist < 500) {
        if (this.castAbility('frozen-solid', buildContext(target.x, target.y))) return 'frozen-solid';
      }

      // 2. Frost Blast — if player has >= 2 frost stacks
      if (playerFrostStacks >= 2) {
        if (this.castAbility('frost-blast', buildContext(target.x, target.y))) return 'frost-blast';
      }

      // 3. Block Up — toggle on when low HP
      if (hpRatio < 0.55 && !aiState.iceBlockActive) {
        if (this.castAbility('block-up', buildContext(this.x, this.y))) return 'block-up';
      } else if (hpRatio >= 0.70 && aiState.iceBlockActive) {
        if (this.castAbility('block-up', buildContext(this.x, this.y))) return 'block-up';
      }

      // 4. Skate — escape when player is close
      if (dist < 200) {
        if (this.castAbility('skate', buildContext(this.x, this.y))) return 'skate';
      }
    }

    // Default: Ice Spike — sharp aim
    if (this.castAbility('ice-spike', buildContext(sharpX, sharpY))) return 'ice-spike';

    return null;
  }

  private doGrowthAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Sharp aim (15% offset) for click attacks
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.15 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Auxiliary Growth — once enough DNA is banked and no clone/nest yet.
      //    Plant the nest a short way off to the side, like a cursor drop.
      if ((aiState.npcGrowthDna ?? 0) >= 8 && !aiState.npcGrowthHasNestOrClone) {
        const nx = this.x + (Math.random() - 0.5) * 140;
        const ny = this.y + (Math.random() - 0.5) * 140;
        if (this.castAbility('auxiliary-growth', buildContext(nx, ny))) return 'auxiliary-growth';
      }

      // 2. Spore Spray — defensive wall between us and the target when hurt
      if (hpRatio < 0.6 && dist < 400) {
        if (this.castAbility('spore-spray', buildContext(sharpX, sharpY))) return 'spore-spray';
      }

      // 3. Virus — keep the infection ticking whenever the target is reachable
      if (dist < 520) {
        if (this.castAbility('growth-virus', buildContext(sharpX, sharpY))) return 'growth-virus';
      }
    }

    // Default: Bacterium
    if (this.castAbility('growth-click', buildContext(sharpX, sharpY))) return 'growth-click';

    return null;
  }

  private doSoulAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const corpses = aiState.npcSoulCorpseCount ?? 0;
    const amalgams = aiState.npcSoulAmalgamCount ?? 0;
    const graves = aiState.npcSoulGraveCount ?? 0;

    // Sharp aim (10% offset) for lantern placement
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.10 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    // Synergy — the kit says a charged beam would pierce two or more things on one line (or set
    // up a Soul Lord hemorrhage next to them). The kit runs the charge itself and fires when full.
    const beamAim = aiState.npcSoulBeamAim;
    if (beamAim && !skipSpecials && Math.random() < 0.08) buildContext(beamAim.x, beamAim.y).soulBeam(beamAim.x, beamAim.y);

    // Synergy — the kit says a Turn right now would steal the enemy's risen (or flip our own
    // grave zombies into Amalgams). Taking their crew is worth more than anything else on the bar.
    const turnValue = aiState.npcSoulTurnValue ?? 0;
    if (!skipSpecials && (turnValue >= 3 || (turnValue >= 2 && hpRatio < 0.6))) {
      if (this.castAbility('soul-turn', buildContext(this.x, this.y))) return 'soul-turn';
    }

    if (!skipSpecials) {
      // 1. Place a grave early if none are out yet.
      if (graves === 0) {
        const gx = this.x + (Math.random() - 0.5) * 140;
        const gy = this.y + (Math.random() - 0.5) * 140;
        if (this.castAbility('soul-grave', buildContext(gx, gy))) return 'soul-grave';
      }

      // 2. Arise whenever a corpse is queued and the cooldown is up.
      if (corpses > 0) {
        if (this.castAbility('soul-arise', buildContext(this.x, this.y))) return 'soul-arise';
      }

      // 4. Whistle amalgams back to heal them up.
      if (amalgams > 0 && hpRatio < 0.7 && Math.random() < 0.3) {
        if (this.castAbility('soul-death-whistle', buildContext(this.x, this.y))) return 'soul-death-whistle';
      }
    }

    // Synergy — a grave zombie is a corpse waiting to happen *and* a lantern kill (which is what
    // scales the lantern and unlocks Soul Lord). Burn our own down whenever the queue runs dry.
    const lanternTarget = aiState.npcSoulLanternTarget;
    if (lanternTarget && corpses < 2
      && this.castAbility('soul-lantern', buildContext(lanternTarget.x, lanternTarget.y))) return 'soul-lantern';

    // Default: wisps at the target — they fly to the aim point and on, so it is good at any range.
    if (dist < 520 && this.castAbility('soul-lantern', buildContext(sharpX, sharpY))) return 'soul-lantern';

    return null;
  }

  private doCrystalAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Sharp aim (10% offset) for laser
    const sharpOffsetRad = (Math.random() * 2 - 1) * (this.difficulty.aimOffsetDeg + (time < this.aimOffsetBonusUntil ? this.aimOffsetBonusDeg : 0)) * 0.10 * (Math.PI / 180);
    const sharpAngle = angleToTarget + sharpOffsetRad;
    const sharpX = this.x + Math.cos(sharpAngle) * dist;
    const sharpY = this.y + Math.sin(sharpAngle) * dist;

    if (!skipSpecials) {
      // 1. Trick of the Light — when low HP
      if (hpRatio < 0.55) {
        if (this.castAbility('crystal-trick', buildContext(this.x, this.y))) return 'crystal-trick';
      }

      // 2. Atune — when in range, stop/redirect shards in flight
      if (dist < 380) {
        if (this.castAbility('crystal-atune', buildContext(target.x, target.y))) return 'crystal-atune';
      }

      // 3. Place Crystal — build up to 3 nodes around NPC position
      if ((aiState.crystalNodeCount ?? 0) < 3) {
        const ox = (Math.random() - 0.5) * 130;
        const oy = (Math.random() - 0.5) * 130;
        if (this.castAbility('crystal-place', buildContext(this.x + ox, this.y + oy))) return 'crystal-place';
      }

      // 4. Portal — place occasionally
      if (this.castAbility('crystal-portal', buildContext(
        this.x + (Math.random() - 0.5) * 200,
        this.y + (Math.random() - 0.5) * 200,
      ))) return 'crystal-portal';
    }

    // Default: Laser Beam — sharp aim
    if (this.castAbility('crystal-laser', buildContext(sharpX, sharpY))) return 'crystal-laser';

    return null;
  }

  private doTimeAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    // Remain active: skip abilities (absorbing damage phase)
    if (aiState.npcTimeRemainActive) return null;

    if (!skipSpecials) {
      // Always Noon — when charged
      if (aiState.npcTimeTimelessReady) {
        if (this.castAbility('time-timeless', buildContext(this.x, this.y))) return 'time-timeless';
      }

      // Remain — activate when HP is low
      if (hpRatio < 0.40) {
        if (this.castAbility('time-remain', buildContext(this.x, this.y))) return 'time-remain';
      }

      // Bounty — when bounty >= 2 and no aura active
      const npcBounty = aiState.npcTimeBounty ?? 0;
      if (npcBounty >= 2 && !aiState.npcTimeBountyAuraActive) {
        if (this.castAbility('time-halt', buildContext(this.x, this.y))) return 'time-halt';
      }

      // Lasso — when at medium range
      if (dist > 80 && dist < 400) {
        if (this.castAbility('time-warp', buildContext(aimX, aimY))) return 'time-warp';
      }
    }

    // Revolver auto-fire handled in TimeKit.update
    return null;
  }

  private doHuntAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    _angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const inBeastForm = aiState.npcHuntBeastForm ?? false;
    void hpRatio;

    // The npc never presses Q: the beast comes out on HuntKit's own clock, and hybrid form
    // needs an upgrade the npc does not have.
    if (!inBeastForm) {
      if (!skipSpecials) {
        // Lay the scent early — everything else in human form is better while it is down.
        if (!aiState.npcHuntTrailActive) {
          if (this.castAbility('hunt-trail', buildContext(this.x, this.y))) return 'hunt-trail';
        }
        // Grenades are lobbed at mid range, where the fuse has time to matter.
        if (dist < 340 && dist > 90) {
          if (this.castAbility('hunt-grenade', buildContext(aimX, aimY))) return 'hunt-grenade';
        }
        // Blast is a shove: only worth spending a charge on inside its own cone range.
        if (dist < 150 && (aiState.npcHuntBlastCharges ?? 0) > 0) {
          if (this.castAbility('hunt-blast', buildContext(aimX, aimY))) return 'hunt-blast';
        }
      }
      // Default: put a bolt in them.
      if (this.castAbility('hunt-crossbow', buildContext(aimX, aimY))) return 'hunt-crossbow';
    } else {
      if (!skipSpecials) {
        // Roar into the cone whenever the quarry is roughly in front — it is the only
        // defensive tool the beast has.
        if (dist < 500) {
          if (this.castAbility('hunt-roar', buildContext(aimX, aimY))) return 'hunt-roar';
        }
        // Blood Scent when the quarry is nearly done.
        if (this.castAbility('hunt-blood-scent', buildContext(this.x, this.y))) return 'hunt-blood-scent';
        // Close the gap with a pounce, or pick them up and throw them at point blank.
        if (dist > 140 && dist < 320) {
          if (this.castAbility('hunt-pounce', buildContext(aimX, aimY))) return 'hunt-pounce';
        }
        if (dist < 120) {
          if (this.castAbility('hunt-grapple', buildContext(aimX, aimY))) return 'hunt-grapple';
        }
      }
      if (dist < 110) {
        if (this.castAbility('hunt-slash', buildContext(aimX, aimY))) return 'hunt-slash';
      }
    }

    return null;
  }

  private doGravityAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
    _angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // Lunar landing when low HP
      if (hpRatio < 0.35) {
        if (this.castAbility('lunar-landing', buildContext(this.x, this.y))) return 'lunar-landing';
      }
      // Space Slam when close
      if (dist < 180) {
        if (this.castAbility('space-slam', buildContext(aimX, aimY))) return 'space-slam';
      }
      // Grav Bomb snap
      if (this.castAbility('grav-bomb', buildContext(aimX, aimY))) return 'grav-bomb';
      // Meteor Rain (NPC burst version)
      if (this.castAbility('meteor-rain', buildContext(aimX, aimY))) return 'meteor-rain';
    }

    // Click: coin-flip between slash and single meteor shadow via space-slash cast()
    if (this.castAbility('space-slash', buildContext(aimX, aimY))) return 'space-slash';

    return null;
  }

  private doCreationAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
    _angleToTarget: number,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    // Synergy first: the player is standing in the blast of one of its walls, its bots or the
    // Nexus, so the remote comes out. The kit owns the geometry; the cast refuses harmlessly.
    if (aiState.npcCreationDetonate && !skipSpecials) {
      if (this.castAbility('self-destruct', buildContext(aimX, aimY))) return 'self-destruct';
    }

    if (!skipSpecials) {
      // Self-Destruct is about to come back: build a wall on top of them so there is something to blow.
      // Create lands 40% of the way to its aim, so aiming at twice the distance drops it at 80%.
      if (dist < 220 && this.getCooldownRatio('self-destruct') >= 0.9) {
        const tx = this.x + (aimX - this.x) * 2, ty = this.y + (aimY - this.y) * 2;
        if (this.castAbility('creation-block', buildContext(tx, ty))) return 'creation-block';
      }
      // Place block when enemy is close
      if (dist < 140) {
        if (this.castAbility('creation-block', buildContext(aimX, aimY))) return 'creation-block';
      }
      // Wrench in your Plans — 20 dmg plus a 5s tax on everything they cast
      if (this.castAbility('wrench-plans', buildContext(aimX, aimY))) return 'wrench-plans';
      // Charged bolt (weighted random tier)
      if (this.castAbility('charged-bolt', buildContext(aimX, aimY))) return 'charged-bolt';
    }

    // Dagger spray fallback
    if (this.castAbility('dagger-spray', buildContext(aimX, aimY))) return 'dagger-spray';

    return null;
  }

  /** Last hover state handed to MagnetKit, so the context is only built when it changes. */
  private magnetHoverSent = false;

  /**
   * Magnet. Every synergy is published by MagnetKit and checked first: a nail that has sat in the
   * target gets ripped out, and the Repulse the kit asks for re-fires it; coins are tossed short
   * so they hang inside the cone and are held while Repulse comes back; a spike that closes the
   * gap is ridden to, and the Repulse after it launches the spike point-blank.
   */
  private doMagnetAbilities(
    target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void target;
    if (aiState.npcMagnetBusy) return null;
    const hover = !!aiState.npcMagnetHover;
    if (hover !== this.magnetHoverSent) {
      this.magnetHoverSent = hover;
      buildContext(aimX, aimY).magnetHover(hover);
    }

    // Mastery: the key Mag-Lev was bound over is the kit's now — second jobs included.
    const bound = aiState.npcMagnetMagLevSlot;
    if (bound !== 'r' && aiState.npcMagnetRecall) {
      buildContext(aimX, aimY).magnetRecall();
      return 'magnet-recall';
    }
    const rp = aiState.npcMagnetRepulseAt;
    if (rp && this.castAbility('magnet-repulse', buildContext(rp.x, rp.y))) return 'magnet-repulse';
    const zip = aiState.npcMagnetZipTo;
    if (bound !== 'f' && zip) {
      buildContext(zip.x, zip.y).magnetZip(zip.x, zip.y);
      return 'magnet-zip';
    }

    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    if (!skipSpecials) {
      if (bound !== 'q' && dist < 420 && hpRatio > 0.35) {
        if (this.castAbility('magnet-mecha', buildContext(aimX, aimY))) return 'magnet-mecha';
      }
      const sp = aiState.npcMagnetSpikeAt;
      if (bound !== 'f' && sp && dist < 520 && this.castAbility('magnet-spike', buildContext(sp.x, sp.y))) return 'magnet-spike';
      if (bound !== 'r' && dist < 520 && this.castAbility('magnet-nail', buildContext(aimX, aimY))) return 'magnet-nail';
    }

    const coin = aiState.npcMagnetCoinAim;
    if (coin && dist < 460 && !aiState.npcMagnetHover) {
      if (this.castAbility('magnet-coin', buildContext(coin.x, coin.y))) return 'magnet-coin';
    }
    return null;
  }

  private doPlasmaAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skipSpecials) {
      // Q: Pure CHAOS! — only worth it with the enemy in volley range, or as a low-HP swing
      if (dist < 280 || hpRatio < 0.35) {
        if (this.castAbility('plasma-pure-chaos', buildContext(aimX, aimY))) return 'plasma-pure-chaos';
      }
      // F: Chaos Blades at medium range
      if (dist < 250) {
        if (this.castAbility('plasma-chaos-blades', buildContext(aimX, aimY))) return 'plasma-chaos-blades';
      }
      // R: Plasma Current — fire toward player
      if (dist < 320 && (this.aiState === 'attack' || this.aiState === 'chase')) {
        if (this.castAbility('plasma-current', buildContext(aimX, aimY))) return 'plasma-current';
      }
      // E: Unstable Arena near player
      if (dist < 220) {
        if (this.castAbility('plasma-arena', buildContext(aimX, aimY))) return 'plasma-arena';
      }
    }

    // Click: Plasma Burst when close
    if (dist <= 130) {
      if (this.castAbility('plasma-burst', buildContext(aimX, aimY))) return 'plasma-burst';
    }

    return null;
  }

  private doGunpowderAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    void time;
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // Keep building out the arsenal until full
      if ((aiState.npcGunpowderArsenalSize ?? 0) < 3) {
        if (this.castAbility('gunpowder-arsenal-expansion', buildContext(aimX, aimY))) return 'gunpowder-arsenal-expansion';
      }

      // BlunderBlast — open the vacuum cone toward the enemy when in range
      if (dist < 500) {
        if (this.castAbility('gunpowder-blunderblast', buildContext(aimX, aimY))) return 'gunpowder-blunderblast';
      }

      // Fire at Will as the main damage dump once weapons are equipped
      if ((aiState.npcGunpowderArsenalSize ?? 0) > 0 && dist < 450) {
        if (this.castAbility('gunpowder-fire-at-will', buildContext(aimX, aimY))) return 'gunpowder-fire-at-will';
      }

      // Explosive Retreat to bail out when low HP and the enemy is close
      if (hpRatio < 0.35 && dist < 150) {
        if (this.castAbility('gunpowder-explosive-retreat', buildContext(aimX, aimY))) return 'gunpowder-explosive-retreat';
      }
    }

    // Musket Shot — steady filler damage
    if (this.castAbility('gunpowder-musket-shot', buildContext(aimX, aimY))) return 'gunpowder-musket-shot';

    return null;
  }

  private doMetalAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const hasFlail = aiState.npcMetalHasFlail === true;
    const flailSwinging = aiState.npcMetalFlailSwinging === true;
    const blood = aiState.npcMetalBlood ?? 0;

    if (!skipSpecials) {
      // Clot Armor when low HP and blood is worth converting
      if (hpRatio < 0.35 && blood >= 20) {
        if (this.castAbility('metal-clot-armor', buildContext(aimX, aimY))) return 'metal-clot-armor';
      }
      // Blood Transfusion when hurt, safe distance, and blood available
      if (hpRatio < 0.6 && dist > 150 && blood > 0) {
        if (this.castAbility('metal-blood-transfusion', buildContext(aimX, aimY))) return 'metal-blood-transfusion';
      }
      // Trigger an idle flail into a swing once the enemy is in range
      if (hasFlail && !flailSwinging && dist < 200) {
        buildContext(aimX, aimY).metalTriggerFlailSwing();
        return 'metal-flail-craft';
      }
      // Craft a flail as the main reach/damage option
      if (!hasFlail && dist < 320) {
        if (this.castAbility('metal-flail-craft', buildContext(aimX, aimY))) return 'metal-flail-craft';
      }
      // Chain Tether at medium range
      if (dist < 230) {
        if (this.castAbility('metal-chain-tether', buildContext(aimX, aimY))) return 'metal-chain-tether';
      }
    }

    // Slash is melee filler
    if (dist <= 95) {
      if (this.castAbility('metal-slash', buildContext(aimX, aimY))) return 'metal-slash';
    }

    return null;
  }

  private doRubberAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // Q: Rubberage when the player is close enough to be caught by the ball swarm
      if (dist < 320 && !aiState.npcRubberageActive) {
        if (this.castAbility('rubberage', buildContext(aimX, aimY))) {
          aiState.npcRubberageActive = true;
          return 'rubberage';
        }
      }

      // R: Bounce Form when at medium range (reflect projectiles)
      if (dist > 150 && dist < 350 && !aiState.npcRubberBounceFormActive) {
        if (this.castAbility('rubber-bounce-form', buildContext(aimX, aimY))) {
          aiState.npcRubberBounceFormActive = true;
          return 'rubber-bounce-form';
        }
      }

      // F: Rubber Banding — plant an anchor for extra mobility / to snap back into range
      if (dist > 220 && !aiState.npcRubberBandActive) {
        if (this.castAbility('rubber-band', buildContext(aimX, aimY))) {
          aiState.npcRubberBandActive = true;
          return 'rubber-band';
        }
      }

      // E: Sling Shot at long range
      if (dist > 300) {
        if (this.castAbility('rubber-sling', buildContext(aimX, aimY))) return 'rubber-sling';
      }
    }

    // Default: Rubber Punch (NPC uses a moderate pull ratio)
    if (this.castAbility('rubber-punch', buildContext(aimX, aimY))) return 'rubber-punch';

    return null;
  }

  private doMagicAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // Q first, and at any range: an elemental assists from the top of the screen for 8
      // seconds off the longest cooldown in the kit, so the worst thing this bot can do is sit
      // on it. MagicKit picks which of the five suits the fight and refuses to double up on
      // one it already has out.
      if (this.castAbility('magic-necronomicon', buildContext(aimX, aimY))) return 'magic-necronomicon';

      // F: Duplication. The kit owns the geometry — it records the densest patch of its own
      // conjurations and reads the scroll out on the spot — so all this has to decide is that
      // there is something out worth copying at all. Early in a fight there is not.
      if (aiState.magicMeditating && this.castAbility('magic-meditate', buildContext(aimX, aimY))) {
        return 'magic-meditate';
      }

      // R: mark them. MagicKit auto-clicks the crosshair for a bot, so casting it is the whole
      // decision — missiles only pay while the target is in reasonable reach.
      if (dist < 420 && this.castAbility('magic-anchor', buildContext(aimX, aimY))) return 'magic-anchor';

      // E: the rotation. The kit reads the range and its own pools before choosing a wedge.
      if (Math.random() < 0.5) {
        if (this.castAbility('magic-grimoire', buildContext(aimX, aimY))) return 'magic-grimoire';
      }
      // Cornered and hurt: a Ward between us is worth the press even off-rotation.
      if (hpRatio < 0.35 && dist < 160) {
        if (this.castAbility('magic-grimoire', buildContext(aimX, aimY))) return 'magic-grimoire';
      }
    }

    // Default: Sparkle Shot
    if (this.castAbility('magic-sparkle-shot', buildContext(aimX, aimY))) return 'magic-sparkle-shot';

    return null;
  }

  private doTechnologyAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // Q: Admin Console when hurt
      if (hpRatio < 0.6 && Math.random() < 0.4) {
        if (this.castAbility('tech-admin', buildContext(aimX, aimY))) return 'tech-admin';
      }
      // R: Upload toward the enemy
      if (Math.random() < 0.35) {
        if (this.castAbility('tech-upload', buildContext(aimX, aimY))) return 'tech-upload';
      }
      // E: Overt Advertisement
      if (Math.random() < 0.25) {
        if (this.castAbility('tech-ads', buildContext(aimX, aimY))) return 'tech-ads';
      }
      // F: Web Drag (rarely — a bot gets little value from the manual grab)
      if (Math.random() < 0.05) {
        if (this.castAbility('tech-webdrag', buildContext(aimX, aimY))) return 'tech-webdrag';
      }
    }

    // Click: Addicting Cruncher
    if (dist < 500) {
      if (this.castAbility('tech-cruncher', buildContext(aimX, aimY))) return 'tech-cruncher';
    }

    return null;
  }

  /**
   * Silence. The kit owns the body for the two moves that matter — the fog-ring stealth
   * farm and the invisible slide into a backstab (SilenceKit.updateNpcMirrorAI) — so
   * everything here is about what to *press*, in priority order: become the Striker the
   * moment terror allows it, keep the stalker network alive, and only fight loudly
   * while visible. While invisible every special is held, because noise is the one
   * thing an ambush cannot afford.
   */
  private doSilenceAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skipSpecials = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const stalkers = aiState.npcSilenceStalkers ?? 0;
    const invisible = aiState.npcSilenceInvisible ?? false;

    // ── The Striker ──
    // Twenty seconds of borrowed monster: the form defers all incoming damage, so the
    // only wrong move is shyness. Slash on top of the target, Boggle (E) for the
    // orbiting eyes mid-range, Allure (R) to pull a distant target into reach.
    if (aiState.npcSilenceStriker) {
      if (dist < 95) {
        if (this.castAbility('silence-stab', buildContext(aimX, aimY))) return 'silence-stab';
      }
      if (!skipSpecials && dist < 280) {
        if (this.castAbility('silence-watch', buildContext(aimX, aimY))) return 'silence-watch';
      }
      if (!skipSpecials && dist > 200) {
        if (this.castAbility('silence-ritual', buildContext(aimX, aimY))) return 'silence-ritual';
      }
      return null;
    }

    // ── Night Terror ──
    // A full bar is the whole element's payoff: ritual *yourself* and transform. Cast
    // at its own feet — doRitual reads a self-target as the transformation.
    if (aiState.npcSilenceTerrorFull) {
      if (this.castAbility('silence-ritual', buildContext(this.x, this.y))) return 'silence-ritual';
    }

    // ── Stalk → backstab ──
    // A Stalked target can't come about, and the kit has walked us into its back shadow:
    // this is the stab the whole F exists to set up, so it outranks everything else.
    const backstab = aiState.npcSilenceBackstabAim;
    if (backstab) {
      if (this.castAbility('silence-stab', buildContext(backstab.x, backstab.y))) return 'silence-stab';
    }

    if (!skipSpecials) {
      // ── Synergies first (see the NpcAiState synergy contract) ──
      // Stalk when the kit says the target can be held inside the aura; the kit's mirror
      // AI then shadows them round to their back for the three seconds.
      if (aiState.npcSilenceStalkOpen) {
        if (this.castAbility('silence-feast', buildContext(aimX, aimY))) return 'silence-feast';
      }

      // Convert a matured stalker into a grabber the moment Ritual comes up.
      const mature = aiState.npcSilenceMatureStalker;
      if (mature) {
        if (this.castAbility('silence-ritual', buildContext(mature.x, mature.y))) return 'silence-ritual';
      }

      // Click+ Sacrifice: dash-stab THROUGH its own stalker while the player stands
      // beside it — the lane detonates the watcher and the scream silences them,
      // which is also what feeds the terror bar.
      const sac = aiState.npcSilenceSacrificeStab;
      if (sac && !invisible) {
        if (this.castAbility('silence-stab', buildContext(sac.x, sac.y))) return 'silence-stab';
      }

      // E+ Mutant: with the network full, re-cast Watch onto its youngest watcher to
      // grow a seeker. The kit only offers this while ritual fodder remains.
      const mut = aiState.npcSilenceMutateWatcher;
      if (mut && Math.random() < 0.35) {
        if (this.castAbility('silence-watch', buildContext(mut.x, mut.y))) return 'silence-watch';
      }

      // Keep the stalker network up — drop them along the fog border. Placement uses
      // the physics bounds (the arena), not the render surface.
      if (stalkers < 3 && Math.random() < 0.5) {
        const wb = this.scene.physics.world.bounds;
        const edge = Phaser.Math.Between(0, 3);
        const sx = edge === 2 ? wb.x + 24 : edge === 3 ? wb.right - 24 : Phaser.Math.Between(wb.x + 10, wb.right - 10);
        const sy = edge === 0 ? wb.y + 24 : edge === 1 ? wb.bottom - 24 : Phaser.Math.Between(wb.y + 10, wb.bottom - 10);
        if (this.castAbility('silence-watch', buildContext(sx, sy))) return 'silence-watch';
      }

      // While invisible, hold the loud specials — the kit steers us into a backstab.
      if (!invisible) {
        if (dist < 260) {
          if (this.castAbility('silence-ritual', buildContext(aimX, aimY))) return 'silence-ritual';
        }
        if (dist < 420 && (hpRatio < 0.6 || _target.hp / _target.maxHp < 0.6)) {
          if (this.castAbility('silence-run', buildContext(_target.x, _target.y))) return 'silence-run';
        }
      }
    }

    // Click: stab when close (the cast itself dashes at the target).
    if (!invisible && dist < 190) {
      if (this.castAbility('silence-stab', buildContext(aimX, aimY))) return 'silence-stab';
    }

    return null;
  }

  /**
   * The target is invisible (Silence stealth): amble around like nothing is
   * there. With stalkers on the field, fire the click attack in random
   * directions hoping to clip one.
   */
  private doBlindBehavior(
    buildContext: (tX: number, tY: number) => CastContext,
    time: number,
    huntStalkers: boolean,
  ): string | null {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (time >= this.blindNextWanderAt) {
      this.blindNextWanderAt = time + Phaser.Math.Between(600, 1200);
      if (Math.random() < 0.25) {
        this.blindWanderVx = 0;
        this.blindWanderVy = 0;
      } else {
        const ang = Math.random() * Math.PI * 2;
        this.blindWanderVx = Math.cos(ang) * this.speed * 0.8;
        this.blindWanderVy = Math.sin(ang) * this.speed * 0.8;
      }
    }
    body.setVelocity(this.blindWanderVx, this.blindWanderVy);
    if (this.stationary) body.setVelocity(0, 0);

    if (huntStalkers && time >= this.blindNextShotAt) {
      this.blindNextShotAt = time + Phaser.Math.Between(900, 1600);
      const ang = Math.random() * Math.PI * 2;
      const clickId = this.element.abilities[0]?.id;
      if (clickId && this.castAbility(clickId, buildContext(this.x + Math.cos(ang) * 320, this.y + Math.sin(ang) * 320))) {
        return clickId;
      }
    }
    return null;
  }

  private doEchoAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    _hpRatio: number,
    aimX: number,
    aimY: number,
    _aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;

    if (!skip) {
      // F: Bat attach when very close
      if (dist < 100) {
        if (this.castAbility('echo-bat', buildContext(aimX, aimY))) return 'echo-bat';
      }
      // E: Guess when in range
      if (dist < 250 && Math.random() < 0.7) {
        if (this.castAbility('echo-guess', buildContext(aimX, aimY))) return 'echo-guess';
      }
      // R: Lantern occasionally
      if (Math.random() < 0.15) {
        if (this.castAbility('echo-lantern', buildContext(aimX, aimY))) return 'echo-lantern';
      }
      // Q: Eclipse occasionally
      if (Math.random() < 0.05) {
        if (this.castAbility('echo-eclipse', buildContext(aimX, aimY))) return 'echo-eclipse';
      }
    }

    // Click: Echolocation as primary attack
    if (dist < 500 && (this.aiState === 'attack' || this.aiState === 'chase')) {
      if (this.castAbility('echo-shot', buildContext(aimX, aimY))) return 'echo-shot';
    }

    return null;
  }

  private doSubterfugeAbilities(
    _target: Fighter,
    buildContext: (tX: number, tY: number) => CastContext,
    _time: number,
    dist: number,
    hpRatio: number,
    aimX: number,
    aimY: number,
    aiState: NpcAiState,
  ): string | null {
    const skip = this.difficulty.castSkipChance > 0 && Math.random() < this.difficulty.castSkipChance;
    const money = aiState.subMoney ?? 0;
    const bullets = aiState.subBullets ?? 0;
    const lackeys = aiState.subLackeys ?? 0;

    if (!skip) {
      // Q: Dark Treachery — steal the player's ultimate once things get serious
      if (hpRatio < 0.85 && Math.random() < 0.04) {
        if (this.castAbility('sub-treachery', buildContext(aimX, aimY))) return 'sub-treachery';
      }
      // R: Recruit — keep a couple of lackeys on the payroll
      if (money >= 1 && lackeys < 2 && Math.random() < 0.05) {
        if (this.castAbility('sub-recruit', buildContext(aimX, aimY))) return 'sub-recruit';
      }
      // F: Bribe — occasionally, and only with money to spare
      if (money >= 2 && Math.random() < 0.02) {
        if (this.castAbility('sub-bribe', buildContext(aimX, aimY))) return 'sub-bribe';
      }
      // E: Spray — burst fire at mid range; also buys a reload when dry
      if (dist < 420 && (bullets > 0 || money >= 1)) {
        if (this.castAbility('sub-spray', buildContext(aimX, aimY))) return 'sub-spray';
      }
    }

    // Click: Molecular Cutter dagger cadence at range
    if (dist < 500 && (this.aiState === 'attack' || this.aiState === 'chase')) {
      if (this.castAbility('sub-cutter', buildContext(aimX, aimY))) return 'sub-cutter';
    }

    return null;
  }
}
