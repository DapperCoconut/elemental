import type Phaser from 'phaser';
import type { Fighter } from '../entities/Fighter';
import type { BossToolkit } from '../boss/framework/BossToolkit';
import type { ItemEffect } from '../data/Items';
import type { StrikeTarget, StrikeTargetDef } from '../boss/framework/StrikeTargets';
export type { StrikeTarget, StrikeTargetDef, Striker } from '../boss/framework/StrikeTargets';
import type { ShotHandle } from '../combat/ShotHandles';
export type { ShotHandle } from '../combat/ShotHandles';

/**
 * The Ten Isles — every shape the campaign's data is written in.
 *
 * Content (areas, courts, encounters, quests, items, fish) is pure data in these shapes, plus
 * three kinds of code a def may carry: an area's painter, an encounter's gimmick factory and an
 * item's script. The engine (`IsleWorldScene`, `IslesFightKit`) reads nothing else. See
 * `docs/ten-isles.md` for the world itself.
 */

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

// ── World state queries ────────────────────────────────────────────────

/**
 * A question about the save, used to pick dialogue, gate exits and show/hide things. Every
 * NPC line set, exit and POI may carry one; the engine answers it through `IslesSave.test`.
 */
export type Cond =
  | { prince: string }
  | { monarch: string }
  | { encounter: string }
  /** All five of a court's encounters won (the prince's gate opens) — or all six seats of a Pinnacle bench (its area id). */
  | { courtReady: string }
  /** The quest has been accepted. With `stage`, it has reached at least that stage. */
  | { quest: string; stage?: number }
  | { questDone: string }
  | { flag: string }
  | { item: string; count?: number }
  | { princesOfIsle: string; count: number }
  /** At least this many of the ten monarchs have fallen. */
  | { monarchs: number }
  /** At least this many of the Pinnacle's sixty councilors have been unseated. */
  | { seats: number }
  | { not: Cond }
  | { all: Cond[] }
  | { any: Cond[] };

// ── People ─────────────────────────────────────────────────────────────

export type NpcHat =
  | 'none' | 'cap' | 'tophat' | 'hood' | 'helmet' | 'crown' | 'bandana' | 'chef'
  /** The Obsidian Council's regalia: a tall black-glass mask over the whole face, one violet slit for the eyes. */
  | 'councilmask'
  /** A tall pointed wizard's hat, star-spangled, its tip flopping (mages, spellwrights, familiar-sellers). */
  | 'wizard'
  | 'tricorn' | 'beanie' | 'veil' | 'goggles' | 'straw' | 'mitre' | 'candle'
  /** A brass diving helmet with a round faceplate (the face shows through the glass). */
  | 'diving'
  /** An oilskin sou'wester — the fisher's rain hat, brim longer at the back. */
  | 'souwester'
  /** A ring of wildflowers worn as a crown (gardeners, petal-folk). */
  | 'wreath'
  /** A stag's antlers (hunters, the wild). */
  | 'antlers'
  /** A broad spotted mushroom cap (spore-folk). */
  | 'mushroom'
  /** A leather flying cap with ear-flaps and goggles pushed up on it (aeronauts, kite-folk). */
  | 'aviator'
  /** A long floppy nightcap with a pompom at the tip (sleepers, dreamers). */
  | 'nightcap'
  /** A soft cap with one long feather swept back from it (bards, storytellers, heralds). */
  | 'plume'
  /** A miner's hard hat with a brass lamp on the brow, lit (miners, quarrymen, delvers). */
  | 'miner'
  /** A desert headwrap wound round the head, its tail hanging behind (dune-folk, caravaners). */
  | 'headwrap'
  /** A smith's leather coif, laced, with smoked welding goggles on the brow (forge-hands, founders). */
  | 'coif'
  /** A snug skullcap with a coiled antenna sprung from the crown, a spark at its tip (linesmen, radio-hams, tinkers). */
  | 'antenna'
  /** A lead-lined hazard hood with a round glass visor over the face (reactor hands, pit-workers). */
  | 'hazmat'
  /** A striped beanie with a little propeller on top that turns (toymakers, children, acrobats). */
  | 'propeller'
  /** A deep cowl that hides the face, only two eye-glints in the dark of it (spies, informers, shadow-folk). */
  | 'cowl'
  /** A plague-doctor's beaked mask under a wide-brimmed hat (apothecaries, gravediggers, milkers). */
  | 'plague'
  /** A live serpent coiled round the head like a turban, its head raised and tongue flicking (venom-priests, charmers). */
  | 'snake'
  /** A green celluloid dealer's eyeshade on a band (croupiers, clerks, card-sharps). */
  | 'visor'
  /** A three-pointed fool's cap with a bell on each point (jokers, tricksters, fools). */
  | 'jester'
  /** A tall military shako with a plume and a brass plate (soldiers, sergeants, drummers). */
  | 'shako'
  /** A peaked bandmaster's cap with gold braid on the band and a brass lyre badge (bandsmen, heralds, conductors). */
  | 'bandmaster'
  /** A feathered masquerade half-mask over the eyes, sequinned, a plume at one temple (revellers, maskers). */
  | 'domino'
  /** Quilted earmuffs on a band over a knit cap (hush wardens, the muffled, the deafened). */
  | 'earmuffs'
  /** A judge's long white curled wig falling to the shoulders (judges, advocates, clerks of the court). */
  | 'wig'
  /** A floppy painter's beret, flecked with paint (painters, muralists, censors of art). */
  | 'beret';

export type NpcTrait =
  | 'apron' | 'beard' | 'cane' | 'satchel' | 'pipe' | 'scarf' | 'glasses' | 'eyepatch'
  | 'lantern' | 'pack' | 'brand' | 'bandage' | 'rod' | 'book' | 'tool' | 'mask';

export interface NpcLook {
  /** Body colour. */
  body: number;
  /** Clothes / hat colour. */
  accent: number;
  /** Hands + small details. Defaults to a darker body. */
  hand?: number;
  hat?: NpcHat;
  traits?: NpcTrait[];
  /** 0.7 (a child) – 1.4 (a big lad). Default 1. */
  size?: number;
  /** Eye colour — default near-white. */
  eye?: number;
}

/** One block of dialogue, shown when `when` holds. A def lists them most-specific first. */
export interface Talk {
  when?: Cond;
  lines: string[];
  /** Set this save flag when the block finishes playing. */
  sets?: string;
}

export type NpcRole = 'shop' | 'bakery' | 'dock' | 'tackle' | 'banker';

export interface NpcDef {
  id: string;
  name: string;
  /** "Ember Merchant", shown under the name plate. */
  title?: string;
  look: NpcLook;
  at: Pt;
  /** Strolls within this radius of `at`. 0 / absent: stands still. */
  wander?: number;
  /** Only present while this holds (e.g. hiding until their prince falls). */
  present?: Cond;
  talks: Talk[];
  /** Counter this NPC keeps: E opens it after the talk. Id of the shop / bakery / dock. */
  role?: { kind: NpcRole; id: string };
  /** Ambient lines they mutter when you walk by, per state (first matching wins). */
  barks?: Talk[];
}

/**
 * The isle's wanderer — one character per isle who follows you from area to area with a large
 * pool of state-keyed dialogue. Placed by the engine near the player's entry point.
 */
export interface WandererDef {
  id: string;
  name: string;
  title: string;
  look: NpcLook;
  /** Lines per area id (and optional state). First matching block for the current area wins. */
  byArea: Record<string, Talk[]>;
  /** Fallback lines anywhere, by state. */
  general: Talk[];
}

// ── Quests ─────────────────────────────────────────────────────────────

export type QuestObjective =
  /** Talk to an NPC; they say `lines`. */
  | { kind: 'talk'; npc: string; lines: string[] }
  | { kind: 'defeat'; encounter: string }
  /**
   * The quest's own fight: `foe` stands at `foe.at` in `area` only while this stage is live, and
   * beating them moves the quest on. Not a court champion — it never counts toward the prince's
   * gate. `foe.gimmick` may name any registered gimmick, or '' for a straight fight.
   */
  | { kind: 'duel'; area: string; foe: EncounterDef }
  | { kind: 'prince'; prince: string }
  /** Land `count` of a fish (any caught after the stage begins). */
  | { kind: 'fish'; fish: string; count: number }
  /** Hand `count` of an item to an NPC (taken from the inventory). */
  | { kind: 'deliver'; npc: string; item: string; count: number; lines: string[] }
  /** Pick up quest-only pickups the engine spawns at these spots while the stage is live. */
  | { kind: 'collect'; area: string; spots: Pt[]; label: string; emoji: string; color: number }
  /** Walk to a place. */
  | { kind: 'visit'; area: string; at: Pt; r: number; label: string }
  /** Have a bakery make this recipe. */
  | { kind: 'cook'; recipe: string };

export interface QuestStage {
  objective: QuestObjective;
  /** Tracker text, e.g. "Find 4 lost bellows-pins in the Boilerworks yard". */
  hint: string;
}

export interface QuestDef {
  id: string;
  /** Area whose tracker groups it. */
  area: string;
  name: string;
  giver: string;
  /** Only offered while this holds. */
  requires?: Cond;
  /** Giver's pitch. The last line is followed by an Accept / Not now choice. */
  offer: string[];
  /** Said on accept. */
  accept: string[];
  stages: QuestStage[];
  /** Said by the giver on turn-in (always the final beat). */
  complete: string[];
  reward: { orbs: number; coins?: number; item?: string; itemCount?: number };
}

// ── Places ─────────────────────────────────────────────────────────────

export type Solid =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; x: number; y: number; r: number };

export type Side = 'n' | 's' | 'e' | 'w';

/**
 * A road off the edge of the map. The engine draws the gate, makes the 140px strip at the edge
 * walkable-into, and lands you at the *opposite* gate of `to` (its exit whose `to` is this area),
 * so two areas only have to agree on which sides face each other.
 */
export interface AreaExit {
  side: Side;
  to: string;
  /** Position along the edge, px from the top/left. Default: the middle. Keep it clear of solids. */
  at?: number;
  label: string;
  /** Closed (a barricade + reason) unless this holds. */
  open?: Cond;
  lockedText?: string;
}

/** Everything placed in an area that you can walk up to and press E on. */
export type Poi =
  | { kind: 'encounter'; id: string }
  | { kind: 'prince'; id: string; at: Pt }
  | { kind: 'monarch'; id: string; at: Pt }
  | { kind: 'waystone'; at: Pt }
  | { kind: 'sign'; at: Pt; text: string }
  | { kind: 'chest'; id: string; at: Pt; coins?: number; item?: string; orbs?: number; open?: Cond }
  /** A door into another area that is not an edge exit (a dungeon, a cellar). */
  | { kind: 'door'; at: Pt; to: string; arrive: Pt; label: string; open?: Cond; lockedText?: string }
  /** Fishing water. Cast from anywhere within `reach` of the shape. */
  | { kind: 'water'; id: string; shape: Rect; fishery: string }
  /** The dock's mooring — where `SeaVoyageScene` starts from. */
  | { kind: 'mooring'; at: Pt; isle: string }
  /** Pull it to set `flag` (opens the gates that wait on it). One-way. */
  | { kind: 'lever'; at: Pt; flag: string; label: string };

/**
 * Dungeon dangers in the walkable world. There is no health out here: a hazard that catches
 * you throws you back to the last checkpoint you passed, scorched and a little embarrassed.
 */
export type WorldHazard =
  /** A timed jet over a rect: lethal while on. `offsetMs` staggers rows of them. */
  | { kind: 'jet'; rect: Rect; periodMs: number; onMs: number; offsetMs?: number; color?: number }
  /** An arm of fire sweeping round a pivot. */
  | { kind: 'sweeper'; x: number; y: number; length: number; radPerSec: number; phase?: number; color?: number }
  /** Pushes you along while you stand on it. `look` 'current' draws moving water instead of a belt. */
  | { kind: 'conveyor'; rect: Rect; vx: number; vy: number; look?: 'belt' | 'current' }
  /** A floor that is safe only while `open` holds (e.g. a quenched channel). */
  | { kind: 'floor'; rect: Rect; safeWhen: Cond; color?: number };

/** A wall that disappears once `open` holds (a lever's flag, a key spent, a prince down). */
export interface WorldGate {
  rect: Rect;
  open: Cond;
  look: 'portcullis' | 'grate' | 'wax' | 'rubble' | 'barrier' | 'ice' | 'coral' | 'sluice'
    /** The Pinnacle: `obsidian` a slab of black glass with a violet seam that splits it; `starseal` the throne door,
     * a disc of sixty mask-seals ringed round a sleeping star. */
    | 'obsidian' | 'starseal'
    | 'thorn' | 'roots' | 'bone' | 'candy'
    | 'cloud' | 'lightning' | 'orrery' | 'veil' | 'book'
    | 'boulder' | 'crystal' | 'kiln' | 'dune' | 'iron' | 'tomb'
    | 'cable' | 'magnet' | 'lead' | 'rubber' | 'phase'
    /** `fang` two great curved white fangs crossed, dripping; `web` a spider-web strung across with a spider in it;
     * `chain` hanging curtains of heavy chain; `shadow` a wall of moving darkness; `lychgate` a roofed churchyard gate. */
    | 'fang' | 'web' | 'chain' | 'shadow' | 'lychgate'
    /** `dice` stacked giant ivory dice; `vault` a round bank-vault door with bolts and a wheel; `clock` a clock face
     * with its hands as bars; `locket` a great open locket; `eye` a great lidded eye; `palisade` stakes hung with banners. */
    | 'dice' | 'vault' | 'clock' | 'locket' | 'eye' | 'palisade'
    /** `pipes` a rank of organ pipes as bars; `bell` a great bronze bell hung low across the way; `curtain` a red theatre
     * curtain with gold fringe; `stalactite` dripping cave teeth meeting stalagmites; `stainedglass` a leaded
     * stained-glass screen; `scroll` a giant unrolled score sheet strung across, notes on its staves. */
    | 'pipes' | 'bell' | 'curtain' | 'stalactite' | 'stainedglass' | 'scroll'
    /** `mirror` a tall gilt-framed mirror wall throwing glare; `sunbar` bars of solid sunlight; `lanterns` a curtain of
     * hanging soul-lanterns; `sigil` a glowing sigil circle standing on edge; `lens` a great lens in a brass ring on a
     * stand; `scaffold` painters' scaffolding hung with paint-spattered dust-sheets. */
    | 'mirror' | 'sunbar' | 'lanterns' | 'sigil' | 'lens' | 'scaffold';
  label?: string;
}

/** Static and animated drawing for an area. Bespoke per area — this is where courts look different. */
export interface AreaPainter {
  /** Drawn once into a baked texture under everything. */
  ground(g: Phaser.GameObjects.Graphics, rng: () => number): void;
  /**
   * Y-sorted set pieces (buildings, trees, machines): each one is drawn once into its own
   * graphics at depth `y`, so the player walks in front of or behind it.
   */
  pieces?: {
    x: number; y: number; w: number; h: number;
    draw: (g: Phaser.GameObjects.Graphics, rng: () => number) => void;
    /**
     * Only shown while this holds (re-checked twice a second) — the lit lighthouse after the
     * Empress falls, the scaffold that comes down once a quest is done. Pair two pieces with
     * opposite conditions to swap a building between its states.
     */
    when?: Cond;
  }[];
  /**
   * Per-frame ambient animation in world space (lava glow, steam, candle flames). Called only
   * for parts on screen: `view` is the camera rect. Drawn above the ground, below actors.
   * `world.test(cond)` reads the save, so an animation can change with the story.
   */
  animate?(g: Phaser.GameObjects.Graphics, t: number, view: Rect, world: PainterWorld): void;
  /** Like `animate` but drawn over actors (smoke, falling ash, canopy). */
  animateOver?(g: Phaser.GameObjects.Graphics, t: number, view: Rect, world: PainterWorld): void;
}

/** What a painter may read about the story — the same conditions NPC talks and exits use. */
export interface PainterWorld {
  test(c: Cond): boolean;
}

/**
 * Ambient particles over an area. `spray` is sea spray blown in off the breakers, `fog` slow
 * banks of sea mist, `bubbles` rising air (underwater places), `ink` drifting black flecks.
 * `pollen` golden dust, `spores` slow rising puffs, `petals` tumbling pink petals, `leaves` falling
 * leaves, `sugar` glittering pastel flakes, `fireflies` blinking lights (best in dark places).
 * `wind` fast streaks blown sideways, `clouds` low cloud puffs drifting across, `feathers` tumbling
 * down-feathers, `stars` a twinkling night sky with the odd shooting star (an overlay — best for
 * places under permanent night), `storm` slanting rain with lightning flashes, `dreams` slow rising
 * soap-bubble dreams and drifting zzz.
 * `dust` slow hanging dust motes in a warm haze, `sandstorm` driving sheets of sand blown sideways,
 * `grit` pebbles and grit trickling down from crumbling stone (ruins, quarries), `glints` coloured
 * crystal flecks winking in the light (caverns).
 * `static` crackling arcs jumping between points and a faint flicker in the air (power towns), `aurora`
 * ribbons of green and violet light rippling overhead (an overlay), `glow` green radioactive motes rising
 * in a faint haze, `flicker` double-exposure ghosts and scan-bands (things not quite in one state),
 * `balloons` loose balloons drifting up on their strings.
 * `miasma` green marsh-gas bubbles rising and popping in a low sickly haze, `drip` venom drops falling from
 * above and splashing, `gossamer` loose web strands drifting and glinting, `murk` wisps of living shadow
 * crawling in a dimmed light (an overlay), `wisps` pale will-o'-wisps bobbing and fading (graveyards).
 * `cards` playing cards fluttering and spinning down, `confetti` lottery confetti and curling streamers,
 * `goldleaf` flakes of gold leaf drifting and winking, `sandfall` fine hourglass sand falling in threads,
 * `sepia` drifting sepia motes in a faded warm haze like an old photograph (an overlay), `ripples` slow
 * concentric psychic rings pulsing outward in the air.
 * `notes` music notes (quavers, crotchets, a clef or two) drifting up and bobbing as if on a stave,
 * `glowworms` blue glowworm threads hanging from a cave roof and twinkling, `lull` slow lint and down falling in a
 * muffled grey hush (an overlay that greys the view), `sequins` sequins glittering and silk ribbons undulating,
 * `incense` coils of incense smoke with slanting shafts of stained-glass colour, `pages` loose manuscript sheets
 * blowing and tumbling end over end.
 * `sunbeams` slanting god-rays with dust glinting in them, `glare` a white heat-glare that blooms and shimmers at
 * the edges (an overlay), `lanterns` paper sky-lanterns drifting up glowing, `sigils` glowing runes drifting and
 * slowly turning, `prisms` rainbow caustics and prism flecks dancing, `pigment` puffs of coloured pigment powder.
 */
export type WeatherKind = 'none' | 'ash' | 'embers' | 'steam' | 'smoke' | 'sparks' | 'wax' | 'rain' | 'snow' | 'motes'
  | 'spray' | 'fog' | 'bubbles' | 'ink'
  | 'pollen' | 'spores' | 'petals' | 'leaves' | 'sugar' | 'fireflies'
  | 'wind' | 'clouds' | 'feathers' | 'stars' | 'storm' | 'dreams'
  | 'dust' | 'sandstorm' | 'grit' | 'glints'
  | 'static' | 'aurora' | 'glow' | 'flicker' | 'balloons'
  | 'miasma' | 'drip' | 'gossamer' | 'murk' | 'wisps'
  | 'cards' | 'confetti' | 'goldleaf' | 'sandfall' | 'sepia' | 'ripples'
  | 'notes' | 'glowworms' | 'lull' | 'sequins' | 'incense' | 'pages'
  | 'sunbeams' | 'glare' | 'lanterns' | 'sigils' | 'prisms' | 'pigment'
  /** The Pinnacle: `glassrain` slivers of black glass falling, each catching violet as it turns; `starmotes` slow
   * motes of cold starlight drifting upward. */
  | 'glassrain' | 'starmotes';

export interface AreaDef {
  id: string;
  isle: string;
  /** Court this area belongs to, if any. */
  court?: string;
  name: string;
  subtitle: string;
  w: number;
  h: number;
  /** Ground colour — the camera background outside the painted world. */
  bg: number;
  /** Tint for the screen-edge grade + minimap accent. */
  accent: number;
  weather: WeatherKind;
  music?: string;
  spawn: Pt;
  painter: AreaPainter;
  solids: Solid[];
  exits: AreaExit[];
  pois: Poi[];
  npcs: NpcDef[];
  /** Wandering townsfolk with ambient chatter. */
  crowd?: { count: number; looks: NpcLook[]; paths: Pt[][]; barks: Talk[] };
  /** Darkness 0–1 over the whole area (dungeons). */
  gloom?: number;
  hazards?: WorldHazard[];
  gates?: WorldGate[];
  /** Respawn points for hazards; the last one you walked within 60px of is used. */
  checkpoints?: Pt[];
  /** A cutscene (id in the bundle's `cutscenes`) played once, the first time this area is entered. */
  intro?: string;
  /** A stand-in from `content/placeholder.ts` while its builder works; the validator skips it. */
  placeholder?: boolean;
}

// ── Fights ─────────────────────────────────────────────────────────────

export interface EncounterDef {
  id: string;
  court: string;
  /** The fight's name — "Ember Tithe". */
  name: string;
  foeName: string;
  foeElement: string;
  /** 1–5, the bot preset. */
  difficulty: number;
  /** Multiplier on the foe's HP. Default 1. */
  hpMult?: number;
  gimmick: string;
  /** Where the champion stands in the court. */
  at: Pt;
  look: NpcLook;
  /** Said when you walk up, before the fight card. */
  challenge: string[];
  /** Said after you beat them (in the world, next visit). */
  beaten: string[];
  coins: number;
  /** Set by the registry on a quest's duel foe: the quest it belongs to. */
  quest?: string;
  /**
   * A councilor of the Obsidian Pinnacle: the foe fights *perfected* — every upgrade of its element, its
   * mastery (mastered look, passive and bound enhancement) and a perk — and is drawn masked in the world.
   */
  mastered?: boolean;
  /** Perk the foe wears (a perk id of its element). Default for a `mastered` foe: one of its element's, at random. */
  perk?: string;
  /** Councilor: the seat it holds — "Seat of Embers". Shown on the fight card and the result. */
  seat?: string;
}

/** What a gimmick may touch. Built per fight by `IslesFightKit`. */
export interface GimmickCtx {
  scene: Phaser.Scene;
  W: number;
  H: number;
  /** Hazard engine with the foe as its "boss" — bullets, zones, lanes, rings, pools… */
  tk: BossToolkit;
  player: Fighter;
  npc: Fighter;
  /** Top of the playfield (the HUD owns the strip above). */
  top: number;
  hard: boolean;
  /** Seeded per fight. */
  rng: () => number;
  /** Damage either fighter through the right chokepoint. */
  hit(f: Fighter, amount: number, x?: number, y?: number): void;
  heal(f: Fighter, amount: number): void;
  /** Positional shove, clamped to the arena. Never a velocity write. */
  nudge(f: Fighter, dx: number, dy: number): void;
  /** A real stun: no moving, no casting, shown on the status tray. Unstoppable fighters shrug it off. */
  stun(f: Fighter, ms: number): void;
  /** Held in place, but free to cast. */
  root(f: Fighter, ms: number): void;
  /** Basic attack only — every other key is locked. */
  silence(f: Fighter, ms: number): void;
  float(x: number, y: number, text: string, color: string): void;
  flash(x: number, y: number, color: number): void;
  /** A banner across the middle of the arena for big moments ("DRAW!"). */
  banner(text: string, color?: string): void;
  sfx(name: string): void;
  /** Win the fight outright (rare — survival-style rules). */
  victory(): void;
  /**
   * Put something on the floor that either fighter can *strike* — a lever, a rod, a prism, a
   * balloon. Every damage path in the arena reaches it (shots from both sides, AoE, melee, kit
   * abilities; the bot also strikes whatever is in reach when it casts). Each blow calls
   * `onStruck(by, amount)`; the thing never breaks on its own — `remove()` it when it should go.
   * Auto-aim and homing ignore it. `passThrough` lets shots fly on after striking it.
   */
  target(def: StrikeTargetDef): StrikeTarget;
  /**
   * Where a fighter is looking, in radians: the player's aim (toward the mouse), the bot's
   * heading as it walks (toward its foe while it stands still).
   */
  facing(f: Fighter): number;
  /**
   * Up in the air for `ms` (a trampoline throw, a blast that lifts): nothing can hit them — shots
   * pass under and damage is refused. Movement is untouched; `root` them too if they should fly
   * where they were thrown.
   */
  airborne(f: Fighter, ms: number): void;
  /** True while `airborne` holds. */
  isAirborne(f: Fighter): boolean;
  /**
   * True for ~120 ms after a fighter moved faster than any walk — a dash, blink, leap or launch (any
   * kit's). Use it for "a dash shakes it off" / "I will not dash" rules instead of reading speeds.
   */
  dashing(f: Fighter): boolean;
  /**
   * Shots in flight inside a circle — both sides', the arena's shared projectiles and the
   * kit-local ones that register. Each handle can `block()` it (gone, no hit) or `reflect()` it
   * (shared projectiles only: bounced off a wall normal and turned against its owner).
   */
  shotsNear(x: number, y: number, r: number): ShotHandle[];
}


export interface EncounterGimmick {
  /** `time` is scene ms; `dt` is SECONDS. */
  update(time: number, dt: number): void;
  drawGround?(g: Phaser.GameObjects.Graphics, time: number): void;
  drawAir?(g: Phaser.GameObjects.Graphics, time: number): void;
  /** Screen-space HUD for the rule (meters, pips). Drawn above everything. */
  drawHud?(g: Phaser.GameObjects.Graphics, time: number): void;
  /** Multipliers pulled every frame (never written onto the fighters). */
  playerSpeedMult?(): number;
  npcSpeedMult?(): number;
  /** Damage *taken* multiplier per side, pulled every frame. */
  playerTakenMult?(): number;
  npcTakenMult?(): number;
  /** Where the bot should go to play the rule (a lamp to snuff, an ember to grab). */
  npcSeek?(): Pt | null;
  onPlayerHurt?(amount: number): void;
  onNpcHurt?(amount: number): void;
  /** Every ability the player casts (after it went off — a refused cast is not reported). */
  onPlayerCast?(abilityId: string, slot: string | null): void;
  /** Every ability the bot casts. */
  onNpcCast?(abilityId: string): void;
  /**
   * Cooldown speed per side, pulled every frame: 1 normal, 2 charges twice as fast, 0.5 half
   * speed (clamped 0.25–4). Charged ultimates gain charge at the same rate.
   */
  playerCooldownRate?(): number;
  npcCooldownRate?(): number;
  destroy?(): void;
}

export interface GimmickDef {
  id: string;
  /** Short rule text on the fight card — what the player needs to know. */
  rules: string;
  make(ctx: GimmickCtx): EncounterGimmick;
}

/** The arena floor for a court's fights, painted once under everything. */
export type ArenaFloor = (g: Phaser.GameObjects.Graphics, W: number, H: number, rng: () => number) => void;

// ── Items ──────────────────────────────────────────────────────────────

export type IsleItemKind = 'charm' | 'food' | 'artifact' | 'fish' | 'material' | 'rod' | 'key';

export interface IsleItemDef {
  id: string;
  name: string;
  emoji: string;
  kind: IsleItemKind;
  /** Shop price in coins (absent: not sold). */
  price?: number;
  /** What a shop pays you for one. */
  sell?: number;
  flavor: string;
  /** Plain stats + generic triggered behaviours (see Items.ts). */
  effect?: ItemEffect;
  /** Bespoke runtime behaviour — id into `ITEM_SCRIPTS`. */
  script?: string;
  /** Hand-written lines for what the script does (stat lines are generated). */
  scriptText?: string[];
  /** Isle the item belongs to (journal grouping). */
  isle: string;
}

export interface ItemScriptCtx {
  scene: Phaser.Scene;
  W: number;
  H: number;
  player: Fighter;
  npc: Fighter;
  rng: () => number;
  hit(f: Fighter, amount: number, x?: number, y?: number): void;
  heal(f: Fighter, amount: number): void;
  float(x: number, y: number, text: string, color: string): void;
  flash(x: number, y: number, color: number): void;
  sfx(name: string): void;
  /** Slot of an ability id for the player's element: 'click' | 'e' | 'r' | 'f' | 'q'. */
  slotOf(abilityId: string): string | null;
  /** Shave time off one of the player's cooldowns. */
  refund(abilityId: string, ms: number): void;
  /** Temporary multiplier on damage the *foe* takes (i.e. your damage), stacked by the kit. */
  boostDamage(mult: number, ms: number): void;
  /** Temporary multiplier on the player's speed. */
  boostSpeed(mult: number, ms: number): void;
  /** Positional shove, clamped to the arena — a charm that knocks the foe back. */
  nudge(f: Fighter, dx: number, dy: number): void;
  /** A real stun (see GimmickCtx.stun). */
  stun(f: Fighter, ms: number): void;
  /** Where a fighter is looking (see GimmickCtx.facing). */
  facing(f: Fighter): number;
}

export interface ItemScript {
  /** `time` is scene ms; `dt` is SECONDS. */
  update?(time: number, dt: number): void;
  onHitDealt?(amount: number): void;
  onHitTaken?(amount: number): void;
  onCast?(abilityId: string, slot: string | null): void;
  drawGround?(g: Phaser.GameObjects.Graphics, time: number): void;
  drawAir?(g: Phaser.GameObjects.Graphics, time: number): void;
}

export type ItemScriptFactory = (ctx: ItemScriptCtx) => ItemScript;

export interface ShopDef {
  id: string;
  name: string;
  stock: string[];
  /** Buys fish / materials at their `sell` price. */
  buys?: boolean;
}

export interface RecipeDef {
  id: string;
  name: string;
  inputs: { item: string; count: number }[];
  coins: number;
  output: string;
  /** How many the oven turns out. Default 1. */
  makes?: number;
}

export interface BakeryDef {
  id: string;
  name: string;
  recipes: RecipeDef[];
}

// ── Fishing ────────────────────────────────────────────────────────────

export interface FishDef {
  /** Item id — a fish is an `IsleItemDef` of kind 'fish' with the same id. */
  id: string;
  fisheries: string[];
  /** Relative weight in its fisheries. */
  weight: number;
  /** 1 (lazy) – 5 (thrashing): how hard the reel is. */
  fight: number;
  /** Size range in cm for the log. */
  size: [number, number];
  /** Rod needed (by id). Absent: any rod. */
  rod?: string;
  /** Only bites at night / in the rain, etc. — flavour gating via a Cond. */
  when?: Cond;
}

export interface FisheryDef {
  id: string;
  name: string;
  /** Water look for the bobber splash. */
  kind: 'sea' | 'lava' | 'pond' | 'wax' | 'steam' | 'oil' | 'ice' | 'ink' | 'abyss' | 'bog' | 'syrup'
    /** Fishing off a cliff edge down into the cloud sea; `aurora` a pool of cooling starlight. Both need the skyline rod. */
    | 'cloud' | 'aurora'
    /** `sand` fishing the dune-sea's sand-swimmers; `cavern` a black lake at the foot of a deep shaft. Both need the delver rod. */
    | 'sand' | 'cavern'
    /** `charged` a storm-fed mill race fizzing with current; `coolant` a reactor's glowing cooling pond; `quantum` a well whose fish are and are not there. All need the insulated rod. */
    | 'charged' | 'coolant' | 'quantum'
    /** `venom` a steaming green venom fen; `blackwater` still black water whose fish are shadows. Both need the antivenin rod. */
    | 'venom' | 'blackwater'
    /** `gilded` gold-bright water over sunken coins; `lethe` pale still water of forgetting. Both need the fortune rod. */
    | 'gilded' | 'lethe'
    /** `resonant` a cave pool that rings like a struck glass when touched; `still` a silent mirror-flat mere. Both need the tuning rod. */
    | 'resonant' | 'still'
    /** `sunpool` a pool too bright to look into, its fish only dark shapes; `mana` a spring of liquid light whose fish are runes. Both need the prism rod. */
    | 'sunpool' | 'mana';
}

export interface RodDef {
  id: string;
  name: string;
  /** Widens the catch bar. */
  control: number;
  /** Fisheries kinds it can survive. */
  kinds: FisheryDef['kind'][];
}

// ── Genes ──────────────────────────────────────────────────────────────

export type GeneSlot = 'click' | 'e' | 'r' | 'f' | 'q';

/**
 * What a gene grants per level. Stats ride the item engine; `onCast` rules are the gene's
 * element-specific half — they fire when that slot's ability is cast.
 */
export interface GeneGrant {
  effect?: ItemEffect;
  onCast?: {
    slot: GeneSlot;
    /** Damage-taken multiplier on the foe for `ms` after the cast (your damage up). */
    damageMult?: number;
    speedMult?: number;
    ms?: number;
    heal?: number;
    shield?: number;
    /** Shave ms off every *other* slot's cooldown. */
    refundOthers?: number;
    /** Chance to refund this slot outright. */
    refundSelfChance?: number;
    /** Burst of damage around the player. */
    burst?: { damage: number; radius: number };
  };
}

export interface GeneNode {
  id: string;
  name: string;
  /** Tier row 0..4; tier 4 is Enlightened. */
  tier: number;
  /** Column 0..2 within the row (layout). */
  col: number;
  /** Ids that must have ≥1 level first. */
  needs: string[];
  /** Plain-language line per level ("+4% damage"), generated if absent. */
  text: string;
  maxLevel: number;
  /** Orb price for level n (1-based). */
  cost(level: number): number;
  /** What the node grants at a level. */
  grant(level: number): GeneGrant;
  /** Mastery: bought once after max level. */
  mastery?: { name: string; text: string; cost: number; grant: GeneGrant };
  /** Enlightened: levels forever. */
  infinite?: boolean;
}

export interface GeneTree {
  element: string;
  /** The tree's name — "Hearthblood". */
  name: string;
  nodes: GeneNode[];
}

// ── Sea ────────────────────────────────────────────────────────────────

export interface BoatDef {
  id: string;
  name: string;
  price: number;
  hull: number;
  speed: number;
  /** Turn rate. */
  handling: number;
  /** Cargo — loot multiplier. */
  hold: number;
  /** Simple silhouette params for the sea scene. */
  len: number;
  sails: number;
  color: number;
}

export interface DockUpgradeDef {
  id: string;
  name: string;
  text: string;
  prices: number[];
}

export interface UberDef {
  id: string;
  isle: string;
  name: string;
  text: string;
  /** Sea beast that drops it. */
  beast: string;
}

// ── Registry entries ───────────────────────────────────────────────────

export interface CourtDef {
  id: string;
  isle: string;
  element: string;
  name: string;
  /** `artifact` is the item id the prince drops (kind 'artifact', defined in the court's items). */
  prince: { id: string; name: string; title: string; artifact: string };
  /** 1 (first court) – 4 (last): drives difficulty labels and the map's suggested order. */
  tier: number;
  /** Area id. */
  area: string;
  floor: ArenaFloor;
  encounters: EncounterDef[];
  quests: QuestDef[];
  /** Hex accent for HUD and map. */
  color: number;
}

export interface IsleDef {
  id: string;
  name: string;
  element: string;
  monarch: { id: string; name: string; title: string; artifact: string };
  courts: string[];
  /** Dock area id — where boats land. */
  port: string;
  color: number;
  /** Position on the sea chart, 0–1. */
  chart: Pt;
  /** The Obsidian Pinnacle: not one of the ten isles (no courts, no genes, not on the dock's isle list). */
  pinnacle?: boolean;
  /**
   * One of the five abstract isles beyond the Breakwater. Crossings to it run the Outer Sea:
   * longer, darker water, a swell that shoves the boat about, and breakers to thread.
   */
  outer?: boolean;
}

/** What rides ArenaScene's `isles` payload. */
export interface IslesFightPayload {
  slot: number;
  kind: 'encounter' | 'prince' | 'monarch' | 'warden' | 'councilor';
  /** Encounter id, prince id or monarch id. */
  id: string;
  court?: string;
  /** Where to put the player back. */
  area: string;
  pos: Pt;
  hard: boolean;
}

/** Everything one court contributes. Each court folder exports one of these. */
export interface CourtBundle {
  court: CourtDef;
  area: AreaDef;
  gimmicks: GimmickDef[];
  /** The prince. `worldId` must be `isle:<prince id>`. */
  boss: import('../boss/framework/BossDefs').WorldBossDef;
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
  shops: ShopDef[];
  bakeries?: BakeryDef[];
  fish?: FishDef[];
  fisheries?: FisheryDef[];
  /** A stand-in from `content/placeholder.ts` while its builder works; the validator skips it. */
  placeholder?: boolean;
}

/** An isle's port, as its builder exports it (`<ISLE>_PORT`); the isle's `isle/index.ts` folds it in. */
export interface PortBundle {
  area: AreaDef;
  wanderer: WandererDef;
  quests: QuestDef[];
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
  shops: ShopDef[];
  bakeries: BakeryDef[];
  fish: FishDef[];
  fisheries: FisheryDef[];
  rods: RodDef[];
  /** Arena backdrop for the port's quest duels (registered under the port's area id). */
  floor: ArenaFloor;
}

/** An isle's dungeon + monarch, as its builder exports it (`<ISLE>_DUNGEON`). */
export interface DungeonBundle {
  area: AreaDef;
  encounters: EncounterDef[];
  gimmicks: GimmickDef[];
  boss: import('../boss/framework/BossDefs').WorldBossDef;
  floor: ArenaFloor;
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
}

/** Everything one isle contributes. */
export interface IsleBundle {
  isle: IsleDef;
  wanderer: WandererDef;
  courts: CourtBundle[];
  /** Non-court areas: the port, the dungeon. */
  areas: AreaDef[];
  /** Isle-level quests (port, dungeon). */
  quests: QuestDef[];
  /** Dungeon wardens and other non-court fights. */
  encounters: EncounterDef[];
  gimmicks: GimmickDef[];
  /** Monarch (+ anything else). `worldId` = `isle:<id>`. */
  bosses: import('../boss/framework/BossDefs').WorldBossDef[];
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
  shops: ShopDef[];
  bakeries: BakeryDef[];
  fish: FishDef[];
  fisheries: FisheryDef[];
  rods: RodDef[];
  genes: GeneTree[];
  ubers: UberDef[];
  /** Floor for non-court fights (dungeon wardens, the monarch). */
  floors: Record<string, ArenaFloor>;
  /** Cinematics this isle plays (area intros, endings). */
  cutscenes?: CutsceneDef[];
}

// ── Cutscenes ──────────────────────────────────────────────────────────

/** What a shot's painter is handed every frame. All drawing is in 960×640 screen space. */
export interface CutsceneKit {
  W: number;
  H: number;
  /** Seconds since this shot began. */
  t: number;
  /** 0–1 through the shot's `ms` (holds at 1 while its lines are still being read). */
  p: number;
  /** Seconds since the cutscene began. */
  T: number;
  /** Index of the line on screen (-1 before the first / with no lines). */
  line: number;
  /** A fresh seeded generator every frame — the same numbers each call, so "random" scenery holds still. */
  rng(): () => number;
  /** Save queries (false with no save). */
  test(c: Cond): boolean;
  /** The player's element id and colour — draw the hero with `cineHero` from `art/CineArt`. */
  hero: { element: string; color: number };
  /** Immediate-mode text: call it every frame you want the text up. `size` px; `align` 0 left, 0.5 centre, 1 right. */
  text(x: number, y: number, str: string, o?: { size?: number; color?: string; alpha?: number; align?: number; display?: boolean; spacing?: number }): void;
}

export interface CutsceneCue {
  /** ms into the shot. */
  at: number;
  sfx?: string;
  /** Camera shake intensity (0.002 gentle – 0.02 violent) for `ms` (default 400). */
  shake?: number;
  ms?: number;
  /** Full-screen flash of this colour. */
  flash?: number;
}

export interface CutsceneLine {
  /** Speaker — shown as a name plate; absent = narration (centred italic). */
  who?: string;
  text: string;
  /** Name-plate / text colour (css). */
  color?: string;
}

export interface CutsceneShot {
  /** The shot's length in ms. It runs at least this long, and until its last line has been read. */
  ms: number;
  /** Paints the whole frame (the Graphics is cleared for you). Runs every frame — keep it under ~1500 shapes. */
  draw(g: Phaser.GameObjects.Graphics, k: CutsceneKit): void;
  /** Subtitles, one at a time: typed out, held, then the next (SPACE / click hurries them along). */
  lines?: CutsceneLine[];
  /** How the shot arrives: a hard cut, a fade up from black (default for the first shot), or a white-out. */
  enter?: 'cut' | 'fade' | 'white';
  cues?: CutsceneCue[];
  /** No letterbox bars for this shot (title cards, credits). */
  full?: boolean;
}

/** A cinematic: a string of painted shots with subtitles. Played by `IslesCutsceneScene`; ESC twice skips. */
export interface CutsceneDef {
  id: string;
  shots: CutsceneShot[];
  /** Music track key (`Music.play`). Default: silence falls, the campaign theme returns after. */
  music?: string;
}

/** One bench of the Obsidian Pinnacle, as its builder exports it (`PIN_<TIER>`). */
export interface PinnacleTierBundle {
  area: AreaDef;
  /** The six councilors — `court` is the tier's area id, `mastered: true`, one per element of the tier. */
  encounters: EncounterDef[];
  /** The six Decrees. */
  gimmicks: GimmickDef[];
  /** Arena backdrop for the six fights (registered under the tier's area id). */
  floor: ArenaFloor;
  /** The bench's relic (a charm) and anything else. */
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
  /** The tier's intro cinematic (its id is the area's `intro`). */
  cutscenes: CutsceneDef[];
}

export type { ItemEffect };

/** The foot of the Pinnacle, as its builder exports it (`PIN_LANDING_BUNDLE`). */
export interface PinnacleLandingBundle {
  area: AreaDef;
  /** Who climbs with you — lines for the landing, every bench and the summit. */
  wanderer: WandererDef;
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
  shops: ShopDef[];
  bakeries: BakeryDef[];
  cutscenes: CutsceneDef[];
}

/** The throne hall, as its builder exports it (`PIN_SUMMIT_BUNDLE`). */
export interface PinnacleSummitBundle {
  area: AreaDef;
  /** The hall floor under the King's fight (registered under the summit's area id). */
  floor: ArenaFloor;
  /** The King's artifact, and anything else found in the hall. */
  items: IsleItemDef[];
  scripts: Record<string, ItemScriptFactory>;
  cutscenes: CutsceneDef[];
}
