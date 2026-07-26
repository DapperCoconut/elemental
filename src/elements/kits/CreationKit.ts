import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { CustomStatus } from './StatusHudKit';
import { seedEffectSnapshot, stretchNewEffects } from '../../combat/StatusEffects';
import {
  ArmGesture, ArmHold, CREATION, CREATION_TIER_COLORS, CreationAvatar, CreationColorFn,
  CreationForge, CreationFx, CreationMechRig, CreationNexus, MECH_ARM_TONES, MechArmKind,
  MechArmView, blueprintFrame, craftPlank, drawAutomaton, drawBolt, drawDagger, drawFlask,
  drawNail, drawSaw, drawSpeedPad, drawSpikedPanel, drawWrench, forgedShard, plankPanel, rivet,
  wrenchShape,
} from './CreationVisuals';

// ── Types ────────────────────────────────────────────────────────────────

export interface CreationNexusBolt {
  tier: 'copper' | 'silver' | 'gold';
  /** The loaded slug shown on the Nexus shelf — an ingot drawn in its own metal. */
  icon: Phaser.GameObjects.Graphics;
}

/** The six potions the Nexus can brew, keyed by the sorted two-bolt recipe that makes them. */
export type CreationPotionKind = 'buff' | 'heal' | 'gold' | 'protection' | 'speed' | 'reload';

/** A brewed potion resting on the Nexus, waiting for its owner to walk over and drink it. */
export interface CreationPotion {
  kind: CreationPotionKind;
  owner: 'player' | 'npc';
  /** Which shelf position on the nexus this bottle occupies (0, or 1 with the E+ second slot). */
  slot: number;
  x: number;
  y: number;
  /** The whole bottle, redrawn each frame so its liquid rocks and its bubbles rise. */
  gfx: Phaser.GameObjects.Graphics;
  /** Seconds since it was brewed — drives the bob, the meniscus and the bubble column. */
  t: number;
}

export interface CreationPotionDef {
  /** The two loaded bolt tiers' initials, sorted alphabetically (copper < gold < silver). */
  recipe: string;
  name: string;
  emoji: string;
  /** Liquid + tray colour. */
  color: number;
  durationMs: number;
  /** Tooltip body and info-panel blurb. */
  effect: string;
}

/**
 * The six potions the Nexus brews. `resolveNexusCraft` sorts the loaded tiers and looks the
 * result up here, so the recipe strings are the single source of truth for what makes what.
 */
export const CREATION_POTIONS: Record<CreationPotionKind, CreationPotionDef> = {
  buff:       { recipe: 'cc', name: 'Buff Potion',       emoji: '⚔️', color: 0xff4466, durationMs: 20000, effect: 'Deal 25% more damage.' },
  heal:       { recipe: 'ss', name: 'Heal Potion',       emoji: '💚', color: 0x33dd66, durationMs: 20000, effect: 'Regenerate 3 HP every second.' },
  gold:       { recipe: 'gg', name: 'Gold Potion',       emoji: '🏆', color: 0xffcc22, durationMs: 90000, effect: 'Every effect you gain — good or bad — lasts twice as long.' },
  protection: { recipe: 'cs', name: 'Protection Potion', emoji: '🛡️', color: 0x66aaff, durationMs: 20000, effect: 'Take 25% less damage.' },
  speed:      { recipe: 'cg', name: 'Speed Potion',      emoji: '👟', color: 0x99ff66, durationMs: 20000, effect: 'Move 50% faster.' },
  reload:     { recipe: 'gs', name: 'Reload Potion',     emoji: '⏱️', color: 0xcc88ff, durationMs: 20000, effect: 'Ability cooldowns recharge 25% faster.' },
};

export const CREATION_POTION_KINDS = Object.keys(CREATION_POTIONS) as CreationPotionKind[];

/** Recipe string → potion kind, derived from the table above. */
export const CREATION_POTION_BY_RECIPE = new Map<string, CreationPotionKind>(
  CREATION_POTION_KINDS.map((k) => [CREATION_POTIONS[k].recipe, k]),
);

export interface CreationDagger {
  sprite: Phaser.GameObjects.Graphics;
  vx: number;
  vy: number;
  damage: number;
  owner: 'player' | 'npc';
  hitSet: Set<string>;
  cutSet: Set<CreationBlocker>; // blocks already cut by this dagger
  // Converging launch: daggers curve toward this cursor point, then fly straight past it.
  targetX?: number;
  targetY?: number;
  converged?: boolean;
}

export interface CreationBoltInFlight {
  sprite: Phaser.GameObjects.Graphics;
  vx: number;
  vy: number;
  tier: 'copper' | 'silver' | 'gold';
  damage: number;
  owner: 'player' | 'npc';
  isRocket?: boolean;
  targetX?: number;
  targetY?: number;
  noNexus?: boolean; // crafted bullets must not re-load the nexus
  /** Barrage-arm rockets steer toward the nearest enemy each frame and detonate on contact. */
  homing?: boolean;
  /** Blast radius for a homing rocket's AoE. */
  blastRadius?: number;
}

/** R — a wrench tumbling end over end toward wherever it was aimed. */
export interface CreationWrench {
  sprite: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  owner: 'player' | 'npc';
  /**
   * Scene-clock stamp before which the Nexus is ignored. A wrench thrown while standing on
   * the pedestal would otherwise wake it on frame one, from any range, by accident.
   */
  armedAt: number;
}

export interface CreationBlocker {
  rect: Phaser.GameObjects.Graphics;
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

export interface CreationMazeWall {
  rect: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  w: number;
  h: number;
  owner: 'player' | 'npc';
  expireAt: number;
  spiked?: boolean;
  spikeAccum?: number;
}

/** Ultimate Invention hazard: a saw sliding horizontally across the workshop. */
export interface CreationSaw {
  sprite: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number;
  owner: 'player' | 'npc';
  hitSet: Set<string>;
}

/** Ultimate Invention hazard: a nail flying inward from a workshop edge. */
export interface CreationNail {
  sprite: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  owner: 'player' | 'npc';
}

export interface CreationSpeedPad {
  rect: Phaser.GameObjects.Graphics;
  x: number; y: number; w: number; h: number;
  hp: number; maxHp: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  owner: 'player' | 'npc';
  /** Set only on Springboard (mastery) pads — build-mode pads are permanent. */
  expireAt?: number;
}

export interface CreationSpikedBlock {
  rect: Phaser.GameObjects.Graphics;
  x: number; y: number; w: number; h: number;
  hp: number; maxHp: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  owner: 'player' | 'npc';
  tickAccum: number;
  invincible: boolean; // true for maze-spawned spiked blocks
}

/**
 * One arm welded onto the mech by a potion that was sitting on the Nexus. `view` is the
 * rig's own mutable draw state for that slot — the sim writes into it rather than pushing a
 * fresh object across every frame.
 */
export interface CreationMechArm {
  kind: MechArmKind;
  view: MechArmView;
  /** Milliseconds toward the next volley / batch / grab attempt. */
  cd: number;
  /** Chainsaw: milliseconds of continuous cutting, and when the vent finishes. */
  heatMs: number;
  coolUntil: number;
  /** Chainsaw: scene-clock stamp of the next allowed bite. */
  biteAt: number;
  /** Grabber: who is in the claw, until when, and along which bearing they are held. */
  held: Fighter | null;
  heldUntil: number;
  heldAngle: number;
}

/**
 * R+ — the Nexus folded up into a walker. It stands dormant where the Nexus was until the
 * player climbs in, then follows them around soaking everything aimed at them.
 */
export interface CreationMech {
  rig: CreationMechRig;
  hp: number;
  maxHp: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  arms: CreationMechArm[];
  mounted: boolean;
  /** Where it is standing. Tracks the player once mounted. */
  x: number; y: number;
  /** Damage instances taken, for the Shield arm's every-Nth block. */
  hits: number;
  prompt: Phaser.GameObjects.Text | null;
}

/** A repair orb lobbed out by a Med Core arm, waiting to be walked over. */
export interface CreationMedOrb {
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  t: number;
  heal: number;
  expireAt: number;
}

/**
 * Automaton perk: a wandering clockwork bot spawned by the Workshop that bounces off walls
 * and shoulder-charges whoever it runs into.
 */
export interface CreationAutomaton {
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  /** Seconds alive — drives the walk cycle and the head gear. */
  t: number;
  expireAt: number;
  meleeCooldownUntil: number;
  owner: 'player' | 'npc';
}

// ── R: Wrench in your Plans ───────────────────────────────────────────────

const WRENCH_SPEED = 640;
const WRENCH_DAMAGE = 20;
const WRENCH_HIT_RADIUS = 22;
/** How long a wrenched fighter pays for using abilities, and what each use costs. */
const WRENCH_PUNISH_MS = 5000;
const WRENCH_PUNISH_DAMAGE = 5;

// ── R+: Nexus Awakening ───────────────────────────────────────────────────

const MECH_HP = 100;
/** The mech is heavy: you move at three quarters speed while you are in it. */
const MECH_SPEED_MULT = 0.75;
const MECH_MOUNT_RANGE = 80;
/** The Nexus reassembles itself this long after its mech is wrecked. */
const NEXUS_REBUILD_MS = 4000;

const CHAINSAW_RANGE = 66;
const CHAINSAW_HEAT_MS = 5000;
const CHAINSAW_COOL_MS = 3000;
const MEDCORE_INTERVAL = 8000;
const MEDCORE_ORB_MS = 20000;
const GRABBER_RANGE = 92;
const GRABBER_HOLD_MS = 3000;
const GRABBER_CD = 8000;
const SHIELD_BONUS_HP = 25;
const BARRAGE_INTERVAL = 8000;
const OVERCLOCK_SPEED_MULT = 1.25;
/** Everything built while an Overclock arm is running comes out steel-plated at double HP. */
const STEEL_PLATE_HP_MULT = 2;

/**
 * Which potion welds on which arm. These are the same two-bolt recipes the Nexus brews from,
 * read one step further: CC→chainsaw, SS→med core, GG→grabber, CS→shield, CG→barrage,
 * GS→overclock. Keeping it keyed by potion kind rather than by recipe string means the
 * recipe table stays the single source of truth for what makes what.
 */
const CREATION_POTION_ARM: Record<CreationPotionKind, MechArmKind> = {
  buff: 'chainsaw',
  heal: 'medcore',
  gold: 'grabber',
  protection: 'shield',
  speed: 'barrage',
  reload: 'overclock',
};

export const CREATION_MECH_ARM_INFO: Record<MechArmKind, { name: string; emoji: string; effect: string }> = {
  chainsaw:  { name: 'Chainsaw Arm',  emoji: '🪚', effect: 'Cuts anything that comes close, on its own. Overheats after 5s and vents for 3s.' },
  medcore:   { name: 'Med Core Arm',  emoji: '💊', effect: 'Lobs 3 repair orbs around you every 8s. Each one you walk over restores 15 mech HP.' },
  grabber:   { name: 'Grabber Arm',   emoji: '🦾', effect: 'Seizes anyone who gets close and holds them for 3s. They cannot attack in the claw.' },
  shield:    { name: 'Shield Arm',    emoji: '🛡️', effect: '+25 mech HP, and every 5th hit is blocked outright (every 3rd with two shields).' },
  barrage:   { name: 'Barrage Arm',   emoji: '🚀', effect: 'Fires 3 homing rockets every 8s — 5 damage each, plus a small blast.' },
  overclock: { name: 'Overclock Arm', emoji: '⚙️', effect: '+25% mech speed, supercharges the other arm, and steel-plates everything you build.' },
};

/** Creation Q+ Ultimate Invention slider panel layout (screen-space, top-left). */
const INVENTION_SLIDER_X = 20;
const INVENTION_SLIDER_Y = 74;
const INVENTION_SLIDER_W = 160;
const INVENTION_SLIDER_ROW = 34;

// ── Mastery ──────────────────────────────────────────────────────────────

const MORTAR_COOLDOWN_MS = 14000;
const MORTAR_FLIGHT_MS = 480;
const MORTAR_RADIUS = 130;
const MORTAR_DAMAGE = 20;
/** Slots Mortar Command may be bound to — E is deliberately excluded (see MASTERY_DEFS). */
const MORTAR_SLOTS = ['r', 'f', 'q'] as const;

const SPRINGBOARD_PAD_W = 38;
const SPRINGBOARD_PAD_H = 14;
const SPRINGBOARD_PAD_HP = 25;
const SPRINGBOARD_PAD_MS = 10000;

/**
 * How each potion reads once the Nexus has fired it back at somebody — the inverse of the
 * potion's own effect. Gold is absent on purpose: it lands unchanged (see `applyMortarHex`).
 */
const CREATION_HEXES: Record<Exclude<CreationPotionKind, 'gold'>, { name: string; emoji: string; effect: string }> = {
  buff:       { name: 'Weakened',  emoji: '🩸', effect: 'Deal 25% less damage.' },
  heal:       { name: 'Corroding', emoji: '🧫', effect: 'Lose 3 HP every second.' },
  protection: { name: 'Brittle',   emoji: '🥀', effect: 'Take 25% more damage.' },
  speed:      { name: 'Leaden',    emoji: '🐌', effect: 'Move half as fast.' },
  reload:     { name: 'Jammed',    emoji: '⛓️', effect: 'Ability cooldowns recharge 25% slower.' },
};

const CREATION_HEX_KINDS = Object.keys(CREATION_HEXES) as Array<Exclude<CreationPotionKind, 'gold'>>;

// ── CreationArenaApi ──────────────────────────────────────────────────────

export interface CreationArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly spaceKey: Phaser.Input.Keyboard.Key;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly width: number;
  readonly height: number;
  readonly isDodging: boolean;
  readonly pointerWasDown: boolean;
  /** Live cursor position — the player's avatar aims at it. */
  readonly aimX: number;
  readonly aimY: number;
  get npcSpeedMult(): number;
  set npcSpeedMult(v: number);
  hasUpgrade(slot: string): boolean;
  hasNpcUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(x: number, y: number): Fighter;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Shared rectangle depenetration helper — ArenaScene owns it (Apprehension uses it too). */
  pushFighterOutOfRect(body: Phaser.Physics.Arcade.Body, bx: number, by: number, bw: number, bh: number): void;
  /** `(base) => displayed` through the owner's skin. */
  creationColor(owner: 'player' | 'npc', base: number): number;
  /** HUD ability cards, so Build Mode can re-label them the way Earth's Titan Form does. */
  readonly abilityBars: Array<{ lbl?: Phaser.GameObjects.Text; desc?: Phaser.GameObjects.Text }>;
  /** True only when the player is creation AND Creation Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
}

// ── CreationKit ───────────────────────────────────────────────────────────

export class CreationKit {
  // ── Visuals ──
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: CreationColorFn;
  private readonly ncol: CreationColorFn;
  private readonly pfx: CreationFx;
  private readonly nfx: CreationFx;
  /** The artisan rig (forge hands, gripped hammer, gear crown) for each creation fighter. */
  private playerAvatar: CreationAvatar | null = null;
  private npcAvatar: CreationAvatar | null = null;
  /** Ring of orbiting stock worn by whoever has the Workshop up. */
  private workshopForge: CreationForge | null = null;
  /**
   * The always-on tell for live potions and mortar hexes: one Graphics per side carrying a
   * little bottle per effect. The status tray only covers the local player, and only in the
   * corner — this is what makes a hexed fighter readable across the arena.
   */
  private brewAura: { player: Phaser.GameObjects.Graphics | null; npc: Phaser.GameObjects.Graphics | null } =
    { player: null, npc: null };
  private brewAuraT = 0;
  /** ~45ms accumulator behind the in-flight trails on daggers, bolts and wrenches. */
  private trailAccum = 0;

  // Nexus (shared world object, one per match)
  private nexusRig: CreationNexus | null = null;
  private nexusLabel: Phaser.GameObjects.Text | null = null;
  private nexusX = 0;
  private nexusY = 0;
  private nexusBolts: CreationNexusBolt[] = [];
  // Brewed potions resting on the nexus (1 normally, 2 with E+)
  private creatPotions: CreationPotion[] = [];
  /** Active potion effects, keyed `${owner}|${kind}` → expiry (scene clock). */
  private creatPotionEnds = new Map<string, number>();
  private creatPotionHealAccum = { player: 0, npc: 0 };
  /** Reload Potion multiplies `cooldownMult` on the way in and divides on the way out. */
  private creatPotionReloadOn = { player: false, npc: false };
  /** Gold Potion duration-stretch bookkeeping, one snapshot per side. */
  private creatGoldSnapshots = { player: new Map<string, number>(), npc: new Map<string, number>() };
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
  /** One Graphics carrying every ghost blade in the fan being lined up. */
  private creatDaggerPreview: Phaser.GameObjects.Graphics | null = null;
  // Bolt E-charge
  private creatBoltHolding = false;
  private creatBoltHoldStart = 0;
  /** The slug being forged over the caster's head while E is held. */
  private creatBoltChargeOrb: Phaser.GameObjects.Graphics | null = null;
  /** Last tier the charge had reached, so crossing into a new one lands a hammer blow once. */
  private creatBoltChargeTier = -1;
  // F-block drag
  private creatBlockDragging = false;
  private creatBlockDragStartX = 0;
  private creatBlockDragStartY = 0;
  private creatBlockPreview: Phaser.GameObjects.Graphics | null = null;
  // Shared in-flight arrays (owner field distinguishes sides)
  private creatDaggers: CreationDagger[] = [];
  private creatBolts: CreationBoltInFlight[] = [];
  private creatWrenches: CreationWrench[] = [];
  // Persistent world objects
  private creatBlockers: CreationBlocker[] = [];
  private creatMazeWalls: CreationMazeWall[] = [];
  private creatSaws: CreationSaw[] = [];
  private creatNails: CreationNail[] = [];
  // Stun applied by Ultimate Invention hazards
  private creatPlayerStunUntil = 0;
  private creatNpcStunUntil = 0;
  // Q Workshop
  private creatWorkshopEnd = 0;
  private creatWorkshopOwner: 'player' | 'npc' = 'player';
  private creatWorkshopOverlay: Phaser.GameObjects.Graphics | null = null;
  private creatWorkshopTrailAccum = 0;
  private creatWorkshopTrail: Phaser.GameObjects.Graphics[] = [];
  // Q+ Ultimate Invention sliders
  private creatInventionActive = false;
  private creatInventionTimer = 0;
  private creatSliderDanger = 0;
  private creatSliderBias = 0;
  private creatSliderClutter = 0;
  private creatInventionUi: Array<{ destroy: () => void }> = [];
  private creatSliderFills: Phaser.GameObjects.Rectangle[] = [];
  private creatSliderHandles: Phaser.GameObjects.Rectangle[] = [];
  private creatInventionTimerText: Phaser.GameObjects.Text | null = null;
  private creatInventionDragSlider = -1;
  private creatSawAccum = 0;
  private creatNailAccum = 0;
  private creatBiasHealAccum = 0;
  private creatClutterBoxes: CreationMazeWall[] = [];
  private creatClutterLevel = -1;

  // Creation upgrades
  private creatLastCraftKey: string | null = null;
  private creatBoltElectroMode = false;
  private creatBuildMode = false;
  /** `[label, description]` per ability card as it read before Build Mode took the bar over. */
  private preBuildBarText: Array<[string, string]> = [];
  private creatBuildBlockDragging = false;
  private creatBuildBlockDragStartX = 0;
  private creatBuildBlockDragStartY = 0;
  private creatBuildBlockPreview: CreationBlocker | null = null;
  private creatBuildNewBlockPreview: Phaser.GameObjects.Graphics | null = null;
  private creatBuildNewBlockCdUntil = 0;
  private creatBuildLaunchCdUntil = 0;
  private creatSpeedPads: CreationSpeedPad[] = [];
  private creatSpikedBlocks: CreationSpikedBlock[] = [];
  private creatBuildSpeedPadDragging = false;
  private creatBuildSpeedPadDragStartX = 0;
  private creatBuildSpeedPadDragStartY = 0;
  private creatBuildSpeedPadPreview: Phaser.GameObjects.Graphics | null = null;
  private creatBuildSpeedPadDragRef: CreationSpeedPad | null = null;
  private creatBuildSpeedPadCdUntil = 0;
  private creatBuildSpikedDragging = false;
  private creatBuildSpikedDragStartX = 0;
  private creatBuildSpikedDragStartY = 0;
  private creatBuildSpikedPreview: Phaser.GameObjects.Graphics | null = null;
  private creatBuildSpikedDragRef: CreationSpikedBlock | null = null;
  private creatBuildSpikedCdUntil = 0;
  private creatPlayerSpeedPadEnd = 0;
  private creatNpcSlowEnd = 0;
  private creatNpcSlowMult = 1;
  // R+ Nexus Awakening
  private creatMech: CreationMech | null = null;
  private creatMedOrbs: CreationMedOrb[] = [];
  /** Scene-clock stamp at which a wrecked mech's Nexus reassembles itself. 0 = nothing pending. */
  private nexusRebuildAt = 0;
  /** Which sustained pose the player's rig is in, so the mech's `ride` never stamps on a cast. */
  private playerHold: ArmHold = null;
  /** Sides currently carrying a wrench debuff, so it can be cleared exactly once when it lapses. */
  private wrenchedSides = new Set<Fighter>();

  // ── Mastery: Springboard + Mortar Command ──────────────────────────────
  /** Absolute scene-clock stamp of the last Mortar Command. Starts a full cooldown in the past
   *  so the very first match (which runs the constructor, not reset) isn't locked out. */
  private mortarLastCastAt = -MORTAR_COOLDOWN_MS;
  /** Inverted potion effects in flight, keyed `${side}|${kind}` → expiry (scene clock). */
  private creatHexEnds = new Map<string, number>();
  private creatHexDrainAccum = { player: 0, npc: 0 };
  /** Jammed hex scales `cooldownMult` on the transition edge only, mirroring Reload. */
  private creatHexReloadOn = { player: false, npc: false };
  /** Springboard watches for the dash ending, so it needs last frame's dodge state. */
  private prevDodging = false;
  /** Where the current dash started — the trail is drawn from here to where it lands. */
  private dashFromX = 0;
  private dashFromY = 0;
  /** Enemies already wired up for the workshopKills requirement this match. */
  private workshopTrackedEnemies = new WeakSet<Fighter>();

  /** Automaton perk (Creation): wandering clockwork bots spawned by the Workshop. */
  private automatons: CreationAutomaton[] = [];

  constructor(private api: CreationArenaApi) {
    this.pcol = (base) => api.creationColor('player', base);
    this.ncol = (base) => api.creationColor('npc', base);
    this.pfx = new CreationFx(api.scene, this.pcol);
    this.nfx = new CreationFx(api.scene, this.ncol);
  }

  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): CreationColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): CreationFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Character rig for a side, if that side is creation this match. */
  private avatar(owner: 'player' | 'npc'): CreationAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * Fire an arm gesture on one side's rig. Every Creation ability routes through here from its
   * owner-aware spawner, which is why the npc's arms move on its casts too without a separate
   * npcCastId table.
   */
  private gesture(owner: 'player' | 'npc', g: ArmGesture, angle?: number, duration?: number): void {
    this.avatar(owner)?.play(g, angle, duration);
  }

  /**
   * Enter/leave a sustained pose on one side's rig. The player's current pose is remembered
   * so the mech's `ride` stance can yield to any pose an ability is actually holding.
   */
  private hold(owner: 'player' | 'npc', h: ArmHold, angle?: number): void {
    if (owner === 'player') this.playerHold = h;
    this.avatar(owner)?.setHold(h, angle);
  }

  private get scene(): Phaser.Scene { return this.api.scene; }
  private get add(): Phaser.GameObjects.GameObjectFactory { return this.api.scene.add; }
  private get tweens(): Phaser.Tweens.TweenManager { return this.api.scene.tweens; }
  private get player(): Fighter { return this.api.player; }
  private get npc(): Fighter { return this.api.npc; }

  /** Maze walls are shared with the Automaton perk (reflection + spawn placement). */
  get mazeWalls(): CreationMazeWall[] { return this.creatMazeWalls; }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.workshopForge) { this.workshopForge.destroy(); this.workshopForge = null; }
    for (const side of ['player', 'npc'] as const) {
      if (this.brewAura[side]) { this.brewAura[side]!.destroy(); this.brewAura[side] = null; }
    }
    this.brewAuraT = 0;
    this.trailAccum = 0;
    for (const a of this.automatons) a.gfx.destroy();
    this.automatons = [];

    if (this.nexusRig) { this.nexusRig.destroy(); this.nexusRig = null; }
    if (this.nexusLabel) { this.nexusLabel.destroy(); this.nexusLabel = null; }
    for (const b of this.nexusBolts) b.icon.destroy();
    this.nexusBolts = [];
    for (const p of this.creatPotions) p.gfx.destroy();
    this.creatPotions = [];
    this.creatPotionEnds.clear();
    this.creatPotionHealAccum = { player: 0, npc: 0 };
    this.creatPotionReloadOn = { player: false, npc: false };
    this.creatGoldSnapshots.player.clear();
    this.creatGoldSnapshots.npc.clear();
    this.creatCraftInProgress = false; this.creatCraftStartTime = 0;
    this.creatDaggerHolding = false; this.creatDaggerHoldStart = 0;
    if (this.creatDaggerPreview) { this.creatDaggerPreview.destroy(); this.creatDaggerPreview = null; }
    this.creatBoltHolding = false; this.creatBoltChargeTier = -1;
    if (this.creatBoltChargeOrb) { this.creatBoltChargeOrb.destroy(); this.creatBoltChargeOrb = null; }
    this.creatBlockDragging = false;
    if (this.creatBlockPreview) { this.creatBlockPreview.destroy(); this.creatBlockPreview = null; }
    for (const d of this.creatDaggers) d.sprite.destroy();
    this.creatDaggers = [];
    for (const b of this.creatBolts) b.sprite.destroy();
    this.creatBolts = [];
    for (const w of this.creatWrenches) w.sprite.destroy();
    this.creatWrenches = [];
    for (const f of this.wrenchedSides) this.clearWrench(f);
    this.wrenchedSides.clear();
    for (const bl of this.creatBlockers) { bl.rect.destroy(); bl.hpBar.destroy(); bl.hpBg.destroy(); }
    this.creatBlockers = [];
    for (const w of this.creatMazeWalls) w.rect.destroy();
    this.creatMazeWalls = [];
    for (const s of this.creatSaws) s.sprite.destroy();
    this.creatSaws = [];
    for (const n of this.creatNails) n.sprite.destroy();
    this.creatNails = [];
    this.creatPlayerStunUntil = 0; this.creatNpcStunUntil = 0;
    this.creatWorkshopEnd = 0;
    if (this.creatWorkshopOverlay) { this.creatWorkshopOverlay.destroy(); this.creatWorkshopOverlay = null; }
    this.creatWorkshopTrailAccum = 0;
    for (const t of this.creatWorkshopTrail) t.destroy();
    this.creatWorkshopTrail = [];
    this.creatInventionActive = false; this.creatInventionTimer = 0;
    this.creatSliderDanger = 0; this.creatSliderBias = 0; this.creatSliderClutter = 0;
    this.creatInventionDragSlider = -1;
    this.teardownInventionUi();
    this.creatSawAccum = 0; this.creatNailAccum = 0; this.creatBiasHealAccum = 0;
    for (const b of this.creatClutterBoxes) b.rect.destroy();
    this.creatClutterBoxes = []; this.creatClutterLevel = -1;

    // Creation upgrade reset
    this.creatLastCraftKey = null; this.creatBoltElectroMode = false;
    // The HUD is rebuilt from scratch each match, so the snapshot is dropped rather than
    // replayed — restoring stale text onto fresh cards would be worse than doing nothing.
    this.creatBuildMode = false; this.preBuildBarText = [];
    this.creatBuildBlockDragging = false;
    if (this.creatBuildBlockPreview) { this.creatBuildBlockPreview = null; }
    if (this.creatBuildNewBlockPreview) { this.creatBuildNewBlockPreview.destroy(); this.creatBuildNewBlockPreview = null; }
    this.creatBuildNewBlockCdUntil = 0;
    this.creatBuildLaunchCdUntil = 0;
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
    if (this.creatMech) {
      const m = this.creatMech;
      m.rig.destroy(); m.hpBar.destroy(); m.hpBg.destroy(); m.prompt?.destroy();
      this.creatMech = null;
    }
    for (const o of this.creatMedOrbs) o.gfx.destroy();
    this.creatMedOrbs = [];
    this.nexusRebuildAt = 0;
    this.playerHold = null;
    this.api.setStatusIndicator('creation-mech', null);
    for (let i = 0; i < 2; i++) this.api.setStatusIndicator(`creation-mech-arm-${i}`, null);

    // Mastery reset
    this.mortarLastCastAt = -MORTAR_COOLDOWN_MS;
    this.creatHexEnds.clear();
    this.creatHexDrainAccum = { player: 0, npc: 0 };
    this.creatHexReloadOn = { player: false, npc: false };
    this.prevDodging = false;
    this.dashFromX = 0; this.dashFromY = 0;
    this.workshopTrackedEnemies = new WeakSet<Fighter>();
  }

  /**
   * Build the Nexus at the arena centre. Called once per match from ArenaScene.create()
   * when either side is playing Creation.
   */
  spawnNexus(cx: number, cy: number): void {
    this.nexusX = cx;
    this.nexusY = cy;
    // The whole machine — riveted plinth, counter-rotating gears, caged core — is one
    // self-driving rig (see CreationNexus); the kit just tells it what it is doing.
    this.nexusRig = new CreationNexus(this.scene, this.pcol, cx, cy, 3);
    this.nexusLabel = this.add.text(cx, cy + 52, 'Nexus',
      { fontSize: '11px', fontFamily: 'Arial', color: '#ff99cc' }).setOrigin(0.5).setDepth(4);
    // It powers on rather than blinking into being.
    this.pfx.gearPulse(cx, cy, 46, 700, CREATION.nexusLit, 5);
    this.pfx.sparks(cx, cy, 10, { speed: 120, size: 2.4, life: 620, depth: 5 });
  }

  // ── Spawners (called from CastContext) ───────────────────────────

  spawnDaggers(fromX: number, fromY: number, tx: number, ty: number, count: number, owner: 'player' | 'npc'): void {
    // Daggers launch fanned 30° apart, then curve to converge on the cursor and fly straight past it.
    const baseAngle = Math.atan2(ty - fromY, tx - fromX);
    const speed = 620;
    const spread = Phaser.Math.DegToRad(30);
    const tint = this.col(owner);
    const fx = this.fx(owner);
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i - (count - 1) / 2) * spread;
      const spr = this.add.graphics().setDepth(7);
      drawDagger(spr, tint);
      spr.setPosition(fromX, fromY).setRotation(a);
      this.creatDaggers.push({
        sprite: spr, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        damage: 8, owner, hitSet: new Set(), cutSet: new Set(),
        targetX: tx, targetY: ty, converged: false,
      });
    }
    // One throw, one gesture — a wide arm-sweep along the fan, sized to how many went out.
    this.gesture(owner, 'sweep', baseAngle, 300 + count * 30);
    fx.sparks(fromX + Math.cos(baseAngle) * 20, fromY + Math.sin(baseAngle) * 20, 3 + count,
      { angle: baseAngle, spread: 0.7, speed: 180, size: 2, life: 320, depth: 6 });
  }

  spawnBolt(fromX: number, fromY: number, tx: number, ty: number, tier: 'copper' | 'silver' | 'gold', owner: 'player' | 'npc'): void {
    const dx = tx - fromX, dy = ty - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 380;
    const angle = Math.atan2(dy, dx);
    const damages: Record<string, number> = { copper: 5, silver: 10, gold: 15 };
    const spr = this.add.graphics().setDepth(7);
    drawBolt(spr, this.col(owner), tier);
    spr.setPosition(fromX + (dx / len) * 24, fromY + (dy / len) * 24).setRotation(angle);
    this.creatBolts.push({ sprite: spr, vx: (dx / len) * speed, vy: (dy / len) * speed, tier, damage: damages[tier], owner });
    // The bigger the slug, the bigger the recoil.
    const scale = tier === 'gold' ? 1.5 : tier === 'silver' ? 1.2 : 1;
    this.gesture(owner, 'punch', angle);
    this.fx(owner).muzzleFlash(fromX + (dx / len) * 22, fromY + (dy / len) * 22, angle, scale);
  }

  /** R — hurl a wrench along the aim. It tumbles, so the throw reads even at speed. */
  spawnWrench(fromX: number, fromY: number, tx: number, ty: number, owner: 'player' | 'npc'): void {
    const dx = tx - fromX, dy = ty - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);
    const spr = this.add.graphics().setDepth(8);
    drawWrench(spr, this.col(owner));
    const sx = fromX + (dx / len) * 24, sy = fromY + (dy / len) * 24;
    spr.setPosition(sx, sy);
    this.creatWrenches.push({
      sprite: spr, x: sx, y: sy,
      vx: (dx / len) * WRENCH_SPEED, vy: (dy / len) * WRENCH_SPEED,
      owner, armedAt: this.scene.time.now + 90,
    });
    // Thrown overhand off the shoulder, with the shop-floor clatter to match.
    this.gesture(owner, 'slam', angle);
    const fx = this.fx(owner);
    fx.sparks(sx, sy, 7, { angle, spread: 0.8, speed: 200, size: 2.2, life: 380, depth: 7 });
  }

  // ── R+ Nexus Awakening ───────────────────────────────────────────

  /** True while the Nexus is standing, armed, and waiting for a wrench (player side only). */
  private get nexusAwakened(): boolean {
    return !!this.nexusRig && !this.creatMech && this.api.elementId === 'creation' && this.api.hasUpgrade('r');
  }

  /** True while a mounted mech is running an Overclock arm — everything built comes out steel. */
  private get mechOverclocked(): boolean {
    return !!this.creatMech?.mounted && this.creatMech.arms.some((a) => a.kind === 'overclock');
  }

  /**
   * The wrench found the charged core: the Nexus folds itself up into a walker on the spot,
   * welding on whichever potions were sitting on its shelf as arms. Everything the Nexus was
   * holding is spent doing it — the machine is the mech now, and it only comes back when the
   * mech is wrecked.
   */
  private awakenNexus(): void {
    const kinds = this.creatPotions
      .filter((p) => p.owner === 'player')
      .sort((a, b) => a.slot - b.slot)
      .map((p) => p.kind);

    // Clear the pedestal: bottles and loaded slugs alike are consumed by the transformation.
    for (let i = this.creatPotions.length - 1; i >= 0; i--) {
      if (this.creatPotions[i].owner !== 'player') continue;
      this.creatPotions[i].gfx.destroy();
      this.creatPotions.splice(i, 1);
    }
    for (const b of this.nexusBolts) b.icon.destroy();
    this.nexusBolts = [];
    this.creatCraftInProgress = false;

    const x = this.nexusX, y = this.nexusY;
    this.nexusRig?.destroy();
    this.nexusRig = null;
    this.nexusLabel?.destroy();
    this.nexusLabel = null;

    // The machine tearing itself apart and standing up out of its own pieces.
    this.pfx.explosion(x, y, 78, { shards: 16, smoke: 3, core: CREATION.rust, debris: false });
    this.pfx.gearPulse(x, y, 70, 760, CREATION.ember, 8);
    this.pfx.ring(x, y, 12, 120, CREATION.spark, 620, 6, 8);
    this.scene.cameras.main.shake(260, 0.007);
    this.api.showFloatingText(x, y - 70, '⚙️ NEXUS AWAKENS', '#ffaa44');

    this.buildMech(x, y, kinds.map((k) => CREATION_POTION_ARM[k]));
  }

  /** Stand a dormant mech up at `x,y` with the given arms welded on. */
  private buildMech(x: number, y: number, kinds: MechArmKind[]): void {
    const rig = new CreationMechRig(this.scene, this.pcol, 5);
    const arms: CreationMechArm[] = kinds.slice(0, 2).map((kind, i) => {
      const view = rig.arm(i as 0 | 1);
      view.kind = kind;
      return {
        kind, view, cd: 0, heatMs: 0, coolUntil: 0, biteAt: 0,
        held: null, heldUntil: 0, heldAngle: 0,
      };
    });
    // An Overclock arm supercharges whatever is on the *other* side. Two of them feed each
    // other, which is how a double-overclock build ends up boosted on both arms.
    if (arms.length === 2) {
      if (arms[0].kind === 'overclock') arms[1].view.boosted = true;
      if (arms[1].kind === 'overclock') arms[0].view.boosted = true;
    }

    let maxHp = MECH_HP;
    for (const a of arms) {
      if (a.kind === 'shield') maxHp += a.view.boosted ? SHIELD_BONUS_HP + 15 : SHIELD_BONUS_HP;
    }

    const hpBg = this.add.rectangle(x, y + 58, 60, 6, 0x221108, 0.85).setDepth(10);
    const hpBar = this.add.rectangle(x - 30, y + 58, 60, 6, CREATION.brass, 0.95).setDepth(11).setOrigin(0, 0.5);
    const prompt = this.add.text(x, y - 62, '[R] BOARD', {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#ffcc66', stroke: '#2a1206', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(16);

    this.creatMech = { rig, hp: maxHp, maxHp, hpBar, hpBg, arms, mounted: false, x, y, hits: 0, prompt };
    // Announce what it came out of the forge carrying.
    arms.forEach((a, i) => {
      const info = CREATION_MECH_ARM_INFO[a.kind];
      this.scene.time.delayedCall(240 + i * 220, () => {
        this.api.showFloatingText(x + (i === 0 ? 34 : -34), y - 18,
          `${info.emoji} ${info.name.toUpperCase()}`,
          `#${MECH_ARM_TONES[a.kind].toString(16).padStart(6, '0')}`);
      });
    });
  }

  /**
   * Climb in. Returns true when the key press was spent boarding, so the caller knows not to
   * also throw a wrench with it.
   */
  private tryBoardMech(): boolean {
    const mech = this.creatMech;
    if (!mech || mech.mounted || this.creatBuildMode) return false;
    if (!Phaser.Input.Keyboard.JustDown(this.api.rKey)) return false;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, mech.x, mech.y) > MECH_MOUNT_RANGE) return false;

    mech.mounted = true;
    mech.prompt?.destroy();
    mech.prompt = null;
    // Only claim the absorber slot if nothing else owns it — same rule the old build used.
    if (!this.player.damageAbsorber) {
      this.player.damageAbsorber = (amt: number) => this.absorbIntoMech(amt);
    }
    this.gesture('player', 'flex');
    this.pfx.gearPulse(this.player.x, this.player.y, 46, 620, CREATION.brass, 7);
    this.pfx.ring(this.player.x, this.player.y, 10, 90, CREATION.spark, 460, 5, 7);
    this.pfx.hammerStrike(this.player.x, this.player.y + 20, -Math.PI / 2, 1.3);
    this.api.showFloatingText(this.player.x, this.player.y - 56, '🤖 MECH ONLINE', '#ffaa44');
    return true;
  }

  /** How many hits the Shield arms swallow one in. 0 = no shield arm on this mech. */
  private mechBlockEvery(mech: CreationMech): number {
    const shields = mech.arms.filter((a) => a.kind === 'shield');
    if (shields.length === 0) return 0;
    if (shields.length >= 2) return 3;
    return shields[0].view.boosted ? 4 : 5;
  }

  /** Damage routed into the mech instead of the pilot. Always absorbs — that is the point. */
  private absorbIntoMech(amount: number): boolean {
    const mech = this.creatMech;
    if (!mech || !mech.mounted) return false;
    mech.hits++;
    const every = this.mechBlockEvery(mech);
    if (every > 0 && mech.hits % every === 0) {
      // A shield arm eats this one whole.
      for (const a of mech.arms) if (a.kind === 'shield') a.view.fire = 1;
      this.pfx.ring(mech.x, mech.y - 10, 14, 62, MECH_ARM_TONES.shield, 340, 4, 10);
      this.pfx.flash(mech.x, mech.y - 10, 22, 10);
      this.api.showFloatingText(mech.x, mech.y - 58, 'BLOCKED', '#66aaff');
      return true;
    }
    mech.hp -= amount;
    this.api.spawnHitFlash(mech.x, mech.y - 8, CREATION.brass);
    // Plating spalling off wherever it just took the hit.
    this.pfx.sparks(mech.x, mech.y - 8, 6, { speed: 150, size: 2.2, life: 400, depth: 10 });
    if (mech.hp <= 0) this.wreckMech();
    return true;
  }

  /** The mech comes apart; the Nexus starts rebuilding itself out of what is left. */
  private wreckMech(): void {
    const mech = this.creatMech;
    if (!mech) return;
    for (const a of mech.arms) this.releaseGrab(a);
    mech.rig.wreck(mech.x, mech.y);
    mech.rig.destroy();
    mech.hpBar.destroy();
    mech.hpBg.destroy();
    mech.prompt?.destroy();
    if (mech.mounted) {
      this.player.damageAbsorber = null;
      if (this.playerHold === 'ride') this.hold('player', null);
      this.api.showFloatingText(this.player.x, this.player.y - 46, 'MECH DESTROYED', '#ff4422');
    }
    this.creatMech = null;
    this.api.setStatusIndicator('creation-mech', null);
    for (let i = 0; i < 2; i++) this.api.setStatusIndicator(`creation-mech-arm-${i}`, null);
    // The Nexus reassembles where it always was — losing it for good would take the whole
    // brewing half of the element off the table for the rest of the match.
    this.nexusRebuildAt = this.scene.time.now + NEXUS_REBUILD_MS;
  }

  private releaseGrab(arm: CreationMechArm): void {
    if (!arm.held) return;
    arm.held = null;
    arm.heldUntil = 0;
    arm.view.grip = 0;
  }

  /**
   * `countAsBuild` is false for the halves Blade Split leaves behind — cutting a wall in two
   * isn't building two more, and the `wallsBuilt` requirement would run away if it were.
   */
  spawnBlocker(cx: number, cy: number, w: number, h: number, owner: 'player' | 'npc', countAsBuild = true): void {
    if (owner === 'player' && countAsBuild) this.api.recordMasteryStat('wallsBuilt', 1);
    // Overclock arm: what comes off the line is plate, not board, and twice as tough.
    const steel = owner === 'player' && this.mechOverclocked;
    const maxHp = steel ? 125 * STEEL_PLATE_HP_MULT : 125;
    const rect = this.add.graphics().setDepth(4);
    plankPanel(rect, this.col(owner), w, h, 0.92, { steel });
    rect.setPosition(cx, cy);
    const hpBg = this.add.rectangle(cx, cy - h / 2 - 6, w, 4, 0x333333).setDepth(5);
    const hpBar = this.add.rectangle(cx - w / 2, cy - h / 2 - 6, w, 4, CREATION.tan).setDepth(6).setOrigin(0, 0.5);
    this.creatBlockers.push({ rect, x: cx, y: cy, w, h, hp: maxHp, maxHp, owner, hpBar, hpBg });
    // Halves left by Blade Split were already standing — only a fresh build gets assembled.
    if (countAsBuild) {
      this.fx(owner).assemble(cx, cy, w, h);
      this.gesture(owner, 'clap', Math.atan2(cy - (owner === 'player' ? this.player.y : this.npc.y),
        cx - (owner === 'player' ? this.player.x : this.npc.x)));
    }
  }

  // ── Wrenched (the R debuff) ──────────────────────────────────────

  /**
   * Jam a wrench in someone's gear. `Fighter.castPunish*` is the only honest chokepoint for
   * "an ability was used", so the cost is charged there; everything here is bookkeeping and
   * the visual that makes it readable.
   */
  private applyWrench(victim: Fighter, owner: 'player' | 'npc'): void {
    victim.castPunishUntil = Math.max(victim.castPunishUntil, Date.now() + WRENCH_PUNISH_MS);
    victim.castPunishDamage = WRENCH_PUNISH_DAMAGE;
    const fx = this.fx(owner);
    victim.onCastPunish = () => {
      // Their own cast grinding against the wrench: a hard gear pulse and a shower of swarf.
      fx.gearPulse(victim.x, victim.y, 26, 380, CREATION.rust, 9);
      fx.sparks(victim.x, victim.y, 8, { speed: 170, size: 2.2, life: 420, depth: 9 });
    };
    this.wrenchedSides.add(victim);
    this.api.showFloatingText(victim.x, victim.y - 46, '🔧 WRENCHED', '#cc6622');
  }

  private clearWrench(victim: Fighter): void {
    victim.castPunishUntil = 0;
    victim.castPunishDamage = 0;
    victim.onCastPunish = null;
  }

  /** Drop the debuff off anyone whose 5 seconds are up. */
  private updateWrenchDebuffs(): void {
    if (this.wrenchedSides.size === 0) return;
    const now = Date.now();
    for (const f of this.wrenchedSides) {
      if (now < f.castPunishUntil && f.active) continue;
      this.clearWrench(f);
      this.wrenchedSides.delete(f);
    }
  }

  // Q — Workshop: the "maze" ctx name is legacy; it now builds a 30s wooden workshop.
  spawnMaze(owner: 'player' | 'npc'): void {
    const time = this.scene.time.now;
    const W = this.api.width, H = this.api.height;
    this.creatWorkshopEnd = time + 30000;
    this.creatWorkshopOwner = owner;
    if (!this.creatWorkshopOverlay) {
      // A boarded floor laid over the whole arena, below the fighters: planks with grain,
      // a rivet at each corner, and a heavy frame around the edge.
      const floor = this.add.graphics().setDepth(0);
      floor.setPosition(W / 2, H / 2);
      plankPanel(floor, this.col(owner), W, H, 0.34, { boardH: 46, frame: 6 });
      this.creatWorkshopOverlay = floor;
    }
    const caster = owner === 'player' ? this.player : this.npc;
    const fx = this.fx(owner);
    // The floor gets hammered down: a strike at the caster, boards flashing in, dust everywhere.
    fx.hammerStrike(caster.x, caster.y + 18, Math.PI / 2, 1.6);
    fx.ring(caster.x, caster.y, 20, Math.max(W, H) * 0.75, CREATION.tan, 620, 8, 1);
    fx.sawdust(W / 2, H / 2, W, H, 40);
    fx.gearPulse(caster.x, caster.y, 60, 700, CREATION.gold, 5);
    this.gesture(owner, 'raise');
    this.api.showFloatingText(caster.x, caster.y - 40, '🔨 WORKSHOP', '#d9a066');
    // Q+ Ultimate Invention: draggable danger/bias/clutter sliders + an unstable timer.
    if (owner === 'player' && this.api.hasUpgrade('q')) this.startUltimateInvention();
    // Automaton perk: spawn 3 wandering bots
    if (this.api.hasPerk(owner, 'automaton')) this.spawnAutomatons(owner, 3);
  }

  // ── Nexus crafting ───────────────────────────────────────────────

  /** Keep the machine turning, and let it show what it is doing. */
  private updateNexusEnergy(delta: number): void {
    if (!this.nexusRig) return;
    this.nexusRig.setBrewing(this.creatCraftInProgress);
    this.nexusRig.setLoad(this.nexusBolts.length);
    this.nexusRig.setAwakened(this.nexusAwakened);
    this.nexusRig.update(delta);
  }

  /** How many potions this side may leave on the nexus — E+ (Electro Bolt) raises it to 2. */
  private nexusPotionCapacity(owner: 'player' | 'npc'): number {
    return (owner === 'player' ? this.api.hasUpgrade('e') : this.api.hasNpcUpgrade('e')) ? 2 : 1;
  }

  private resolveNexusCraft(_time: number, forceKey?: string, forceOwner?: 'player' | 'npc'): void {
    const tiers = forceKey ? [] : this.nexusBolts.map((b) => b.tier).sort();
    // Two-bolt recipes: cc, cs, cg, ss, sg, gg (tier initials, sorted alphabetically).
    const key = forceKey ?? tiers.map((t) => t[0]).join('');
    const owner = forceOwner ?? this.creatCraftOwner;
    // Save last craft key for E+ Electro Bolt
    if (!forceKey) this.creatLastCraftKey = key;

    // Clear bolt icons and craft state (skip when re-crafting via Electro Bolt)
    if (!forceKey) {
      for (const b of this.nexusBolts) b.icon.destroy();
      this.nexusBolts = [];
      this.creatCraftInProgress = false;
    }

    const kind = CREATION_POTION_BY_RECIPE.get(key);
    if (!kind) return;
    if (owner === 'player') this.api.recordMasteryStat('nexusCrafts', 1);

    // The machine finishes its cycle and coughs the brew out, tinted to whatever came out.
    const fx = this.fx(owner);
    fx.gearPulse(this.nexusX, this.nexusY, 44, 560, CREATION.nexusLit, 8);
    fx.ring(this.nexusX, this.nexusY, 12, 70, CREATION_POTIONS[kind].color, 460, 5, 8);
    fx.sparks(this.nexusX, this.nexusY, 14, { speed: 190, size: 2.6, life: 560, depth: 8 });

    this.spawnCreationPotion(kind, owner);
  }

  // ── Nexus potions ────────────────────────────────────────────────

  /**
   * Set a freshly brewed potion down on the nexus, where it waits until its owner walks over
   * and drinks it. Each side holds one at a time (two once E+ is bought) — brewing past the
   * cap discards that side's oldest bottle to make room.
   */
  private spawnCreationPotion(kind: CreationPotionKind, owner: 'player' | 'npc'): void {
    const cap = this.nexusPotionCapacity(owner);
    const fx = this.fx(owner);
    while (this.creatPotions.filter((p) => p.owner === owner).length >= cap) {
      const [stale] = this.creatPotions.splice(this.creatPotions.findIndex((p) => p.owner === owner), 1);
      // Displaced bottles are dropped and smash, rather than politely dissolving.
      fx.shrapnel(stale.x, stale.y, 7, 22, 8);
      fx.ring(stale.x, stale.y, 3, 22, CREATION.silver, 260, 2, 8);
      stale.gfx.destroy();
    }

    // Lowest free shelf slot, so a replacement never lands on top of a surviving bottle.
    const used = new Set(this.creatPotions.filter((p) => p.owner === owner).map((p) => p.slot));
    let slot = 0;
    while (used.has(slot)) slot++;

    const def = CREATION_POTIONS[kind];
    const x = this.nexusX + (cap > 1 ? (slot === 0 ? -20 : 20) : 0);
    // Sits above the loaded-bolt icons at -44. A mirror match puts both sides' bottles on the
    // same nexus, so the npc's shelf is stacked higher again to keep them apart.
    const y = this.nexusY - (owner === 'player' ? 62 : 92);

    // One Graphics for the whole bottle, redrawn each frame in updateCreationPotions so the
    // liquid rocks, the bubbles rise and it bobs on the pedestal without a stack of tweens.
    const gfx = this.add.graphics().setDepth(6);
    drawFlask(gfx, this.col(owner), def.color, 0);
    gfx.setPosition(x, y);

    this.creatPotions.push({ kind, owner, slot, x, y, gfx, t: 0 });
    const hex = `#${def.color.toString(16).padStart(6, '0')}`;
    this.api.showFloatingText(this.nexusX, this.nexusY - 96, `${def.emoji} ${def.name.toUpperCase()}`, hex);
  }

  /** Bob the bottles on their shelf, and hand one over when its brewer steps onto the nexus. */
  private updateCreationPotions(time: number, delta: number): void {
    for (let i = this.creatPotions.length - 1; i >= 0; i--) {
      const p = this.creatPotions[i];
      p.t += delta / 1000;
      drawFlask(p.gfx, this.col(p.owner), CREATION_POTIONS[p.kind].color, p.t);
      p.gfx.setPosition(p.x, p.y + Math.sin(p.t * 2.2) * 4);
      const drinker = p.owner === 'player' ? this.player : this.npc;
      if (!drinker.active || drinker.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(this.nexusX, this.nexusY, drinker.x, drinker.y) > 46) continue;
      this.creatPotions.splice(i, 1);
      p.gfx.destroy();
      this.drinkCreationPotion(p.kind, p.owner, time);
    }
  }

  /** Start (or refresh) a potion's effect, doubled if the drinker's Gold Potion is running. */
  private drinkCreationPotion(kind: CreationPotionKind, owner: 'player' | 'npc', time: number): void {
    const def = CREATION_POTIONS[kind];
    const drinker = owner === 'player' ? this.player : this.npc;
    // Gold stretches everything it catches, but never extends its own window.
    const goldOn = kind !== 'gold' && time < (this.creatPotionEnds.get(`${owner}|gold`) ?? 0);
    this.creatPotionEnds.set(`${owner}|${kind}`, time + def.durationMs * (goldOn ? 2 : 1));
    if (kind === 'gold') seedEffectSnapshot(drinker, this.creatGoldSnapshots[owner]);

    const hex = `#${def.color.toString(16).padStart(6, '0')}`;
    this.api.showFloatingText(drinker.x, drinker.y - 40, `${def.emoji} ${def.name.toUpperCase()}`, hex);
    // Downed in one: a swig gesture, the brew washing outward, and the empty bottle smashed.
    const fx = this.fx(owner);
    this.gesture(owner, 'flex');
    fx.ring(drinker.x, drinker.y, 8, 52, def.color, 380, 5, 9);
    fx.sparks(drinker.x, drinker.y, 10, { speed: 130, size: 2.2, life: 520, gravity: -50, depth: 9 });
    fx.shrapnel(drinker.x, drinker.y, 6, 26, 9);
  }

  /**
   * Per-frame application of every live potion effect, for both sides — and of every
   * Mortar Command hex, which is the same table read backwards (see `CREATION_HEXES`).
   */
  private updateCreationPotionEffects(time: number, delta: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const fighter = owner === 'player' ? this.player : this.npc;
      const active = (kind: CreationPotionKind) => time < (this.creatPotionEnds.get(`${owner}|${kind}`) ?? 0);
      const hexed = (kind: CreationPotionKind) => time < (this.creatHexEnds.get(`${owner}|${kind}`) ?? 0);

      // Buff — applied victim-side like Subterfuge's bribe, so it catches direct takeDamage
      // calls (daggers, bolts, constructs) as well as projectiles. Weakened rides the same
      // field from the other direction: everything this side hits takes 25% less.
      const empowered = (active('buff') ? 1.25 : 1) * (hexed('buff') ? 0.75 : 1);
      for (const victim of (owner === 'player' ? this.api.enemies : [this.player])) {
        victim.empoweredIncomingMult = empowered;
      }

      fighter.potionArmorMult = (active('protection') ? 0.75 : 1) * (hexed('protection') ? 1.25 : 1);

      if (active('heal')) {
        this.creatPotionHealAccum[owner] += delta;
        while (this.creatPotionHealAccum[owner] >= 1000 / 3) {
          this.creatPotionHealAccum[owner] -= 1000 / 3;
          fighter.heal(1);
        }
      } else {
        this.creatPotionHealAccum[owner] = 0;
      }

      // Corroding — the Heal Potion run backwards, 3 HP/s off the top.
      if (hexed('heal') && fighter.active && fighter.hp > 0) {
        this.creatHexDrainAccum[owner] += delta;
        while (this.creatHexDrainAccum[owner] >= 1000 / 3) {
          this.creatHexDrainAccum[owner] -= 1000 / 3;
          fighter.takeDamage(1);
        }
      } else {
        this.creatHexDrainAccum[owner] = 0;
      }

      // Reload — cooldownMult is shared with other systems (Timeless, Rebirth), so scale it
      // in once on the edge and back out once, rather than reassigning it every frame.
      const reload = active('reload');
      if (reload !== this.creatPotionReloadOn[owner]) {
        fighter.cooldownMult *= reload ? 0.75 : 1 / 0.75;
        this.creatPotionReloadOn[owner] = reload;
      }
      // Jammed — same edge-only bookkeeping, pushing cooldowns the other way.
      const jammed = hexed('reload');
      if (jammed !== this.creatHexReloadOn[owner]) {
        fighter.cooldownMult *= jammed ? 1.25 : 1 / 1.25;
        this.creatHexReloadOn[owner] = jammed;
      }

      // Gold reaches a side either by drinking it or by eating a gold mortar shell.
      if (active('gold')) stretchNewEffects(fighter, Date.now(), time, 2, this.creatGoldSnapshots[owner]);
      else this.creatGoldSnapshots[owner].clear();
    }

    // Mirror the local player's potions into the top-right effect tray.
    for (const kind of CREATION_POTION_KINDS) {
      const def = CREATION_POTIONS[kind];
      const until = this.creatPotionEnds.get(`player|${kind}`) ?? 0;
      this.api.setStatusIndicator(`creation-potion-${kind}`, time < until
        ? { name: def.name, emoji: def.emoji, color: def.color, description: def.effect, until, priority: 118 }
        : null);
    }
    // ...and the hexes a mortar shell left on them.
    for (const kind of CREATION_HEX_KINDS) {
      const hex = CREATION_HEXES[kind];
      const until = this.creatHexEnds.get(`player|${kind}`) ?? 0;
      this.api.setStatusIndicator(`creation-hex-${kind}`, time < until
        ? { name: hex.name, emoji: hex.emoji, color: CREATION_POTIONS[kind].color, description: hex.effect, until, priority: 117 }
        : null);
    }
  }

  /**
   * Paint the live-effect tell on both fighters: upright bottles orbiting above a fighter for
   * every potion running on them, inverted dripping ones below for every mortar hex.
   */
  private updateBrewAuras(time: number, delta: number): void {
    this.brewAuraT += delta / 1000;
    for (const side of ['player', 'npc'] as const) {
      const fighter = side === 'player' ? this.player : this.npc;
      const potions = CREATION_POTION_KINDS.filter((k) => time < (this.creatPotionEnds.get(`${side}|${k}`) ?? 0));
      const hexes = CREATION_HEX_KINDS.filter((k) => time < (this.creatHexEnds.get(`${side}|${k}`) ?? 0));
      // The wrench rides the same aura: `castPunishUntil` is a wall clock, not the scene one.
      const wrenched = !!fighter && Date.now() < fighter.castPunishUntil;

      if ((potions.length + hexes.length === 0 && !wrenched) || !fighter?.active || fighter.hp <= 0) {
        if (this.brewAura[side]) { this.brewAura[side]!.destroy(); this.brewAura[side] = null; }
        continue;
      }
      if (!this.brewAura[side]) this.brewAura[side] = this.add.graphics().setDepth(9);
      const g = this.brewAura[side]!;
      if (!g.active) { this.brewAura[side] = null; continue; }
      g.clear();
      const alpha = fighter.forceInvisible ? 0 : fighter.alpha;
      if (alpha <= 0.02) continue;
      const tint = this.col(side);

      const bottle = (bx: number, by: number, color: number, flipped: boolean, a: number) => {
        const s = flipped ? -1 : 1;
        g.fillStyle(color, 0.45 * a);
        g.fillCircle(bx, by, 8);
        g.fillStyle(color, 0.95 * a);
        g.fillCircle(bx, by, 4.4);
        g.fillStyle(tint(CREATION.brass), 0.95 * a);
        g.fillRect(bx - 2.4, by - s * 8, 4.8, 4 * s);
        g.fillStyle(tint(CREATION.white), 0.7 * a);
        g.fillCircle(bx - 1.6, by - 1.6, 1.3);
      };

      // Potions ride a shallow ring above the head.
      potions.forEach((kind, i) => {
        const p = this.brewAuraT * 1.1 + (i / Math.max(1, potions.length)) * Math.PI * 2;
        bottle(fighter.x + Math.cos(p) * 22, fighter.y - 30 + Math.sin(p) * 5,
          CREATION_POTIONS[kind].color, false, alpha);
      });
      // Hexes hang upside-down at the feet and drip.
      hexes.forEach((kind, i) => {
        const p = -this.brewAuraT * 0.9 + (i / Math.max(1, hexes.length)) * Math.PI * 2;
        const bx = fighter.x + Math.cos(p) * 20;
        const by = fighter.y + 22 + Math.sin(p) * 4;
        bottle(bx, by, CREATION_POTIONS[kind].color, true, alpha * 0.9);
        const drip = (this.brewAuraT * 1.6 + i * 0.37) % 1;
        g.fillStyle(CREATION_POTIONS[kind].color, 0.7 * alpha * (1 - drip));
        g.fillCircle(bx, by + 6 + drip * 12, 2 * (1 - drip * 0.6));
      });

      // Wrenched: the spanner itself stuck through their works, juddering as it binds.
      if (wrenched) {
        const bind = Math.sin(this.brewAuraT * 14) * 0.12;
        wrenchShape(g, tint, fighter.x + 16, fighter.y - 16, -0.7 + bind, 0.72, alpha * 0.95);
        g.lineStyle(2, tint(CREATION.rust), alpha * (0.25 + 0.25 * Math.sin(this.brewAuraT * 9)));
        g.strokeCircle(fighter.x + 16, fighter.y - 16, 15);
      }
    }
  }

  private updateCreationWorkshop(time: number, delta: number): void {
    if (time >= this.creatWorkshopEnd) {
      if (this.creatWorkshopOverlay) { this.creatWorkshopOverlay.destroy(); this.creatWorkshopOverlay = null; }
      for (const t of this.creatWorkshopTrail) t.destroy();
      this.creatWorkshopTrail = [];
      if (this.creatInventionActive) this.endUltimateInvention();
      return;
    }
    // Sawdust footprints stamped behind the workshop owner — the floor is theirs, and the
    // trail is the read on which side that is.
    const walker = this.creatWorkshopOwner === 'player' ? this.player : this.npc;
    const tint = this.col(this.creatWorkshopOwner);
    this.creatWorkshopTrailAccum += delta;
    if (this.creatWorkshopTrailAccum >= 70) {
      this.creatWorkshopTrailAccum = 0;
      const step = this.add.graphics().setDepth(1);
      const vel = (walker.body as Phaser.Physics.Arcade.Body | null)?.velocity;
      const ang = Math.atan2(vel?.y ?? 0, vel?.x ?? 1);
      for (let i = 0; i < 5; i++) {
        const a = ang + (i - 2) * 0.6;
        craftPlank(step, tint, Math.cos(a) * 9, Math.sin(a) * 9, a, 12, 2.6, 0.7);
      }
      rivet(step, tint, 0, 0, 3);
      step.setPosition(walker.x, walker.y + 6).setScale(1, 0.55);
      this.tweens.add({ targets: step, alpha: 0, duration: 620, onComplete: () => step.destroy() });
      this.creatWorkshopTrail.push(step);
    }
    this.creatWorkshopTrail = this.creatWorkshopTrail.filter((t) => t.active);
  }

  // ── Q+ Ultimate Invention ────────────────────────────────────────

  private startUltimateInvention(): void {
    this.teardownInventionUi();
    this.creatInventionActive = true;
    this.creatInventionTimer = 30000;
    this.creatSliderDanger = 0; this.creatSliderBias = 0; this.creatSliderClutter = 0;
    this.creatClutterLevel = -1;
    this.creatSawAccum = 0; this.creatNailAccum = 0; this.creatBiasHealAccum = 0;
    this.creatInventionDragSlider = -1;
    const labels = ['Danger', 'Bias', 'Clutter'];
    const colors = [0xff5544, 0xffcc33, 0x88aaff];
    const x0 = INVENTION_SLIDER_X, y0 = INVENTION_SLIDER_Y, trackW = INVENTION_SLIDER_W, rowH = INVENTION_SLIDER_ROW;
    for (let i = 0; i < 3; i++) {
      const y = y0 + i * rowH;
      const lbl = this.add.text(x0, y - 13, labels[i], { fontSize: '12px', color: '#ffffff' }).setScrollFactor(0).setDepth(60);
      const track = this.add.rectangle(x0, y + 6, trackW, 8, 0x222228, 0.9).setOrigin(0, 0.5).setScrollFactor(0).setDepth(60).setStrokeStyle(1, 0x555560, 1);
      const fill = this.add.rectangle(x0, y + 6, 0, 8, colors[i], 0.9).setOrigin(0, 0.5).setScrollFactor(0).setDepth(61);
      const handle = this.add.rectangle(x0, y + 6, 10, 18, 0xffffff, 1).setScrollFactor(0).setDepth(62).setStrokeStyle(1, 0x000000, 0.5);
      this.creatSliderFills.push(fill);
      this.creatSliderHandles.push(handle);
      this.creatInventionUi.push(lbl, track, fill, handle);
    }
    this.creatInventionTimerText = this.add.text(x0, y0 + 3 * rowH - 2, '30.0s', { fontSize: '16px', fontStyle: 'bold', color: '#ff3333' }).setScrollFactor(0).setDepth(62);
    this.creatInventionUi.push(this.creatInventionTimerText);
  }

  private teardownInventionUi(): void {
    for (const o of this.creatInventionUi) o.destroy();
    this.creatInventionUi = [];
    this.creatSliderFills = [];
    this.creatSliderHandles = [];
    this.creatInventionTimerText = null;
  }

  private endUltimateInvention(): void {
    this.creatInventionActive = false;
    this.teardownInventionUi();
    for (const b of this.creatClutterBoxes) b.rect.destroy();
    this.creatClutterBoxes = []; this.creatClutterLevel = -1;
    this.creatSliderDanger = 0; this.creatSliderBias = 0; this.creatSliderClutter = 0;
    this.creatInventionDragSlider = -1;
    this.player.outgoingDamageMult = 1;
  }

  /** Read pointer drags over the three sliders. Returns true if a slider is being dragged. */
  private updateInventionSliderInput(pointer: Phaser.Input.Pointer): boolean {
    if (!this.creatInventionActive) return false;
    const x0 = INVENTION_SLIDER_X, y0 = INVENTION_SLIDER_Y, trackW = INVENTION_SLIDER_W, rowH = INVENTION_SLIDER_ROW;
    const px = pointer.x, py = pointer.y;
    if (pointer.isDown) {
      if (this.creatInventionDragSlider < 0) {
        for (let i = 0; i < 3; i++) {
          const y = y0 + i * rowH + 6;
          if (px >= x0 - 14 && px <= x0 + trackW + 14 && Math.abs(py - y) <= 15) { this.creatInventionDragSlider = i; break; }
        }
      }
      if (this.creatInventionDragSlider >= 0) {
        const v = Phaser.Math.Clamp((px - x0) / trackW, 0, 1);
        if (this.creatInventionDragSlider === 0) this.creatSliderDanger = v;
        else if (this.creatInventionDragSlider === 1) this.creatSliderBias = v;
        else this.creatSliderClutter = v;
      }
    } else {
      this.creatInventionDragSlider = -1;
    }
    const vals = [this.creatSliderDanger, this.creatSliderBias, this.creatSliderClutter];
    for (let i = 0; i < 3; i++) {
      if (this.creatSliderFills[i]) this.creatSliderFills[i].setSize(vals[i] * trackW, 8);
      if (this.creatSliderHandles[i]) this.creatSliderHandles[i].setX(x0 + vals[i] * trackW);
    }
    return this.creatInventionDragSlider >= 0;
  }

  private updateUltimateInvention(time: number, delta: number): void {
    if (!this.creatInventionActive) return;
    // Instability: raised sliders drain the timer faster.
    const instability = 1 + (this.creatSliderDanger + this.creatSliderBias + this.creatSliderClutter) * 1.5;
    this.creatInventionTimer -= delta * instability;
    if (this.creatInventionTimerText) this.creatInventionTimerText.setText(`${Math.max(0, this.creatInventionTimer / 1000).toFixed(1)}s`);
    if (this.creatInventionTimer <= 0) { this.endUltimateInvention(); return; }
    // Danger: saws + nail bursts, more frequent at higher danger.
    if (this.creatSliderDanger > 0) {
      this.creatSawAccum += delta;
      if (this.creatSawAccum >= 4000 - this.creatSliderDanger * 2600) { this.creatSawAccum = 0; this.spawnCreationSaw('player'); }
      this.creatNailAccum += delta;
      if (this.creatNailAccum >= 3500 - this.creatSliderDanger * 2200) { this.creatNailAccum = 0; this.spawnCreationNailBurst('player'); }
    }
    // Bias: passive 3 HP/s heal above 50%.
    if (this.creatSliderBias > 0.5) {
      this.creatBiasHealAccum += delta;
      if (this.creatBiasHealAccum >= 1000) { this.creatBiasHealAccum -= 1000; this.player.heal(3); this.api.showFloatingText(this.player.x, this.player.y - 34, '+3', '#ffcc33'); }
    } else {
      this.creatBiasHealAccum = 0;
    }
    // Clutter: rebuild boxes when the tier changes.
    const clutterLevel = Math.round(this.creatSliderClutter * 4);
    if (clutterLevel !== this.creatClutterLevel) { this.creatClutterLevel = clutterLevel; this.rebuildClutterBoxes(clutterLevel); }
    void time;
  }

  private spawnCreationSaw(owner: 'player' | 'npc'): void {
    const W = this.api.width, H = this.api.height;
    const fromLeft = Math.random() < 0.5;
    const y = 80 + Math.random() * (H - 160);
    const x = fromLeft ? -24 : W + 24;
    const vx = (fromLeft ? 1 : -1) * (240 + Math.random() * 140);
    const g = this.add.graphics().setDepth(6);
    drawSaw(g, this.col(owner), 22);
    g.setPosition(x, y);
    this.creatSaws.push({ sprite: g, x, y, vx, owner, hitSet: new Set() });
  }

  private updateCreationSaws(delta: number): void {
    const W = this.api.width;
    for (let si = this.creatSaws.length - 1; si >= 0; si--) {
      const s = this.creatSaws[si];
      s.x += s.vx * (delta / 1000);
      s.sprite.setPosition(s.x, s.y);
      s.sprite.rotation += 12 * (delta / 1000);
      if (s.x < -40 || s.x > W + 40) { s.sprite.destroy(); this.creatSaws.splice(si, 1); continue; }
      for (const en of (s.owner === 'player' ? this.api.enemies : [this.player])) {
        if (!en.active || en.hp <= 0) continue;
        const tId = en === this.player ? 'player' : String(this.api.enemies.indexOf(en as Fighter));
        if (!s.hitSet.has(tId) && Phaser.Math.Distance.Between(s.x, s.y, en.x, en.y) <= 30) {
          en.takeDamage(25);
          this.api.spawnHitFlash(en.x, en.y, CREATION.silver);
          // A blade that bites throws a spray of sparks off the contact point.
          this.fx(s.owner).sparks(en.x, en.y, 12,
            { angle: s.vx > 0 ? 0 : Math.PI, spread: 1.1, speed: 240, size: 2.6, life: 480, depth: 7 });
          s.hitSet.add(tId);
        }
      }
    }
  }

  private spawnCreationNailBurst(owner: 'player' | 'npc'): void {
    const W = this.api.width, H = this.api.height;
    const side = Math.floor(Math.random() * 4);
    let ox = 0, oy = 0, baseAng = 0;
    if (side === 0) { ox = -10; oy = 60 + Math.random() * (H - 120); baseAng = 0; }
    else if (side === 1) { ox = W + 10; oy = 60 + Math.random() * (H - 120); baseAng = Math.PI; }
    else if (side === 2) { ox = 60 + Math.random() * (W - 120); oy = -10; baseAng = Math.PI / 2; }
    else { ox = 60 + Math.random() * (W - 120); oy = H + 10; baseAng = -Math.PI / 2; }
    const speed = 380;
    const tint = this.col(owner);
    for (let i = 0; i < 5; i++) {
      const a = baseAng + (i - 2) * Phaser.Math.DegToRad(14);
      const spr = this.add.graphics().setDepth(6);
      drawNail(spr, tint);
      spr.setPosition(ox, oy).setRotation(a);
      this.creatNails.push({ sprite: spr, x: ox, y: oy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, damage: 10, owner });
    }
    // A nail gun going off just off screen.
    this.fx(owner).muzzleFlash(ox, oy, baseAng, 1.2);
  }

  private updateCreationNails(delta: number): void {
    const W = this.api.width, H = this.api.height;
    for (let ni = this.creatNails.length - 1; ni >= 0; ni--) {
      const n = this.creatNails[ni];
      n.x += n.vx * (delta / 1000);
      n.y += n.vy * (delta / 1000);
      n.sprite.setPosition(n.x, n.y);
      if (n.x < -30 || n.x > W + 30 || n.y < -30 || n.y > H + 30) { n.sprite.destroy(); this.creatNails.splice(ni, 1); continue; }
      let hit = false;
      for (const en of (n.owner === 'player' ? this.api.enemies : [this.player])) {
        if (!en.active || en.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(n.x, n.y, en.x, en.y) <= 18) {
          en.takeDamage(n.damage);
          this.api.spawnHitFlash(en.x, en.y, CREATION.silver);
          this.fx(n.owner).sparks(n.x, n.y, 5,
            { angle: Math.atan2(-n.vy, -n.vx), spread: 0.8, speed: 150, size: 1.8, life: 340, depth: 7 });
          hit = true; break;
        }
      }
      if (hit) { n.sprite.destroy(); this.creatNails.splice(ni, 1); }
    }
  }

  private rebuildClutterBoxes(level: number): void {
    for (const b of this.creatClutterBoxes) b.rect.destroy();
    this.creatClutterBoxes = [];
    if (level <= 0) return;
    const W = this.api.width, H = this.api.height;
    const owner = this.creatWorkshopOwner;
    const box = 46, gap = box + 6;
    const expireAt = this.creatWorkshopEnd;
    for (let r = 0; r < level; r++) {
      const inset = 24 + r * gap;
      for (let x = inset; x <= W - inset; x += gap) {
        this.pushClutterBox(x, inset, box, owner, expireAt);
        this.pushClutterBox(x, H - inset, box, owner, expireAt);
      }
      for (let y = inset + gap; y <= H - inset - gap; y += gap) {
        this.pushClutterBox(inset, y, box, owner, expireAt);
        this.pushClutterBox(W - inset, y, box, owner, expireAt);
      }
    }
  }

  private pushClutterBox(x: number, y: number, size: number, owner: 'player' | 'npc', expireAt: number): void {
    // Keep the nexus reachable.
    if (this.nexusRig && Math.abs(x - this.nexusX) < size && Math.abs(y - this.nexusY) < size) return;
    const rect = this.add.graphics().setDepth(4);
    plankPanel(rect, this.col(owner), size, size, 0.95, { boardH: 15 });
    rect.setPosition(x, y);
    this.creatClutterBoxes.push({ rect, x, y, w: size, h: size, owner, expireAt, spiked: false, spikeAccum: 0 });
  }

  private updateCreationClutter(time: number): void {
    if (this.creatClutterBoxes.length === 0) return;
    const owner = this.creatWorkshopOwner;
    const enemyBody = (owner === 'player' ? this.npc : this.player).body as Phaser.Physics.Arcade.Body;
    const allProj = this.api.projectiles.getChildren() as Projectile[];
    for (let i = this.creatClutterBoxes.length - 1; i >= 0; i--) {
      const b = this.creatClutterBoxes[i];
      if (time >= b.expireAt) { b.rect.destroy(); this.creatClutterBoxes.splice(i, 1); continue; }
      for (const proj of allProj) {
        if (!proj.active) continue;
        const isEnemyProj = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!isEnemyProj) continue;
        if (Math.abs(proj.x - b.x) <= b.w / 2 && Math.abs(proj.y - b.y) <= b.h / 2) {
          proj.setActive(false).setVisible(false);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
        }
      }
      this.api.pushFighterOutOfRect(enemyBody, b.x, b.y, b.w, b.h);
    }
  }

  // ── Speed multipliers ────────────────────────────────────────────

  /** Creation's contribution to the player's speed multiplier, given ArenaScene's base value. */
  computePlayerSpeedMult(time: number, base: number): number {
    let mult = base;
    // Speed pad boost (F+ Build Mode)
    if (time < this.creatPlayerSpeedPadEnd) mult *= 1.25;
    // R+ mech: heavy to walk in, unless an Overclock arm is driving the legs.
    if (this.creatMech?.mounted) {
      mult *= MECH_SPEED_MULT;
      for (const a of this.creatMech.arms) if (a.kind === 'overclock') mult *= OVERCLOCK_SPEED_MULT;
    }
    // Q Workshop: +25% while active
    if (time < this.creatWorkshopEnd && this.creatWorkshopOwner === 'player') mult *= 1.25;
    // Speed Potion: +50%
    if (time < (this.creatPotionEnds.get('player|speed') ?? 0)) mult *= 1.5;
    // Ultimate Invention — Bias slider: scaling speed
    if (this.creatInventionActive && this.creatSliderBias > 0) mult *= 1 + this.creatSliderBias * 0.75;
    // Leaden (mortar hex): half speed
    if (time < (this.creatHexEnds.get('player|speed') ?? 0)) mult *= 0.5;
    return mult;
  }

  /** Creation's contribution to the npc's speed multiplier (Workshop + Speed Potion). */
  computeNpcSpeedMult(time: number, base: number): number {
    let mult = base;
    if (time < this.creatWorkshopEnd && this.creatWorkshopOwner === 'npc') mult *= 1.25;
    if (time < (this.creatPotionEnds.get('npc|speed') ?? 0)) mult *= 1.5;
    if (time < (this.creatHexEnds.get('npc|speed') ?? 0)) mult *= 0.5;
    return mult;
  }

  // ── Mastery: Springboard + Mortar Command ────────────────────────

  /** Which slot Mortar Command is bound over this match, or null when it isn't bound/enabled. */
  private mortarSlot(): 'r' | 'f' | 'q' | null {
    if (!this.api.masteryActive) return null;
    for (const s of MORTAR_SLOTS) {
      if (this.api.masteryBindFor(s) === 'mortar-command') return s;
    }
    return null;
  }

  /** HUD ability-bar fill for the bound Mortar Command slot. */
  getMortarCooldownRatio(time: number): number {
    return Phaser.Math.Clamp((time - this.mortarLastCastAt) / MORTAR_COOLDOWN_MS, 0, 1);
  }

  /**
   * Mortar Command — the Nexus lobs every potion the caster has parked on it at the cursor.
   * Refuses (without burning the cooldown) when there is nothing loaded.
   */
  private tryCastMortar(time: number, tx: number, ty: number): void {
    if (time < this.mortarLastCastAt + MORTAR_COOLDOWN_MS) return;
    const loaded = this.creatPotions.filter((p) => p.owner === 'player');
    if (loaded.length === 0) {
      this.api.showFloatingText(this.nexusX, this.nexusY - 70, 'NEXUS EMPTY', '#ff8866');
      return;
    }
    this.mortarLastCastAt = time;
    this.fireMortar(loaded.map((p) => p.kind), 'player', tx, ty);
    this.api.broadcastMasteryCast('mortar-command');
  }

  /** Online replay: the opposing Creation player fired their Nexus at the local player. */
  doNpcMortarCommand(tx: number, ty: number): void {
    const loaded = this.creatPotions.filter((p) => p.owner === 'npc');
    if (loaded.length === 0) return;
    this.fireMortar(loaded.map((p) => p.kind), 'npc', tx, ty);
  }

  /**
   * Clear the fired bottles off the pedestal, arc a shell per potion to the target, and land
   * one shared blast. Both sides go through here so the npc replay looks identical.
   */
  private fireMortar(kinds: CreationPotionKind[], owner: 'player' | 'npc', tx: number, ty: number): void {
    for (let i = this.creatPotions.length - 1; i >= 0; i--) {
      if (this.creatPotions[i].owner !== owner) continue;
      this.creatPotions[i].gfx.destroy();
      this.creatPotions.splice(i, 1);
    }

    const fx = this.fx(owner);
    const angle = Math.atan2(ty - this.nexusY, tx - this.nexusX);
    fx.muzzleFlash(this.nexusX, this.nexusY, angle, 2.2, 9);
    fx.ring(this.nexusX, this.nexusY, 10, 64, CREATION.nexusLit, 340, 5, 9);
    fx.smoke(this.nexusX, this.nexusY, 3, 30, 8);
    this.gesture(owner, 'raise', angle);
    this.api.showFloatingText(this.nexusX, this.nexusY - 70, '🎆 MORTAR', '#ff66cc');

    kinds.forEach((kind, i) => {
      // Fan the shells slightly so a two-potion volley reads as two shells, not one.
      const jitter = (i - (kinds.length - 1) / 2) * 26;
      fx.mortarShell(this.nexusX, this.nexusY, tx + jitter, ty, CREATION_POTIONS[kind].color, MORTAR_FLIGHT_MS);
    });

    this.scene.time.delayedCall(MORTAR_FLIGHT_MS, () => this.landMortar(kinds, owner, tx, ty));
  }

  private landMortar(kinds: CreationPotionKind[], owner: 'player' | 'npc', tx: number, ty: number): void {
    const time = this.scene.time.now;
    const fx = this.fx(owner);
    // A two-potion volley is a visibly bigger event than a one-potion one: more shrapnel,
    // more smoke, a longer burn and a harder shake.
    const tier = kinds.length - 1;
    fx.explosion(tx, ty, MORTAR_RADIUS, {
      shards: 16 + tier * 8,
      smoke: 4 + tier * 2,
      duration: 460 + tier * 140,
      core: CREATION_POTIONS[kinds[0]].color,
    });
    // Each shell's own colour still lands as its own splash, so you can read what hit you.
    kinds.forEach((kind, i) => {
      this.scene.time.delayedCall(70 * i, () => {
        fx.ring(tx, ty, 14, MORTAR_RADIUS * 1.05, CREATION_POTIONS[kind].color, 520, 5, 9);
        fx.bloom(tx, ty, MORTAR_RADIUS * 0.55, 8);
      });
    });
    this.scene.cameras.main.shake(180 + tier * 70, 0.006 + tier * 0.003);

    const victimSide: 'player' | 'npc' = owner === 'player' ? 'npc' : 'player';
    for (const target of (owner === 'player' ? this.api.enemies : [this.player])) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(tx, ty, target.x, target.y) > MORTAR_RADIUS) continue;
      target.takeDamage(MORTAR_DAMAGE);
      this.api.spawnHitFlash(target.x, target.y, CREATION.nexus);
    }
    // The debuffs are side-keyed like the potions themselves, so in a crowd only the
    // opposing fighter carries them — everyone else in the blast just eats the damage.
    for (const kind of kinds) this.applyMortarHex(kind, victimSide, time);
  }

  /**
   * Land one potion's payload on a side. Everything inverts except Gold, which is handed
   * over intact — doubling every effect that side gains from then on, good or bad.
   */
  private applyMortarHex(kind: CreationPotionKind, side: 'player' | 'npc', time: number): void {
    const def = CREATION_POTIONS[kind];
    const victim = side === 'player' ? this.player : this.npc;
    // Gold already running on the victim stretches whatever lands next, hexes included.
    const goldOn = time < (this.creatPotionEnds.get(`${side}|gold`) ?? 0);
    const duration = def.durationMs * (goldOn && kind !== 'gold' ? 2 : 1);

    // The payload snapping onto the victim — an inverted brew closing over them, drawn on
    // whichever side owns the mortar so a skin recolours the right half of the exchange.
    const fx = this.fx(side === 'player' ? 'npc' : 'player');
    fx.ring(victim.x, victim.y, 40, 12, def.color, 340, 4, 9);
    fx.sparks(victim.x, victim.y, 8, { speed: 90, size: 2.2, life: 620, gravity: 260, depth: 9 });

    if (kind === 'gold') {
      this.creatPotionEnds.set(`${side}|gold`, time + def.durationMs);
      seedEffectSnapshot(victim, this.creatGoldSnapshots[side]);
      this.api.showFloatingText(victim.x, victim.y - 46, `${def.emoji} ${def.name.toUpperCase()}`, '#ffcc22');
      return;
    }

    this.creatHexEnds.set(`${side}|${kind}`, time + duration);
    const hex = CREATION_HEXES[kind as Exclude<CreationPotionKind, 'gold'>];
    this.api.showFloatingText(victim.x, victim.y - 46, `${hex.emoji} ${hex.name.toUpperCase()}`,
      `#${def.color.toString(16).padStart(6, '0')}`);
  }

  /** Springboard passive: a dash that just ended drops a small speed pad where it landed. */
  private updateSpringboard(time: number): void {
    const dodging = this.api.isDodging;
    if (dodging && !this.prevDodging) {
      // Dash launching: note where from, and throw the arms forward.
      this.dashFromX = this.player.x;
      this.dashFromY = this.player.y;
      this.gesture('player', 'dash');
      this.pfx.sparks(this.player.x, this.player.y, 8, { speed: 150, size: 2.2, life: 400, depth: 5 });
    }
    if (this.prevDodging && !dodging) {
      // Sawdust kicked up along the whole path, whether or not the pad drops.
      this.pfx.dashTrail(this.dashFromX, this.dashFromY, this.player.x, this.player.y);
      if (this.api.masteryActive) this.spawnSpringboardPad(this.player.x, this.player.y, time);
    }
    this.prevDodging = dodging;
  }

  private spawnSpringboardPad(x: number, y: number, time: number): void {
    const w = SPRINGBOARD_PAD_W, h = SPRINGBOARD_PAD_H;
    const rect = this.add.graphics().setDepth(4);
    drawSpeedPad(rect, this.pcol, w, h);
    rect.setPosition(x, y);
    const hpBg = this.add.rectangle(x, y - h / 2 - 6, w, 4, 0x333333, 0.8).setDepth(5);
    const hpBar = this.add.rectangle(x - w / 2, y - h / 2 - 6, w, 4, CREATION.steel, 0.9).setDepth(6).setOrigin(0, 0.5);
    this.creatSpeedPads.push({
      rect, x, y, w, h, hp: SPRINGBOARD_PAD_HP, maxHp: SPRINGBOARD_PAD_HP,
      hpBar, hpBg, owner: 'player', expireAt: time + SPRINGBOARD_PAD_MS,
    });
    // Stamped into the floor where the dash landed.
    this.pfx.hammerStrike(x, y, Math.PI / 2, 0.85);
    this.pfx.ring(x, y, 4, 34, CREATION.spark, 300, 3, 5);
  }

  /**
   * Requirement tracking for `workshopKills` — register each live enemy the first time it is
   * seen during the player's Workshop, then check the workshop is *still* up when it dies.
   */
  private trackWorkshopKills(time: number): void {
    if (this.creatWorkshopOwner !== 'player' || time >= this.creatWorkshopEnd) return;
    for (const enemy of this.api.enemies) {
      if (!enemy.active || enemy.hp <= 0 || this.workshopTrackedEnemies.has(enemy)) continue;
      this.workshopTrackedEnemies.add(enemy);
      enemy.once('defeated', () => {
        if (this.creatWorkshopOwner === 'player' && this.scene.time.now < this.creatWorkshopEnd) {
          this.api.recordMasteryStat('workshopKills', 1);
        }
      });
    }
  }

  // ── Avatars, aura and automatons ─────────────────────────────────

  /**
   * Builds (on first frame) and drives the artisan avatar for whichever fighters are creation,
   * plus the workshop forge ring worn by whoever has the Workshop up. The player faces the
   * cursor; the npc faces whoever it is fighting.
   */
  private updateAvatars(time: number, delta: number): void {
    const { scene, player, npc, elementId, npcElementId } = this.api;

    if (elementId === 'creation' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new CreationAvatar(scene, this.pcol);
      const av = this.playerAvatar;
      av.setFacing(Math.atan2(this.api.aimY - player.y, this.api.aimX - player.x));
      // Workshop up, or a mech at your back, is the smith at full stretch.
      const workshop = time < this.creatWorkshopEnd && this.creatWorkshopOwner === 'player';
      av.setIntensity(workshop ? 1.35 : this.creatMech ? 1.15 : 1);
      av.setMastered(this.api.masteryActive);
      av.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (npcElementId === 'creation' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new CreationAvatar(scene, this.ncol);
      const av = this.npcAvatar;
      av.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      av.setIntensity(time < this.creatWorkshopEnd && this.creatWorkshopOwner === 'npc' ? 1.35 : 1);
      av.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }

    // The Workshop stance: raw stock orbiting whoever owns the floor.
    if (time < this.creatWorkshopEnd) {
      const owner = this.creatWorkshopOwner;
      const walker = owner === 'player' ? this.player : this.npc;
      if (!this.workshopForge) this.workshopForge = new CreationForge(scene, this.col(owner), 34, 1, 2);
      this.workshopForge.update(delta, walker.x, walker.y, walker.forceInvisible ? 0 : walker.alpha);
    } else if (this.workshopForge) {
      this.workshopForge.destroy();
      this.workshopForge = null;
    }
  }

  // ── Automaton perk ───────────────────────────────────────────────

  /** Workshop + the Automaton perk: wind up three bots and let them loose on the floor. */
  private spawnAutomatons(owner: 'player' | 'npc', count: number): void {
    const W = this.api.width, H = this.api.height;
    const expireAt = this.scene.time.now + 10000;
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
      const gfx = this.add.graphics().setDepth(5);
      gfx.setPosition(ax, ay);
      this.automatons.push({
        gfx, x: ax, y: ay, t: Math.random() * 6,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        expireAt, meleeCooldownUntil: 0, owner,
      });
      this.fx(owner).gearPulse(ax, ay, 20, 420, CREATION.brass, 6);
    }
  }

  private updateAutomatons(time: number, delta: number): void {
    const W = this.api.width, H = this.api.height;
    for (let i = this.automatons.length - 1; i >= 0; i--) {
      const a = this.automatons[i];
      if (time >= a.expireAt) {
        // They run down rather than blinking out.
        this.fx(a.owner).bloom(a.x, a.y, 22, 7);
        a.gfx.destroy();
        this.automatons.splice(i, 1);
        continue;
      }
      a.t += delta / 1000;
      a.x += a.vx * (delta / 1000);
      a.y += a.vy * (delta / 1000);
      // Reflect off maze walls
      for (const wall of this.creatMazeWalls) {
        if (wall.owner !== a.owner) continue;
        const closestX = Math.max(wall.x - wall.w / 2, Math.min(a.x, wall.x + wall.w / 2));
        const closestY = Math.max(wall.y - wall.h / 2, Math.min(a.y, wall.y + wall.h / 2));
        const distSq = (a.x - closestX) ** 2 + (a.y - closestY) ** 2;
        if (distSq < 14 * 14) {
          if (Math.abs(a.x - closestX) < Math.abs(a.y - closestY)) a.vy *= -1; else a.vx *= -1;
          break;
        }
      }
      // Bounce off arena edges
      if (a.x < 20 || a.x > W - 20) { a.vx *= -1; a.x = Math.max(20, Math.min(W - 20, a.x)); }
      if (a.y < 20 || a.y > H - 20) { a.vy *= -1; a.y = Math.max(20, Math.min(H - 20, a.y)); }
      drawAutomaton(a.gfx, this.col(a.owner), a.t);
      a.gfx.setPosition(a.x, a.y);
      // Contact damage
      const enemy = a.owner === 'player' ? this.npc : this.player;
      if (enemy && enemy.active && enemy.hp > 0 && time >= a.meleeCooldownUntil) {
        const ddx = a.x - enemy.x, ddy = a.y - enemy.y;
        if (ddx * ddx + ddy * ddy < 24 * 24) {
          a.meleeCooldownUntil = time + 500;
          enemy.takeDamage(12);
          this.api.spawnHitFlash(a.x, a.y, CREATION.nexus);
          this.fx(a.owner).sparks(a.x, a.y, 6,
            { angle: Math.atan2(-ddy, -ddx), spread: 0.9, speed: 150, size: 2.2, life: 380, depth: 6 });
        }
      }
    }
  }

  // ── R: wrenches in flight ────────────────────────────────────────

  private updateWrenches(time: number, delta: number, emitTrails: boolean): void {
    const W = this.api.width, H = this.api.height;
    for (let i = this.creatWrenches.length - 1; i >= 0; i--) {
      const w = this.creatWrenches[i];
      w.x += w.vx * (delta / 1000);
      w.y += w.vy * (delta / 1000);
      // End over end, the way a thrown spanner actually goes.
      w.sprite.setPosition(w.x, w.y);
      w.sprite.rotation += 17 * (delta / 1000);
      if (w.x < -30 || w.x > W + 30 || w.y < -30 || w.y > H + 30) {
        w.sprite.destroy();
        this.creatWrenches.splice(i, 1);
        continue;
      }
      if (emitTrails) {
        this.fx(w.owner).emberTrail(w.x, w.y, Math.atan2(-w.vy, -w.vx), CREATION.silver);
      }

      // The charged core. This is the only way into the mech, so it is checked before
      // fighters — a wrench that clips someone standing on the pedestal still wakes it.
      if (w.owner === 'player' && time >= w.armedAt && this.nexusAwakened
          && Phaser.Math.Distance.Between(w.x, w.y, this.nexusX, this.nexusY) <= 34) {
        w.sprite.destroy();
        this.creatWrenches.splice(i, 1);
        this.awakenNexus();
        continue;
      }

      let hit = false;
      for (const target of (w.owner === 'player' ? this.api.enemies : [this.player])) {
        if (!target.active || target.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(w.x, w.y, target.x, target.y) > WRENCH_HIT_RADIUS) continue;
        target.takeDamage(WRENCH_DAMAGE);
        this.api.spawnHitFlash(target.x, target.y, CREATION.silver);
        const fx = this.fx(w.owner);
        // A tool landing on machinery: a hard clang, swarf, and a gear jolting out of true.
        fx.hammerStrike(target.x, target.y, Math.atan2(w.vy, w.vx), 1.1);
        fx.gearPulse(target.x, target.y, 30, 460, CREATION.rust, 9);
        fx.sparks(target.x, target.y, 10,
          { angle: Math.atan2(-w.vy, -w.vx), spread: 1.1, speed: 210, size: 2.4, life: 460, depth: 9 });
        this.applyWrench(target, w.owner);
        hit = true;
        break;
      }
      if (hit) {
        w.sprite.destroy();
        this.creatWrenches.splice(i, 1);
      }
    }
  }

  // ── R+: the mech ─────────────────────────────────────────────────

  private updateMech(time: number, delta: number): void {
    const mech = this.creatMech;
    if (!mech) return;

    if (mech.mounted) {
      mech.x = this.player.x;
      mech.y = this.player.y;
      // The pilot's hands go to the yokes — but only when no ability is holding them.
      if (this.playerHold === null) this.hold('player', 'ride');
    }

    const aim = mech.mounted
      ? Math.atan2(this.api.aimY - mech.y, this.api.aimX - mech.x)
      : Math.atan2(this.player.y - mech.y, this.player.x - mech.x);
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    const walkSpeed = mech.mounted && body ? Math.hypot(body.velocity.x, body.velocity.y) : 0;
    mech.rig.setMounted(mech.mounted);
    mech.rig.setAim(aim);
    mech.rig.update(delta, mech.x, mech.y, this.player.forceInvisible && mech.mounted ? 0 : 1, walkSpeed);

    // HP bar rides under the feet.
    const frac = Math.max(0, mech.hp / mech.maxHp);
    mech.hpBg.setPosition(mech.x, mech.y + 58);
    mech.hpBar.setPosition(mech.x - 30, mech.y + 58).setSize(60 * frac, 6);

    // Boarding prompt: only while you are close enough for R to actually do it.
    if (mech.prompt) {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, mech.x, mech.y) <= MECH_MOUNT_RANGE;
      mech.prompt.setPosition(mech.x, mech.y - 62 + Math.sin(time / 260) * 3);
      mech.prompt.setAlpha(near ? 1 : 0.35);
      mech.prompt.setScale(near ? 1 + Math.sin(time / 180) * 0.06 : 0.85);
    }

    if (mech.mounted) {
      for (const arm of mech.arms) this.updateMechArm(mech, arm, aim, time, delta);
    }
    this.updateMechHud(mech, time);
  }

  private updateMechArm(mech: CreationMech, arm: CreationMechArm, aim: number, time: number, delta: number): void {
    const v = arm.view;
    const boosted = v.boosted;
    const dt = delta / 1000;
    // Every arm has something turning on it; the rate is the arm's personality.
    const spinRate = arm.kind === 'chainsaw' ? (boosted ? 5.5 : 3.6)
      : arm.kind === 'overclock' ? (boosted ? 2.6 : 1.7) : 0.5;
    v.spin = (v.spin + dt * spinRate) % 1;
    v.fire = Math.max(0, v.fire - dt * 3.6);

    const nearest = this.api.getNearestEnemy(mech.x, mech.y);
    const alive = nearest?.active && nearest.hp > 0;
    const distToEnemy = alive ? Phaser.Math.Distance.Between(mech.x, mech.y, nearest.x, nearest.y) : Infinity;
    const ease = (target: number, k: number) => Math.min(1, dt * k) * target;

    switch (arm.kind) {
      case 'chainsaw': {
        const range = boosted ? CHAINSAW_RANGE * 1.2 : CHAINSAW_RANGE;
        const heatCap = boosted ? CHAINSAW_HEAT_MS * 1.4 : CHAINSAW_HEAT_MS;
        const coolMs = boosted ? CHAINSAW_COOL_MS * 0.66 : CHAINSAW_COOL_MS;
        const cooling = time < arm.coolUntil;
        const cutting = !cooling && alive && distToEnemy <= range;
        v.extend += ((cutting ? 1 : 0) - v.extend) * Math.min(1, dt * 9);
        if (cooling) {
          // Venting: heat bleeds off over the whole lockout, and it visibly steams.
          v.heat = Phaser.Math.Clamp((arm.coolUntil - time) / coolMs, 0, 1);
          if (Math.random() < dt * 6) this.pfx.smoke(mech.x + Math.cos(aim) * 34, mech.y + Math.sin(aim) * 24, 1, 14, 9);
          break;
        }
        v.heat = Phaser.Math.Clamp(arm.heatMs / heatCap, 0, 1);
        if (!cutting) {
          arm.heatMs = Math.max(0, arm.heatMs - delta * 0.7);
          break;
        }
        arm.heatMs += delta;
        if (time >= arm.biteAt) {
          arm.biteAt = time + (boosted ? 140 : 200);
          nearest.takeDamage(boosted ? 5 : 3);
          this.api.spawnHitFlash(nearest.x, nearest.y, CREATION.silver);
          this.pfx.sparks(nearest.x, nearest.y, 5,
            { angle: Math.atan2(mech.y - nearest.y, mech.x - nearest.x), spread: 1, speed: 190, size: 2, life: 300, depth: 9 });
        }
        if (arm.heatMs >= heatCap) {
          arm.heatMs = 0;
          arm.coolUntil = time + coolMs;
          this.pfx.smoke(mech.x, mech.y - 20, 3, 26, 9);
          this.api.showFloatingText(mech.x, mech.y - 62, 'OVERHEAT', '#ff6644');
        }
        break;
      }

      case 'medcore': {
        const interval = boosted ? MEDCORE_INTERVAL * 0.75 : MEDCORE_INTERVAL;
        arm.cd += delta;
        if (arm.cd >= interval) {
          arm.cd = 0;
          v.fire = 1;
          this.dropMedOrbs(mech, boosted ? 4 : 3, boosted ? 22 : 15, time);
        }
        break;
      }

      case 'grabber': {
        const holdMs = boosted ? GRABBER_HOLD_MS * 1.5 : GRABBER_HOLD_MS;
        const cd = boosted ? GRABBER_CD * 0.7 : GRABBER_CD;
        const range = boosted ? GRABBER_RANGE * 1.25 : GRABBER_RANGE;
        if (arm.held) {
          const captive = arm.held;
          if (time >= arm.heldUntil || !captive.active || captive.hp <= 0 || captive.unstoppable) {
            this.api.showFloatingText(captive.x, captive.y - 40, 'RELEASED', '#ffcc22');
            this.releaseGrab(arm);
            break;
          }
          // Pinned at the claw and unable to swing back. `reset` is what glues a body to a
          // moving kit object — setting x/y alone leaves the physics step to undo it.
          const gx = mech.x + Math.cos(arm.heldAngle) * 62;
          const gy = mech.y + Math.sin(arm.heldAngle) * 62;
          (captive.body as Phaser.Physics.Arcade.Body).reset(gx, gy);
          captive.disarmedUntil = Math.max(captive.disarmedUntil, Date.now() + 150);
          v.grip += (1 - v.grip) * Math.min(1, dt * 12);
          v.extend += (1 - v.extend) * Math.min(1, dt * 12);
          if (Math.random() < dt * 8) {
            this.pfx.sparks(gx, gy, 2, { speed: 90, size: 1.8, life: 300, depth: 9 });
          }
          break;
        }
        v.grip -= ease(v.grip, 8);
        v.extend -= ease(v.extend, 7);
        arm.cd += delta;
        if (arm.cd >= cd && alive && distToEnemy <= range && !nearest.unstoppable) {
          arm.cd = 0;
          arm.held = nearest;
          arm.heldUntil = time + holdMs;
          arm.heldAngle = Math.atan2(nearest.y - mech.y, nearest.x - mech.x);
          v.extend = 1;
          this.pfx.ring(nearest.x, nearest.y, 34, 10, MECH_ARM_TONES.grabber, 300, 4, 9);
          this.pfx.gearPulse(mech.x, mech.y, 34, 420, CREATION.brass, 9);
          this.api.showFloatingText(nearest.x, nearest.y - 44, '🦾 GRABBED', '#ffcc22');
        }
        break;
      }

      case 'shield': {
        // Braced flat, easing back out of the block flash the absorber sets.
        v.grip += (0.55 - v.grip) * Math.min(1, dt * 4);
        break;
      }

      case 'barrage': {
        const interval = boosted ? BARRAGE_INTERVAL * 0.75 : BARRAGE_INTERVAL;
        arm.cd += delta;
        if (arm.cd >= interval && alive) {
          arm.cd = 0;
          v.fire = 1;
          this.fireBarrage(mech, aim, boosted ? 5 : 3, boosted ? 8 : 5);
        }
        break;
      }

      case 'overclock':
        // Pure passive: speed, the boost flag on the other arm, and steel-plated builds.
        v.grip += (0.3 - v.grip) * Math.min(1, dt * 3);
        break;
    }
  }

  /** Barrage arm: a fan of homing rockets off the pod. */
  private fireBarrage(mech: CreationMech, aim: number, count: number, damage: number): void {
    for (let i = 0; i < count; i++) {
      const a = aim + (i - (count - 1) / 2) * 0.34;
      const spr = this.add.graphics().setDepth(9);
      drawBolt(spr, this.pcol, 'silver');
      const sx = mech.x + Math.cos(a) * 26, sy = mech.y + Math.sin(a) * 18;
      spr.setPosition(sx, sy).setRotation(a);
      this.creatBolts.push({
        sprite: spr, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400,
        tier: 'silver', damage, owner: 'player',
        isRocket: true, homing: true, blastRadius: 52,
        targetX: sx + Math.cos(a) * 400, targetY: sy + Math.sin(a) * 400, noNexus: true,
      });
      this.pfx.muzzleFlash(sx, sy, a, 0.9, 9);
    }
    this.api.showFloatingText(mech.x, mech.y - 62, '🚀 BARRAGE', '#99ff66');
  }

  /** Med core arm: scatter repair orbs around the mech for the pilot to drive over. */
  private dropMedOrbs(mech: CreationMech, count: number, heal: number, time: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const d = 52 + Math.random() * 34;
      const x = Phaser.Math.Clamp(mech.x + Math.cos(a) * d, 24, this.api.width - 24);
      const y = Phaser.Math.Clamp(mech.y + Math.sin(a) * d, 24, this.api.height - 24);
      const gfx = this.add.graphics().setDepth(6);
      this.creatMedOrbs.push({ gfx, x, y, t: Math.random() * 3, heal, expireAt: time + MEDCORE_ORB_MS });
      this.pfx.ring(x, y, 2, 20, MECH_ARM_TONES.medcore, 300, 3, 6);
    }
    this.api.showFloatingText(mech.x, mech.y - 62, '💊 REPAIR KIT', '#33dd66');
  }

  private updateMedOrbs(time: number, delta: number): void {
    const mech = this.creatMech;
    for (let i = this.creatMedOrbs.length - 1; i >= 0; i--) {
      const o = this.creatMedOrbs[i];
      if (time >= o.expireAt) {
        this.pfx.bloom(o.x, o.y, 16, 6);
        o.gfx.destroy();
        this.creatMedOrbs.splice(i, 1);
        continue;
      }
      o.t += delta / 1000;
      // A capsule in a brass ring, bobbing, with a cross that reads at a glance.
      const g = o.gfx;
      const tone = MECH_ARM_TONES.medcore;
      const bob = Math.sin(o.t * 2.6) * 3;
      const fade = Math.min(1, (o.expireAt - time) / 1200);
      g.clear();
      g.setPosition(o.x, o.y + bob);
      g.fillStyle(tone, 0.2 * fade);
      g.fillCircle(0, 0, 15 + Math.sin(o.t * 4) * 2);
      g.fillStyle(this.pcol(CREATION.soot), 0.9 * fade);
      g.fillCircle(0, 0, 9.4);
      g.fillStyle(tone, 0.95 * fade);
      g.fillCircle(0, 0, 8);
      g.fillStyle(this.pcol(CREATION.white), 0.9 * fade);
      g.fillRect(-4.4, -1.6, 8.8, 3.2);
      g.fillRect(-1.6, -4.4, 3.2, 8.8);
      g.lineStyle(1.8, this.pcol(CREATION.brass), 0.9 * fade);
      g.strokeCircle(0, 0, 10);
      for (let k = 0; k < 4; k++) {
        const a = o.t * 1.4 + (k / 4) * Math.PI * 2;
        rivet(g, this.pcol, Math.cos(a) * 10, Math.sin(a) * 10, 1.8, fade);
      }

      if (!mech || !mech.mounted) continue;
      if (Phaser.Math.Distance.Between(o.x, o.y, mech.x, mech.y) > 30) continue;
      const before = mech.hp;
      mech.hp = Math.min(mech.maxHp, mech.hp + o.heal);
      const gained = Math.round(mech.hp - before);
      this.pfx.ring(o.x, o.y, 6, 44, MECH_ARM_TONES.medcore, 340, 4, 9);
      this.pfx.sparks(o.x, o.y, 8, { speed: 110, size: 2, life: 480, gravity: -70, depth: 9 });
      this.api.showFloatingText(mech.x, mech.y - 50, `+${gained}`, '#33dd66');
      o.gfx.destroy();
      this.creatMedOrbs.splice(i, 1);
    }
  }

  /** Mirror the mech and everything bolted to it into the top-right effect tray. */
  private updateMechHud(mech: CreationMech, time: number): void {
    this.api.setStatusIndicator('creation-mech', mech.mounted ? {
      name: 'Mech', emoji: '🤖', color: CREATION.brass,
      description: `Piloting the awakened Nexus. It soaks every hit aimed at you and you move ${Math.round((1 - MECH_SPEED_MULT) * 100)}% slower. ${mech.maxHp} HP total.`,
      count: Math.max(0, Math.ceil(mech.hp)), suffix: ' HP', priority: 108,
    } : null);
    for (let i = 0; i < 2; i++) {
      const arm = mech.mounted ? mech.arms[i] : undefined;
      if (!arm) {
        this.api.setStatusIndicator(`creation-mech-arm-${i}`, null);
        continue;
      }
      const info = CREATION_MECH_ARM_INFO[arm.kind];
      // Chainsaws show their vent timer; everything else shows how close the next cycle is.
      const venting = arm.kind === 'chainsaw' && time < arm.coolUntil;
      this.api.setStatusIndicator(`creation-mech-arm-${i}`, {
        name: `${info.name}${arm.view.boosted ? ' (Overclocked)' : ''}`,
        emoji: venting ? '♨️' : info.emoji,
        color: MECH_ARM_TONES[arm.kind],
        description: arm.view.boosted ? `${info.effect} Supercharged by an Overclock arm.` : info.effect,
        until: venting ? arm.coolUntil : undefined,
        priority: 109 + i,
      });
    }
  }

  // ── Input ────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number, playerCtx: CastContext): void {
    // Q+ Ultimate Invention sliders steal the pointer while being dragged.
    const draggingSlider = this.updateInventionSliderInput(pointer);
    // Mastery — Mortar Command replaces whichever of R/F/Q it is bound over, but only
    // outside Build Mode: in there the slot keeps doing its build job.
    const mortarSlot = this.mortarSlot();

    if (!this.creatBuildMode) {
      // Click — Dagger Spray: hold to add more daggers (up to 5), release to fire
      if (pointer.isDown && !this.creatDaggerHolding && !draggingSlider) {
        if (this.player.getCooldownRatio('dagger-spray') >= 1) {
          this.creatDaggerHolding = true;
          this.creatDaggerHoldStart = time;
          this.creatDaggerHoldX = this.player.x;
          this.creatDaggerHoldY = this.player.y;
        }
      }
      if (this.creatDaggerHolding) {
        const count = Math.min(5, 1 + Math.floor((time - this.creatDaggerHoldStart) / 600));
        // A fan of ghost blades, 30° apart, each already pointed where it will go: the shape
        // of the throw, not a bundle of aiming lines.
        if (!this.creatDaggerPreview) this.creatDaggerPreview = this.add.graphics().setDepth(5);
        const g = this.creatDaggerPreview;
        g.clear();
        const baseAngle = Math.atan2(mouseY - this.player.y, mouseX - this.player.x);
        const spread = Phaser.Math.DegToRad(30);
        const pulse = 0.35 + 0.2 * Math.sin(time / 90);
        for (let i = 0; i < count; i++) {
          const a = baseAngle + (i - (count - 1) / 2) * spread;
          const ox = this.player.x + Math.cos(a) * 26, oy = this.player.y + Math.sin(a) * 26;
          g.fillStyle(this.pcol(CREATION.silver), pulse);
          forgedShard(g, ox, oy, a, 26, 4);
          g.fillStyle(this.pcol(CREATION.spark), pulse * 1.2);
          forgedShard(g, ox, oy, a, 18, 1.4);
        }
        // Where they will converge.
        g.lineStyle(1.5, this.pcol(CREATION.gold), pulse);
        g.strokeCircle(mouseX, mouseY, 12 + Math.sin(time / 120) * 3);
        // Hands hauled wide, blades drawn back ready to fan out.
        this.hold('player', 'draw', baseAngle);
      }
      if (!pointer.isDown && this.creatDaggerHolding) {
        this.creatDaggerHolding = false;
        const count = Math.min(5, 1 + Math.floor((time - this.creatDaggerHoldStart) / 600));
        if (this.creatDaggerPreview) { this.creatDaggerPreview.destroy(); this.creatDaggerPreview = null; }
        this.hold('player', null);
        playerCtx.creationDaggerSpray(mouseX, mouseY, count);
        this.player.triggerCooldown('dagger-spray');
      }

      // E — Charged Bolt: hold to charge tier
      if (this.api.eKey.isDown && !this.creatBoltHolding) {
        if (this.player.getCooldownRatio('charged-bolt') >= 1) {
          this.creatBoltHolding = true;
          this.creatBoltHoldStart = time;
          this.creatBoltChargeTier = -1;
          if (this.creatBoltChargeOrb) this.creatBoltChargeOrb.destroy();
          this.creatBoltChargeOrb = this.add.graphics().setDepth(15);
        }
      }
      if (this.creatBoltHolding && this.creatBoltChargeOrb) {
        // The slug is forged over the smith's head: a glowing ingot in whatever metal the
        // charge has reached, hammered up a tier at each threshold.
        const held = time - this.creatBoltHoldStart;
        const electroThresh = 3000; // 2s past gold (gold at 1000ms)
        const electro = this.api.hasUpgrade('e') && held >= electroThresh;
        if (electro) this.creatBoltElectroMode = true;
        const tierIdx = electro ? 3 : held >= 1000 ? 2 : held >= 500 ? 1 : 0;
        const metal = electro ? CREATION.nexusLit
          : tierIdx === 2 ? CREATION.gold : tierIdx === 1 ? CREATION.silver : CREATION.copper;
        const ox = this.player.x, oy = this.player.y - 40;
        if (tierIdx !== this.creatBoltChargeTier) {
          // Crossing into a new tier: one hammer blow, once.
          if (this.creatBoltChargeTier >= 0) this.pfx.hammerStrike(ox, oy, -Math.PI / 2, 0.8 + tierIdx * 0.12);
          this.creatBoltChargeTier = tierIdx;
        }
        const g = this.creatBoltChargeOrb;
        g.clear();
        const beat = 1 + Math.sin(time / 90) * 0.1;
        g.fillStyle(this.pcol(metal), 0.28);
        g.fillCircle(ox, oy, (12 + tierIdx * 2.5) * beat);
        g.fillStyle(this.pcol(CREATION.soot), 0.9);
        forgedShard(g, ox - 9, oy, 0, 18 + tierIdx * 2, 6 + tierIdx * 0.8);
        g.fillStyle(this.pcol(metal), 1);
        forgedShard(g, ox - 8, oy, 0, 16 + tierIdx * 2, 4.6 + tierIdx * 0.8);
        g.fillStyle(this.pcol(CREATION.spark), 0.8);
        forgedShard(g, ox - 7, oy - 1.5, 0, 11 + tierIdx, 1.2);
        // Anvil face under it, so the ingot is sitting on something.
        craftPlank(g, this.pcol, ox, oy + 10, 0, 26, 3.2, 0.9);
        // Hands in tight, working the piece.
        this.hold('player', 'charge');
      }
      if (!this.api.eKey.isDown && this.creatBoltHolding) {
        this.creatBoltHolding = false;
        this.creatBoltChargeTier = -1;
        this.hold('player', null);
        if (this.creatBoltChargeOrb) { this.creatBoltChargeOrb.destroy(); this.creatBoltChargeOrb = null; }
        const held = time - this.creatBoltHoldStart;
        if (this.creatBoltElectroMode && this.creatLastCraftKey) {
          // E+ Electro Bolt: instantly re-brew the last recipe onto the nexus
          this.creatBoltElectroMode = false;
          this.gesture('player', 'clap');
          this.pfx.ring(this.player.x, this.player.y, 10, 90, CREATION.nexusLit, 380, 5, 15);
          this.pfx.gearPulse(this.nexusX, this.nexusY, 40, 520, CREATION.nexusLit, 8);
          this.pfx.sparks(this.player.x, this.player.y, 14, { speed: 220, size: 2.4, life: 480, depth: 15 });
          this.api.showFloatingText(this.player.x, this.player.y - 40, 'ELECTRO!', '#44ddff');
          this.resolveNexusCraft(time, this.creatLastCraftKey, 'player');
          this.player.triggerCooldown('charged-bolt');
        } else {
          this.creatBoltElectroMode = false;
          const tier: 'copper' | 'silver' | 'gold' = held >= 1000 ? 'gold' : held >= 500 ? 'silver' : 'copper';
          playerCtx.creationBolt(mouseX, mouseY, tier);
          this.player.triggerCooldown('charged-bolt');
        }
      }

      // R — Wrench in your Plans. A dormant mech in reach takes the key first: climbing in
      // matters more than one wrench, and the prompt over its head says so.
      if (this.tryBoardMech()) {
        // Key spent boarding.
      } else if (mortarSlot === 'r') {
        // Slot is Mortar Command — dispatched below.
      } else if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
        this.player.castAbility('wrench-plans', playerCtx);
      }

      // Mastery — Mortar Command on its bound key (never E, never in Build Mode).
      if (mortarSlot && Phaser.Input.Keyboard.JustDown(this.keyForSlot(mortarSlot))) {
        this.tryCastMortar(time, mouseX, mouseY);
      }
    } // end !creatBuildMode

    if (this.api.hasUpgrade('f') && this.creatBuildMode) {
      // ── Build Mode ──────────────────────────────────────────────
      // Click: create/drag blocks, speed pads, spiked blocks
      if (pointer.isDown && !this.creatBuildBlockDragging && !this.creatBuildSpeedPadDragging && !this.creatBuildSpikedDragging && !this.api.pointerWasDown) {
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
          this.creatBuildNewBlockPreview = this.add.graphics().setDepth(5);
          this.creatBuildNewBlockPreview.setPosition(mouseX, mouseY);
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
          // Creating new block: redraw the drafting frame at the size being dragged out.
          const rw = Math.min(200, Math.abs(mouseX - this.creatBuildBlockDragStartX));
          const rh = Math.min(200, Math.abs(mouseY - this.creatBuildBlockDragStartY));
          const rx = this.creatBuildBlockDragStartX + (mouseX > this.creatBuildBlockDragStartX ? 1 : -1) * rw / 2;
          const ry = this.creatBuildBlockDragStartY + (mouseY > this.creatBuildBlockDragStartY ? 1 : -1) * rh / 2;
          const g = this.creatBuildNewBlockPreview;
          g.clear();
          g.setPosition(rx, ry);
          if (rw > 2 && rh > 2) blueprintFrame(g, this.pcol, rw, rh, 1, time / 40);
          this.hold('player', 'sow', Math.atan2(ry - this.player.y, rx - this.player.x));
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
        this.hold('player', null);
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
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey) && time >= this.creatBuildLaunchCdUntil) {
        this.creatBuildLaunchCdUntil = time + 5000;
        // Marching chevrons over everything that is about to be thrown, for 1.5s.
        this.gesture('player', 'sweep', Math.atan2(mouseY - this.player.y, mouseX - this.player.x), 1500);
        const launchables = [
          ...this.creatBlockers, ...this.creatSpeedPads, ...this.creatSpikedBlocks,
        ].filter((b) => b.owner === 'player');
        for (const b of launchables) {
          this.pfx.launchMarker(b.x, b.y, Math.atan2(mouseY - b.y, mouseX - b.x), 1500);
        }
        this.scene.time.delayedCall(1500, () => {
          // Launch blocks: fast movement toward cursor each frame (handled via vx/vy in per-frame section)
          for (const b of this.creatBlockers) {
            if (b.owner !== 'player') continue;
            const dx = mouseX - b.x, dy = mouseY - b.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            (b as any).launchVx = (dx / len) * 600; (b as any).launchVy = (dy / len) * 600;
            (b as any).launchUntil = this.scene.time.now + 2000;
          }
          for (const b of this.creatSpeedPads) {
            if (b.owner !== 'player') continue;
            const dx = mouseX - b.x, dy = mouseY - b.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            (b as any).launchVx = (dx / len) * 600; (b as any).launchVy = (dy / len) * 600;
            (b as any).launchUntil = this.scene.time.now + 2000;
          }
          for (const b of this.creatSpikedBlocks) {
            if (b.owner !== 'player') continue;
            const dx = mouseX - b.x, dy = mouseY - b.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            (b as any).launchVx = (dx / len) * 600; (b as any).launchVy = (dy / len) * 600;
            (b as any).launchUntil = this.scene.time.now + 2000;
          }
        });
      }
      // R — Speed pad
      if (Phaser.Input.Keyboard.JustDown(this.api.rKey) && time >= this.creatBuildSpeedPadCdUntil) {
        this.creatBuildSpeedPadCdUntil = time + 6000;
        const pw = 60, ph = 20;
        const padHp = this.mechOverclocked ? 40 * STEEL_PLATE_HP_MULT : 40;
        const padSpr = this.add.graphics().setDepth(4);
        drawSpeedPad(padSpr, this.pcol, pw, ph);
        padSpr.setPosition(mouseX, mouseY);
        const padHpBg = this.add.rectangle(mouseX, mouseY - ph / 2 - 6, pw, 4, 0x333333, 0.8).setDepth(5);
        const padHpBar = this.add.rectangle(mouseX - pw / 2, mouseY - ph / 2 - 6, pw, 4, CREATION.steel, 0.9).setDepth(6).setOrigin(0, 0.5);
        this.creatSpeedPads.push({ rect: padSpr, x: mouseX, y: mouseY, w: pw, h: ph, hp: padHp, maxHp: padHp, hpBar: padHpBar, hpBg: padHpBg, owner: 'player' });
        this.pfx.assemble(mouseX, mouseY, pw, ph, 300);
        this.pfx.hammerStrike(mouseX, mouseY, Math.PI / 2, 1);
        this.gesture('player', 'slam', Math.atan2(mouseY - this.player.y, mouseX - this.player.x));
        this.api.recordMasteryStat('wallsBuilt', 1);
        this.api.showFloatingText(mouseX, mouseY - 30, 'SPEED PAD', '#44aaff');
      }
      // F — Exit build mode
      if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
        this.creatBuildMode = false;
        this.applyBuildModeBar(false);
        this.gesture('player', 'flex');
        this.pfx.gearPulse(this.player.x, this.player.y, 30, 420, CREATION.iron, 7);
        this.api.showFloatingText(this.player.x, this.player.y - 40, 'Build Mode OFF', '#aaaaaa');
      }
      // Q — Spike block
      if (Phaser.Input.Keyboard.JustDown(this.api.qKey) && time >= this.creatBuildSpikedCdUntil) {
        this.creatBuildSpikedCdUntil = time + 20000;
        const sw = 50, sh = 50;
        const spkSteel = this.mechOverclocked;
        const spkHp = spkSteel ? 50 * STEEL_PLATE_HP_MULT : 50;
        const spkSpr = this.add.graphics().setDepth(4);
        drawSpikedPanel(spkSpr, this.pcol, sw, sh, false, spkSteel);
        spkSpr.setPosition(mouseX, mouseY);
        const spkHpBg = this.add.rectangle(mouseX, mouseY - sh / 2 - 6, sw, 4, 0x333333, 0.8).setDepth(5);
        const spkHpBar = this.add.rectangle(mouseX - sw / 2, mouseY - sh / 2 - 6, sw, 4, CREATION.rust, 0.9).setDepth(6).setOrigin(0, 0.5);
        this.creatSpikedBlocks.push({ rect: spkSpr, x: mouseX, y: mouseY, w: sw, h: sh, hp: spkHp, maxHp: spkHp, hpBar: spkHpBar, hpBg: spkHpBg, owner: 'player', tickAccum: 0, invincible: false });
        this.pfx.assemble(mouseX, mouseY, sw, sh, 340);
        this.pfx.shrapnel(mouseX, mouseY, 8, 30, 5);
        this.gesture('player', 'slam', Math.atan2(mouseY - this.player.y, mouseX - this.player.x));
        this.api.recordMasteryStat('wallsBuilt', 1);
        this.api.showFloatingText(mouseX, mouseY - 30, 'SPIKE BLOCK', '#cc2222');
      }
    } else {
      // ── Normal F — Create: drag to define rectangle, release to spawn
      if (mortarSlot === 'f') {
        // F is Mortar Command — Create (and the Build Mode toggle with it) is replaced.
      } else if (this.api.hasUpgrade('f') && Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
        this.creatBuildMode = true;
        this.applyBuildModeBar(true);
        this.gesture('player', 'flex');
        this.pfx.gearPulse(this.player.x, this.player.y, 34, 520, CREATION.gold, 7);
        this.pfx.sparks(this.player.x, this.player.y, 8, { speed: 120, size: 2.2, life: 460, depth: 7 });
        this.api.showFloatingText(this.player.x, this.player.y - 40, 'Build Mode ON', '#bb88ff');
      } else {
        if (this.api.fKey.isDown && !this.creatBlockDragging) {
          if (this.player.getCooldownRatio('creation-block') >= 1) {
            this.creatBlockDragging = true;
            this.creatBlockDragStartX = mouseX;
            this.creatBlockDragStartY = mouseY;
            if (this.creatBlockPreview) this.creatBlockPreview.destroy();
            this.creatBlockPreview = this.add.graphics().setDepth(5);
            this.creatBlockPreview.setPosition(mouseX, mouseY);
          }
        }
        if (this.creatBlockDragging && this.creatBlockPreview) {
          const rw = Math.min(200, Math.abs(mouseX - this.creatBlockDragStartX));
          const rh = Math.min(200, Math.abs(mouseY - this.creatBlockDragStartY));
          const rx = this.creatBlockDragStartX + (mouseX > this.creatBlockDragStartX ? 1 : -1) * rw / 2;
          const ry = this.creatBlockDragStartY + (mouseY > this.creatBlockDragStartY ? 1 : -1) * rh / 2;
          const g = this.creatBlockPreview;
          g.clear();
          g.setPosition(rx, ry);
          if (rw > 2 && rh > 2) blueprintFrame(g, this.pcol, rw, rh, 1, time / 40);
          this.hold('player', 'sow', Math.atan2(ry - this.player.y, rx - this.player.x));
        }
        if (!this.api.fKey.isDown && this.creatBlockDragging) {
          this.creatBlockDragging = false;
          this.hold('player', null);
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
      if (mortarSlot !== 'q' && Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
        this.player.castAbility('maze-of-doom', playerCtx);
      }
    }
  }

  // ── Build Mode HUD ───────────────────────────────────────────────

  /**
   * Build Mode is a whole second loadout on the same five keys, so the ability cards have to
   * say so — otherwise entering it looks like nothing happened. Same swap Earth's Titan Form
   * does: rewrite the card labels going in, restore the element's real ones coming out.
   */
  private applyBuildModeBar(on: boolean): void {
    const bars = this.api.abilityBars;
    if (on) {
      // Snapshot whatever the cards actually say right now rather than rebuilding them from
      // the element's ability list on the way out — a mastery bind or an upgrade may have
      // already rewritten a card, and reconstructing would quietly wipe that.
      this.preBuildBarText = bars.map((b) => [b.lbl?.text ?? '', b.desc?.text ?? ''] as [string, string]);
      const cards: Array<[string, string]> = [
        ['[Click] Build / Move', 'Drag out a new block, or drag an existing one'],
        ['[E] Launch All', 'Everything you built flies at the cursor'],
        ['[R] Speed Pad', 'Sprung plate: +25% speed while stood on'],
        ['[F] Exit Build Mode', 'Back to the normal Creation loadout'],
        ['[Q] Spike Block', '50 HP hazard, 5 dmg/0.3s to anything near it'],
      ];
      bars.forEach((bar, i) => {
        if (i >= cards.length) return;
        bar.lbl?.setText(cards[i][0]);
        bar.desc?.setText(cards[i][1]);
      });
    } else {
      bars.forEach((bar, i) => {
        const saved = this.preBuildBarText[i];
        if (!saved) return;
        bar.lbl?.setText(saved[0]);
        bar.desc?.setText(saved[1]);
      });
      this.preBuildBarText = [];
    }
  }

  /**
   * Cooldown fill for a card while Build Mode is up — the build actions have their own timers,
   * which have nothing to do with the abilities whose slots they borrowed. Returns null when
   * Build Mode is off so ArenaScene falls through to its normal handling.
   */
  buildModeBarRatio(abilityId: string, time: number): number | null {
    if (!this.creatBuildMode) return null;
    // A mastery-bound card carries the enhancement's id, not the ability it replaced, so map
    // it back to whichever slot it is sitting on before matching.
    let id = abilityId;
    if (id === 'mortar-command') {
      const slot = this.mortarSlot();
      id = slot === 'r' ? 'wrench-plans' : slot === 'f' ? 'creation-block' : 'maze-of-doom';
    }
    const cd = id === 'dagger-spray' ? { at: this.creatBuildNewBlockCdUntil, len: 2000 }
      : id === 'charged-bolt' ? { at: this.creatBuildLaunchCdUntil, len: 5000 }
      : id === 'wrench-plans' ? { at: this.creatBuildSpeedPadCdUntil, len: 6000 }
      : id === 'maze-of-doom' ? { at: this.creatBuildSpikedCdUntil, len: 20000 }
      // F is the exit toggle — always available, so it always reads full.
      : id === 'creation-block' ? null
      : undefined;
    if (cd === undefined) return null;
    if (cd === null) return 1;
    return Phaser.Math.Clamp(1 - (cd.at - time) / cd.len, 0, 1);
  }

  private keyForSlot(slot: 'r' | 'f' | 'q'): Phaser.Input.Keyboard.Key {
    return slot === 'r' ? this.api.rKey : slot === 'f' ? this.api.fKey : this.api.qKey;
  }

  // ── Per-frame ────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    // 0. Character rigs, the workshop stance, and the live-effect tell on both fighters.
    this.updateAvatars(time, delta);
    this.updateBrewAuras(time, delta);
    // Trails come off the back of everything in flight, on one shared ~45ms accumulator.
    this.trailAccum += delta;
    const emitTrails = this.trailAccum >= 45;
    if (emitTrails) this.trailAccum = 0;

    // 1. Nexus energy, brew timer, and potions on the pedestal
    this.updateNexusEnergy(delta);
    if (this.creatCraftInProgress && time >= this.creatCraftStartTime + this.creatCraftDuration) {
      this.resolveNexusCraft(time);
    }
    this.updateCreationPotions(time, delta);
    this.updateCreationPotionEffects(time, delta);

    // 2. Daggers in flight
    const W2 = this.api.width, H2 = this.api.height;
    for (let i = this.creatDaggers.length - 1; i >= 0; i--) {
      const d = this.creatDaggers[i];
      // Steer toward the cursor until converged, then keep flying straight.
      if (!d.converged && d.targetX !== undefined && d.targetY !== undefined) {
        const desired = Math.atan2(d.targetY - d.sprite.y, d.targetX - d.sprite.x);
        const cur = Math.atan2(d.vy, d.vx);
        let diff = Phaser.Math.Angle.Wrap(desired - cur);
        const maxTurn = 7 * (delta / 1000);
        if (diff > maxTurn) diff = maxTurn;
        else if (diff < -maxTurn) diff = -maxTurn;
        const na = cur + diff;
        const sp = Math.hypot(d.vx, d.vy);
        d.vx = Math.cos(na) * sp;
        d.vy = Math.sin(na) * sp;
        d.sprite.setRotation(na);
        if (Phaser.Math.Distance.Between(d.sprite.x, d.sprite.y, d.targetX, d.targetY) < 26) d.converged = true;
      }
      d.sprite.x += d.vx * (delta / 1000);
      d.sprite.y += d.vy * (delta / 1000);
      if (d.sprite.x < 0 || d.sprite.x > W2 || d.sprite.y < 0 || d.sprite.y > H2) {
        d.sprite.destroy();
        this.creatDaggers.splice(i, 1);
        continue;
      }
      // Glint shed out of the back of the blade, so a fan of five reads as five moving objects.
      if (emitTrails) {
        this.fx(d.owner).emberTrail(d.sprite.x, d.sprite.y, Math.atan2(-d.vy, -d.vx), CREATION.silver);
      }
      for (const dTarget of (d.owner === 'player' ? this.api.enemies : [this.player])) {
        if (!dTarget.active || dTarget.hp <= 0) continue;
        const tId = dTarget === this.player ? 'player' : String(this.api.enemies.indexOf(dTarget as Fighter));
        if (!d.hitSet.has(tId) && Phaser.Math.Distance.Between(d.sprite.x, d.sprite.y, dTarget.x, dTarget.y) <= 20) {
          dTarget.takeDamage(d.damage);
          this.api.spawnHitFlash(dTarget.x, dTarget.y, CREATION.silver);
          this.fx(d.owner).sparks(d.sprite.x, d.sprite.y, 5,
            { angle: Math.atan2(-d.vy, -d.vx), spread: 0.9, speed: 160, size: 2, life: 340, depth: 7 });
          d.hitSet.add(tId);
          if (d.owner === 'player') this.api.recordMasteryStat('daggerStabs', 1);
          // Daggers pierce — don't destroy
        }
      }
    }

    // 3. Bolts in flight
    for (let i = this.creatBolts.length - 1; i >= 0; i--) {
      const b = this.creatBolts[i];
      // Barrage rockets chase: turn-rate limited so they arc in rather than snapping on.
      if (b.homing) {
        const chase = b.owner === 'player'
          ? this.api.getNearestEnemy(b.sprite.x, b.sprite.y)
          : this.player;
        if (chase?.active && chase.hp > 0) {
          const desired = Math.atan2(chase.y - b.sprite.y, chase.x - b.sprite.x);
          const cur = Math.atan2(b.vy, b.vx);
          const maxTurn = 5.5 * (delta / 1000);
          const na = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(desired - cur), -maxTurn, maxTurn);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(na) * sp;
          b.vy = Math.sin(na) * sp;
          b.sprite.setRotation(na);
          b.targetX = chase.x;
          b.targetY = chase.y;
        }
      }
      b.sprite.x += b.vx * (delta / 1000);
      b.sprite.y += b.vy * (delta / 1000);
      if (b.sprite.x < 0 || b.sprite.x > W2 || b.sprite.y < 0 || b.sprite.y > H2) {
        b.sprite.destroy();
        this.creatBolts.splice(i, 1);
        continue;
      }
      if (emitTrails) {
        this.fx(b.owner).emberTrail(b.sprite.x, b.sprite.y, Math.atan2(-b.vy, -b.vx),
          b.isRocket ? CREATION.ember : CREATION_TIER_COLORS[b.tier]);
      }
      // Rockets: explode at target position instead of entering the nexus
      if (b.isRocket && b.targetX !== undefined && b.targetY !== undefined) {
        const blast = b.blastRadius ?? 50;
        if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, b.targetX, b.targetY) <= 20) {
          this.fx(b.owner).explosion(b.sprite.x, b.sprite.y, blast + 6, { shards: 8, smoke: 2, core: CREATION.ember });
          for (const rktTarget of (b.owner === 'player' ? this.api.enemies : [this.player])) {
            if (!rktTarget.active || rktTarget.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, rktTarget.x, rktTarget.y) <= blast) {
              rktTarget.takeDamage(b.damage);
              this.api.spawnHitFlash(rktTarget.x, rktTarget.y, CREATION.ember);
            }
          }
          b.sprite.destroy();
          this.creatBolts.splice(i, 1);
          continue;
        }
      }
      // Check nexus hit (skip rockets and crafted bullets)
      if (!b.isRocket && !b.noNexus && this.nexusRig && Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, this.nexusX, this.nexusY) <= 30) {
        const fx = this.fx(b.owner);
        if (this.creatCraftInProgress) {
          // Rejected mid-brew — it bounces off the housing.
          fx.sparks(b.sprite.x, b.sprite.y, 4, { speed: 100, size: 1.8, life: 300, depth: 6 });
        } else if (this.nexusBolts.length < 2) {
          // Loaded slug on the shelf: an ingot in its own metal, not a coloured square.
          const iconX = this.nexusX - 12 + this.nexusBolts.length * 24;
          const iconY = this.nexusY - 46;
          const icon = this.add.graphics().setDepth(5);
          const tint = this.col(b.owner);
          icon.fillStyle(tint(CREATION.soot), 0.95);
          forgedShard(icon, -9, 0, 0, 19, 6.4);
          icon.fillStyle(tint(CREATION_TIER_COLORS[b.tier]), 1);
          forgedShard(icon, -8, 0, 0, 17, 5);
          icon.fillStyle(tint(CREATION.white), 0.5);
          forgedShard(icon, -7, -1.6, 0, 12, 1.3);
          icon.setPosition(iconX, iconY);
          this.nexusBolts.push({ tier: b.tier, icon });
          fx.gearPulse(this.nexusX, this.nexusY, 22, 340, CREATION.brass, 6);
          fx.sparks(iconX, iconY, 5, { speed: 80, size: 2, life: 400, depth: 6 });
          if (this.nexusBolts.length === 2) {
            this.creatCraftInProgress = true;
            this.creatCraftStartTime = time;
            this.creatCraftOwner = b.owner;
            // The machine winds up: stock spiralling in for the whole brew.
            fx.channelCharge(this.nexusX, this.nexusY, 46, this.creatCraftDuration, undefined, 6);
          }
        }
        b.sprite.destroy();
        this.creatBolts.splice(i, 1);
        continue;
      }
      // Check enemy hit
      let _boltHit = false;
      for (const bTarget of (b.owner === 'player' ? this.api.enemies : [this.player])) {
        if (!bTarget.active || bTarget.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, bTarget.x, bTarget.y) <= 18) {
          bTarget.takeDamage(b.damage);
          this.api.spawnHitFlash(bTarget.x, bTarget.y, CREATION_TIER_COLORS[b.tier]);
          // Heavier slugs land harder.
          const heft = b.tier === 'gold' ? 1.6 : b.tier === 'silver' ? 1.25 : 1;
          this.fx(b.owner).sparks(b.sprite.x, b.sprite.y, Math.round(7 * heft),
            { angle: Math.atan2(-b.vy, -b.vx), spread: 1.1, speed: 190 * heft, size: 2.4, life: 420, depth: 7 });
          this.fx(b.owner).ring(b.sprite.x, b.sprite.y, 3, 24 * heft, CREATION_TIER_COLORS[b.tier], 300, 3, 7);
          _boltHit = true;
          break;
        }
      }
      if (_boltHit) { b.sprite.destroy(); this.creatBolts.splice(i, 1); }
    }

    // 4. Wrenches in flight, and the debuff they leave behind
    this.updateWrenches(time, delta, emitTrails);
    this.updateWrenchDebuffs();

    // 5. Workshop (owner-agnostic) + the bots the Automaton perk lets it spawn
    this.updateCreationWorkshop(time, delta);
    this.updateAutomatons(time, delta);
    this.trackWorkshopKills(time);
    // Hazard stun enforcement
    if (time < this.creatNpcStunUntil) this.api.npcSpeedMult = 0;
    if (time < this.creatPlayerStunUntil && !this.api.isDodging) (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    // Bias slider outgoing damage on the creation player
    if (this.api.elementId === 'creation') {
      this.player.outgoingDamageMult = this.creatInventionActive && this.creatSliderBias > 0
        ? 1 + this.creatSliderBias * 0.75
        : 1;
    }

    // 6 & 7. Blocker and maze wall projectile absorption + movement push-out
    const allProj = this.api.projectiles.getChildren() as Projectile[];
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
        const W3 = this.api.width, H3 = this.api.height;
        if (bl.x < -bl.w || bl.x > W3 + bl.w || bl.y < -bl.h || bl.y > H3 + bl.h) {
          bl.rect.destroy(); bl.hpBar.destroy(); bl.hpBg.destroy();
          this.creatBlockers.splice(bi, 1);
          continue;
        }
        // Deal contact damage to enemy while launched
        if (bl.owner === 'player' && Math.abs(this.npc.x - bl.x) <= bl.w / 2 + 18 && Math.abs(this.npc.y - bl.y) <= bl.h / 2 + 18) {
          this.npc.takeDamage(20);
          this.api.spawnHitFlash(this.npc.x, this.npc.y, CREATION.tan);
          // A wall thrown into someone bursts into its own boards.
          this.pfx.bloom(bl.x, bl.y, Math.max(bl.w, bl.h) * 0.6, 10);
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
          // Splinters off the board that took the hit.
          this.fx(bl.owner).sparks(proj.x, proj.y, 4, { speed: 110, size: 2, life: 340, depth: 6 });
          if (bl.hp <= 0) {
            this.fx(bl.owner).bloom(bl.x, bl.y, Math.max(bl.w, bl.h) * 0.55, 10);
            bl.rect.destroy(); bl.hpBar.destroy(); bl.hpBg.destroy();
            this.creatBlockers.splice(bi, 1);
            break;
          }
        }
      }
      if (bi < this.creatBlockers.length) {
        // Push both fighters out — except the Workshop owner walks on their own barriers.
        const workshopWalker = this.scene.time.now < this.creatWorkshopEnd ? this.creatWorkshopOwner : null;
        if (!(workshopWalker === 'player' && bl.owner === 'player')) {
          this.api.pushFighterOutOfRect(this.player.body as Phaser.Physics.Arcade.Body, bl.x, bl.y, bl.w, bl.h);
        }
        if (!(workshopWalker === 'npc' && bl.owner === 'npc')) {
          this.api.pushFighterOutOfRect(this.npc.body as Phaser.Physics.Arcade.Body, bl.x, bl.y, bl.w, bl.h);
        }
      }
    }
    // Maze walls
    const casterBody = (this.api.elementId === 'creation' ? this.player : this.npc).body as Phaser.Physics.Arcade.Body;
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
            this.api.spawnHitFlash(spikeTarget.x, spikeTarget.y, CREATION.rust);
            this.fx(mw.owner).sparks(spikeTarget.x, spikeTarget.y, 4, { speed: 90, size: 1.8, life: 320, depth: 7 });
          }
        }
      }
      // Push non-caster fighter out
      const nonCasterBody = mwEnemyIsPlayer
        ? (this.player.body as Phaser.Physics.Arcade.Body)
        : (this.npc.body as Phaser.Physics.Arcade.Body);
      if (nonCasterBody !== casterBody) {
        this.api.pushFighterOutOfRect(nonCasterBody, mw.x, mw.y, mw.w, mw.h);
      } else {
        // If somehow same, push npc
        this.api.pushFighterOutOfRect(this.npc.body as Phaser.Physics.Arcade.Body, mw.x, mw.y, mw.w, mw.h);
      }
      // Expiry
      if (time >= mw.expireAt) {
        mw.rect.destroy();
        this.creatMazeWalls.splice(mi, 1);
      }
    }

    if (this.api.elementId === 'creation') {
      // Mastery — Springboard: drop a pad wherever the dash ended.
      this.updateSpringboard(time);

      // 8. Q+ Ultimate Invention: sliders, hazards, clutter (player-only)
      this.updateUltimateInvention(time, delta);
      this.updateCreationSaws(delta);
      this.updateCreationNails(delta);
      this.updateCreationClutter(time);

      // 9. R+ mech: the walker, its arms, and the repair orbs a med core throws
      this.updateMech(time, delta);
      this.updateMedOrbs(time, delta);
      // The Nexus rebuilding itself after its mech was wrecked.
      if (this.nexusRebuildAt > 0 && time >= this.nexusRebuildAt && !this.nexusRig) {
        this.nexusRebuildAt = 0;
        this.spawnNexus(this.nexusX, this.nexusY);
      }

      // 10. Speed pads (F+ Build Mode)
      for (let spi = this.creatSpeedPads.length - 1; spi >= 0; spi--) {
        const sp = this.creatSpeedPads[spi];
        // Springboard pads fade; build-mode pads have no expiry and skip this.
        if (sp.expireAt !== undefined && time >= sp.expireAt) {
          sp.rect.destroy(); sp.hpBar.destroy(); sp.hpBg.destroy();
          this.creatSpeedPads.splice(spi, 1);
          continue;
        }
        // Handle launched movement
        const spLaunch = sp as any;
        if (spLaunch.launchUntil && time < spLaunch.launchUntil) {
          sp.x += spLaunch.launchVx * (delta / 1000);
          sp.y += spLaunch.launchVy * (delta / 1000);
          sp.rect.setPosition(sp.x, sp.y);
          sp.hpBg.setPosition(sp.x, sp.y - sp.h / 2 - 6);
          sp.hpBar.setPosition(sp.x - sp.w / 2, sp.y - sp.h / 2 - 6);
          // Delete if offscreen
          const spW3 = this.api.width, spH3 = this.api.height;
          if (sp.x < -sp.w || sp.x > spW3 + sp.w || sp.y < -sp.h || sp.y > spH3 + sp.h) {
            sp.rect.destroy(); sp.hpBar.destroy(); sp.hpBg.destroy();
            this.creatSpeedPads.splice(spi, 1);
            continue;
          }
          // Check NPC hit
          if (sp.owner === 'player' && Math.abs(this.npc.x - sp.x) <= sp.w / 2 + 18 && Math.abs(this.npc.y - sp.y) <= sp.h / 2 + 18) {
            this.npc.takeDamage(12);
            this.api.spawnHitFlash(this.npc.x, this.npc.y, CREATION.steel);
            this.pfx.shrapnel(sp.x, sp.y, 8, 28, 7);
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
      if (time < this.creatNpcSlowEnd) this.api.npcSpeedMult *= this.creatNpcSlowMult;

      // 11. Spiked blocks (F+ Build Mode)
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
          const sbW3 = this.api.width, sbH3 = this.api.height;
          if (sb.x < -sb.w || sb.x > sbW3 + sb.w || sb.y < -sb.h || sb.y > sbH3 + sb.h) {
            sb.rect.destroy(); sb.hpBar.destroy(); sb.hpBg.destroy();
            this.creatSpikedBlocks.splice(sbi, 1);
            continue;
          }
          if (sb.owner === 'player' && Math.abs(this.npc.x - sb.x) <= sb.w / 2 + 18 && Math.abs(this.npc.y - sb.y) <= sb.h / 2 + 18) {
            this.npc.takeDamage(25);
            this.api.spawnHitFlash(this.npc.x, this.npc.y, CREATION.rust);
            this.pfx.shrapnel(sb.x, sb.y, 12, 34, 7);
            this.api.showFloatingText(this.npc.x, this.npc.y - 30, '25', '#cc2222');
            if (!sb.invincible) { sb.rect.destroy(); sb.hpBar.destroy(); sb.hpBg.destroy(); this.creatSpikedBlocks.splice(sbi, 1); continue; }
          }
        } else if (sbLaunch.launchUntil && time >= sbLaunch.launchUntil) {
          delete sbLaunch.launchUntil; delete sbLaunch.launchVx; delete sbLaunch.launchVy;
        }
        // Stationary: tick damage to adjacent enemy
        sb.tickAccum += delta;
        if (sb.tickAccum >= 300) {
          sb.tickAccum -= 300;
          for (const sbTarget of (sb.owner === 'player' ? this.api.enemies : [this.player])) {
            if (!sbTarget.active || sbTarget.hp <= 0) continue;
            if (Math.abs(sbTarget.x - sb.x) <= sb.w / 2 + 22 && Math.abs(sbTarget.y - sb.y) <= sb.h / 2 + 22) {
              sbTarget.takeDamage(5);
              this.api.spawnHitFlash(sbTarget.x, sbTarget.y, CREATION.rust);
              this.fx(sb.owner).sparks(sbTarget.x, sbTarget.y, 3, { speed: 80, size: 1.6, life: 300, depth: 7 });
            }
          }
        }
      }

      // 12. Click+ Blade Split: each dagger can cut any number of different blocks, but not the same block twice
      if (this.api.hasUpgrade('click')) {
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
              // The cut itself: a bright kerf along the blade's path, sawdust off both faces.
              const cutAng = Math.atan2(d.vy, d.vx);
              const cutLen = splitH ? ow : oh;
              this.pfx.anim(7, 260, (g, t) => {
                const fade = 1 - t;
                g.fillStyle(this.pcol(CREATION.spark), 0.9 * fade);
                forgedShard(g, ox - Math.cos(cutAng) * cutLen * 0.5, oy - Math.sin(cutAng) * cutLen * 0.5,
                  cutAng, cutLen * (0.5 + t * 0.6), 3 * fade);
              });
              this.pfx.sparks(ox, oy, 10, { angle: cutAng, spread: 0.5, speed: 200, size: 2.2, life: 420, depth: 7 });
              // Remove original
              bl.rect.destroy(); bl.hpBar.destroy(); bl.hpBg.destroy();
              this.creatBlockers.splice(bi, 1);
              // Spawn two halves, add them to this dagger's cutSet so it won't re-cut them
              if (splitH) {
                this.spawnBlocker(ox, oy - oh / 4 - gap, ow, oh / 2, oOwner, false);
                const h1 = this.creatBlockers[this.creatBlockers.length - 1]; h1.hp = halfHp; d.cutSet.add(h1);
                this.spawnBlocker(ox, oy + oh / 4 + gap, ow, oh / 2, oOwner, false);
                const h2 = this.creatBlockers[this.creatBlockers.length - 1]; h2.hp = halfHp; d.cutSet.add(h2);
              } else {
                this.spawnBlocker(ox - ow / 4 - gap, oy, ow / 2, oh, oOwner, false);
                const h1 = this.creatBlockers[this.creatBlockers.length - 1]; h1.hp = halfHp; d.cutSet.add(h1);
                this.spawnBlocker(ox + ow / 4 + gap, oy, ow / 2, oh, oOwner, false);
                const h2 = this.creatBlockers[this.creatBlockers.length - 1]; h2.hp = halfHp; d.cutSet.add(h2);
              }
              break; // move to next dagger after one cut
            }
          }
        }
      }
    }
  }
}
