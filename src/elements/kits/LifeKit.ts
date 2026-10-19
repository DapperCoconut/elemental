import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { Element } from '../Element';
import { CastContext } from '../Ability';
import {
  ArmGesture, LifeAura, LifeAvatar, LifeColorFn, LifeFx, PlantArtType, LIFE, SEED_COLOR, sprig,
} from './LifeVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { FONT_UI } from '../../ui/Theme';

// ── Seed catalogue ────────────────────────────────────────────────────────────

export type SeedType = PlantArtType;

interface SeedDef {
  id: SeedType;
  name: string;
  baseHp: number;
  color: number;
  blurb: string;
}

const SEEDS: SeedDef[] = [
  { id: 'sunflower',      name: 'Sunflower',  baseHp: 30, color: SEED_COLOR['sunflower'],      blurb: 'Solar link' },
  { id: 'nightcap',       name: 'Nightcap',   baseHp: 25, color: SEED_COLOR['nightcap'],       blurb: 'Poison bombs' },
  { id: 'helicopter',     name: 'Helicopter', baseHp: 70, color: SEED_COLOR['helicopter'],     blurb: 'Blades' },
  { id: 'mushroom',       name: 'Colony',     baseHp: 35, color: SEED_COLOR['mushroom'],       blurb: '8-way volley' },
  { id: 'frost-lily',     name: 'Frost Lily', baseHp: 30, color: SEED_COLOR['frost-lily'],     blurb: 'Piercing ice' },
  { id: 'flaming-sprout', name: 'Fire Sprout', baseHp: 20, color: SEED_COLOR['flaming-sprout'], blurb: 'Rapid fire, 5s' },
  { id: 'lotus',          name: 'Lotus',      baseHp: 35, color: SEED_COLOR['lotus'],          blurb: 'Healing orb' },
  { id: 'pitcher',        name: 'Pitcher',    baseHp: 50, color: SEED_COLOR['pitcher'],        blurb: 'Sprinkler' },
];

const SEED_BY_ID = new Map<SeedType, SeedDef>(SEEDS.map((s) => [s.id, s]));

/** Max simultaneous plants per owner. */
const MAX_PLANTS = 5;
/** Radius within which mushrooms count as "near each other" for the Mycology HP bonus. */
const MUSHROOM_CLUSTER_RADIUS = 170;

// ── Plant tuning ──────────────────────────────────────────────────────────────

/** Sunflower: recharge between links, how long a link runs, and how far it reaches. */
const SUN_RECHARGE_MS = 6000;
const SUN_LINK_MS = 3000;
const SUN_RANGE = 400;
/** A link snaps if its victim gets this far away. */
const SUN_BREAK_RANGE = 480;
/** Link damage per second climbs linearly from the first number to the second over the 3s. */
const SUN_DPS_START = 4;
const SUN_DPS_END = 20;

/** Nightcap: one spore bomb per interval, lobbed at whoever is in range. */
const NIGHTCAP_INTERVAL_MS = 2200;
const NIGHTCAP_RANGE = 480;
const NIGHTCAP_FLIGHT_MS = 600;
const NIGHTCAP_IMPACT_DMG = 8;
const NIGHTCAP_IMPACT_RADIUS = 38;
const NIGHTCAP_POOL_RADIUS = 42;
const NIGHTCAP_POOL_MS = 3000;

/** Helicopter: rotor reach, spin speed and the per-tick bite of the blades. */
export const HELI_RADIUS = 62;
const HELI_SPIN = 7;
const HELI_TICK_MS = 200;
const HELI_TICK_DMG = 3;

/** Mushroom Colony: one ring of eight spores per interval while something hostile is near. */
const SHROOM_INTERVAL_MS = 2600;
const SHROOM_COUNT = 8;
const SHROOM_DMG = 6;
const SHROOM_SPEED = 340;
const SHROOM_WAKE_RANGE = 520;

/** Frost Lily: piercing shard cadence, flight and the chill/brittle it leaves. */
const FROST_INTERVAL_MS = 1700;
const FROST_RANGE = 560;
const FROST_DMG = 7;
const FROST_SPEED = 560;
const FROST_MAX_DIST = 640;
const FROST_SLOW_MS = 2500;
const FROST_FRAIL_MS = 3000;
/** Slow and vulnerability the shard applies. */
const FROST_SLOW_MULT = 0.7;
const FROST_FRAIL_MULT = 1.2;

/** Flaming Sprout: a short-lived machine gun. */
const SPROUT_LIFESPAN_MS = 5000;
const SPROUT_INTERVAL_MS = 220;
const SPROUT_RANGE = 460;
const SPROUT_DMG = 3;
const SPROUT_SPEED = 620;
const SPROUT_BURN_MS = 2000;
/** Burn ticks every half second for this much. */
const BURN_TICK_DMG = 2;

/** Lotus: orb ripening time, pickup reach, and what an orb is worth. */
const LOTUS_RIPEN_MS = 5000;
const LOTUS_PICKUP_RADIUS = 30;
const LOTUS_HEAL = 10;
/** Each orb adds one petal per click for this long; stacks run on their own timers. */
const LOTUS_STACK_MS = 15000;
const LOTUS_MAX_STACKS = 8;

/** Pitcher: sprinkler cadence and reach, the heal per watering and how long the soak lasts. */
const PITCHER_INTERVAL_MS = 1500;
const PITCHER_RADIUS = 140;
const PITCHER_HEAL = 4;
const WATERED_MS = 2500;
/** A watered plant acts this much faster and hits this much harder. */
const WATERED_RATE = 0.35;
const WATERED_POWER = 0.25;

/** Nightcap essence poison: damage per stack per second, and how long a stack ladder lingers. */
const POISON_DPS_PER_STACK = 0.6;
const POISON_LINGER_MS = 4000;

// ── Life Mastery constants ────────────────────────────────────────────────────

/** Thorn Thrash: per-plant cooldown between thorn barrages. */
const THORN_THRASH_CD_MS = 3000;
const THORN_THRASH_COUNT = 5;
const THORN_DAMAGE = 5;
const THORN_SPEED = 420;
const REAP_COOLDOWN_MS = 15000;
/** Reap buff length: 20s for a bare plant, +10s per permanent fertilizer stack and +10s if
 *  it was freshly fertilized when reaped — a fully fed plant gives a full minute. */
const REAP_BUFF_BASE_MS = 20000;
const REAP_BUFF_PER_STACK_MS = 10000;
const REAP_BUFF_MAX_MS = 60000;
/** Sunflower reap: the right-click solar link's own recharge. */
const SOLAR_RECHARGE_MS = 6000;
/** Helicopter reap: blades round the caster, and the short petals' reach. */
const REAP_ROTOR_RADIUS = 54;
const REAP_ROTOR_TICK_DMG = 2;
const STUBBY_PETAL_RANGE = 130;
const STUBBY_PETAL_ANGLES = [-28, 0, 28];
/** Flaming reap: every chained shot shaves this fraction more off the click cooldown. */
const RAPID_STEP = 0.08;
const RAPID_MAX = 0.65;
/** Clicking stops for longer than this and the rapid-fire ramp falls back to nothing. */
const RAPID_RESET_MS = 900;
/** Lotus reap: a lotus grows on your head on this interval; a dash spends it. */
const CROWN_GROW_MS = 8000;
const CROWN_REGEN_MS = 5000;
const CROWN_REGEN_PER_SEC = 10;
const CROWN_SPEED_MULT = 1.25;
/** Pitcher reap: the watering can's cadence and reach around you. */
const CAN_INTERVAL_MS = 1500;
const CAN_RADIUS = 170;

// ── Revitalize (divine perk) ──────────────────────────────────────────────────

/** Living plants walk at roughly a third of a fighter's pace — they stalk, they don't chase. */
const LIVING_WALK_SPEED = 62;
/** HP a living plant knits back every second. */
const LIVING_REGEN_PER_SEC = 5;
/** How close an attacking plant closes to its prey. */
const LIVING_ENGAGE_DIST = 28;
/** How close a supporting plant trails its owner. */
const LIVING_FOLLOW_DIST = 40;
/** The seeds that work for their owner rather than on the enemy, so they walk the other way. */
const LIVING_FOLLOWERS: SeedType[] = ['lotus', 'pitcher'];

/** Petal Burst (click upgrade): 5 petals at 8 dmg, wider cone than the base 3×8. */
const SAKURA_ANGLES = [-24, -12, 0, 12, 24];

/** Which arm gesture the rig plays for each ability, on both sides. */
const GESTURES: Record<string, ArmGesture> = {
  'petal-shotgun': 'punch',
  'plant': 'slam',
  'grow': 'flex',
  'thorns': 'clap',
  'thorn-drag': 'raise',
};

// Invisible-hitbox element — plants are inert Fighters used purely as chase/bite targets.
const PLANT_ELEMENT: Element = {
  id: 'plant',
  name: 'Plant',
  color: 0x44cc44,
  emoji: '🌿',
  abilities: [],
};

interface PoisonPuddle {
  x: number;
  y: number;
  radius: number;
  expiresAt: number;
  /** Full lifetime, for the fade. */
  lifeMs: number;
  tickAccum: number;
  owner: 'player' | 'npc';
  /** Per-pool phase offset so a cluster of them doesn't ripple in lockstep. */
  seed: number;
}

/** A garden shot the kit flies itself: Frost Lily shards and Flaming Sprout fire. */
interface PlantBolt {
  kind: 'frost' | 'flame';
  owner: 'player' | 'npc';
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  /** Distance left before it fizzles. */
  range: number;
  /** Frost shards pierce: every fighter they have already gone through. */
  hit: Set<Fighter>;
  /** The plant that fired it, for kill credit and the hit-flash source. */
  from: Plant | null;
}

/** A Nightcap spore bomb on its arc. */
interface SporeBomb {
  owner: 'player' | 'npc';
  x0: number; y0: number;
  x1: number; y1: number;
  elapsed: number;
  damage: number;
  from: Plant;
}

/** A Sunflower link — the plant's, or the caster's own under Sunflower essence. */
interface SolarLink {
  target: Fighter;
  elapsed: number;
  /** Damage-per-second multiplier (fertilizer, watering, …). */
  power: number;
  /** ms banked toward the next damage tick. */
  tick: number;
}

interface Plant {
  type: SeedType;
  owner: 'player' | 'npc';
  x: number;
  y: number;
  /** Invisible Fighter that owns this plant's HP and acts as an enemy chase/bite target. */
  hitbox: Fighter;
  /** The plant itself, repainted from scratch every frame. */
  art: Phaser.GameObjects.Graphics;
  /** Over-head HP twig + fertilizer blossoms, repainted every frame. */
  hud: Phaser.GameObjects.Graphics;
  /** Base HP before E+/mushroom-cluster/permanent-fertilizer scaling. */
  baseHp: number;
  /** Primary effect timer (shots, recharge, ripening). */
  accum: number;
  /** Secondary timer (blade ticks, living-root lashes). */
  accum2: number;
  /** Seconds this plant has been alive — drives its sway. */
  age: number;
  /** Direction of the nearest hostile, so heads and mouths turn toward prey. */
  aim: number;

  // Fertilize (R)
  fertUntil: number;
  permStacks: number;

  // Root shield (F)
  shieldUntil: number;
  shieldLiving: boolean;

  // Revitalize (divine perk): the plant has been brought to life and walks.
  living: boolean;
  /** Gait clock for the root legs — advances with distance travelled, not with time. */
  legPhase: number;
  /** ms banked toward the next 5 HP of living regeneration. */
  regenAccum: number;

  /** Pitcher: watered until this time — faster and harder-hitting. */
  wateredUntil: number;
  /** Sunflower: the link it is running right now. */
  link: SolarLink | null;
  /** Helicopter: rotor angle. */
  spin: number;
  /** Flaming Sprout: when it burns out. */
  expiresAt: number;
  /** Lotus: an orb is ripe and waiting to be picked up. */
  orbReady: boolean;
  /** Pitcher: 1 right after a watering, decaying — fattens the spray arcs. */
  sprayFlash: number;

  // E+ dragging
  targetX: number;
  targetY: number;

  // Thorn Thrash (mastery passive): earliest time this plant may thrash again.
  thrashAt: number;
}

/** Bot plan for its next planting, computed owner-side and side-effect-free. */
export interface LifeNpcPlan {
  seed: SeedType;
  x: number;
  y: number;
}

// ── Arena API ─────────────────────────────────────────────────────────────────

export interface LifeArenaApi {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  isPlayerLife(): boolean;
  isNpcLife(): boolean;
  /** True only when the player is life AND Life Mastery is switched on. */
  readonly masteryActive: boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** Skins: maps a life visual color through the owner's skin. */
  lifeColor(owner: 'player' | 'npc', base: number): number;
  /** Equipped skin id for that side, or null — decides which character rig gets built. */
  skinId(owner: 'player' | 'npc'): string | null;
  buildPlayerContext(x: number, y: number): CastContext;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  /** True for the frames the player's Space dodge is running — Lotus essence spends on it. */
  readonly isDodging: boolean;
  /** Online: relay a pseudo-cast id (the seed the player just picked) to the peer. */
  broadcast(id: string): void;
  /** Online PvP — the opponent is a person, so their seed comes over the wire, not from a plan. */
  readonly isOnline: boolean;
}

// ── LifeKit ───────────────────────────────────────────────────────────────────

export class LifeKit {
  private readonly api: LifeArenaApi;

  // ── Visuals ─────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a future skin recolours one side. */
  private readonly pcol: LifeColorFn;
  private readonly ncol: LifeColorFn;
  private readonly pfx: LifeFx;
  private readonly nfx: LifeFx;
  /**
   * The character rig for each life-element fighter — life's own by default, or whatever that
   * side's equipped skin installs instead. Typed as the base rig because the kit only ever
   * drives it through poses and gestures, which every rig has.
   */
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Overgrowth ring worn while Thrive! is up. */
  private thriveAura: LifeAura | null = null;
  /** Every poison pool repainted in one pass rather than one Graphics per pool. */
  private puddleGfx: Phaser.GameObjects.Graphics | null = null;
  /** Seconds since reset — drives every surface that sways rather than tweens. */
  private worldT = 0;
  private projTrailAccum = 0;
  /** Last known aim, captured in handleInput so update() can steer the rig. */
  private lastMouseX = 0;
  private lastMouseY = 0;

  private playerPlants: Plant[] = [];
  private npcPlants: Plant[] = [];
  private puddles: PoisonPuddle[] = [];

  /** Currently selected seed for the player. */
  private selected: SeedType = 'sunflower';

  // Seed selection bar
  private barSlots: {
    def: SeedDef;
    /** Invisible hit target — all of the slot's look is painted into `art`. */
    bg: Phaser.GameObjects.Rectangle;
    /** The slot's seed, drawn as the real seed of that plant, sprouting when selected. */
    art: Phaser.GameObjects.Graphics;
    name: Phaser.GameObjects.Text;
    x: number;
    y: number;
    hover: boolean;
  }[] = [];
  /** The planter trough the seed slots sit in. */
  private barBack: Phaser.GameObjects.Graphics | null = null;
  /** Per-slot sprout growth 0..1, eased toward selected/unselected. */
  private sprout = new Map<SeedType, number>();

  /** Screen-space bounds of the seed bar; clicks inside never become attacks. */
  private barBounds = { x1: 0, y1: 0, x2: 0, y2: 0 };

  // E+ drag
  private dragging: Plant | null = null;
  private pointerWasDown = false;
  /** Last pointer position seen in handleInput, for the seed-bar hit test. */
  private lastPointerX = -1;
  private lastPointerY = -1;

  // Thrive! (Q)
  private thriveUntil = 0;
  private prevAbsorber: ((amount: number) => boolean) | null = null;
  /**
   * The opponent's Thrive! window. Purely a visual tell — the NPC's Thrive has no damage
   * redirect behind it — but their rig has to swell for it the way the player's does, or the
   * biggest cast in the kit reads as nothing on the side you are fighting.
   */
  private npcThriveUntil = 0;

  // ── Garden world objects ──
  private bolts: PlantBolt[] = [];
  private bombs: SporeBomb[] = [];
  /** Shared paint layer for bolts, bombs, every solar link and the caster's reap trappings. */
  private shotGfx: Phaser.GameObjects.Graphics | null = null;
  /** Per-fighter tick clocks for the garden's burn and poison. */
  private burnClock = new Map<Fighter, number>();
  private poisonClock = new Map<Fighter, { acc: number; bank: number }>();
  /** Husks walk on `walkSpeedMult`, so a chilled husk carries a divided-out slow we must undo. */
  private chilledHusks = new Set<Fighter>();
  /** Lotus orbs picked up: one expiry per stack, per side. */
  private lotusStacks: Record<'player' | 'npc', number[]> = { player: [], npc: [] };
  /** Online: the seed the remote player last picked, relayed ahead of their plantings. */
  private npcSeedOverride: SeedType | null = null;

  // ── Life Mastery state ──
  private reapLastCastAt = -Infinity;
  /** Seed type -> expiry timestamp for buffs stolen via Reap. */
  private reapBuffs = new Map<SeedType, number>();
  /** Sunflower essence: the caster's own right-click link, and when it can be used again. */
  private solar: SolarLink | null = null;
  private solarReadyAt = 0;
  private rightWasDown = false;
  /** Helicopter essence: rotor angle and blade tick clock. */
  private rotorSpin = 0;
  private rotorAccum = 0;
  /** Helicopter essence: the stubby close-range petals and where each was thrown from. */
  private stubbyPetals: { proj: Projectile; x: number; y: number }[] = [];
  /** Frost Lily essence: click petals that have not yet used their one wall bounce. */
  private bouncyPetals = new Set<Projectile>();
  /** Flaming essence: how many shots are chained, and when the last one went. */
  private rapidStacks = 0;
  private rapidLastAt = 0;
  /** Lotus essence: a lotus is sitting on your head; when the next one grows; the regen window. */
  private crownReady = false;
  private crownAccum = 0;
  private crownUntil = 0;
  private crownRegenAccum = 0;
  private wasDodging = false;
  /** Pitcher essence: watering-can clock. */
  private canAccum = 0;

  constructor(api: LifeArenaApi) {
    this.api = api;
    this.pcol = (base) => api.lifeColor('player', base);
    this.ncol = (base) => api.lifeColor('npc', base);
    this.pfx = new LifeFx(api.scene, this.pcol);
    this.nfx = new LifeFx(api.scene, this.ncol);
    this.reset();
  }

  /** The effects painter for whichever side owns a thing. */
  private fxFor(owner: 'player' | 'npc'): LifeFx {
    return owner === 'player' ? this.pfx : this.nfx;
  }

  private colFor(owner: 'player' | 'npc'): LifeColorFn {
    return owner === 'player' ? this.pcol : this.ncol;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  reset(): void {
    for (const p of [...this.playerPlants, ...this.npcPlants]) this.destroyPlant(p);
    this.playerPlants = [];
    this.npcPlants = [];
    this.puddles = [];

    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.thriveAura) { this.thriveAura.destroy(); this.thriveAura = null; }
    if (this.puddleGfx) { this.puddleGfx.destroy(); this.puddleGfx = null; }
    this.worldT = 0;
    this.projTrailAccum = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.selected = 'sunflower';
    this.dragging = null;
    this.pointerWasDown = false;
    this.lastPointerX = -1;
    this.lastPointerY = -1;
    this.thriveUntil = 0;
    this.npcThriveUntil = 0;
    this.reapLastCastAt = -Infinity;
    this.reapBuffs.clear();
    this.bolts = [];
    this.bombs = [];
    if (this.shotGfx) { this.shotGfx.destroy(); this.shotGfx = null; }
    this.burnClock.clear();
    this.poisonClock.clear();
    this.chilledHusks.clear();
    this.lotusStacks = { player: [], npc: [] };
    this.npcSeedOverride = null;
    this.solar = null;
    this.solarReadyAt = 0;
    this.rightWasDown = false;
    this.rotorSpin = 0;
    this.rotorAccum = 0;
    this.stubbyPetals = [];
    this.bouncyPetals.clear();
    this.rapidStacks = 0;
    this.rapidLastAt = 0;
    this.crownReady = false;
    this.crownAccum = 0;
    this.crownUntil = 0;
    this.crownRegenAccum = 0;
    this.wasDodging = false;
    this.canAccum = 0;
    // reset() runs from the constructor and from create(), both of which happen
    // before ArenaScene assigns this match's player — so guard the access.
    this.prevAbsorber = null;
    if (this.api.player) this.api.player.damageAbsorber = null;

    this.teardownBar();
    if (this.api.isPlayerLife()) this.buildBar();
  }

  // ── Seed selection bar ──────────────────────────────────────────────────────

  private teardownBar(): void {
    for (const s of this.barSlots) { s.bg.destroy(); s.art.destroy(); s.name.destroy(); }
    this.barSlots = [];
    this.barBack?.destroy();
    this.barBack = null;
    this.sprout.clear();
    this.barBounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
  }

  private static readonly BAR_Y = 66;
  private static readonly SLOT_W = 74;
  private static readonly SLOT_H = 50;

  private buildBar(): void {
    const scene = this.api.scene;
    const slotW = LifeKit.SLOT_W;
    const slotH = LifeKit.SLOT_H;
    const gap = 8;
    const total = SEEDS.length * slotW + (SEEDS.length - 1) * gap;
    const startX = scene.scale.width / 2 - total / 2 + slotW / 2;
    // Sits just under the top-centre HP bar rather than on it.
    const y = LifeKit.BAR_Y;
    this.barBounds = {
      x1: startX - slotW / 2, y1: y - slotH / 2,
      x2: startX - slotW / 2 + total, y2: y + slotH / 2,
    };
    this.barBack = scene.add.graphics().setDepth(199.5).setScrollFactor(0);

    for (let i = 0; i < SEEDS.length; i++) {
      const def = SEEDS[i];
      const x = startX + i * (slotW + gap);
      // Fully transparent but still a hit target — every pixel of the slot is painted in `art`.
      const bg = scene.add.rectangle(x, y, slotW, slotH, 0x000000, 0.001)
        .setDepth(200)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const art = scene.add.graphics().setDepth(201).setScrollFactor(0);
      const name = scene.add.text(x, y + slotH / 2 - 8, def.name, {
        fontSize: '10px', fontFamily: FONT_UI, fontStyle: 'bold', color: '#cfe8c0',
        stroke: '#10200a', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(202).setScrollFactor(0);

      const slot = { def, bg, art, name, x, y, hover: false };
      bg.on('pointerdown', () => {
        this.selectSeed(def.id);
      });
      // Hovering the bar must never leak a click through to the attack handler.
      bg.on('pointerover', () => { slot.hover = true; });
      bg.on('pointerout', () => { slot.hover = false; this.refreshBar(); });

      this.barSlots.push(slot);
    }
    this.refreshBar();
  }

  /** Pick a seed — from the bar or a number key — and tell an online peer which one it is. */
  private selectSeed(id: SeedType): void {
    if (this.selected === id) return;
    this.selected = id;
    this.refreshBar();
    this.api.broadcast(`life-seed:${id}`);
  }

  /** Online: the peer picked a seed. Their next planting grows it. */
  setNpcSeed(id: string): void {
    const seed = id.slice('life-seed:'.length) as SeedType;
    if (SEED_BY_ID.has(seed)) this.npcSeedOverride = seed;
  }

  private refreshBar(): void {
    for (const s of this.barSlots) {
      const isSel = s.def.id === this.selected;
      s.name.setColor(isSel ? '#ffffff' : '#9fbf90');
    }
  }

  /**
   * Repaint the seed tray: a wooden planter trough, and in it one soil bed per plant with
   * that plant's actual seed lying in it. The chosen seed has split its husk and is sending
   * up a shoot; hovering one makes it stir. Everything is redrawn from `worldT` each frame.
   */
  private paintBar(): void {
    if (this.barSlots.length === 0) return;
    const t = this.worldT;
    const c = this.pcol;
    const W = LifeKit.SLOT_W, H = LifeKit.SLOT_H;
    const b = this.barBounds;

    // ── Planter trough behind every bed ──
    const back = this.barBack;
    if (back && back.active) {
      back.clear();
      const x0 = b.x1 - 10, x1 = b.x2 + 10, y0 = b.y1 - 4, y1 = b.y2 + 4;
      back.fillStyle(0x000000, 0.35);
      back.fillRoundedRect(x0 + 2, y0 + 4, x1 - x0, y1 - y0, 10);
      back.fillStyle(c(LIFE.soil), 0.94);
      back.fillRoundedRect(x0, y0, x1 - x0, y1 - y0, 10);
      // Plank seams and grain on the frame.
      back.lineStyle(2, c(LIFE.bark), 0.95);
      back.strokeRoundedRect(x0, y0, x1 - x0, y1 - y0, 10);
      back.lineStyle(1, c(LIFE.rot), 0.5);
      back.strokeRoundedRect(x0 + 3, y0 + 3, x1 - x0 - 6, y1 - y0 - 6, 8);
      // Vine trailing along the top edge, with leaves.
      back.lineStyle(1.6, c(LIFE.deep), 0.9);
      back.beginPath();
      for (let i = 0; i <= 40; i++) {
        const px = x0 + 8 + (i / 40) * (x1 - x0 - 16);
        const py = y0 + 1 + Math.sin(i * 0.9 + t * 0.6) * 1.6;
        if (i === 0) back.moveTo(px, py); else back.lineTo(px, py);
      }
      back.strokePath();
      for (let i = 0; i < 14; i++) {
        const px = x0 + 14 + (i / 13) * (x1 - x0 - 28);
        const py = y0 + 1 + Math.sin(i * 2.07 + t * 0.6) * 1.6;
        const side = i % 2 === 0 ? -1 : 1;
        back.fillStyle(c(i % 3 === 0 ? LIFE.lime : LIFE.leaf), 0.9);
        back.fillEllipse(px + 2, py + side * 3, 6, 3);
      }
      // Corner rivets.
      back.fillStyle(c(LIFE.pale), 0.5);
      for (const [rx, ry] of [[x0 + 5, y0 + 5], [x1 - 5, y0 + 5], [x0 + 5, y1 - 5], [x1 - 5, y1 - 5]]) {
        back.fillCircle(rx, ry, 1.6);
      }
    }

    for (const s of this.barSlots) {
      const isSel = s.def.id === this.selected;
      const g = s.art;
      g.clear();
      // Ease the sprout up/down so switching seeds animates instead of popping.
      const want = isSel ? 1 : s.hover ? 0.3 : 0;
      const cur = this.sprout.get(s.def.id) ?? want;
      const grow = cur + (want - cur) * 0.18;
      this.sprout.set(s.def.id, grow);

      const x0 = s.x - W / 2, y0 = s.y - H / 2;
      const accent = c(s.def.color);
      // Soil bed: dark tilled earth with a lighter top crumb.
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(x0 + 1, y0 + 2, W, H, 8);
      g.fillStyle(isSel ? 0x3a2716 : 0x261a10, 0.98);
      g.fillRoundedRect(x0, y0, W, H, 8);
      g.fillStyle(c(LIFE.soil), 1);
      g.fillRoundedRect(x0 + 3, y0 + H * 0.52, W - 6, H * 0.44, 6);
      // Soil crumbs.
      for (let i = 0; i < 9; i++) {
        const cx = x0 + 6 + ((i * 53 + s.x) % (W - 12));
        const cy = y0 + H * 0.58 + ((i * 29) % 9);
        g.fillStyle(c(i % 2 ? LIFE.rot : LIFE.bark), 0.55);
        g.fillCircle(cx, cy, 1 + (i % 3) * 0.4);
      }
      // Bed rim: the plant's own colour, bright and doubled when this is the chosen seed.
      if (isSel) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 4);
        g.lineStyle(5, accent, 0.18 + 0.12 * pulse);
        g.strokeRoundedRect(x0 - 2, y0 - 2, W + 4, H + 4, 10);
        g.lineStyle(2.2, accent, 1);
        g.strokeRoundedRect(x0, y0, W, H, 8);
        g.lineStyle(1, c(LIFE.glow), 0.6);
        g.strokeRoundedRect(x0 + 2.5, y0 + 2.5, W - 5, H - 5, 6);
      } else {
        g.lineStyle(1.5, accent, s.hover ? 0.85 : 0.45);
        g.strokeRoundedRect(x0, y0, W, H, 8);
      }

      // The seed, lying in the soil, half-buried — stirring when hovered, split when chosen.
      const sx = s.x, sy = s.y - 4;
      const wob = s.hover && !isSel ? Math.sin(t * 14) * 0.08 : Math.sin(t * 1.4 + s.x) * 0.03;
      this.paintSeed(g, s.def.id, sx, sy, wob, grow, isSel ? 1 : s.hover ? 0.9 : 0.72);
    }
  }

  /**
   * One seed, drawn as the real seed of its plant: a striped sunflower kernel, a capped
   * nightcap spore-nut, a maple key, a clutch of button mushrooms, a frosted bulb, an ember
   * kernel, a lotus pod and a spindle pitcher seed.
   * `grow` 0..1 splits the husk and sends up a two-leaf shoot from the top.
   */
  private paintSeed(
    g: Phaser.GameObjects.Graphics, type: SeedType,
    x: number, y: number, rot: number, grow: number, alpha: number,
  ): void {
    const c = this.pcol;
    const t = this.worldT;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const P = (dx: number, dy: number) => ({ x: x + dx * cos - dy * sin, y: y + dx * sin + dy * cos });
    const ell = (dx: number, dy: number, w: number, h: number) => { const p = P(dx, dy); g.fillEllipse(p.x, p.y, w, h); };
    const circ = (dx: number, dy: number, r: number) => { const p = P(dx, dy); g.fillCircle(p.x, p.y, r); };
    const line = (ax: number, ay: number, bx: number, by: number) => {
      const a = P(ax, ay), b = P(bx, by); g.lineBetween(a.x, a.y, b.x, b.y);
    };
    const poly = (pts: [number, number][]) => {
      g.beginPath();
      pts.forEach(([px, py], i) => { const p = P(px, py); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); });
      g.closePath();
      g.fillPath();
    };

    // Contact shadow in the soil.
    g.fillStyle(0x000000, 0.35 * alpha);
    g.fillEllipse(x + 1, y + 10, 26, 6);

    // The shoot grows *behind* the husk's top edge, so draw it first.
    if (grow > 0.02) {
      const h = 6 + grow * 16;
      const sway = Math.sin(t * 2.2 + x) * 2 * grow;
      const top = P(sway, -6 - h);
      const base = P(0, -6);
      g.lineStyle(2.2, c(LIFE.stem), alpha);
      g.beginPath();
      g.moveTo(base.x, base.y);
      const mid = P(sway * 0.3 + 1.5, -6 - h * 0.5);
      g.lineTo(mid.x, mid.y);
      g.lineTo(top.x, top.y);
      g.strokePath();
      // Two cotyledon leaves opening out of the tip.
      const open = Math.min(1, grow * 1.3);
      for (const side of [-1, 1]) {
        const la = -Math.PI / 2 + side * (0.4 + open * 0.75);
        const lx = top.x + Math.cos(la) * 5 * open;
        const ly = top.y + Math.sin(la) * 5 * open;
        g.fillStyle(c(LIFE.leaf), alpha);
        g.fillEllipse(lx, ly, 9 * open + 1, 4.5 * open + 1);
        g.fillStyle(c(LIFE.pale), alpha * 0.7);
        g.fillEllipse(lx - 0.6, ly - 0.6, 4 * open + 0.5, 1.6 * open + 0.4);
      }
      if (grow > 0.9) {
        // A dew drop on the chosen seed's shoot.
        g.fillStyle(c(LIFE.glow), alpha * (0.6 + 0.4 * Math.sin(t * 3)));
        g.fillCircle(top.x + 3, top.y + 2, 1.3);
      }
    }

    const split = grow > 0.5 ? (grow - 0.5) * 2 : 0;
    switch (type) {
      case 'sunflower': {
        // Teardrop kernel, black with cream stripes.
        g.fillStyle(0x1a1410, alpha);
        poly([[0, -9], [6, -3], [7, 4], [4, 9], [0, 10.5], [-4, 9], [-7, 4], [-6, -3]]);
        g.lineStyle(1.3, 0xe8e0c8, alpha * 0.85);
        line(-3.5, -5, -4.5, 8); line(0, -8, 0, 10); line(3.5, -5, 4.5, 8);
        g.fillStyle(0xffffff, alpha * 0.35);
        ell(-2.5, -1, 2, 7);
        break;
      }
      case 'nightcap': {
        // A spore-nut: speckled purple cap over a pale stalk-bulb.
        g.fillStyle(0xd8ccb8, alpha);
        ell(0, 5, 11, 11);
        g.fillStyle(c(LIFE.night), alpha);
        g.beginPath();
        { const a = P(-8, 1), b = P(8, 1); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
        for (let i = 0; i <= 10; i++) {
          const a = (i / 10) * Math.PI;
          const p = P(Math.cos(a) * 8, 1 - Math.sin(a) * 9);
          g.lineTo(p.x, p.y);
        }
        g.closePath();
        g.fillPath();
        g.fillStyle(c(LIFE.glow), alpha * 0.85);
        circ(-3, -3, 1.4); circ(2.5, -5, 1.1); circ(4, -1, 1);
        g.fillStyle(0x000000, alpha * 0.25);
        ell(0, 1.5, 16, 2.4);
        break;
      }
      case 'pitcher': {
        // Spindle seed with a wing-fringe and hooked tip.
        g.fillStyle(c(LIFE.pitcher), alpha * 0.4);
        poly([[0, -12], [5, -2], [4, 9], [0, 12], [-4, 9], [-5, -2]]);
        g.fillStyle(c(LIFE.bark), alpha);
        poly([[0, -9], [2.8, -2], [2.6, 7], [0, 10], [-2.6, 7], [-2.8, -2]]);
        g.lineStyle(1, c(LIFE.pitcher), alpha * 0.9);
        line(0, -8, 0, 9);
        g.lineStyle(1.2, c(LIFE.lime), alpha * 0.7);
        line(-4, -1, -6, -3); line(4, -1, 6, -3); line(-3.5, 5, -5.5, 4); line(3.5, 5, 5.5, 4);
        break;
      }
      case 'helicopter': {
        // A maple key: a fat seed with a single veined wing — the seed that helicopters down.
        g.fillStyle(c(LIFE.heli), alpha * 0.85);
        poly([[-2, 3], [-6, -6], [-3, -12], [4, -13], [9, -8], [6, -2], [2, 3]]);
        g.lineStyle(0.9, c(LIFE.deep), alpha * 0.8);
        line(0, 2, 2, -12); line(1, -3, 6, -8); line(0.6, -6, -4, -9);
        g.fillStyle(c(LIFE.bark), alpha);
        ell(-1, 5, 9, 8);
        g.fillStyle(0xffffff, alpha * 0.35);
        ell(-2.5, 4, 3, 3);
        break;
      }
      case 'mushroom': {
        // A clutch of button mushrooms just breaking the soil.
        for (const [bx, by, r] of [[-5, 4, 4.5], [4, 2, 5.5], [0, 7, 3.5]] as [number, number, number][]) {
          g.fillStyle(0xe8dcc0, alpha);
          ell(bx, by + 2, r * 1.1, r * 1.2);
          g.fillStyle(c(LIFE.shroom), alpha);
          g.beginPath();
          { const a0 = P(bx - r, by), b0 = P(bx + r, by); g.moveTo(a0.x, a0.y); g.lineTo(b0.x, b0.y); }
          for (let i = 0; i <= 8; i++) {
            const a = (i / 8) * Math.PI;
            const q = P(bx + Math.cos(a) * r, by - Math.sin(a) * r * 0.9);
            g.lineTo(q.x, q.y);
          }
          g.closePath();
          g.fillPath();
          g.fillStyle(c(LIFE.cotton), alpha * 0.85);
          circ(bx - r * 0.3, by - r * 0.45, r * 0.18);
        }
        break;
      }
      case 'frost-lily': {
        // An icy bulb crusted with frost crystals.
        g.fillStyle(c(LIFE.frost), alpha);
        ell(0, 2, 15, 16);
        g.fillStyle(c(LIFE.ice), alpha);
        ell(-2, 0, 8, 12);
        g.fillStyle(0xffffff, alpha * 0.9);
        for (const [cx2, cy2] of [[-5, -4], [4, -2], [1, 7]] as [number, number][]) {
          poly([[cx2, cy2 - 3], [cx2 + 1.2, cy2], [cx2, cy2 + 3], [cx2 - 1.2, cy2]]);
        }
        g.lineStyle(1, c(LIFE.frost), alpha * 0.8);
        line(0, -7, 0, 9);
        break;
      }
      case 'flaming-sprout': {
        // An ember kernel, glowing through cracks in its char.
        const glow = 0.6 + 0.4 * Math.sin(t * 6 + x);
        g.fillStyle(c(LIFE.flame), alpha * 0.25 * glow);
        circ(0, 1, 10);
        g.fillStyle(0x1a1410, alpha);
        ell(0, 2, 13, 15);
        g.lineStyle(1.4, c(LIFE.ember), alpha * glow);
        line(-3, -4, 0, 1); line(0, 1, -2, 6); line(0, 1, 4, 4); line(2, -5, 0, 1);
        g.fillStyle(c(LIFE.flame), alpha * glow);
        circ(0, 1, 1.6);
        break;
      }
      case 'lotus': {
        // A lotus seed pod: a flat-topped cone pocked with seed holes.
        g.fillStyle(c(LIFE.lime), alpha);
        poly([[-8, -5], [8, -5], [4, 9], [-4, 9]]);
        g.fillStyle(c(LIFE.stem), alpha);
        ell(0, -5, 16, 5);
        g.fillStyle(c(LIFE.deep), alpha);
        for (const [hx, hy] of [[-4, -5.5], [0, -6], [4, -5.5], [-2, -4], [2, -4]] as [number, number][]) circ(hx, hy, 1.1);
        g.fillStyle(c(LIFE.lotus), alpha * 0.8);
        ell(-6, 3, 5, 8);
        break;
      }
    }

    // A split down the husk once the shoot is up, showing pale flesh inside.
    if (split > 0) {
      g.lineStyle(1.4, c(LIFE.pale), alpha * split);
      line(0, -7, 0.8, -2);
      line(0.8, -2, -0.4, 2);
    }
  }

  /**
   * True when the pointer is doing UI work rather than attacking — hovering the
   * seed bar or dragging a plant. Checked geometrically rather than via a flag
   * set in the pointerdown handler, because Phaser dispatches input events
   * before scene update and a per-frame flag would already have been cleared.
   */
  consumedPointer(): boolean {
    if (this.dragging) return true;
    const b = this.barBounds;
    return this.lastPointerX >= b.x1 && this.lastPointerX <= b.x2
      && this.lastPointerY >= b.y1 && this.lastPointerY <= b.y2;
  }

  // ── Plant creation ──────────────────────────────────────────────────────────

  /** Base max HP for a plant type, before cluster/permanent scaling. */
  private computeMaxHp(p: Plant, list: Plant[]): number {
    let hp = p.baseHp;
    const myco = this.api.hasPerk(p.owner, 'mycology');
    if (myco) {
      // Mushrooms start at 50% strength but scale to 150% when clustered five deep.
      let near = 0;
      for (const o of list) {
        if (Phaser.Math.Distance.Between(p.x, p.y, o.x, o.y) <= MUSHROOM_CLUSTER_RADIUS) near++;
      }
      hp *= 0.5 + 0.25 * (Math.min(5, Math.max(1, near)) - 1);
    }
    if (p.owner === 'player' && this.api.hasUpgrade('e')) hp *= 1.5;
    // Revitalize: a plant that has been brought to life is a hardier thing than a plant.
    if (p.living) hp *= 1.25;
    hp *= 1 + 0.1 * p.permStacks;
    return Math.max(1, Math.round(hp));
  }

  /**
   * How much faster a plant acts right now: Fertilize's surge, permanent stacks, and a
   * Pitcher's watering. Multiplies every plant's timers.
   */
  private boost(p: Plant): number {
    const now = this.api.scene.time.now;
    const fert = now < p.fertUntil ? 0.6 : 0;
    const wet = now < p.wateredUntil ? WATERED_RATE : 0;
    return 1 + fert + 0.08 * p.permStacks + wet;
  }

  /**
   * How hard a plant hits right now. Gentler than `boost` — a fertilised plant is already
   * attacking 60% more often — plus Mushroom essence's bonus on its owner's colonies.
   */
  private power(p: Plant): number {
    const now = this.api.scene.time.now;
    let mult = 1 + (now < p.fertUntil ? 0.25 : 0) + 0.05 * p.permStacks
      + (now < p.wateredUntil ? WATERED_POWER : 0);
    if (p.type === 'mushroom' && p.owner === 'player' && this.hasReapBuff('mushroom')) mult *= 1.5;
    return mult;
  }

  private isFertilized(p: Plant): boolean {
    return this.api.scene.time.now < p.fertUntil;
  }

  private isWatered(p: Plant): boolean {
    return this.api.scene.time.now < p.wateredUntil;
  }

  createPlant(x: number, y: number, owner: 'player' | 'npc'): void {
    const scene = this.api.scene;
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    // The remote player's relayed pick wins online; a bot grows whatever its plan called for.
    const type: SeedType = owner === 'player'
      ? this.selected
      : this.npcSeedOverride ?? (this.api.isOnline ? 'sunflower' : this.npcPlantPlan()?.seed ?? 'sunflower');
    if (owner === 'player') this.api.broadcast(`life-seed:${type}`);
    const def = SEED_BY_ID.get(type)!;

    // Oldest plant makes way once the cap is reached.
    if (list.length >= MAX_PLANTS) {
      const oldest = list.shift();
      if (oldest) { this.fxFor(owner).wilt(oldest.x, oldest.y, 22); this.destroyPlant(oldest); }
    }

    const hitbox = new Fighter(scene, x, y, 'husk', PLANT_ELEMENT, def.baseHp, 0);
    hitbox.setAlpha(0);
    hitbox.forceInvisible = true;
    hitbox.hideHealthBar();
    const hb = hitbox.body as Phaser.Physics.Arcade.Body;
    hb.setImmovable(true);
    hb.moves = false;

    const art = scene.add.graphics().setDepth(2);
    const hud = scene.add.graphics().setDepth(5);

    const plant: Plant = {
      type, owner, x, y, hitbox, art, hud,
      baseHp: def.baseHp,
      // A fresh Sunflower is nearly charged, so planting one is not six seconds of nothing.
      accum: type === 'sunflower' ? SUN_RECHARGE_MS - 900 : 0,
      accum2: 0, age: 0, aim: -Math.PI / 2,
      fertUntil: 0, permStacks: 0,
      shieldUntil: 0, shieldLiving: false,
      living: false, legPhase: 0, regenAccum: 0,
      wateredUntil: 0, link: null, spin: Math.random() * Math.PI * 2,
      expiresAt: type === 'flaming-sprout' ? scene.time.now + SPROUT_LIFESPAN_MS : Infinity,
      orbReady: false, sprayFlash: 0,
      targetX: x, targetY: y,
      thrashAt: 0,
    };
    list.push(plant);

    // Every damage path — husk bites, projectiles, Thrive! shares — lands on the
    // hitbox, so the Root Shield lives in one place.
    hitbox.damageAbsorber = () => {
      if (scene.time.now < plant.shieldUntil) {
        this.api.showFloatingText(plant.x, plant.y - 34, '🛡️', '#aaeeff');
        this.fxFor(owner).ring(plant.x, plant.y, 24, 38, LIFE.pale, 260, 3, 5);
        return true; // fully blocked
      }
      return false; // let the normal HP subtraction happen
    };

    // Cluster bonuses shift for every mushroom whenever one is added.
    this.rescaleAll(list);

    // It takes root: the ground breaks open, a bloom throws itself outward, pollen lifts.
    const f = this.fxFor(owner);
    f.bloomBurst(x, y, 40, 9, 3);
    f.ring(x, y, 6, 52, def.color, 420, 4, 3);
    f.pollen(x, y, 8, { speed: 90, size: 2.8, life: 620, rise: 26, depth: 4, color: def.color });
    // Kept tight: a wide patch under a small plant reads as a smear rather than as turf.
    f.overgrowth(x, y + 10, 18);
    this.avatarFor(owner)?.play('slam', Math.atan2(y - this.casterFor(owner).y, x - this.casterFor(owner).x));

    if (owner === 'player') {
      const myco = this.api.hasPerk('player', 'mycology');
      this.api.showFloatingText(x, y - 46, `🌱 ${def.name}`, '#88ff88');
      // Mycology trades the E cooldown for a blood price on every planting.
      if (myco) {
        this.api.player.applySelfDamage(15);
        this.api.spawnHitFlash(this.api.player.x, this.api.player.y, this.pcol(LIFE.night));
        this.api.showFloatingText(this.api.player.x, this.api.player.y - 30, '🍄 -15', '#cc88ff');
        this.pfx.spores(this.api.player.x, this.api.player.y, 3, 26, 5, LIFE.night);
      }
    }
  }

  /** Recompute max HP for every plant in a list, preserving each plant's HP ratio. */
  private rescaleAll(list: Plant[]): void {
    for (const p of list) {
      const newMax = this.computeMaxHp(p, list);
      if (newMax === p.hitbox.maxHp) continue;
      const ratio = p.hitbox.maxHp > 0 ? p.hitbox.hp / p.hitbox.maxHp : 1;
      p.hitbox.maxHp = newMax;
      p.hitbox.hp = Math.max(1, Math.min(newMax, Math.round(newMax * ratio)));
    }
  }

  private destroyPlant(p: Plant): void {
    p.art.destroy();
    p.hud.destroy();
    p.hitbox.destroy();
  }

  // ── Ability entry points (called from CastContext) ──────────────────────────

  /** R — Fertilize: heal + temporarily supercharge every plant in a yellow AOE. */
  doFertilize(owner: 'player' | 'npc'): void {
    const scene = this.api.scene;
    const caster = this.casterFor(owner);
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    const radius = 200;
    const perma = owner === 'player' && this.api.hasUpgrade('r');
    const f = this.fxFor(owner);

    // A wave of growth rolls out from the caster and pollen falls over everything in it.
    f.ring(caster.x, caster.y, 20, radius, LIFE.pollen, 520, 6, 3);
    scene.time.delayedCall(90, () => f.ring(caster.x, caster.y, 16, radius * 1.08, LIFE.sun, 560, 4, 3));
    f.pollen(caster.x, caster.y, 26, {
      speed: radius * 1.5, size: 3.4, life: 780, rise: 30, depth: 4, color: LIFE.pollen,
    });
    this.avatarFor(owner)?.play('flex');

    let hit = 0;
    for (const p of list) {
      if (Phaser.Math.Distance.Between(caster.x, caster.y, p.x, p.y) > radius) continue;
      hit++;
      const healed = Math.min(Math.round(p.hitbox.maxHp * 0.5), p.hitbox.maxHp - p.hitbox.hp);
      if (healed > 0) {
        p.hitbox.hp += healed;
        this.api.showFloatingText(p.x, p.y - 38, `+${healed}`, '#ffdd44');
      }
      p.fertUntil = scene.time.now + 5000;
      if (perma && p.permStacks < 3) {
        p.permStacks++;
        this.api.showFloatingText(p.x, p.y - 52, '⭐ Perma-Fertilized!', '#66ccff');
        f.bloomBurst(p.x, p.y, 34, 8, 3);
      }
      // Each plant visibly surges. Gold, not the mint used for heals and shields — a buff
      // and a heal reading as the same event is the fastest way to make a HUD unreadable.
      f.healBloom(p.x, p.y, 22, 5, LIFE.pollen);
      f.pollen(p.x, p.y + 10, 6, { speed: 40, size: 2.6, life: 700, rise: 34, depth: 5, color: LIFE.pollen });
    }
    this.rescaleAll(list);
    if (owner === 'player') {
      if (hit > 0) this.api.recordMasteryStat('fertilized', hit);
      this.api.showFloatingText(caster.x, caster.y - 40,
        hit > 0 ? `🌟 Fertilized ${hit}!` : '🌟 No plants in range', hit > 0 ? '#ffdd44' : '#aaaa88');
    }
  }

  /** F — Root Shield: 3s of invulnerability on the cursored (or nearest) plant, then a full heal. */
  doRootShield(owner: 'player' | 'npc', targetX: number, targetY: number): void {
    const scene = this.api.scene;
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    const caster = this.casterFor(owner);
    if (list.length === 0) {
      if (owner === 'player') this.api.showFloatingText(caster.x, caster.y - 40, '🌱 No plants!', '#aaaa88');
      return;
    }

    const target = this.pickPlant(list, targetX, targetY);
    if (!target) return;

    // Revitalize (divine perk) replaces the shield outright: the roots tear free and the
    // plant gets up. Nothing else about the cast happens — no dome, no delayed heal.
    if (this.api.hasPerk(owner, 'revitalize')) {
      this.revivePlant(target, owner);
      return;
    }

    const living = owner === 'player' && this.api.hasUpgrade('f');
    target.shieldUntil = scene.time.now + 3000;
    target.shieldLiving = living;
    target.accum2 = 0;

    // Roots come up out of the ground and close over the plant.
    const f = this.fxFor(owner);
    f.bloomBurst(target.x, target.y + 8, 44, 11, 3);
    f.ring(target.x, target.y, 10, 46, living ? LIFE.rose : LIFE.pale, 440, 5, 5);
    f.vineLash(caster.x, caster.y, target.x, target.y, living ? LIFE.rose : LIFE.leaf, 5);
    this.avatarFor(owner)?.play('clap', Math.atan2(target.y - caster.y, target.x - caster.x));
    this.api.showFloatingText(target.x, target.y - 44, living ? '🩸 Living Roots!' : '🛡️ Root Shield!', living ? '#ff6666' : '#aaeeff');
  }

  /**
   * Revitalize: bring one plant to life. It grows root legs and starts walking — the
   * attackers stalk the nearest enemy, the supports follow their owner — carries 25% more
   * HP, and knits 5 HP back a second from then on.
   */
  private revivePlant(p: Plant, owner: 'player' | 'npc'): void {
    const caster = this.casterFor(owner);
    const f = this.fxFor(owner);

    if (p.living) {
      // Already up: the second cast just tops it back up rather than being wasted.
      const healed = p.hitbox.maxHp - p.hitbox.hp;
      if (healed > 0) {
        p.hitbox.hp = p.hitbox.maxHp;
        this.api.showFloatingText(p.x, p.y - 40, `+${Math.round(healed)} ⚡`, '#aaff66');
      }
      f.healBloom(p.x, p.y, 30, 5);
      return;
    }

    p.living = true;
    p.regenAccum = 0;
    this.rescaleAll(owner === 'player' ? this.playerPlants : this.npcPlants);

    // The ground gives up the root ball: a jolt down the vine, roots thrown clear of the
    // hole, and the plant standing where it used to be planted.
    f.vineLash(caster.x, caster.y, p.x, p.y, LIFE.vital, 6);
    f.ring(p.x, p.y, 8, 54, LIFE.vital, 480, 5, 5);
    f.petalShards(p.x, p.y + 12, 8, 170, 460, 4, LIFE.rot);
    f.bloomBurst(p.x, p.y, 40, 10, 3);
    this.avatarFor(owner)?.play('clap', Math.atan2(p.y - caster.y, p.x - caster.x));
    this.api.showFloatingText(p.x, p.y - 44, '⚡ REVITALIZED!', '#aaff66');
  }

  /** Q — Thrive!: for 5s the player's incoming damage is split across their plants instead. */
  doThrive(): void {
    const scene = this.api.scene;
    this.thriveUntil = scene.time.now + 5000;
    this.prevAbsorber = this.api.player.damageAbsorber;
    this.api.player.damageAbsorber = (amount: number) => this.absorbIntoPlants(amount);

    this.thriveAura?.destroy();
    this.thriveAura = new LifeAura(scene, this.pcol, 40, 1.25, 3, 14);
    // Every plant is visibly wired into you the moment the link opens.
    for (const p of this.playerPlants) {
      this.pfx.vineLash(this.api.player.x, this.api.player.y, p.x, p.y, LIFE.lime, 5);
    }
    this.playerAvatar?.play('raise', undefined, 1000);
    this.api.showFloatingText(this.api.player.x, this.api.player.y - 44, '🌿 THRIVE!', '#44ff88');
  }

  /** Splits incoming player damage evenly across live plants. Returns true when fully absorbed. */
  private absorbIntoPlants(amount: number): boolean {
    const live = this.playerPlants;
    if (live.length === 0) return false;
    this.api.recordMasteryStat('thriveRedirect', Math.round(amount));
    const share = amount / live.length;
    const player = this.api.player;
    for (const p of live) {
      p.hitbox.takeDamage(share);
      // The damage is visibly carried down the vine into each plant.
      this.pfx.vineLash(player.x, player.y, p.x, p.y, LIFE.rose, 6);
      this.api.spawnHitFlash(p.x, p.y, this.pcol(LIFE.vital));
      this.pfx.petalShards(p.x, p.y, 4, 130, 380, 6, LIFE.leaf);
    }
    this.api.showFloatingText(player.x, player.y - 30,
      `🌿 ${Math.round(amount)} shared`, '#44ff88');
    return true;
  }

  private endThrive(): void {
    this.api.player.damageAbsorber = this.prevAbsorber;
    this.prevAbsorber = null;
    if (this.thriveAura) { this.thriveAura.destroy(); this.thriveAura = null; }
  }

  // ── Public accessors used by ArenaScene ─────────────────────────────────────

  /** Invisible plant hitboxes — enemies chase these in preference to the Life player. */
  getPlantTargets(owner: 'player' | 'npc' = 'player'): Fighter[] {
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    return list.map((p) => p.hitbox);
  }

  /** True when `f` is one of this kit's plant hitboxes. */
  isPlantHitbox(f: Fighter): boolean {
    return this.playerPlants.some((p) => p.hitbox === f) || this.npcPlants.some((p) => p.hitbox === f);
  }

  /** Lotus essence: the 25% stride a spent lotus leaves behind it. */
  getPlayerSpeedMult(): number {
    return this.api.scene.time.now < this.crownUntil ? CROWN_SPEED_MULT : 1;
  }

  /**
   * A Frost Lily's chill on one of the two duelists, pulled by ArenaScene into that side's
   * speed multiplier. Husks are slowed through `walkSpeedMult` in `tickAfflictions` instead.
   */
  getChillSpeedMult(f: Fighter | null | undefined): number {
    if (!f) return 1;
    return this.api.scene.time.now < f.lifeSlowUntil ? FROST_SLOW_MULT : 1;
  }

  getPlantCount(owner: 'player' | 'npc'): number {
    return (owner === 'player' ? this.playerPlants : this.npcPlants).length;
  }

  /** Mycology removes the E cooldown entirely (paid for with 15 self-damage per plant). */
  isPlantCooldownFree(owner: 'player' | 'npc'): boolean {
    return this.api.hasPerk(owner, 'mycology');
  }

  /** Mirror the opponent's cast on their rig, so their character acts out what it just did. */
  handleNpcCastId(id: string | null): void {
    if (!id) return;
    if (id === 'thorn-drag') this.npcThriveUntil = this.api.scene.time.now + 5000;
    const { npc, player } = this.api;
    // Lotus orbs the opponent has eaten fan out of their click too. Their base three petals are
    // already in the air from the cast itself; this adds the extras around them.
    if (id === 'petal-shotgun' && this.api.isNpcLife() && npc?.active) {
      const bonus = this.lotusStackCount('npc');
      if (bonus > 0) {
        const aim = Math.atan2(player.y - npc.y, player.x - npc.x);
        this.fireExtraPetals('npc', npc.x, npc.y, aim, bonus, 15, 15, 8, 'proj-life');
      }
    }
    if (!this.npcAvatar) return;
    const gesture = GESTURES[id];
    if (!gesture) return;
    this.npcAvatar.play(
      gesture,
      Math.atan2(player.y - npc.y, player.x - npc.x),
      id === 'thorn-drag' ? 1000 : undefined,
    );
  }

  // ── Input ───────────────────────────────────────────────────────────────────

  handleInput(pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (!this.api.isPlayerLife()) return;
    this.lastPointerX = pointer.worldX;
    this.lastPointerY = pointer.worldY;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;

    // E+ lets plants be dragged; they trail the cursor rather than snapping to it.
    if (this.api.hasUpgrade('e')) {
      const down = pointer.isDown;
      if (down && !this.pointerWasDown && !this.consumedPointer()) {
        for (const p of this.playerPlants) {
          if (Phaser.Math.Distance.Between(mouseX, mouseY, p.x, p.y) <= 30) {
            this.dragging = p;
            break;
          }
        }
      }
      if (down && this.dragging) {
        this.dragging.targetX = mouseX;
        this.dragging.targetY = mouseY;
      }
      if (!down) this.dragging = null;
      this.pointerWasDown = down;
    }

    // Sunflower essence: right-click throws your own solar link at whoever is nearest the cursor.
    const right = pointer.rightButtonDown();
    if (right && !this.rightWasDown && this.hasReapBuff('sunflower')) this.tryCastSolar(mouseX, mouseY);
    this.rightWasDown = right;

    // Reap (mastery) — bound over one of E/R/F/Q; the displaced base ability is
    // suppressed in ArenaScene, so this kit owns the keypress for that slot.
    if (this.api.masteryActive) {
      const slot = this.reapSlot();
      if (slot) {
        const key = slot === 'e' ? this.api.eKey
          : slot === 'r' ? this.api.rKey
          : slot === 'q' ? this.api.qKey
          : this.api.fKey;
        if (Phaser.Input.Keyboard.JustDown(key)) {
          this.tryCastReap(this.api.scene.time.now, mouseX, mouseY);
        }
      }
    }
  }

  /**
   * Click — Petal Shotgun, or the wider five-petal Sakura burst once the click slot is
   * upgraded. Both branches live here so ArenaScene never has to know which one is live,
   * and so do every garden gift that changes the click: Lotus orbs and Mushroom essence add
   * petals, Helicopter essence adds a stubby close-range three, Flaming essence chains the
   * cooldown down.
   */
  doPetalShotgun(mouseX: number, mouseY: number): void {
    const player = this.api.player;
    const aim = Math.atan2(mouseY - player.y, mouseX - player.x);
    const upgraded = this.api.hasUpgrade('click');

    if (!upgraded) {
      if (!player.castAbility('petal-shotgun', this.api.buildPlayerContext(mouseX, mouseY))) return;
      this.playerAvatar?.play('punch', aim);
    } else {
      if (player.getCooldownRatio('petal-shotgun') < 1) return;
      player.triggerCooldown('petal-shotgun');
      const speed = 480;
      const spawnDist = 32;
      for (const deg of SAKURA_ANGLES) {
        const angle = aim + deg * (Math.PI / 180);
        const sx = player.x + Math.cos(angle) * spawnDist;
        const sy = player.y + Math.sin(angle) * spawnDist;
        const proj = new Projectile(this.api.scene, sx, sy, 'proj-sakura', 8, true);
        proj.setTint(this.pcol(LIFE.blossom));
        (proj as any).isSakura = true;
        this.api.projectiles.add(proj);
        proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.pfx.petalMuzzle(sx, sy, angle, 0.75, 6, LIFE.rose);
      }
      // A fuller cone deserves a fuller throw: blossom litter thrown wide behind the petals.
      this.pfx.petalShards(player.x, player.y, 5, 120, 400, 5, LIFE.rose);
      this.playerAvatar?.play('sweep', aim, 300);
    }

    // Extra petals fan out past the edges of whichever cone just fired.
    const bonus = this.lotusStackCount('player') + (this.hasReapBuff('mushroom') ? 2 : 0);
    if (bonus > 0) {
      this.fireExtraPetals(
        'player', player.x, player.y, aim, bonus,
        upgraded ? 24 : 15, upgraded ? 12 : 15, upgraded ? 5 : 8,
        upgraded ? 'proj-sakura' : 'proj-life',
      );
    }
    // Helicopter essence: three short petals that tumble out and drop within a few steps.
    if (this.hasReapBuff('helicopter')) {
      for (const deg of STUBBY_PETAL_ANGLES) {
        const angle = aim + deg * (Math.PI / 180);
        const sx = player.x + Math.cos(angle) * 28;
        const sy = player.y + Math.sin(angle) * 28;
        const proj = new Projectile(this.api.scene, sx, sy, 'proj-life', upgraded ? 5 : 8, true);
        proj.setTint(this.pcol(LIFE.heli));
        proj.setScale(0.8);
        this.api.projectiles.add(proj);
        proj.launch(Math.cos(angle) * 380, Math.sin(angle) * 380);
        this.stubbyPetals.push({ proj, x: sx, y: sy });
        this.pfx.petalMuzzle(sx, sy, angle, 0.55, 6, LIFE.heli);
      }
    }
    this.onPetalShotgunFired();

    // Flaming essence: every shot inside the chain window shaves more off the next cooldown.
    if (this.hasReapBuff('flaming-sprout')) {
      const now = this.api.scene.time.now;
      this.rapidStacks = now - this.rapidLastAt <= RAPID_RESET_MS ? this.rapidStacks + 1 : 1;
      this.rapidLastAt = now;
      const cut = Math.min(RAPID_MAX, this.rapidStacks * RAPID_STEP);
      player.reduceCooldown('petal-shotgun', Math.round(500 * cut));
      this.pfx.petalMuzzle(player.x, player.y, aim, 0.5 + cut, 6, LIFE.flame);
      if (cut >= RAPID_MAX && this.rapidStacks === Math.ceil(RAPID_MAX / RAPID_STEP)) {
        this.api.showFloatingText(player.x, player.y - 40, '🔥 FULL BLAZE!', '#ff8833');
      }
    }
  }

  /**
   * Extra petals past the edges of a cone: alternating right and left, one step further out
   * each pair. `edgeDeg` is the cone's outermost angle, `stepDeg` its spacing.
   */
  private fireExtraPetals(
    owner: 'player' | 'npc', x: number, y: number, aim: number, count: number,
    edgeDeg: number, stepDeg: number, damage: number, texture: string,
  ): void {
    const fromPlayer = owner === 'player';
    const f = this.fxFor(owner);
    for (let k = 0; k < count; k++) {
      const side = k % 2 === 0 ? 1 : -1;
      const ring = Math.floor(k / 2) + 1;
      const angle = aim + side * (edgeDeg + ring * stepDeg) * (Math.PI / 180);
      const sx = x + Math.cos(angle) * 32;
      const sy = y + Math.sin(angle) * 32;
      const proj = new Projectile(this.api.scene, sx, sy, texture, damage, fromPlayer);
      // Lotus-gold edging, so the extra petals read as the orbs' gift.
      proj.setTint(this.colFor(owner)(LIFE.lotus));
      this.api.projectiles.add(proj);
      proj.launch(Math.cos(angle) * 480, Math.sin(angle) * 480);
      f.petalMuzzle(sx, sy, angle, 0.6, 6, LIFE.lotus);
    }
  }

  // ── Per-frame update ────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.worldT += delta / 1000;

    if (this.thriveUntil > 0 && time >= this.thriveUntil) {
      this.thriveUntil = 0;
      this.endThrive();
    }
    if (this.thriveAura) {
      const player = this.api.player;
      this.thriveAura.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    }

    this.updateAvatars(delta);
    this.updateProjectileTrails(delta);
    this.paintBar();
    if (!this.shotGfx || !this.shotGfx.active) this.shotGfx = this.api.scene.add.graphics().setDepth(6);
    this.shotGfx.clear();
    this.pruneLotusStacks(time);
    this.tickReapBuffs(time, delta);
    this.updatePlantList(this.playerPlants, 'player', time, delta);
    this.updatePlantList(this.npcPlants, 'npc', time, delta);
    this.updateBolts(delta);
    this.updateBombs(time, delta);
    this.updatePuddles(time, delta);
    this.tickAfflictions(time, delta);
  }

  private casterFor(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.api.player : this.api.npc;
  }

  private avatarFor(owner: 'player' | 'npc'): BaseAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * That side's rig: the skin's if one is equipped, life's sprouting figure otherwise. Built
   * lazily in `updateAvatars` and torn down in `reset`, so changing skin between matches swaps
   * the character.
   */
  private makeAvatar(owner: 'player' | 'npc'): BaseAvatar {
    const { scene } = this.api;
    const col = owner === 'player' ? this.pcol : this.ncol;
    return makeSkinAvatar(this.api.skinId(owner), scene) ?? new LifeAvatar(scene, col);
  }

  private updateAvatars(delta: number): void {
    const { player, npc, scene } = this.api;

    if (this.api.isPlayerLife() && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
      const aimX = this.lastMouseX || player.x + 1;
      const aimY = this.lastMouseY || player.y;
      const aim = Math.atan2(aimY - player.y, aimX - player.x);
      this.playerAvatar.setFacing(aim);
      // Thrive! visibly swells the rig, so the ultimate is readable from the character alone.
      this.playerAvatar.setIntensity(scene.time.now < this.thriveUntil ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      // Dragging a plant around is sustained work with the hands, not a one-shot gesture.
      this.playerAvatar.setHold(this.dragging ? 'sow' : null, aim);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.api.isNpcLife() && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(scene.time.now < this.npcThriveUntil ? 1.35 : 1);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Petals in flight shed leaf litter out of their own wake. */
  private updateProjectileTrails(delta: number): void {
    this.projTrailAccum += delta;
    if (this.projTrailAccum < 45) return;
    this.projTrailAccum = 0;
    for (const child of this.api.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const key = proj.texture?.key;
      if (key !== 'proj-life' && key !== 'proj-sakura') continue;
      const fx = proj.isFromPlayer ? this.pfx : this.nfx;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      // Trail streams out of the back of the shot rather than puffing symmetrically.
      const back = body ? Math.atan2(-body.velocity.y, -body.velocity.x) : 0;
      fx.pollen(proj.x, proj.y, 2, {
        angle: back, spread: 0.45, speed: 34, size: 2.2, life: 300, rise: 6, depth: 4,
        color: key === 'proj-sakura' ? LIFE.rose : LIFE.leaf,
      });
    }
  }

  private hostilesFor(owner: 'player' | 'npc'): Fighter[] {
    return owner === 'player' ? this.api.enemies : [this.api.player];
  }

  private updatePlantList(list: Plant[], owner: 'player' | 'npc', time: number, delta: number): void {
    const friendly = this.casterFor(owner);
    const hostiles = this.hostilesFor(owner).filter((e) => e.active && e.hp > 0);
    const activeProj = this.api.projectiles.getChildren() as Projectile[];
    const f = this.fxFor(owner);

    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const shielded = time < p.shieldUntil;
      p.age += delta / 1000;

      // Hostile projectiles chip away at plants (healing shots pass through).
      for (const go of activeProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.isHeal) continue;
        const hostileProj = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostileProj) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, p.x, p.y) <= 30) {
          p.hitbox.takeDamage(proj.damage);
          f.petalShards(proj.x, proj.y, 4, 140, 340, 6);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          proj.setActive(false).setVisible(false);
        }
      }

      // Root shield ends with a full heal.
      if (p.shieldUntil > 0 && time >= p.shieldUntil) {
        p.shieldUntil = 0;
        p.shieldLiving = false;
        const healed = p.hitbox.maxHp - p.hitbox.hp;
        p.hitbox.hp = p.hitbox.maxHp;
        if (healed > 0) {
          this.api.showFloatingText(p.x, p.y - 40, `+${Math.round(healed)} 🛡️`, '#aaeeff');
          f.healBloom(p.x, p.y, 30, 5);
        }
      }

      // A Flaming Sprout burns itself out.
      if (time >= p.expiresAt) {
        f.flash(p.x, p.y - 10, 26, 5);
        f.petalShards(p.x, p.y, 8, 120, 420, 5, LIFE.flame);
        f.spores(p.x, p.y - 8, 3, 18, 5, LIFE.soil);
        if (owner === 'player') this.api.showFloatingText(p.x, p.y - 40, '🔥 Burnt out', '#ff9955');
        p.link = null;
        this.destroyPlant(p);
        list.splice(i, 1);
        this.rescaleAll(list);
        continue;
      }

      // Death.
      if (p.hitbox.hp <= 0) {
        if (owner === 'player' && time < this.thriveUntil && this.api.hasUpgrade('q')) {
          // Cycle of Life: a plant that dies while linked pays back 20 HP.
          this.api.player.heal(20);
          this.pfx.vineLash(p.x, p.y, this.api.player.x, this.api.player.y, LIFE.lime, 6);
          this.api.showFloatingText(this.api.player.x, this.api.player.y - 34, '♻️ +20', '#88ffaa');
        }
        f.wilt(p.x, p.y, 22);
        this.destroyPlant(p);
        list.splice(i, 1);
        this.rescaleAll(list);
        continue;
      }

      // E+ drag: ease toward wherever the cursor pulled the plant.
      if (owner === 'player' && this.api.hasUpgrade('e')) {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const d = Math.hypot(dx, dy);
        if (d > 2) {
          const step = Math.min(140 * (delta / 1000), d);
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
          this.rescaleAll(list);
        }
      }

      // Revitalize: a living plant knits itself back together and walks.
      if (p.living) {
        p.regenAccum += delta;
        while (p.regenAccum >= 1000) {
          p.regenAccum -= 1000;
          if (p.hitbox.hp < p.hitbox.maxHp) {
            p.hitbox.hp = Math.min(p.hitbox.maxHp, p.hitbox.hp + LIVING_REGEN_PER_SEC);
            f.healBloom(p.x, p.y, 18, 4);
          }
        }
        this.walkPlant(p, owner, friendly, hostiles, list, delta);
      }

      // Whichever hostile is closest is what the plant looks at.
      const watched = this.nearestHostile(p.x, p.y, hostiles, 700);
      if (watched) p.aim = Math.atan2(watched.y - p.y, watched.x - p.x);

      this.paintPlant(p, owner, time);

      // Thorn Thrash (mastery passive): your own click petals striking a plant
      // make it spray thorns; each plant can thrash once every 3 seconds.
      if (owner === 'player' && this.api.masteryActive && time >= p.thrashAt) {
        for (const go of activeProj) {
          if (!go.active || !go.isFromPlayer || !(go as any).isPetal) continue;
          if (Phaser.Math.Distance.Between(go.x, go.y, p.x, p.y) <= 34) {
            p.thrashAt = time + THORN_THRASH_CD_MS;
            this.doThornThrash(p);
            break;
          }
        }
      }

      // Living Roots (F+): the red shield lashes out while it holds.
      if (shielded && p.shieldLiving) {
        p.accum2 += delta;
        if (p.accum2 >= 750) {
          p.accum2 -= 750;
          const victim = this.nearestHostile(p.x, p.y, hostiles, 240);
          if (victim) {
            victim.takeDamage(10, { source: p, sourceX: p.x, sourceY: p.y });
            if (owner === 'player') this.api.recordMasteryStat('plantDamage', 10);
            victim.walkSpeedMult = Math.min(victim.walkSpeedMult, 0.85);
            this.scheduleSlowClear(victim, 3000);
            f.vineLash(p.x, p.y, victim.x, victim.y, LIFE.rose, 6);
            f.thornSpray(victim.x, victim.y, 4, 6);
            this.api.spawnHitFlash(victim.x, victim.y, this.colFor(owner)(LIFE.rose));
            this.api.showFloatingText(victim.x, victim.y - 24, '🩸 -10', '#ff6666');
          }
        }
      }

      this.tickPlantBehaviour(p, owner, friendly, hostiles, time, delta);
    }
  }

  /**
   * One step of a living plant's walk. The attacking seeds stalk whatever is nearest; the two
   * that work on their owner (Cotton's speed pad, the Nurse Lily's healing tether) follow the
   * owner around instead, stopping just outside contact range so they trail rather than shove.
   */
  private walkPlant(
    p: Plant,
    owner: 'player' | 'npc',
    friendly: Fighter,
    hostiles: Fighter[],
    list: Plant[],
    delta: number,
  ): void {
    const followsOwner = LIVING_FOLLOWERS.includes(p.type);
    const target = followsOwner ? friendly : this.nearestHostile(p.x, p.y, hostiles, 900);
    if (!target || !target.active) return;

    const stopAt = followsOwner ? LIVING_FOLLOW_DIST : LIVING_ENGAGE_DIST;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= stopAt) return;

    const step = Math.min(LIVING_WALK_SPEED * (delta / 1000), d - stopAt);
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
    // The gait runs off distance covered, so a plant that stops walking stops stepping.
    p.legPhase += step / 5;
    // E+ drag reads these; without the update a walked plant would snap back to its old spot
    // the moment it was grabbed.
    p.targetX = p.x;
    p.targetY = p.y;
    if (owner === 'player') this.rescaleAll(list);
  }

  private nearestHostile(x: number, y: number, hostiles: Fighter[], maxDist: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = maxDist;
    for (const h of hostiles) {
      const d = Phaser.Math.Distance.Between(x, y, h.x, h.y);
      if (d < bestD) { bestD = d; best = h; }
    }
    return best;
  }

  /** Cursor-over first, else nearest to the cursor — shared by Root Shield and Reap. */
  private pickPlant(list: Plant[], x: number, y: number): Plant | null {
    for (const p of list) {
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) <= 34) return p;
    }
    let best = Infinity;
    let target: Plant | null = null;
    for (const p of list) {
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < best) { best = d; target = p; }
    }
    return target;
  }

  private scheduleSlowClear(f: Fighter, ms: number): void {
    this.api.scene.time.delayedCall(ms, () => {
      if (f.active) f.walkSpeedMult = 1;
    });
  }

  /**
   * Repaint one plant from scratch: the plant itself, its shield dome and its HP bar. Drawing
   * rather than tweening means a fertilised plant can visibly stand taller and a dying one can
   * visibly droop, on the same frame the number changes.
   */
  private paintPlant(p: Plant, owner: 'player' | 'npc', time: number): void {
    p.hitbox.setPosition(p.x, p.y);
    const ratio = Phaser.Math.Clamp(p.hitbox.hp / p.hitbox.maxHp, 0, 1);
    const tint = this.colFor(owner);

    p.art.clear();
    // Revitalize: the legs go down first, so the plant's own art sits on top of the hips.
    if (p.living) {
      LifeFx.drawRootLegs(p.art, tint, p.x, p.y, p.legPhase, {
        alpha: 0.95,
        facing: p.aim,
      });
    }
    LifeFx.drawPlant(p.art, tint, p.type, p.x, p.y, p.age, {
      hp: ratio,
      fert: this.isFertilized(p),
      aim: p.aim,
      mushroom: this.api.hasPerk(owner, 'mycology'),
      charge: this.plantCharge(p, time),
      spin: p.spin,
      wet: this.isWatered(p),
    });

    // Root Shield: a woven dome of vine over the plant, red and barbed when Living Roots.
    if (time < p.shieldUntil) {
      const g = p.art;
      const living = p.shieldLiving;
      const pulse = 0.85 + Math.sin(p.age * 9) * 0.15;
      const r = 34 * pulse;
      g.fillStyle(tint(living ? LIFE.rose : LIFE.lily), 0.16);
      g.fillCircle(p.x, p.y, r);
      g.lineStyle(2.5, tint(living ? LIFE.rose : LIFE.lily), 0.85);
      g.strokeCircle(p.x, p.y, r);
      g.fillStyle(tint(living ? LIFE.rose : LIFE.leaf), 0.75);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + p.age * 0.7;
        sprig(g, tint, p.x + Math.cos(a) * r * 0.5, p.y + Math.sin(a) * r * 0.5, a, r * 0.55, 2.4, 1.4, 0.8, 1);
      }
    }

    this.paintPlantHud(p, ratio, tint, time);
  }

  /** The 0–1 `charge` each plant's art animates on — see `PlantArtOpts.charge`. */
  private plantCharge(p: Plant, time: number): number {
    switch (p.type) {
      case 'sunflower':
        return p.link ? Math.min(1, p.link.elapsed / SUN_LINK_MS) : 0;
      case 'nightcap': return Math.min(1, p.accum / NIGHTCAP_INTERVAL_MS);
      case 'mushroom': return Math.min(1, p.accum / SHROOM_INTERVAL_MS);
      case 'frost-lily': return Math.min(1, p.accum / FROST_INTERVAL_MS);
      case 'flaming-sprout': return Phaser.Math.Clamp((p.expiresAt - time) / SPROUT_LIFESPAN_MS, 0, 1);
      case 'lotus': return p.orbReady ? 1 : Math.min(0.99, p.accum / LOTUS_RIPEN_MS);
      case 'pitcher': return p.sprayFlash;
      default: return 0;
    }
  }

  /**
   * A plant's over-head readout: a living twig whose sap-filled length is its HP — green and
   * leafy when healthy, yellowing then browning as it wilts — and one little five-petal
   * blossom per permanent fertilizer stack above it.
   */
  private paintPlantHud(p: Plant, ratio: number, tint: LifeColorFn, time: number): void {
    const g = p.hud;
    g.clear();
    const w = 40, h = 5;
    const x = p.x - w / 2, y = p.y - 34 - h / 2;
    // Bark casing.
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x - 1, y, w + 2, h + 2, 3);
    g.fillStyle(tint(LIFE.soil), 0.92);
    g.fillRoundedRect(x - 1.5, y - 1.5, w + 3, h + 3, 3.5);
    // Sap fill, its colour following the plant's health.
    const fill = ratio > 0.5 ? LIFE.leaf : ratio > 0.25 ? LIFE.pollen : LIFE.rot;
    if (ratio > 0.01) {
      g.fillStyle(tint(fill), 1);
      g.fillRoundedRect(x, y, Math.max(2, w * ratio), h, 2);
      g.fillStyle(tint(LIFE.glow), 0.45);
      g.fillRect(x + 1, y + 0.8, Math.max(0, w * ratio - 2), 1.2);
    }
    // Leaf nodes along the twig — the ones past the HP mark have dropped off.
    for (let i = 1; i < 4; i++) {
      const nx = x + (w * i) / 4;
      const alive = ratio * 4 > i;
      const side = i % 2 === 0 ? -1 : 1;
      if (alive) {
        g.fillStyle(tint(LIFE.leaf), 0.95);
        g.fillEllipse(nx + 1.5, y + (side < 0 ? -2 : h + 2), 5, 2.6);
      }
      g.fillStyle(tint(LIFE.bark), 0.9);
      g.fillRect(nx - 0.5, y, 1, h);
    }
    g.lineStyle(1, tint(LIFE.bark), 0.95);
    g.strokeRoundedRect(x - 1.5, y - 1.5, w + 3, h + 3, 3.5);

    // Flaming Sprout: a burning fuse under the twig, eaten from the right as its 5s run out.
    if (p.type === 'flaming-sprout' && p.expiresAt < Infinity) {
      const left = Phaser.Math.Clamp((p.expiresAt - time) / SPROUT_LIFESPAN_MS, 0, 1);
      const fy = y + h + 4;
      g.lineStyle(2, tint(LIFE.soil), 0.9);
      g.lineBetween(x, fy, x + w, fy);
      g.lineStyle(2, tint(LIFE.ember), 1);
      g.lineBetween(x, fy, x + w * left, fy);
      const flick = 0.7 + 0.3 * Math.sin(p.age * 30);
      g.fillStyle(tint(LIFE.flame), flick);
      g.fillCircle(x + w * left, fy, 2.6);
      g.fillStyle(tint(LIFE.white), 0.9 * flick);
      g.fillCircle(x + w * left, fy, 1.1);
    }

    // Fertilizer blossoms.
    const n = p.permStacks;
    if (n > 0) {
      const step = Math.min(9, 44 / n);
      const bx0 = p.x - ((n - 1) * step) / 2;
      const by = p.y - 46;
      for (let i = 0; i < n; i++) {
        const bx = bx0 + i * step;
        const spin = p.age * 0.6 + i;
        g.fillStyle(tint(LIFE.blossom), 0.95);
        for (let k = 0; k < 5; k++) {
          const a = spin + (k / 5) * Math.PI * 2;
          g.fillCircle(bx + Math.cos(a) * 2.3, by + Math.sin(a) * 2.3, 1.7);
        }
        g.fillStyle(tint(LIFE.pollen), 1);
        g.fillCircle(bx, by, 1.3);
      }
    }
  }

  // ── Per-type behaviour ──────────────────────────────────────────────────────

  private tickPlantBehaviour(
    p: Plant,
    owner: 'player' | 'npc',
    friendly: Fighter,
    hostiles: Fighter[],
    time: number,
    delta: number,
  ): void {
    const rate = this.boost(p);
    const f = this.fxFor(owner);

    switch (p.type) {
      // ── Sunflower: a 3s solar link that heats from gold to red, then a long recharge ──
      case 'sunflower': {
        const headX = p.x, headY = p.y - 18;
        if (p.link) {
          const link = p.link;
          const v = link.target;
          if (!v.active || v.hp <= 0
            || Phaser.Math.Distance.Between(p.x, p.y, v.x, v.y) > SUN_BREAK_RANGE) {
            this.endSunLink(p);
            break;
          }
          p.aim = Math.atan2(v.y - headY, v.x - headX);
          if (this.tickSolar(link, headX, headY, delta, owner, p)) this.endSunLink(p);
        } else {
          p.accum += delta * rate;
          if (p.accum >= SUN_RECHARGE_MS) {
            const victim = this.nearestHostile(p.x, p.y, hostiles, SUN_RANGE);
            if (!victim) { p.accum = SUN_RECHARGE_MS; break; }
            p.accum = 0;
            p.link = { target: victim, elapsed: 0, power: this.power(p), tick: 0 };
            // The head flares as the link strikes out.
            f.flash(headX, headY, 22, 6);
            f.ring(headX, headY, 6, 34, LIFE.sun, 300, 3, 6);
            this.api.spawnHitFlash(victim.x, victim.y, this.colFor(owner)(LIFE.sun));
            this.api.showFloatingText(victim.x, victim.y - 34, '☀️ Solar link!', '#ffcc33');
          }
        }
        break;
      }

      // ── Nightcap: lobs a spore bomb at whoever is in range ──────────────────
      case 'nightcap': {
        p.accum += delta * rate;
        if (p.accum < NIGHTCAP_INTERVAL_MS) break;
        const victim = this.nearestHostile(p.x, p.y, hostiles, NIGHTCAP_RANGE);
        if (!victim) { p.accum = NIGHTCAP_INTERVAL_MS; break; }
        p.accum = 0;
        // Lead the target by half the flight, so a walking target has to actually dodge.
        const vb = victim.body as Phaser.Physics.Arcade.Body | null;
        const lead = NIGHTCAP_FLIGHT_MS / 1000 * 0.5;
        this.bombs.push({
          owner, x0: p.x, y0: p.y,
          x1: victim.x + (vb ? vb.velocity.x * lead : 0),
          y1: victim.y + (vb ? vb.velocity.y * lead : 0),
          elapsed: 0, damage: NIGHTCAP_IMPACT_DMG * this.power(p), from: p,
        });
        f.spores(p.x, p.y - 22, 2, 18, 5, LIFE.night);
        f.ring(p.x, p.y - 18, 4, 22, LIFE.night, 260, 2, 5);
        break;
      }

      // ── Helicopter: a rotor of blades cutting everything inside its reach ───
      case 'helicopter': {
        p.spin += (delta / 1000) * HELI_SPIN * rate;
        p.accum2 += delta;
        const reach = HELI_RADIUS * (this.isFertilized(p) ? 1.12 : 1) + 12;
        while (p.accum2 >= HELI_TICK_MS) {
          p.accum2 -= HELI_TICK_MS;
          const dmg = Math.max(1, Math.round(HELI_TICK_DMG * this.power(p)));
          for (const h of hostiles) {
            if (Phaser.Math.Distance.Between(p.x, p.y - 6, h.x, h.y) > reach) continue;
            h.takeDamage(dmg, { source: p, sourceX: p.x, sourceY: p.y });
            if (owner === 'player') this.api.recordMasteryStat('plantDamage', dmg);
            f.petalShards(h.x, h.y, 2, 150, 260, 6, LIFE.heli);
            if (Math.random() < 0.3) this.api.spawnHitFlash(h.x, h.y, this.colFor(owner)(LIFE.heli));
          }
        }
        break;
      }

      // ── Mushroom Colony: eight spores in a ring, while anything is near ─────
      case 'mushroom': {
        const near = this.nearestHostile(p.x, p.y, hostiles, SHROOM_WAKE_RANGE);
        // Asleep with nobody about: it loads most of the way and waits there.
        p.accum = near
          ? p.accum + delta * rate
          : Math.min(p.accum + delta * rate, SHROOM_INTERVAL_MS * 0.8);
        if (p.accum < SHROOM_INTERVAL_MS) break;
        p.accum = 0;
        const dmg = Math.max(1, Math.round(SHROOM_DMG * this.power(p)));
        const turn = p.age * 0.9;
        for (let i = 0; i < SHROOM_COUNT; i++) {
          const a = turn + (i / SHROOM_COUNT) * Math.PI * 2;
          const sx = p.x + Math.cos(a) * 18, sy = p.y - 4 + Math.sin(a) * 18;
          const proj = new Projectile(this.api.scene, sx, sy, 'proj-life', dmg, owner === 'player');
          proj.setTint(this.colFor(owner)(LIFE.shroom));
          (proj as any).isPlantShot = true;
          this.api.projectiles.add(proj);
          proj.launch(Math.cos(a) * SHROOM_SPEED, Math.sin(a) * SHROOM_SPEED);
        }
        f.ring(p.x, p.y - 4, 8, 46, LIFE.shroom, 320, 4, 5);
        f.spores(p.x, p.y - 6, 4, 26, 5, LIFE.pollen);
        f.pollen(p.x, p.y - 6, 10, { speed: 110, size: 2.4, life: 420, rise: 8, depth: 5, color: LIFE.shroom });
        break;
      }

      // ── Frost Lily: a piercing ice shard that chills and makes brittle ──────
      case 'frost-lily': {
        p.accum += delta * rate;
        if (p.accum < FROST_INTERVAL_MS) break;
        const victim = this.nearestHostile(p.x, p.y, hostiles, FROST_RANGE);
        if (!victim) { p.accum = FROST_INTERVAL_MS; break; }
        p.accum = 0;
        const hx = p.x, hy = p.y - 14;
        const a = Math.atan2(victim.y - hy, victim.x - hx);
        this.bolts.push({
          kind: 'frost', owner, x: hx + Math.cos(a) * 12, y: hy + Math.sin(a) * 12,
          vx: Math.cos(a) * FROST_SPEED, vy: Math.sin(a) * FROST_SPEED,
          damage: Math.max(1, Math.round(FROST_DMG * this.power(p))),
          range: FROST_MAX_DIST, hit: new Set(), from: p,
        });
        f.petalMuzzle(hx, hy, a, 0.7, 6, LIFE.frost);
        f.pollen(hx, hy, 4, { angle: a, spread: 0.5, speed: 60, size: 2, life: 300, depth: 6, color: LIFE.ice });
        break;
      }

      // ── Flaming Sprout: rapid fire until it burns out ──────────────────────
      case 'flaming-sprout': {
        p.accum += delta * rate;
        if (p.accum < SPROUT_INTERVAL_MS) break;
        const victim = this.nearestHostile(p.x, p.y, hostiles, SPROUT_RANGE);
        if (!victim) { p.accum = SPROUT_INTERVAL_MS; break; }
        p.accum -= SPROUT_INTERVAL_MS;
        const hx = p.x, hy = p.y - 10;
        const a = Math.atan2(victim.y - hy, victim.x - hx) + (Math.random() - 0.5) * 0.12;
        this.bolts.push({
          kind: 'flame', owner, x: hx + Math.cos(a) * 10, y: hy + Math.sin(a) * 10,
          vx: Math.cos(a) * SPROUT_SPEED, vy: Math.sin(a) * SPROUT_SPEED,
          damage: Math.max(1, Math.round(SPROUT_DMG * this.power(p))),
          range: SPROUT_RANGE + 60, hit: new Set(), from: p,
        });
        f.petalMuzzle(hx, hy, a, 0.45, 6, LIFE.flame);
        break;
      }

      // ── Lotus: ripens an orb its owner can walk over for a heal and a petal ─
      case 'lotus': {
        if (!p.orbReady) {
          p.accum += delta * rate;
          if (p.accum >= LOTUS_RIPEN_MS) {
            p.accum = 0;
            p.orbReady = true;
            f.ring(p.x, p.y - 14, 4, 30, LIFE.pollen, 380, 3, 5);
            f.pollen(p.x, p.y - 14, 8, { speed: 50, size: 2.4, life: 600, rise: 18, depth: 5, color: LIFE.pollen });
          }
          break;
        }
        if (!friendly.active || friendly.hp <= 0) break;
        if (Phaser.Math.Distance.Between(p.x, p.y - 8, friendly.x, friendly.y) > LOTUS_PICKUP_RADIUS + 14) break;
        p.orbReady = false;
        p.accum = 0;
        friendly.heal(LOTUS_HEAL);
        const stacks = this.lotusStacks[owner];
        stacks.push(time + LOTUS_STACK_MS);
        if (stacks.length > LOTUS_MAX_STACKS) stacks.shift();
        f.vineLash(p.x, p.y - 14, friendly.x, friendly.y, LIFE.pollen, 6);
        f.healBloom(friendly.x, friendly.y, 26, 6, LIFE.pollen);
        f.flash(p.x, p.y - 14, 20, 6);
        this.api.showFloatingText(friendly.x, friendly.y - 34,
          `🪷 +${LOTUS_HEAL} · +1 petal (x${stacks.length})`, '#ffdd66');
        break;
      }

      // ── Pitcher: a sprinkler watering every plant around it ────────────────
      case 'pitcher': {
        p.sprayFlash = Math.max(0, p.sprayFlash - delta / 600);
        p.accum += delta * rate;
        if (p.accum < PITCHER_INTERVAL_MS) break;
        p.accum = 0;
        p.sprayFlash = 1;
        this.waterAround(p.x, p.y, PITCHER_RADIUS * (this.isFertilized(p) ? 1.15 : 1), owner, p, time);
        break;
      }
    }
  }

  /**
   * Sprinkle every plant of `owner` within `radius`: a small heal and a soak that makes it act
   * faster and hit harder. `except` is the sprinkler itself — a pitcher never waters itself.
   */
  private waterAround(
    x: number, y: number, radius: number, owner: 'player' | 'npc', except: Plant | null, time: number,
  ): number {
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    const f = this.fxFor(owner);
    f.ring(x, y, 12, radius, LIFE.water, 520, 3, 2);
    let n = 0;
    for (const q of list) {
      if (q === except) continue;
      if (Phaser.Math.Distance.Between(x, y, q.x, q.y) > radius) continue;
      n++;
      const healed = Math.min(PITCHER_HEAL, q.hitbox.maxHp - q.hitbox.hp);
      if (healed > 0) q.hitbox.hp += healed;
      const fresh = time >= q.wateredUntil;
      q.wateredUntil = time + WATERED_MS;
      f.pollen(q.x, q.y - 16, 5, { speed: 40, size: 2.2, life: 420, rise: -14, depth: 5, color: LIFE.water });
      if (fresh) this.api.showFloatingText(q.x, q.y - 44, healed > 0 ? `💧 +${healed}` : '💧 Watered', '#66ccff');
    }
    return n;
  }

  /**
   * One frame of a solar link from (sx,sy): advance it, deal its ramping damage on 250ms
   * ticks, and paint it. Returns true once the 3 seconds are up.
   */
  private tickSolar(
    link: SolarLink, sx: number, sy: number, delta: number, owner: 'player' | 'npc', source: object,
  ): boolean {
    link.elapsed += delta;
    link.tick += delta;
    const heat = Math.min(1, link.elapsed / SUN_LINK_MS);
    const v = link.target;
    while (link.tick >= 250) {
      link.tick -= 250;
      const dps = SUN_DPS_START + (SUN_DPS_END - SUN_DPS_START) * heat;
      const dmg = Math.max(1, Math.round(dps * 0.25 * link.power));
      v.takeDamage(dmg, { source, sourceX: sx, sourceY: sy });
      if (owner === 'player') this.api.recordMasteryStat('plantDamage', dmg);
      this.fxFor(owner).pollen(v.x, v.y, 3, {
        speed: 70, size: 2.2, life: 280, rise: 10, depth: 7,
        color: heat > 0.6 ? LIFE.solar : LIFE.sun,
      });
    }
    if (this.shotGfx) {
      LifeFx.drawSolarBeam(this.shotGfx, this.colFor(owner), sx, sy, v.x, v.y, heat, this.worldT);
    }
    return link.elapsed >= SUN_LINK_MS;
  }

  private endSunLink(p: Plant): void {
    p.link = null;
    p.accum = 0;
    // The spent head lets off a puff of scorched petals.
    this.fxFor(p.owner).petalShards(p.x, p.y - 18, 5, 90, 360, 5, LIFE.solar);
  }

  // ── Garden shots ────────────────────────────────────────────────────────────

  /** Frost shards (piercing) and sprout fire, flown and collided here rather than in ArenaScene. */
  private updateBolts(delta: number): void {
    const g = this.shotGfx;
    const dt = delta / 1000;
    const now = this.api.scene.time.now;
    const wb = this.api.scene.physics.world.bounds;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      const f = this.fxFor(b.owner);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.range -= Math.hypot(b.vx, b.vy) * dt;
      if (b.range <= 0 || b.x < wb.left - 20 || b.x > wb.right + 20 || b.y < wb.top - 20 || b.y > wb.bottom + 20) {
        f.petalShards(b.x, b.y, 3, 80, 260, 6, b.kind === 'frost' ? LIFE.ice : LIFE.ember);
        this.bolts.splice(i, 1);
        continue;
      }
      let spent = false;
      for (const h of this.hostilesFor(b.owner)) {
        if (!h.active || h.hp <= 0 || b.hit.has(h)) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, h.x, h.y) > 24) continue;
        b.hit.add(h);
        h.takeDamage(b.damage, { source: b.from ?? b, sourceX: b.x, sourceY: b.y });
        if (b.owner === 'player') this.api.recordMasteryStat('plantDamage', b.damage);
        if (b.kind === 'frost') {
          const wasBrittle = now < h.lifeFrailUntil;
          h.lifeSlowUntil = Math.max(h.lifeSlowUntil, now + FROST_SLOW_MS);
          h.lifeFrailUntil = Math.max(h.lifeFrailUntil, now + FROST_FRAIL_MS);
          f.ring(h.x, h.y, 6, 30, LIFE.frost, 300, 3, 7);
          f.petalShards(h.x, h.y, 4, 140, 320, 7, LIFE.ice);
          this.api.spawnHitFlash(h.x, h.y, this.colFor(b.owner)(LIFE.frost));
          if (!wasBrittle) this.api.showFloatingText(h.x, h.y - 30, '❄️ Brittle! +20% dmg', '#aaeeff');
          // Pierces: keeps flying through.
        } else {
          const wasBurning = now < h.lifeBurnUntil;
          h.lifeBurnUntil = Math.max(h.lifeBurnUntil, now + SPROUT_BURN_MS);
          f.flash(b.x, b.y, 12, 7);
          this.api.spawnHitFlash(h.x, h.y, this.colFor(b.owner)(LIFE.flame));
          if (!wasBurning) this.api.showFloatingText(h.x, h.y - 30, '🔥 Burning!', '#ff8833');
          spent = true;
          break;
        }
      }
      if (spent) { this.bolts.splice(i, 1); continue; }
      if (!g) continue;
      const a = Math.atan2(b.vy, b.vx);
      if (b.kind === 'frost') LifeFx.drawIceShard(g, this.colFor(b.owner), b.x, b.y, a, this.worldT);
      else LifeFx.drawFlameBolt(g, this.colFor(b.owner), b.x, b.y, a, this.worldT);
    }
  }

  /** Nightcap bombs on their arc; they burst into a poison pool where they land. */
  private updateBombs(time: number, delta: number): void {
    const g = this.shotGfx;
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.elapsed += delta;
      const k = Math.min(1, b.elapsed / NIGHTCAP_FLIGHT_MS);
      const gx = b.x0 + (b.x1 - b.x0) * k;
      const gy = b.y0 + (b.y1 - b.y0) * k;
      // Leaves the cap 20px up, peaks at ~80, comes down onto the ground.
      const h = Math.sin(k * Math.PI) * 70 + (1 - k) * 20;
      if (k < 1) {
        if (g) LifeFx.drawSporeBomb(g, this.colFor(b.owner), gx, gy, h, this.worldT);
        continue;
      }
      this.bombs.splice(i, 1);
      const f = this.fxFor(b.owner);
      const dmg = Math.max(1, Math.round(b.damage));
      for (const v of this.hostilesFor(b.owner)) {
        if (!v.active || v.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(b.x1, b.y1, v.x, v.y) > NIGHTCAP_IMPACT_RADIUS) continue;
        v.takeDamage(dmg, { source: b.from, sourceX: b.x1, sourceY: b.y1 });
        if (b.owner === 'player') this.api.recordMasteryStat('plantDamage', dmg);
        this.api.spawnHitFlash(v.x, v.y, this.colFor(b.owner)(LIFE.night));
        this.api.showFloatingText(v.x, v.y - 30, '🍄 Splat!', '#cc88ff');
      }
      this.spawnSporePool(b.x1, b.y1, b.owner, time, NIGHTCAP_POOL_RADIUS, NIGHTCAP_POOL_MS);
      f.ring(b.x1, b.y1, 6, NIGHTCAP_POOL_RADIUS + 6, LIFE.night, 340, 4, 4);
      f.spores(b.x1, b.y1, 4, 30, 5, LIFE.night);
      f.petalShards(b.x1, b.y1, 6, 160, 360, 5, LIFE.night);
    }
  }

  // ── Garden afflictions (chill, brittle, burn, poison) ───────────────────────

  /**
   * Ticks the garden's statuses on everyone they can land on: the brittle vulnerability folded
   * into `lifeIncomingMult`, the chill on husks (the duelists' chill is pulled by ArenaScene),
   * the Flaming Sprout burn and the Nightcap-essence poison ladder — and paints all four.
   */
  private tickAfflictions(time: number, delta: number): void {
    const { player, npc, enemies } = this.api;
    const all = new Set<Fighter>();
    if (player) all.add(player);
    if (npc) all.add(npc);
    for (const e of enemies ?? []) all.add(e);
    const g = this.shotGfx;
    const t = this.worldT;

    for (const f of all) {
      if (!f.active) continue;
      f.lifeIncomingMult = time < f.lifeFrailUntil ? FROST_FRAIL_MULT : 1;

      const chilled = time < f.lifeSlowUntil;
      if (f !== player && f !== npc) {
        if (chilled && !this.chilledHusks.has(f)) { f.walkSpeedMult *= FROST_SLOW_MULT; this.chilledHusks.add(f); }
        else if (!chilled && this.chilledHusks.has(f)) { f.walkSpeedMult /= FROST_SLOW_MULT; this.chilledHusks.delete(f); }
      }
      if (g && (chilled || time < f.lifeFrailUntil) && f.alpha > 0.05) {
        // Rime: a ring of ice crystals slowly turning around the chilled.
        g.fillStyle(LIFE.frost, 0.16);
        g.fillCircle(f.x, f.y, 22);
        for (let i = 0; i < 6; i++) {
          const a = t * 0.8 + (i / 6) * Math.PI * 2;
          const cx = f.x + Math.cos(a) * 20, cy = f.y + Math.sin(a) * 20;
          g.fillStyle(LIFE.ice, 0.85);
          g.fillTriangle(cx, cy - 4, cx + 1.8, cy, cx, cy + 4);
          g.fillTriangle(cx, cy - 4, cx - 1.8, cy, cx, cy + 4);
        }
      }

      if (time < f.lifeBurnUntil && f.hp > 0) {
        let acc = (this.burnClock.get(f) ?? 0) + delta;
        while (acc >= 500) {
          acc -= 500;
          f.takeDamage(BURN_TICK_DMG);
        }
        this.burnClock.set(f, acc);
        if (g && f.alpha > 0.05) {
          for (let i = 0; i < 4; i++) {
            const p = (t * 1.6 + i / 4) % 1;
            g.fillStyle(i % 2 ? LIFE.ember : LIFE.flame, 0.85 * (1 - p));
            g.fillCircle(f.x + Math.sin(t * 5 + i * 1.6) * 12, f.y + 10 - p * 34, 3.2 * (1 - p * 0.6));
          }
        }
      } else {
        this.burnClock.delete(f);
      }

      if (f.lifePoisonStacks > 0) {
        if (time >= f.lifePoisonUntil || f.hp <= 0) {
          f.lifePoisonStacks = 0;
          this.poisonClock.delete(f);
        } else {
          const clk = this.poisonClock.get(f) ?? { acc: 0, bank: 0 };
          clk.acc += delta;
          while (clk.acc >= 500) {
            clk.acc -= 500;
            clk.bank += POISON_DPS_PER_STACK * f.lifePoisonStacks * 0.5;
            const whole = Math.floor(clk.bank);
            if (whole > 0) { clk.bank -= whole; f.takeDamage(whole); }
          }
          this.poisonClock.set(f, clk);
          if (g && f.alpha > 0.05) {
            const n = Math.min(8, 2 + Math.floor(f.lifePoisonStacks / 3));
            for (let i = 0; i < n; i++) {
              const p = (t * 0.9 + i / n) % 1;
              g.fillStyle(LIFE.night, 0.7 * (1 - p));
              g.fillCircle(f.x + Math.sin(t * 3 + i * 2.2) * 14, f.y + 6 - p * 26, 2.4);
            }
          }
        }
      }
    }
    for (const h of this.chilledHusks) if (!h.active) this.chilledHusks.delete(h);
  }

  private pruneLotusStacks(time: number): void {
    for (const side of ['player', 'npc'] as const) {
      const s = this.lotusStacks[side];
      while (s.length > 0 && s[0] <= time) s.shift();
    }
  }

  private lotusStackCount(owner: 'player' | 'npc'): number {
    return this.lotusStacks[owner].length;
  }

  // ── Bot planning (owner-side, side-effect-free) ─────────────────────────────

  /**
   * What the bot should plant next and where. The kit owns the reasoning so the AI never has to
   * re-derive it, and `createPlant` reads the same plan for the seed — so this has to stay a
   * pure function of the board (no randomness) or the two would disagree.
   *
   *  - Pressed hard: a Helicopter between itself and the target, so the rotor is in the way.
   *  - Target in range: a Flaming Sprout in front of it — five seconds of fire at short range.
   *  - Two or more attackers up: a Pitcher in the middle of them, to water the lot (synergy).
   *  - Hurt: a Lotus at its feet, to feed it orbs (it walks to them via `npcLotusOrb`).
   *  - Otherwise fill the garden from the rotation it is missing.
   */
  npcPlantPlan(): LifeNpcPlan | null {
    const { npc, player } = this.api;
    if (!npc?.active || !player?.active) return null;
    const list = this.npcPlants;
    const has = (t: SeedType) => list.some((p) => p.type === t);
    const dx = player.x - npc.x, dy = player.y - npc.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const along = (k: number, side = 0) => ({ x: npc.x + ux * k - uy * side, y: npc.y + uy * k + ux * side });

    if (dist < 200 && !has('helicopter')) return { seed: 'helicopter', ...along(dist * 0.5) };
    if (dist < 320 && !has('flaming-sprout')) return { seed: 'flaming-sprout', ...along(Math.min(110, dist * 0.4)) };

    const attackers = list.filter((p) => p.type !== 'pitcher' && p.type !== 'lotus');
    if (attackers.length >= 2 && !has('pitcher')) {
      let cx = 0, cy = 0;
      for (const p of attackers) { cx += p.x; cy += p.y; }
      return { seed: 'pitcher', x: cx / attackers.length, y: cy / attackers.length };
    }
    if (npc.hp / npc.maxHp < 0.6 && !has('lotus')) return { seed: 'lotus', ...along(-40) };

    // The base garden is full: only the situational seeds above are worth replacing a plant for.
    if (list.length >= MAX_PLANTS) return null;
    const side = list.length % 2 === 0 ? 55 : -55;
    for (const seed of ['sunflower', 'frost-lily', 'nightcap', 'mushroom', 'lotus'] as SeedType[]) {
      if (!has(seed)) return { seed, ...along(Math.min(90, dist * 0.3), side) };
    }
    return { seed: 'sunflower', ...along(Math.min(90, dist * 0.3), side) };
  }

  /** The bot's nearest ripe Lotus orb, worth a short walk. */
  npcLotusOrb(): { x: number; y: number } | null {
    const npc = this.api.npc;
    if (!npc?.active) return null;
    let best: { x: number; y: number } | null = null;
    let bestD = 300;
    for (const p of this.npcPlants) {
      if (p.type !== 'lotus' || !p.orbReady) continue;
      const d = Phaser.Math.Distance.Between(npc.x, npc.y, p.x, p.y);
      if (d < bestD) { bestD = d; best = { x: p.x, y: p.y - 8 }; }
    }
    return best;
  }

  /** Fertilize is worth casting: two or more of the bot's plants inside the 200px wave. */
  npcFertilizeReady(): boolean {
    const npc = this.api.npc;
    if (!npc?.active) return false;
    let n = 0;
    for (const p of this.npcPlants) {
      if (Phaser.Math.Distance.Between(npc.x, npc.y, p.x, p.y) <= 190) n++;
    }
    return n >= 2;
  }

  /** A bot plant that is half dead with the enemy on it — where Root Shield should go. */
  npcShieldTarget(): { x: number; y: number } | null {
    const player = this.api.player;
    if (!player?.active) return null;
    for (const p of this.npcPlants) {
      if (p.hitbox.hp / p.hitbox.maxHp > 0.5 || this.api.scene.time.now < p.shieldUntil) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) > 260) continue;
      return { x: p.x, y: p.y };
    }
    return null;
  }

  // ── Life Mastery ────────────────────────────────────────────────────────────

  /** 0–1 cooldown fill for the Reap HUD card. */
  getReapCooldownRatio(time: number): number {
    return Math.min(1, (time - this.reapLastCastAt) / REAP_COOLDOWN_MS);
  }

  private hasReapBuff(type: SeedType): boolean {
    return this.api.masteryActive && this.api.scene.time.now < (this.reapBuffs.get(type) ?? 0);
  }

  /** The ability slot Reap is bound over this match, or null. */
  private reapSlot(): string | null {
    for (const slot of ['e', 'r', 'f', 'q']) {
      if (this.api.masteryBindFor(slot) === 'reap') return slot;
    }
    return null;
  }

  private tryCastReap(time: number, mouseX: number, mouseY: number): void {
    if (time - this.reapLastCastAt < REAP_COOLDOWN_MS) return;
    const list = this.playerPlants;
    const player = this.api.player;
    if (list.length === 0) {
      this.api.showFloatingText(player.x, player.y - 40, '🌱 No plants!', '#aaaa88');
      return;
    }

    const target = this.pickPlant(list, mouseX, mouseY);
    if (!target) return;

    // A better-fed plant gives a longer gift: 20s bare, +10s per perma-fertilizer star and +10s
    // if Fertilize's surge was still on it — a full minute from a fully fed plant.
    const fed = target.permStacks + (this.isFertilized(target) ? 1 : 0);
    const dur = Math.min(REAP_BUFF_MAX_MS, REAP_BUFF_BASE_MS + REAP_BUFF_PER_STACK_MS * fed);
    this.reapLastCastAt = time;
    this.reapBuffs.set(target.type, time + dur);
    if (target.type === 'lotus') { this.crownReady = true; this.crownAccum = 0; }
    if (target.type === 'flaming-sprout') { this.rapidStacks = 0; this.rapidLastAt = 0; }

    const def = SEED_BY_ID.get(target.type)!;
    // The plant is torn up and its essence hauled back down a vine into you.
    this.pfx.wilt(target.x, target.y, 26);
    this.pfx.petalShards(target.x, target.y, 10, 210, 520, 6, def.color);
    this.pfx.vineLash(target.x, target.y, player.x, player.y, def.color, 7);
    this.pfx.ring(target.x, target.y, 8, 62, def.color, 460, 5, 5);
    this.pfx.pollen(player.x, player.y, 12, { speed: 60, size: 3, life: 700, rise: 34, depth: 6, color: def.color });
    this.playerAvatar?.play('sweep', Math.atan2(target.y - player.y, target.x - player.x));

    const labels: Record<SeedType, string> = {
      'sunflower': '☀️ Solar Beam — right-click!',
      'nightcap': '🍄 Toxic Petals!',
      'helicopter': '🌀 Rotor Blades!',
      'mushroom': '🍄 +2 Petals!',
      'frost-lily': '❄️ Frost Petals!',
      'flaming-sprout': '🔥 Rapid Fire!',
      'lotus': '🪷 Lotus Crown!',
      'pitcher': '💧 Watering Can!',
    };
    this.api.showFloatingText(target.x, target.y - 44,
      `💀 Reaped! ${labels[target.type]} (${Math.round(dur / 1000)}s)`, '#ffdd66');

    // Cycle of Life (Q+): a reaped plant pays back 20 HP while Thrive! links it,
    // exactly as if it had died.
    if (time < this.thriveUntil && this.api.hasUpgrade('q')) {
      player.heal(20);
      this.api.showFloatingText(player.x, player.y - 34, '♻️ +20', '#88ffaa');
    }

    if (this.dragging === target) this.dragging = null;
    const idx = list.indexOf(target);
    this.destroyPlant(target);
    if (idx !== -1) list.splice(idx, 1);
    this.rescaleAll(list);
  }

  /** Sunflower essence: right-click links you to whoever is nearest the cursor. */
  private tryCastSolar(mouseX: number, mouseY: number): void {
    const now = this.api.scene.time.now;
    const player = this.api.player;
    if (this.solar) return;
    if (now < this.solarReadyAt) {
      const left = Math.ceil((this.solarReadyAt - now) / 1000);
      this.api.showFloatingText(player.x, player.y - 40, `☀️ ${left}s`, '#aa9955');
      return;
    }
    const hostiles = this.hostilesFor('player').filter((h) => h.active && h.hp > 0
      && Phaser.Math.Distance.Between(player.x, player.y, h.x, h.y) <= SUN_RANGE + 40);
    const target = this.nearestHostile(mouseX, mouseY, hostiles, Infinity);
    if (!target) {
      this.api.showFloatingText(player.x, player.y - 40, '☀️ Nothing in reach', '#aa9955');
      return;
    }
    this.solar = { target, elapsed: 0, power: 1, tick: 0 };
    this.solarReadyAt = now + SUN_LINK_MS + SOLAR_RECHARGE_MS;
    this.pfx.flash(player.x, player.y, 26, 6);
    this.pfx.ring(player.x, player.y, 8, 40, LIFE.sun, 320, 3, 6);
    this.playerAvatar?.play('punch', Math.atan2(target.y - player.y, target.x - player.x), 3000);
    this.api.showFloatingText(target.x, target.y - 34, '☀️ Solar Beam!', '#ffcc33');
  }

  /** Thorn Thrash: the struck plant sprays thorns in random directions. */
  private doThornThrash(p: Plant): void {
    const scene = this.api.scene;
    for (let i = 0; i < THORN_THRASH_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const proj = new Projectile(scene, p.x, p.y, 'proj-life', THORN_DAMAGE, true);
      proj.setTint(this.pcol(LIFE.thorn));
      (proj as any).isPlantShot = true;
      this.api.projectiles.add(proj);
      proj.launch(Math.cos(angle) * THORN_SPEED, Math.sin(angle) * THORN_SPEED);
    }
    this.pfx.thornSpray(p.x, p.y, 9, 6);
    this.pfx.ring(p.x, p.y, 8, 46, LIFE.leaf, 340, 4, 5);
    this.api.spawnHitFlash(p.x, p.y, this.pcol(LIFE.thorn));
    this.api.showFloatingText(p.x, p.y - 44, '🌵 Thorn Thrash!', '#aacc66');
  }

  /**
   * Tag this frame's freshly fired click petals so Thorn Thrash and the petal reap buffs can
   * recognise them, and enrol them for Frost Lily essence's one wall bounce.
   */
  onPetalShotgunFired(): void {
    if (!this.api.masteryActive) return;
    const player = this.api.player;
    const bouncy = this.hasReapBuff('frost-lily');
    for (const go of this.api.projectiles.getChildren() as Projectile[]) {
      if (!go.active || !go.isFromPlayer) continue;
      const rec = go as any;
      if (rec.isPetal || rec.isPlantShot) continue;
      if (go.texture.key !== 'proj-life' && go.texture.key !== 'proj-sakura') continue;
      // Petals spawn 32px out and haven't moved yet this frame; plant shots are
      // excluded above, so anything this close is a just-fired petal.
      if (Phaser.Math.Distance.Between(go.x, go.y, player.x, player.y) > 50) continue;
      rec.isPetal = true;
      if (bouncy) this.bouncyPetals.add(go);
    }
  }

  /** Called from ArenaScene's on-hit pipeline for every player projectile that lands. */
  onPlayerProjectileHit(proj: Projectile, target: Fighter, damageDealt: number): void {
    if ((proj as any).isPlantShot) this.api.recordMasteryStat('plantDamage', damageDealt);
    // Every petal that lands bursts apart, whatever else it does.
    this.pfx.petalShards(proj.x, proj.y, 5, 150, 380, 7,
      (proj as any).isSakura ? LIFE.rose : LIFE.leaf);
    if (!this.api.masteryActive || !(proj as any).isPetal) return;
    const now = this.api.scene.time.now;
    // Nightcap essence: one more rung on an uncapped poison ladder.
    if (this.hasReapBuff('nightcap')) {
      target.lifePoisonStacks += 1;
      target.lifePoisonUntil = now + POISON_LINGER_MS;
      this.pfx.spores(target.x, target.y, 1, 16, 6, LIFE.night);
      if (target.lifePoisonStacks % 5 === 0) {
        this.api.showFloatingText(target.x, target.y - 30, `🍄 Poison x${target.lifePoisonStacks}`, '#cc88ff');
      }
    }
    // Frost Lily essence: petals chill (no brittleness — that stays the lily's).
    if (this.hasReapBuff('frost-lily')) {
      const fresh = now >= target.lifeSlowUntil;
      target.lifeSlowUntil = Math.max(target.lifeSlowUntil, now + 1500);
      this.pfx.petalShards(target.x, target.y, 3, 120, 260, 7, LIFE.ice);
      if (fresh) this.api.showFloatingText(target.x, target.y - 30, '❄️ Chilled', '#aaeeff');
    }
  }

  /** Per-frame upkeep for every reap buff that lives on the caster. */
  private tickReapBuffs(time: number, delta: number): void {
    const player = this.api.player;
    if (!player || !this.api.isPlayerLife()) return;
    const g = this.shotGfx;
    const hostiles = () => this.hostilesFor('player').filter((h) => h.active && h.hp > 0);

    // Sunflower: the caster's own solar link.
    if (this.solar) {
      const v = this.solar.target;
      if (!v.active || v.hp <= 0 || !player.active
        || Phaser.Math.Distance.Between(player.x, player.y, v.x, v.y) > SUN_BREAK_RANGE + 40) {
        this.solar = null;
      } else if (this.tickSolar(this.solar, player.x, player.y - 6, delta, 'player', player)) {
        this.solar = null;
        this.pfx.petalShards(player.x, player.y, 5, 90, 360, 5, LIFE.solar);
      }
    }

    // Helicopter: rotor blades round the caster.
    if (this.hasReapBuff('helicopter') && player.active) {
      this.rotorSpin += (delta / 1000) * 8;
      if (g) LifeFx.drawGrassRotor(g, this.pcol, player.x, player.y, REAP_ROTOR_RADIUS, this.rotorSpin, 0.9);
      this.rotorAccum += delta;
      while (this.rotorAccum >= HELI_TICK_MS) {
        this.rotorAccum -= HELI_TICK_MS;
        for (const h of hostiles()) {
          if (Phaser.Math.Distance.Between(player.x, player.y, h.x, h.y) > REAP_ROTOR_RADIUS + 14) continue;
          h.takeDamage(REAP_ROTOR_TICK_DMG, { source: player, sourceX: player.x, sourceY: player.y });
          this.pfx.petalShards(h.x, h.y, 2, 140, 240, 6, LIFE.heli);
        }
      }
    } else {
      this.rotorAccum = 0;
    }

    // Helicopter: stubby petals drop after a few steps.
    for (let i = this.stubbyPetals.length - 1; i >= 0; i--) {
      const s = this.stubbyPetals[i];
      if (!s.proj.active) { this.stubbyPetals.splice(i, 1); continue; }
      if (Phaser.Math.Distance.Between(s.x, s.y, s.proj.x, s.proj.y) < STUBBY_PETAL_RANGE) continue;
      this.pfx.petalShards(s.proj.x, s.proj.y, 3, 60, 300, 5, LIFE.heli);
      (s.proj.body as Phaser.Physics.Arcade.Body | null)?.stop();
      s.proj.setActive(false).setVisible(false);
      this.stubbyPetals.splice(i, 1);
    }

    // Frost Lily: petals bank off the arena wall once.
    const wb = this.api.scene.physics.world.bounds;
    for (const proj of this.bouncyPetals) {
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      if (!proj.active || !body) { this.bouncyPetals.delete(proj); continue; }
      let bounced = false;
      if (proj.x < wb.left) { proj.x = wb.left; body.velocity.x = Math.abs(body.velocity.x); bounced = true; }
      else if (proj.x > wb.right) { proj.x = wb.right; body.velocity.x = -Math.abs(body.velocity.x); bounced = true; }
      if (proj.y < wb.top) { proj.y = wb.top; body.velocity.y = Math.abs(body.velocity.y); bounced = true; }
      else if (proj.y > wb.bottom) { proj.y = wb.bottom; body.velocity.y = -Math.abs(body.velocity.y); bounced = true; }
      if (bounced) {
        this.bouncyPetals.delete(proj);
        this.pfx.ring(proj.x, proj.y, 3, 18, LIFE.frost, 220, 2, 6);
      }
    }

    // Flaming Sprout: the chain falls apart if you stop clicking.
    if (this.rapidStacks > 0 && time - this.rapidLastAt > RAPID_RESET_MS) this.rapidStacks = 0;
    if (g && this.rapidStacks > 0 && this.hasReapBuff('flaming-sprout') && player.alpha > 0.05) {
      const k = Math.min(1, (this.rapidStacks * RAPID_STEP) / RAPID_MAX);
      for (let i = 0; i < 3 + Math.round(k * 5); i++) {
        const p = (this.worldT * 1.8 + i * 0.17) % 1;
        g.fillStyle(this.pcol(i % 2 ? LIFE.ember : LIFE.flame), 0.8 * (1 - p));
        g.fillCircle(player.x + Math.sin(this.worldT * 4 + i * 1.9) * 16, player.y + 8 - p * 30, 2.4 * (1 - p * 0.5));
      }
    }

    // Lotus: a lotus grows on your head; the next dash spends it on regen and stride.
    const dodging = this.api.isDodging;
    if (this.hasReapBuff('lotus')) {
      if (!this.crownReady) {
        this.crownAccum += delta;
        if (this.crownAccum >= CROWN_GROW_MS) {
          this.crownAccum = 0;
          this.crownReady = true;
          this.pfx.bloomBurst(player.x, player.y - 30, 18, 6, 6);
        }
      } else if (dodging && !this.wasDodging) {
        this.crownReady = false;
        this.crownAccum = 0;
        this.crownUntil = time + CROWN_REGEN_MS;
        this.crownRegenAccum = 0;
        this.pfx.petalShards(player.x, player.y - 30, 8, 160, 480, 6, LIFE.lotus);
        this.pfx.healBloom(player.x, player.y, 30, 6, LIFE.pollen);
        this.api.showFloatingText(player.x, player.y - 40, '🪷 Bloom! +regen +25% speed', '#ffaadd');
      }
      if (this.crownReady && g && player.alpha > 0.05) {
        LifeFx.drawLotusCrown(g, this.pcol, player.x, player.y - 32, this.worldT);
      }
    } else {
      this.crownReady = false;
      this.crownAccum = 0;
    }
    this.wasDodging = dodging;
    if (time < this.crownUntil && player.active) {
      this.crownRegenAccum += delta;
      const per = 1000 / CROWN_REGEN_PER_SEC;
      while (this.crownRegenAccum >= per) {
        this.crownRegenAccum -= per;
        player.heal(1);
      }
      if (g && player.alpha > 0.05) {
        const p = (this.worldT * 1.2) % 1;
        g.fillStyle(this.pcol(LIFE.lotus), 0.6 * (1 - p));
        g.fillCircle(player.x + Math.sin(this.worldT * 3) * 10, player.y + 6 - p * 26, 2.6);
      }
    }

    // Pitcher: the watering can.
    if (this.hasReapBuff('pitcher') && player.active) {
      this.canAccum += delta;
      if (this.canAccum >= CAN_INTERVAL_MS) {
        this.canAccum = 0;
        this.waterAround(player.x, player.y, CAN_RADIUS, 'player', null, time);
      }
    } else {
      this.canAccum = 0;
    }
  }

  // ── Spore pools (Nightcap) ──────────────────────────────────────────────────

  private spawnSporePool(
    x: number, y: number, owner: 'player' | 'npc', time: number, radius = 34, lifeMs = 2000,
  ): void {
    this.puddles.push({
      x, y, radius, expiresAt: time + lifeMs, lifeMs, tickAccum: 0, owner,
      seed: Math.random() * Math.PI * 2,
    });
    this.fxFor(owner).spores(x, y, 2, 24, 2, LIFE.night);
  }

  private updatePuddles(time: number, delta: number): void {
    if (!this.puddleGfx) this.puddleGfx = this.api.scene.add.graphics().setDepth(1);
    this.puddleGfx.clear();

    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const pd = this.puddles[i];
      if (time >= pd.expiresAt) {
        this.puddles.splice(i, 1);
        continue;
      }

      // Fade in over the first fifth of the pool's life, out over the last third.
      const life = (pd.expiresAt - time) / pd.lifeMs;
      const alpha = Math.min(1, Math.min((1 - life) * 5, life * 3));
      LifeFx.drawSporePool(this.puddleGfx, this.colFor(pd.owner), pd.x, pd.y, pd.radius, this.worldT, alpha, pd.seed);

      pd.tickAccum += delta;
      if (pd.tickAccum < 250) continue;
      pd.tickAccum -= 250;

      for (const h of this.hostilesFor(pd.owner)) {
        if (!h.active || h.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(pd.x, pd.y, h.x, h.y) > pd.radius) continue;
        h.takeDamage(2, { source: pd, sourceX: pd.x, sourceY: pd.y });
        if (pd.owner === 'player') this.api.recordMasteryStat('plantDamage', 2);
        // Standing in the cap also leaves a lingering toxic DOT.
        h.toxicUntil = Math.max(h.toxicUntil, time + 3000);
        h.toxicDps = Math.max(h.toxicDps, 4);
        this.fxFor(pd.owner).spores(h.x, h.y, 1, 16, 5, LIFE.night);
      }
    }
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Planted seeds. Every plant is a structure with its own hitbox Fighter, which
   * `destroyPlant` tears down along with the art — including letting go of anyone a pitcher
   * plant happened to be holding.
   */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: 'player' | 'npc',
    report?: (px: number, py: number) => void,
  ): number {
    const near = (px: number, py: number): boolean => {
      if (Phaser.Math.Distance.Between(x, y, px, py) > radius) return false;
      report?.(px, py);
      return true;
    };
    let razed = 0;
    const cull = (list: Plant[], owner: 'player' | 'npc'): void => {
      if (owner === exceptOwner) return;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (!near(p.x, p.y)) continue;
        this.destroyPlant(p);
        list.splice(i, 1);
        razed++;
      }
    };
    cull(this.playerPlants, 'player');
    cull(this.npcPlants, 'npc');
    return razed;
  }
}
