import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Husk, HuskWorld } from '../../invasion/Husk';
import { BASIC_HUSK, HUSK_VARIANTS, HuskVariantDef, huskTextureKey } from '../../invasion/HuskVariants';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import {
  ANGERED_TONES, GOLD_TONES, NPC_TONES, ROT_TONES, SOUL, SPIRIT_TONES, SoulAmalgamBody,
  SoulAvatar, SoulColorFn, SoulFx, SoulShroud, SoulTones, TORMENT_TONES, tonesFor,
} from './SoulVisuals';
import { FONT_DISPLAY } from '../../ui/Theme';

type Owner = 'player' | 'npc';

/**
 * Every soul ability — the player's and the NPC's alike — is cast through the `do*` methods
 * below, so each one drives its own arm gesture right where it fires. That covers the local
 * player, the AI opponent and an online peer's replayed casts from one place, which is why this
 * kit has no separate npc-cast-id gesture table.
 */

// ── SoulArenaApi ─────────────────────────────────────────────────────────────

export interface SoulArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly isInvasion: boolean;
  /** Campaign finale: the npc slot is The Amalgam, which Turn hurts instead of converting. */
  readonly isAmalgamBoss: boolean;
  readonly width: number;
  readonly height: number;
  hasUpgrade(slot: string): boolean;
  /** The npc side's upgrades (bot loadout or online peer) — Soul Lord is mirrored on both sides. */
  hasNpcUpgrade(slot: string): boolean;
  /** Online: relays a non-cooldown press (the beam release) to the peer. */
  broadcastMasteryCast(id: string): void;
  /** Skins: maps a soul visual color through the owner's skin. */
  soulColor(owner: Owner, base: number): number;
  hasPerk(owner: Owner, perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamageFromOwner(x: number, y: number, radius: number, damage: number, owner: Owner): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  /** True only when the player is soul AND Soul Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the online opponent is soul AND has Soul Mastery on. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── Mastery: Strength in Numbers passive + Grave Mistake bindable ─────────────
const ALPHA_HP = 200;
const ALPHA_BITE_DMG = 20;
const ALPHA_SPEED = 85;
const ALPHA_CONE_INTERVAL_MS = 3000;
const ALPHA_CONE_BULLETS = 5;
const ALPHA_CONE_DAMAGE = 5;
const ALPHA_ANTIHEAL_MS = 5000;
const SOUL_SCREECH_RADIUS = 165;
const SOUL_SCREECH_DAMAGE = 25;
const SOUL_SCREECH_COOLDOWN_MS = 12000;

// ── World-object types ───────────────────────────────────────────────────────

/** A Lantern of the Damned wisp, or one of the shards a Soul Lord wisp bursts into. */
interface LanternBolt {
  owner: Owner;
  /** Repainted every frame — a flame of spirit with a face in its head. */
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  angle: number;
  speed: number;
  /** Still bending toward the cursor. Cleared for good on arrival or once it would turn back. */
  seeking: boolean;
  seekX: number;
  seekY: number;
  /** Track the live cursor (the local player) rather than a fixed point (bot, online peer). */
  live: boolean;
  /** Fraction of the lantern's damage it carries — 1 for a wisp, less for a shard. */
  frac: number;
  small: boolean;
  /** A shard never re-hits the thing its parent burst on. */
  ignore: Fighter | null;
  bornAt: number;
  expiresAt: number;
  t: number;
}

/** A fired soul beam, fading out. Damage is dealt the instant it fires. */
interface BeamFlash {
  owner: Owner;
  gfx: Phaser.GameObjects.Graphics;
  x1: number; y1: number; x2: number; y2: number;
  width: number;
  bornAt: number;
  t: number;
}

/** Soul Lord 10: a bleeding soul aura the beam leaves on what it hit. */
interface Hemorrhage {
  owner: Owner;
  target: Fighter;
  gfx: Phaser.GameObjects.Graphics;
  until: number;
  tickAccum: number;
  t: number;
}

/** Restless Ground (E+): the rot a fallen zombie leaves behind it. */
interface DecayCloud {
  /** Repainted every frame — turning lobes of bile with bone flecks drifting up out of them. */
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  radius: number;
  owner: Owner;
  expiresAt: number;
  tickAccum: number;
  /** Own clock, so overlapping clouds churn out of phase. */
  t: number;
}

interface Grave {
  sprite: Phaser.GameObjects.Image;
  /** Repainted every frame — the light seeping out of the plot and the wisps it exhales. */
  aura: Phaser.GameObjects.Graphics;
  auraT: number;
  x: number;
  y: number;
  owner: Owner;
  nextSpawnAt: number;
  /** 1 = a plot, 2 and 3 = a graveyard. Sets the tier of everything it raises (R+). */
  tier: 1 | 2 | 3;
}

interface GraveZombie {
  husk: Husk;
  owner: Owner;
  variant: HuskVariantDef;
  angered: boolean;
  auraGfx: Phaser.GameObjects.Graphics | null;
  /** Own clock so a pack of them doesn't pulse in lockstep. */
  t: number;
}

interface Corpse {
  maxHp: number;
  variant?: HuskVariantDef;
  angered?: boolean;
  /** Mastery — the Corpse Prince. Never dropped off the queue, never turned, always comes back. */
  prince?: boolean;
}

interface Amalgam {
  husk: Husk;
  owner: Owner;
  waypoint: { x: number; y: number } | null;
  baseBiteDamage: number;
  dashBiteDamage: number;
  nextDashAt: number;
  dashUntil: number;
  /** The drawn creature. The husk sprite underneath it is hidden — this *is* the amalgam. */
  body: SoulAmalgamBody;
  meleeTickAccum: number;
  /** Carrion Call (F+): timestamp until which +speed/+damage is active. */
  carrionUntil: number;
  nextTrailAt: number;
  variant: HuskVariantDef;
  angered: boolean;
  /** Mastery — the Corpse Prince: crowned, sword in hand, back in the queue 12s after it falls. */
  prince?: boolean;
  /** Grave Mistake: the friendly alpha fires a periodic cone. */
  isAlpha?: boolean;
  alphaNextConeAt?: number;
  /** Live veil of wisps while Carrion Call has hold of it. */
  shroud: SoulShroud | null;
  /** Own clock for the stitch seam and aura art. */
  t: number;
}

/** A recruited variant's ranged attack (Spitter). Mirrors InvasionKit's HuskShot. */
interface SoulShot {
  /** Repainted every frame — a wisp-tailed bolt, so its heading reads at speed. */
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  owner: Owner;
  /** Bile green for an alpha cone, the owner's own shades for a recruited spitter. */
  tones: SoulTones;
  t: number;
  /** True for a hostile grave zombie's shot (hits the caster); false for a friendly amalgam's (hits foes). */
  hitsCaster: boolean;
  expiresAt: number;
  /** Grave Mistake alpha cone: applies anti-heal to the player on hit. */
  antiHeal?: boolean;
}

// ── Tuning ────────────────────────────────────────────────────────────────────

const CORPSE_CAP_BASE = 5;

// ── Click: Lantern of the Damned ─────────────────────────────────
const LANTERN_SPEED = 330;
const LANTERN_RADIUS = 7;
const LANTERN_HIT_RADIUS = 22;
const LANTERN_DAMAGE = 8;
/** How hard a wisp can bend toward the cursor, in rad/s. */
const LANTERN_TURN_RATE = 7;
const LANTERN_ARRIVE_RADIUS = 14;
/** Once the cursor is this far off its heading it would have to circle back — it flies on. */
const LANTERN_GIVE_UP_ANGLE = Math.PI * 0.55;
const LANTERN_SEEK_MAX_MS = 1400;
const LANTERN_LIFETIME_MS = 2600;
/** +5% lantern-family damage per kill this match, capped at +200%. */
const LANTERN_KILL_BONUS = 0.05;
const LANTERN_KILL_BONUS_CAP = 2;
/** How far a bot will reach for its own grave zombie with the lantern. */
const NPC_LANTERN_RANGE = 360;

// ── Right click: Soul Beam ───────────────────────────────────────────
const BEAM_CHARGE_MS = 1200;
const BEAM_CHARGE_ASCENDED_MS = 600;
/** Released below this much charge, the beam fizzles without firing or going on cooldown. */
const BEAM_MIN_CHARGE = 0.15;
const BEAM_LENGTH = 460;
const BEAM_MIN_WIDTH = 10;
const BEAM_MAX_WIDTH = 22;
const BEAM_MIN_DMG = 6;
const BEAM_MAX_DMG = 22;
const BEAM_COOLDOWN_MS = 1500;
const BEAM_FADE_MS = 280;

// ── Click+: Soul Lord ─────────────────────────────────────────────────
const LORD_SPLIT_KILLS = 5;
const LORD_HEMO_KILLS = 10;
const LORD_ORB_KILLS = 15;
const LORD_ASCEND_KILLS = 25;
const SPLIT_COUNT = 3;
const SPLIT_SPEED = 300;
const SPLIT_LIFETIME_MS = 550;
const SPLIT_DMG_FRAC = 0.4;
const HEMO_MS = 4000;
const HEMO_RADIUS = 80;
const HEMO_TICK_MS = 500;
/** Per tick to everything else inside the aura (scaled by kills), and to the bearer. */
const HEMO_SPLASH = 3;
const HEMO_BLEED = 1;
const ORB_COUNT = 3;
const ORB_RADIUS = 48;
const ORB_SIZE = 7;
const ORB_DAMAGE = 5;
const ORB_HIT_CD_MS = 600;
/** rad/s at 15 kills, +0.12 per kill beyond, capped. */
const ORB_SPIN_BASE = 2.4;
const ORB_SPIN_PER_KILL = 0.12;
const ORB_SPIN_MAX = 7;
const HOMING_RANGE = 280;
const HOMING_TURN_RATE = 5;

/** Distance from a point to a segment — the beam's hit test. */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const f = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  return Math.hypot(px - (x1 + dx * f), py - (y1 + dy * f));
}

// ── E+: Cloud of Decay ──────────────────────────────────────────────
const DECAY_RADIUS = 84;
const DECAY_LIFETIME_MS = 6000;
const DECAY_TICK_MS = 1000;
const DECAY_DPS = 6;
const DECAY_HPS = 6;
const DECAY_SLOW_MULT = 0.7;

// ── R+: graveyards ──────────────────────────────────────────────────
/** How near an existing plot a fresh R has to land to raise it a tier instead of adding a stone. */
const GRAVEYARD_RADIUS = 90;
const GRAVE_MAX_TIER = 3;

/**
 * The hard ceiling on how many bodies one side can have standing at once — grave zombies and
 * Amalgams share it, which is the whole tension: a zombie you have not drained yet is a slot
 * your Amalgam cannot use. Graves quietly hold their next spawn while the field is full rather
 * than queueing them up, and Arise refuses without spending the corpse.
 */
const SOUL_HUSK_CAP = 3;

const GRAVE_SPAWN_INTERVAL_MS = 5000;
const GRAVE_ZOMBIE_HP = 20;
const GRAVE_ZOMBIE_SPEED = 70;
const GRAVE_ZOMBIE_BITE_DMG = 5;
const GRAVE_ZOMBIE_BITE_CD_MS = 1200;

/**
 * Every rollable elemental variant, all three tiers — a grave zombie can come
 * up wearing any element the invasion lightning knows. Decoys and other
 * no-reward husks are excluded; they are props, not bodies worth raising. So
 * are the tenth-wave bosses, the Graveyard's own titan and everything a boss
 * calls in: none of those are a body that walked through a window.
 */
const RECRUITABLE_VARIANTS: HuskVariantDef[] = HUSK_VARIANTS.filter((v) => (
  !v.isBoss
  && v.behavior !== 'titan'
  && !v.id.startsWith('boss-')
  && v.id !== 'basic'
  && !v.noReward
));
/** Tier buckets, so a graveyard can raise exactly the tier it has been built up to. */
const VARIANTS_BY_TIER: Record<1 | 2 | 3, HuskVariantDef[]> = {
  1: RECRUITABLE_VARIANTS.filter((v) => (v.tier ?? 1) === 1),
  2: RECRUITABLE_VARIANTS.filter((v) => v.tier === 2),
  3: RECRUITABLE_VARIANTS.filter((v) => v.tier === 3),
};

const ANGERED_HP_MULT = 2;
const ANGERED_SPEED_MULT = 1.25;

const AMALGAM_BITE_DMG = 8;
const AMALGAM_BITE_CD_MS = 900;
const AMALGAM_SPEED = 115;
const AMALGAM_DASH_BITE_DMG = 15;
const AMALGAM_DASH_SPEED_MULT = 2.4;
const AMALGAM_DASH_DURATION_MS = 400;
const AMALGAM_DASH_INTERVAL_MIN_MS = 4000;
const AMALGAM_DASH_INTERVAL_MAX_MS = 6000;
const AMALGAM_PROJECTILE_HIT_RADIUS = 26;
const AMALGAM_MELEE_RANGE = 50;
const AMALGAM_MELEE_DMG = 6;
const MELEE_ELEMENT_IDS = new Set(['metal', 'earth', 'light', 'silence']);
const AMALGAM_MELEE_TICK_MS = 800;
/** Body radius the drawn amalgam is built at, before the husk's own `sizeMult`. */
const AMALGAM_BODY_SIZE = 19;

// The silhouette quirk a recruited variant brings with it now rides on the
// variant def itself (`variant.quirk`), so an Earth amalgam and a Water
// amalgam are told apart by shape and not only by the colour of their flesh.

/** Call of the Void (divine perk): how far the invitation carries from the shriek. */
const VOID_CALL_RADIUS = 150;
const VOID_CALL_BASE = 0.10;
const VOID_CALL_STEP = 0.05;
const VOID_CALL_MAX = 0.30;

const WHISTLE_ARRIVE_RADIUS = 30;
const WHISTLE_HEAL_FRAC = 0.75;
const CARRION_BUFF_MS = 10000;
const CARRION_SPEED_MULT = 1.5;
const CARRION_DMG_MULT = 1.5;
const CARRION_TRAIL_INTERVAL_MS = 80;

/** Soul's standing ward: while any Amalgam stands, 20% of every hit on you lands on one of them. */
const TANK_SHARE = 0.2;

const TURN_RADIUS = 240;
/** The Amalgam (campaign finale) cannot be turned; Turn tears this fraction of its current HP. */
const TURN_BOSS_FRAC = 0.5;
/** We are Legion (Q+): the turned rise with this much extra max HP and the Carrion Call buff. */
const LEGION_BONUS_HP = 25;

/** Mastery — Corpse Prince: a crowned, sword-bearing amalgam that is never lost for good. */
const PRINCE_HP = 120;
const PRINCE_SWORD_DMG = 14;
const PRINCE_LUNGE_DMG = 22;
const PRINCE_SPEED = 120;
const PRINCE_RETURN_MS = 12000;
const PRINCE_ICON_TINT = 0xffd24a;

const WARD_RADIUS = 220;
const WARD_MIN_AMALGAMS = 2;
const WARD_MULT = 0.7;

const SOUL_SHOT_SPEED = 280;
const SOUL_SHOT_RADIUS = 6;
const SOUL_SHOT_LIFETIME_MS = 2600;
const BLASTER_BOOM_RADIUS = 90;

const HUD_Y = 52;

// ── SoulKit ───────────────────────────────────────────────────────────────────

/**
 * Soul: Lantern of the Damned wisps and a charged soul beam (Click / right click) that grow
 * stronger with every zombie they kill, a 5-slot corpse queue fed by Grave zombies (and real
 * Invasion husk kills), Amalgam allies raised from that queue, Death Whistle recalls + heals
 * them, and Turn steals every hostile body nearby. While any Amalgam stands it takes 20% of every
 * hit aimed at its caster. Amalgams and grave zombies are
 * plain `Husk` instances SoulKit owns and ticks manually — never added to `arena.enemies`.
 *
 * Upgrades layer on: Soul Lord kill milestones (Click+), decay clouds (E+), graveyard tiers
 * (R+), a temporary speed+damage buff off Death Whistle (F+), and turned bodies rising with
 * +25 HP and that same buff (Q+, We are Legion). Mastery adds the Corpse Prince — a crowned
 * amalgam that starts in the queue and returns to it 12s after every death — and Grave Mistake.
 */
export class SoulKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: SoulColorFn;
  private readonly ncol: SoulColorFn;
  private readonly pfx: SoulFx;
  private readonly nfx: SoulFx;
  /** The soul character rig (spirit arms, eyes, torn cowl) for each soul fighter. */
  private playerAvatar: SoulAvatar | null = null;
  private npcAvatar: SoulAvatar | null = null;
  /** Soul Mastery: an always-on veil while mastery is enabled — the mastered tell. */
  private masteryShroud: SoulShroud | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  /** Call of the Void: the HP fraction this side's next whistle will claim at. Per-owner. */
  private voidThreshold: Record<Owner, number> = { player: VOID_CALL_BASE, npc: VOID_CALL_BASE };

  // ── Click: Lantern of the Damned + Soul Beam, Click+ Soul Lord ─────
  private bolts: LanternBolt[] = [];
  private beams: BeamFlash[] = [];
  private hemorrhages: Hemorrhage[] = [];
  /** Zombies the lantern family has killed this match, per side. */
  private kills: Record<Owner, number> = { player: 0, npc: 0 };
  private ascended: Record<Owner, boolean> = { player: false, npc: false };
  /** A beam being charged. The player aims it live; a bot's is locked to the point it chose. */
  private beamCharge: Record<Owner, { startedAt: number; tx: number; ty: number } | null> = { player: null, npc: null };
  private beamReadyAt: Record<Owner, number> = { player: 0, npc: 0 };
  private beamChargeGfx: Record<Owner, Phaser.GameObjects.Graphics | null> = { player: null, npc: null };
  private orbGfx: Record<Owner, Phaser.GameObjects.Graphics | null> = { player: null, npc: null };
  private orbAngle: Record<Owner, number> = { player: 0, npc: 0 };
  /** Per-target re-hit clock for the orbs. */
  private orbHitAt: Record<Owner, Map<Fighter, number>> = { player: new Map(), npc: new Map() };
  private playerPointerWasDown = false;
  private playerRightWasDown = false;
  private decayClouds: DecayCloud[] = [];
  private graves: Grave[] = [];
  private graveZombies: GraveZombie[] = [];
  private amalgams: Amalgam[] = [];
  private soulShots: SoulShot[] = [];

  // ── Mastery: Corpse Prince + Grave Mistake ────────────────────────────
  /** When a fallen prince is due back in its side's queue (0 = not away). */
  private princeReturnAt: Record<Owner, number> = { player: 0, npc: 0 };
  /**
   * Starting corpses are seeded on the first frame, not in reset(): ArenaScene resets the kit
   * before it reads this match's mastery toggle, and the prince depends on it.
   */
  private seeded = false;
  /** Fighters whose 'damaged' event already routes the Amalgam share (fighters are rebuilt per match). */
  private tankHooked = new WeakSet<Fighter>();
  private alphaState: 'none' | 'hostile' | 'defeated' = 'none';
  private alphaHusk: Husk | null = null;
  /** The loose alpha wears the same drawn creature as the amalgams, in angered shades. */
  private alphaBody: SoulAmalgamBody | null = null;
  private alphaNextConeAt = 0;
  private soulAntiHealUntil = 0;
  private soulScreechLastCastAt = -SOUL_SCREECH_COOLDOWN_MS;
  private corpseQueue: Record<Owner, Corpse[]> = { player: [], npc: [] };
  private hudIcons: Phaser.GameObjects.Image[] = [];
  /** `2/3` beside the corpse queue — a cap you cannot see is a cap you cannot play around. */
  private hudBodyCount: Phaser.GameObjects.Text | null = null;
  /** Lantern kills, and with Soul Lord the next milestone — left of the corpse queue. */
  private hudKills: Phaser.GameObjects.Text | null = null;
  /** The crypt-lintel plate behind the corpse queue: coffin slots, rising wisps, kill plaque. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;

  /** Shared HuskWorld for every zombie/amalgam SoulKit owns — resolves target/owner by pool lookup. */
  private huskWorld: HuskWorld = {
    fireShot: (from, tx, ty, damage) => this.doFireShot(from, tx, ty, damage),
    summon: () => {},
    healNearbyHusks: (source, radius, frac) => this.doHealNearby(source, radius, frac),
    telegraph: (x1, y1, x2, y2, color, durationMs) => this.doTelegraph(x1, y1, x2, y2, color, durationMs),
    findPossessTarget: () => null,
    possess: () => {},
  };

  constructor(private readonly arena: SoulArenaApi) {
    this.pcol = (base) => arena.soulColor('player', base);
    this.ncol = (base) => arena.soulColor('npc', base);
    this.pfx = new SoulFx(arena.scene, this.pcol);
    this.nfx = new SoulFx(arena.scene, this.ncol);
  }

  /** Colour mapper for a side. */
  private col(owner: Owner): SoulColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  private fx(owner: Owner): SoulFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Character rig for a side, if that side is soul this match. */
  private avatar(owner: Owner): SoulAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }

  // ── Lifecycle ────────────────────────────────────────────────────────

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.masteryShroud) { this.masteryShroud.destroy(); this.masteryShroud = null; }
    this.aimX = 0;
    this.aimY = 0;
    this.voidThreshold = { player: VOID_CALL_BASE, npc: VOID_CALL_BASE };

    for (const b of this.bolts) b.gfx.destroy();
    this.bolts = [];
    for (const b of this.beams) b.gfx.destroy();
    this.beams = [];
    for (const h of this.hemorrhages) h.gfx.destroy();
    this.hemorrhages = [];
    this.kills = { player: 0, npc: 0 };
    this.ascended = { player: false, npc: false };
    this.beamCharge = { player: null, npc: null };
    this.beamReadyAt = { player: 0, npc: 0 };
    for (const o of ['player', 'npc'] as Owner[]) {
      this.beamChargeGfx[o]?.destroy(); this.beamChargeGfx[o] = null;
      this.orbGfx[o]?.destroy(); this.orbGfx[o] = null;
    }
    this.orbAngle = { player: 0, npc: 0 };
    this.orbHitAt = { player: new Map(), npc: new Map() };
    this.playerPointerWasDown = false;
    this.playerRightWasDown = false;
    for (const c of this.decayClouds) c.sprite.destroy();
    this.decayClouds = [];
    for (const g of this.graves) { g.sprite.destroy(); g.aura.destroy(); }
    this.graves = [];
    for (const gz of this.graveZombies) {
      gz.auraGfx?.destroy();
      if (gz.husk.scene) gz.husk.destroy();
    }
    this.graveZombies = [];
    for (const rec of this.amalgams) {
      rec.body.destroy();
      rec.shroud?.destroy();
      if (rec.husk.scene) rec.husk.destroy();
    }
    this.amalgams = [];
    for (const s of this.soulShots) s.gfx.destroy();
    this.soulShots = [];

    // Mastery — Corpse Prince + Grave Mistake
    this.princeReturnAt = { player: 0, npc: 0 };
    if (this.alphaHusk?.scene) this.alphaHusk.destroy();
    this.alphaHusk = null;
    this.alphaBody?.destroy(); this.alphaBody = null;
    this.alphaState = 'none';
    this.alphaNextConeAt = 0;
    this.soulAntiHealUntil = 0;
    this.soulScreechLastCastAt = -SOUL_SCREECH_COOLDOWN_MS;
    this.corpseQueue = { player: [], npc: [] };
    this.seeded = false;
    for (const t of this.hudIcons) t.destroy();
    this.hudIcons = [];
    this.hudBodyCount?.destroy(); this.hudBodyCount = null;
    this.hudKills?.destroy(); this.hudKills = null;
    this.hudGfx?.destroy(); this.hudGfx = null;
    // Ward owns its own multiplier now, so the reset is unconditional rather than the old
    // "clear it only if the value still looks like mine" guess against a shared field.
    this.arena.player.wardIncomingMult = 1;
    this.arena.npc.wardIncomingMult = 1;
    this.arena.player.soulTankIncomingMult = 1;
    this.arena.npc.soulTankIncomingMult = 1;
  }

  // ── Public accessors ───────────────────────────────────────────────────

  corpseCount(owner: Owner): number { return this.corpseQueue[owner].length; }

  amalgamCount(owner: Owner): number {
    return this.amalgams.filter((r) => r.owner === owner && r.husk.active && r.husk.hp > 0).length;
  }

  graveCount(owner: Owner): number { return this.graves.filter((g) => g.owner === owner).length; }

  /**
   * Live bodies on one side: grave zombies and Amalgams together, measured against
   * `SOUL_HUSK_CAP`. Everything that raises something checks this first.
   */
  huskCount(owner: Owner): number {
    let n = 0;
    for (const gz of this.graveZombies) if (gz.owner === owner && gz.husk.active && gz.husk.hp > 0) n++;
    for (const a of this.amalgams) if (a.owner === owner && a.husk.active && a.husk.hp > 0) n++;
    return n;
  }

  /** Invasion: a real husk died — feed it into the player's corpse queue. */
  onRealHuskKilled(husk: Husk): void {
    this.pushCorpse('player', { maxHp: husk.maxHp, variant: husk.variant.id !== 'basic' ? husk.variant : undefined });
  }

  // ── Input ────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, rKey, fKey, qKey } = this.arena;
    // `update` has no pointer, so the aim the rig faces is cached here.
    this.aimX = mouseX;
    this.aimY = mouseY;
    const leftDown = pointer.leftButtonDown();
    const rightDown = pointer.rightButtonDown();
    const leftJustDown = leftDown && !this.playerPointerWasDown;
    const rightJustDown = rightDown && !this.playerRightWasDown;
    const rightReleased = !rightDown && this.playerRightWasDown;
    this.playerPointerWasDown = leftDown;
    this.playerRightWasDown = rightDown;
    if (!player.active || player.hp <= 0) { this.beamCharge.player = null; return; }
    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);

    // ── Mastery — Grave Mistake takes over its bound slot ────────────────
    const graveSlot = this.arena.masteryActive ? this.graveMistakeSlot() : null;
    if (graveSlot) {
      const gk = graveSlot === 'e' ? eKey : graveSlot === 'r' ? rKey : graveSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(gk)) this.tryCastGraveMistake(time, mouseX, mouseY);
    }

    // Click: Lantern of the Damned — one wisp per press.
    if (leftJustDown) player.castAbility('soul-lantern', ctx());
    // Right click: hold to charge the soul beam, release to fire it along the cursor.
    if (rightJustDown && !this.beamCharge.player && time >= this.beamReadyAt.player) {
      this.beamCharge.player = { startedAt: time, tx: mouseX, ty: mouseY };
    }
    if (rightReleased && this.beamCharge.player) {
      const charge = this.beamChargeFrac('player', time);
      this.beamCharge.player = null;
      if (charge >= BEAM_MIN_CHARGE) {
        this.fireBeam('player', mouseX, mouseY, charge);
        this.arena.broadcastMasteryCast(`soul-beam:${Math.round(charge * 100)}`);
      }
    }

    if (graveSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('soul-arise', ctx());
    if (graveSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) player.castAbility('soul-grave', ctx());
    if (graveSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) player.castAbility('soul-death-whistle', ctx());
    if (graveSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('soul-turn', ctx());
  }

  // ── Per-frame update ────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (!this.seeded) { this.seeded = true; this.seedStartingCorpses(); }
    this.updateAvatars(time, delta);
    this.updateLanterns(time, delta);
    this.updateBeams(time, delta);
    this.updateHemorrhages(time, delta);
    this.updateSoulOrbs(time, delta);
    this.updateDecayClouds(time, delta);
    this.updateGraves(time, delta);
    this.updateGraveZombies(time, delta);
    this.updateAmalgams(time, delta);
    this.updateSoulShots(time, delta);
    this.updatePrinceReturn(time);
    this.updateSoulTank();
    this.updateAlpha(time, delta);
    this.updateAlphaAllies(time);
    this.updateWardPerk();
    this.updateHud();
  }

  // ── Character rig ────────────────────────────────────────────────────

  /**
   * Builds (on first frame) and drives the spirit-arm avatar for whichever fighters are soul.
   * The player faces the cursor; the NPC faces whoever it is fighting. The mastery passive's
   * wisp veil lives here too, at a lower depth than anything a cast raises, so the two stack
   * into one silhouette rather than fighting each other.
   */
  private updateAvatars(time: number, delta: number): void {
    const { player, npc, scene, elementId, npcElementId } = this.arena;

    if (elementId === 'soul' && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new SoulAvatar(scene, this.pcol, SPIRIT_TONES);
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      const aim = Math.atan2(aimY - player.y, aimX - player.x);
      this.playerAvatar.setFacing(aim);
      // A beam being charged is a sustained pose, not a string of jabs.
      this.playerAvatar.setHold(this.beamCharge.player ? 'charge' : null, aim);
      this.playerAvatar.setAscended(this.ascended.player);
      // A caster surrounded by their own dead is the character at full stretch.
      const host = this.amalgamCount('player');
      this.playerAvatar.setIntensity(host >= 3 ? 1.4 : host >= 1 ? 1.15 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);

      if (this.arena.masteryActive) {
        if (!this.masteryShroud) this.masteryShroud = new SoulShroud(scene, this.pcol, this.tonesOf('player'), 42, 0.7, 2, 7);
        // The veil thickens with the crowd, which is exactly what the passive scales on.
        this.masteryShroud.setTones(this.tonesOf('player'));
        this.masteryShroud.setIntensity(0.6 + Math.min(1, host / 5) * 0.7);
        this.masteryShroud.update(delta, player.x, player.y, player.alpha);
      } else if (this.masteryShroud) {
        this.masteryShroud.destroy();
        this.masteryShroud = null;
      }
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
      if (this.masteryShroud) { this.masteryShroud.destroy(); this.masteryShroud = null; }
    }

    if (npcElementId === 'soul' && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new SoulAvatar(scene, this.ncol, NPC_TONES);
      const aim = Math.atan2(player.y - npc.y, player.x - npc.x);
      this.npcAvatar.setFacing(aim);
      this.npcAvatar.setHold(this.beamCharge.npc ? 'charge' : null, aim);
      this.npcAvatar.setAscended(this.ascended.npc);
      this.npcAvatar.setIntensity(this.amalgamCount('npc') >= 2 ? 1.3 : 1);
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Cast entry points (from CastContext) ────────────────────────────

  // ── Click: Lantern of the Damned ─────────────────────────────────────
  //
  // Left click throws a flaming wisp that chases the cursor until it reaches it — it may bend
  // toward a moving cursor, but never turn back on itself, so it cannot circle the mouse — and
  // then flies on in a straight line. Right click is held to charge a piercing soul beam. Both
  // scale with the zombies the lantern family has killed this match, and Click+ (Soul Lord)
  // unlocks a new power at 5, 10, 15 and 25 of those kills.

  /** Everything a lantern, beam, aura or orb of this side can hurt — foes, and the dead. */
  private lanternTargets(owner: Owner): Fighter[] {
    const out = this.foesOf(owner);
    for (const gz of this.graveZombies) {
      if (gz.husk.active && gz.husk.hp > 0 && !out.includes(gz.husk)) out.push(gz.husk);
    }
    for (const a of this.amalgams) {
      if (a.owner !== owner && a.husk.active && a.husk.hp > 0) out.push(a.husk);
    }
    return out;
  }

  /** Damage multiplier from this match's kills: +5% each, up to ×3. */
  private killMult(owner: Owner): number {
    return 1 + Math.min(LANTERN_KILL_BONUS_CAP, this.kills[owner] * LANTERN_KILL_BONUS);
  }

  /** Soul Lord (Click+) is owned by this side. */
  private lordActive(owner: Owner): boolean {
    return owner === 'player' ? this.arena.hasUpgrade('click') : this.arena.hasNpcUpgrade('click');
  }

  /** A Soul Lord tier is unlocked: the upgrade is owned and enough zombies have died to it. */
  private lordTier(owner: Owner, kills: number): boolean {
    return this.lordActive(owner) && this.kills[owner] >= kills;
  }

  /** The owner's soul colours — gold once Soul Lord has ascended them. */
  private tonesOf(owner: Owner): SoulTones {
    return this.ascended[owner] ? GOLD_TONES : tonesFor(owner);
  }

  /** Kills on the lantern family this match. */
  killCount(owner: Owner): number { return this.kills[owner]; }

  /**
   * One hit from any lantern-family source. Damage goes through the target's own `takeDamage`
   * (and its own damage number); a zombie that dies to it is a kill for the owner.
   */
  private soulStrike(owner: Owner, target: Fighter, dmg: number): void {
    if (!target.active || target.hp <= 0 || dmg <= 0) return;
    target.takeDamage(dmg);
    this.arena.spawnHitFlash(target.x, target.y, this.tonesOf(owner).glow);
    if (target.hp <= 0 && target instanceof Husk) this.creditKill(owner, target.x, target.y);
  }

  private creditKill(owner: Owner, x: number, y: number): void {
    this.kills[owner]++;
    const k = this.kills[owner];
    const caster = this.fighterOf(owner);
    const tones = this.tonesOf(owner);
    // The freed soul streaks back into the lantern.
    this.fx(owner).tether(x, y, caster.x, caster.y, 360, 7, tones);
    this.arena.showFloatingText(x, y - 26, `☠ ${k}`, owner === 'player' ? '#ddbbff' : '#aa88cc');
    if (!this.lordActive(owner)) return;
    const unlock: Record<number, string> = {
      [LORD_SPLIT_KILLS]: '🏮 SOUL LORD — lanterns split',
      [LORD_HEMO_KILLS]: '🩸 SOUL LORD — beam hemorrhages',
      [LORD_ORB_KILLS]: '🔮 SOUL LORD — soul orbs',
    };
    if (unlock[k]) {
      this.arena.showFloatingText(caster.x, caster.y - 52, unlock[k], '#eeddff');
      this.fx(owner).ring(caster.x, caster.y, 14, 70, tones.glow, 520, 4, 7);
    }
    if (k === LORD_ASCEND_KILLS) this.ascend(owner);
  }

  /** 25 kills with Soul Lord: everything turns gold and the caster becomes an angelic figure. */
  private ascend(owner: Owner): void {
    if (this.ascended[owner]) return;
    this.ascended[owner] = true;
    const caster = this.fighterOf(owner);
    const fx = this.fx(owner);
    this.avatar(owner)?.setAscended(true);
    this.avatar(owner)?.play('raise', undefined, 700);
    fx.bloom(caster.x, caster.y, 60, 14, 6, GOLD_TONES);
    fx.ring(caster.x, caster.y, 12, 140, SOUL.sun, 700, 6, 7);
    fx.soulRise(caster.x, caster.y, 110, 900, 7, GOLD_TONES);
    fx.flash(caster.x, caster.y, 46, 8, GOLD_TONES);
    if (owner === 'player') this.arena.scene.cameras.main.shake(220, 0.006);
    this.arena.showFloatingText(caster.x, caster.y - 60, '✨ SOUL LORD ASCENDED ✨', '#ffe07a');
  }

  doLantern(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const x = caster.x + Math.cos(ang) * 18;
    const y = caster.y + Math.sin(ang) * 18;
    const now = scene.time.now;
    this.bolts.push({
      owner, gfx: scene.add.graphics().setDepth(7), x, y, angle: ang, speed: LANTERN_SPEED,
      seeking: true, seekX: tx, seekY: ty,
      // The local player's wisp follows the live cursor; a bot's or a peer's goes to the point.
      live: owner === 'player', frac: 1, small: false, ignore: null,
      bornAt: now, expiresAt: now + LANTERN_LIFETIME_MS, t: Math.random() * 6,
    });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).muzzleWisp(x, y, ang, 1, 7, this.tonesOf(owner));
  }

  private spawnShards(b: LanternBolt, hit: Fighter | null): void {
    const scene = this.arena.scene;
    const now = scene.time.now;
    // Random rotation, equal spacing.
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < SPLIT_COUNT; i++) {
      this.bolts.push({
        owner: b.owner, gfx: scene.add.graphics().setDepth(7), x: b.x, y: b.y,
        angle: base + (i / SPLIT_COUNT) * Math.PI * 2, speed: SPLIT_SPEED,
        seeking: false, seekX: 0, seekY: 0, live: false, frac: SPLIT_DMG_FRAC, small: true, ignore: hit,
        bornAt: now, expiresAt: now + SPLIT_LIFETIME_MS, t: Math.random() * 6,
      });
    }
  }

  private removeBolt(i: number, burst: boolean): void {
    const b = this.bolts[i];
    if (burst) {
      this.fx(b.owner).wisps(b.x, b.y, b.small ? 2 : 5, {
        speed: 70, size: b.small ? 1.8 : 2.6, life: 380, rise: -22, depth: 7, tones: this.tonesOf(b.owner),
      });
    }
    b.gfx.destroy();
    this.bolts.splice(i, 1);
  }

  private updateLanterns(time: number, delta: number): void {
    if (this.bolts.length === 0) return;
    const dt = delta / 1000;
    const W = this.arena.width, H = this.arena.height;
    const targets: Record<Owner, Fighter[] | null> = { player: null, npc: null };
    const targetsOf = (o: Owner): Fighter[] => (targets[o] ??= this.lanternTargets(o));

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      if (time >= b.expiresAt) { this.removeBolt(i, true); continue; }
      b.t += dt;

      if (b.seeking) {
        if (b.live) { b.seekX = this.aimX; b.seekY = this.aimY; }
        const want = Math.atan2(b.seekY - b.y, b.seekX - b.x);
        const off = Math.abs(Phaser.Math.Angle.Wrap(want - b.angle));
        // Arrived, or the cursor is now behind it: from here on it only flies straight.
        if (Phaser.Math.Distance.Between(b.x, b.y, b.seekX, b.seekY) <= LANTERN_ARRIVE_RADIUS
          || off > LANTERN_GIVE_UP_ANGLE || time - b.bornAt > LANTERN_SEEK_MAX_MS) {
          b.seeking = false;
        } else {
          b.angle = Phaser.Math.Angle.RotateTo(b.angle, want, LANTERN_TURN_RATE * dt);
        }
      } else if (this.lordTier(b.owner, LORD_ASCEND_KILLS)) {
        // Ascended: once free of the cursor, every wisp hunts the nearest thing it can hurt.
        let best: Fighter | null = null;
        let bestD = HOMING_RANGE;
        for (const t of targetsOf(b.owner)) {
          if (t === b.ignore) continue;
          const d = Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y);
          if (d < bestD) { bestD = d; best = t; }
        }
        if (best) b.angle = Phaser.Math.Angle.RotateTo(b.angle, Math.atan2(best.y - b.y, best.x - b.x), HOMING_TURN_RATE * dt);
      }

      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { this.removeBolt(i, false); continue; }

      b.gfx.clear();
      SoulFx.drawLantern(b.gfx, this.col(b.owner), this.tonesOf(b.owner), b.x, b.y, b.angle,
        b.small ? LANTERN_RADIUS * 0.55 : LANTERN_RADIUS, b.t, b.small);

      const reach = b.small ? LANTERN_HIT_RADIUS * 0.7 : LANTERN_HIT_RADIUS;
      for (const t of targetsOf(b.owner)) {
        if (t === b.ignore || !t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > reach) continue;
        this.soulStrike(b.owner, t, Math.max(1, Math.round(LANTERN_DAMAGE * b.frac * this.killMult(b.owner))));
        this.fx(b.owner).flash(b.x, b.y, b.small ? 10 : 18, 7, this.tonesOf(b.owner));
        // Soul Lord 5: a full wisp bursts into smaller ones on impact.
        if (!b.small && this.lordTier(b.owner, LORD_SPLIT_KILLS)) this.spawnShards(b, t);
        this.removeBolt(i, true);
        break;
      }
    }
  }

  /** How full a side's beam charge is, 0 → 1. */
  private beamChargeFrac(owner: Owner, time: number): number {
    const c = this.beamCharge[owner];
    if (!c) return 0;
    const full = this.lordTier(owner, LORD_ASCEND_KILLS) ? BEAM_CHARGE_ASCENDED_MS : BEAM_CHARGE_MS;
    return Phaser.Math.Clamp((time - c.startedAt) / full, 0, 1);
  }

  /**
   * Bot entry (`ctx.soulBeam`): start charging at a fixed point. The kit fires it itself when the
   * charge is full, so the wind-up is as visible — and as dodgeable — as the player's.
   */
  doBeamCharge(tx: number, ty: number, owner: Owner): void {
    const now = this.arena.scene.time.now;
    if (this.beamCharge[owner] || now < this.beamReadyAt[owner]) return;
    this.beamCharge[owner] = { startedAt: now, tx, ty };
  }

  /** Online: the peer released a beam. The charge rides in the relay id (`soul-beam:<0-100>`). */
  replayBeam(relayId: string, tx: number, ty: number): void {
    const pct = Number(relayId.split(':')[1] ?? 100);
    this.beamCharge.npc = null;
    this.fireBeam('npc', tx, ty, Phaser.Math.Clamp((Number.isFinite(pct) ? pct : 100) / 100, 0, 1));
  }

  private fireBeam(owner: Owner, tx: number, ty: number, charge: number): void {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const x1 = caster.x + Math.cos(ang) * 16, y1 = caster.y + Math.sin(ang) * 16;
    const x2 = caster.x + Math.cos(ang) * BEAM_LENGTH, y2 = caster.y + Math.sin(ang) * BEAM_LENGTH;
    const width = BEAM_MIN_WIDTH + (BEAM_MAX_WIDTH - BEAM_MIN_WIDTH) * charge;
    const dmg = Math.round((BEAM_MIN_DMG + (BEAM_MAX_DMG - BEAM_MIN_DMG) * charge) * this.killMult(owner));
    const hemo = this.lordTier(owner, LORD_HEMO_KILLS);

    // Pierces: everything along the line takes the full hit.
    for (const t of this.lanternTargets(owner)) {
      if (distToSegment(t.x, t.y, x1, y1, x2, y2) > width / 2 + 16) continue;
      this.soulStrike(owner, t, dmg);
      if (hemo && t.active && t.hp > 0) this.applyHemorrhage(owner, t);
    }

    this.beams.push({
      owner, gfx: scene.add.graphics().setDepth(7), x1, y1, x2, y2, width,
      bornAt: scene.time.now, t: Math.random() * 6,
    });
    this.beamReadyAt[owner] = scene.time.now + BEAM_COOLDOWN_MS;
    const tones = this.tonesOf(owner);
    this.avatar(owner)?.play('punch', ang, 260);
    this.fx(owner).flash(x1, y1, 16 + charge * 12, 8, tones);
    this.fx(owner).muzzleWisp(x1, y1, ang, 1 + charge * 0.6, 7, tones);
    if (owner === 'player' && charge > 0.8) scene.cameras.main.shake(110, 0.004);
  }

  private updateBeams(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      const life = 1 - (time - b.bornAt) / BEAM_FADE_MS;
      if (life <= 0) { b.gfx.destroy(); this.beams.splice(i, 1); continue; }
      b.t += dt;
      b.gfx.clear();
      SoulFx.drawBeam(b.gfx, this.col(b.owner), this.tonesOf(b.owner), b.x1, b.y1, b.x2, b.y2, b.width, life, b.t);
    }

    // The charge in hand: drawn for whoever is holding one; a bot's fires itself when full.
    for (const owner of ['player', 'npc'] as Owner[]) {
      const c = this.beamCharge[owner];
      const caster = this.fighterOf(owner);
      if (c && (!caster.active || caster.hp <= 0)) this.beamCharge[owner] = null;
      if (!this.beamCharge[owner]) {
        if (this.beamChargeGfx[owner]) { this.beamChargeGfx[owner]!.destroy(); this.beamChargeGfx[owner] = null; }
        continue;
      }
      const frac = this.beamChargeFrac(owner, time);
      const ax = owner === 'player' ? this.aimX : c!.tx;
      const ay = owner === 'player' ? this.aimY : c!.ty;
      const ang = Math.atan2(ay - caster.y, ax - caster.x);
      const g = this.beamChargeGfx[owner] ??= this.arena.scene.add.graphics().setDepth(7);
      g.clear();
      SoulFx.drawBeamCharge(g, this.col(owner), this.tonesOf(owner),
        caster.x + Math.cos(ang) * 20, caster.y + Math.sin(ang) * 20, ang, BEAM_LENGTH - 20, frac, time / 1000);
      if (owner === 'npc' && frac >= 1) {
        this.beamCharge.npc = null;
        this.fireBeam('npc', c!.tx, c!.ty, 1);
      }
    }
  }

  /** Soul Lord 10: the beam leaves a bleeding soul aura on what it hit. */
  private applyHemorrhage(owner: Owner, target: Fighter): void {
    const now = this.arena.scene.time.now;
    const existing = this.hemorrhages.find((h) => h.owner === owner && h.target === target);
    if (existing) { existing.until = now + HEMO_MS; return; }
    this.hemorrhages.push({
      owner, target, gfx: this.arena.scene.add.graphics().setDepth(4),
      until: now + HEMO_MS, tickAccum: 0, t: Math.random() * 6,
    });
    this.arena.showFloatingText(target.x, target.y - 40, '🩸 HEMORRHAGE', '#ff7799');
  }

  private updateHemorrhages(time: number, delta: number): void {
    for (let i = this.hemorrhages.length - 1; i >= 0; i--) {
      const h = this.hemorrhages[i];
      const t = h.target;
      if (time >= h.until || !t.active || t.hp <= 0) { h.gfx.destroy(); this.hemorrhages.splice(i, 1); continue; }
      h.t += delta / 1000;
      h.gfx.clear();
      SoulFx.drawHemorrhage(h.gfx, this.col(h.owner), this.tonesOf(h.owner), t.x, t.y, HEMO_RADIUS, h.t, (h.until - time) / HEMO_MS);
      h.tickAccum += delta;
      while (h.tickAccum >= HEMO_TICK_MS) {
        h.tickAccum -= HEMO_TICK_MS;
        const mult = this.killMult(h.owner);
        // Everything else inside the aura is hurt by it; the bearer bleeds a little too.
        for (const other of this.lanternTargets(h.owner)) {
          if (other === t || Phaser.Math.Distance.Between(t.x, t.y, other.x, other.y) > HEMO_RADIUS) continue;
          this.soulStrike(h.owner, other, Math.round(HEMO_SPLASH * mult));
        }
        this.soulStrike(h.owner, t, HEMO_BLEED);
        if (!t.active || t.hp <= 0) break;
      }
    }
  }

  /** Soul Lord 15: three orbs circling the caster, spinning faster with every kill. */
  private updateSoulOrbs(time: number, delta: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const caster = this.fighterOf(owner);
      const isSoul = owner === 'player' ? this.arena.elementId === 'soul' : this.arena.npcElementId === 'soul';
      const on = isSoul && caster.active && caster.hp > 0 && this.lordTier(owner, LORD_ORB_KILLS);
      if (!on) {
        if (this.orbGfx[owner]) { this.orbGfx[owner]!.destroy(); this.orbGfx[owner] = null; }
        continue;
      }
      const spin = Math.min(ORB_SPIN_MAX, ORB_SPIN_BASE + (this.kills[owner] - LORD_ORB_KILLS) * ORB_SPIN_PER_KILL);
      this.orbAngle[owner] += spin * delta / 1000;
      const g = this.orbGfx[owner] ??= this.arena.scene.add.graphics().setDepth(7);
      g.clear();
      const tones = this.tonesOf(owner);
      const targets = this.lanternTargets(owner);
      const hitAt = this.orbHitAt[owner];
      const dmg = Math.round(ORB_DAMAGE * this.killMult(owner));
      for (let i = 0; i < ORB_COUNT; i++) {
        const a = this.orbAngle[owner] + (i / ORB_COUNT) * Math.PI * 2;
        const ox = caster.x + Math.cos(a) * ORB_RADIUS;
        const oy = caster.y + Math.sin(a) * ORB_RADIUS;
        SoulFx.drawSoulOrb(g, this.col(owner), tones, ox, oy, a + Math.PI / 2, ORB_SIZE, time / 1000 + i);
        for (const t of targets) {
          if (Phaser.Math.Distance.Between(ox, oy, t.x, t.y) > ORB_SIZE + 16) continue;
          if (time < (hitAt.get(t) ?? 0)) continue;
          hitAt.set(t, time + ORB_HIT_CD_MS);
          this.soulStrike(owner, t, dmg);
        }
      }
    }
  }

  /**
   * Bot synergy — the npc's own grave zombies are both its kill count and its corpse queue, so
   * the bot lanterns the nearest one in range. Returns where it stands, or null. Side-effect free.
   */
  npcLanternTarget(): { x: number; y: number } | null {
    const { npc } = this.arena;
    let best: Husk | null = null;
    let bestD = NPC_LANTERN_RANGE;
    for (const gz of this.graveZombies) {
      if (gz.owner !== 'npc' || !gz.husk.active || gz.husk.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(npc.x, npc.y, gz.husk.x, gz.husk.y);
      if (d <= bestD) { bestD = d; best = gz.husk; }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  /**
   * Bot synergy — a beam is worth charging when it is ready and at least two things it can hurt
   * stand on one line from the npc, or when Soul Lord 10 would hemorrhage the opponent standing
   * next to its own risen. Returns the aim point, or null. Side-effect free.
   */
  /**
   * Bot synergy for Turn: what a cast from the npc's spot would take right now. Its own grave
   * zombies count 1 (they become Amalgams), the player's grave zombies 1, the player's Amalgams 2
   * (a body taken off them and put on us). Princes are never counted. Side-effect free.
   */
  npcTurnValue(): number {
    if (this.arena.npcElementId !== 'soul') return 0;
    const npc = this.arena.npc;
    if (!npc.active || npc.hp <= 0) return 0;
    const near = (h: Husk): boolean => h.active && h.hp > 0
      && Phaser.Math.Distance.Between(npc.x, npc.y, h.x, h.y) <= TURN_RADIUS;
    let v = 0;
    for (const gz of this.graveZombies) if (near(gz.husk)) v += 1;
    for (const rec of this.amalgams) if (rec.owner === 'player' && !rec.prince && near(rec.husk)) v += rec.isAlpha ? 3 : 2;
    return v;
  }

  npcBeamAim(): { x: number; y: number } | null {
    const { npc } = this.arena;
    const now = this.arena.scene.time.now;
    if (this.beamCharge.npc || now < this.beamReadyAt.npc || !npc.active) return null;
    const targets = this.lanternTargets('npc').filter((t) => Phaser.Math.Distance.Between(npc.x, npc.y, t.x, t.y) <= BEAM_LENGTH - 30);
    let best: Fighter | null = null;
    let bestCount = 0;
    for (const aim of targets) {
      const ang = Math.atan2(aim.y - npc.y, aim.x - npc.x);
      const x2 = npc.x + Math.cos(ang) * BEAM_LENGTH, y2 = npc.y + Math.sin(ang) * BEAM_LENGTH;
      let n = 0;
      for (const t of targets) if (distToSegment(t.x, t.y, npc.x, npc.y, x2, y2) <= BEAM_MAX_WIDTH / 2 + 16) n++;
      if (n > bestCount) { bestCount = n; best = aim; }
    }
    if (!best) return null;
    const hemoSetup = this.lordTier('npc', LORD_HEMO_KILLS) && !(best instanceof Husk)
      && targets.some((t) => t !== best && Phaser.Math.Distance.Between(best!.x, best!.y, t.x, t.y) <= HEMO_RADIUS);
    return bestCount >= 2 || hemoSetup ? { x: best.x, y: best.y } : null;
  }

  doArise(owner: Owner): void {
    const caster = this.fighterOf(owner);
    const fx = this.fx(owner);
    const tones = this.tonesOf(owner);
    const queue = this.corpseQueue[owner];
    if (queue.length === 0) {
      // The gesture still fires on an empty queue — reaching into a grave and finding nothing.
      this.avatar(owner)?.play('raise', undefined, 420);
      return;
    }
    // The field is full. The corpse is not spent, so this costs nothing but the cooldown.
    if (this.huskCount(owner) >= SOUL_HUSK_CAP) {
      this.avatar(owner)?.play('raise', undefined, 420);
      if (owner === 'player') {
        this.arena.showFloatingText(caster.x, caster.y - 44, `🪦 ${SOUL_HUSK_CAP} BODIES ALREADY`, '#775588');
      }
      return;
    }
    const corpse = queue.shift()!;
    this.avatar(owner)?.play('raise', undefined, 700);
    fx.soulRise(caster.x, caster.y + 6, corpse.prince ? 64 : 46, 620, 5, corpse.prince ? GOLD_TONES : tones);
    this.spawnAmalgam(owner, corpse);
  }

  doGrave(tx: number, ty: number, owner: Owner): void {
    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);
    const x = Phaser.Math.Clamp(tx, 20, this.arena.width - 20);
    const y = Phaser.Math.Clamp(ty, 20, this.arena.height - 20);
    const fx = this.fx(owner);
    const tones = this.tonesOf(owner);
    // A headstone is driven into the ground, so the arms slam it home.
    this.avatar(owner)?.play('slam', Math.atan2(y - caster.y, x - caster.x));

    // Restless Ground (R+): a stone driven in beside an existing plot doesn't make a second
    // plot — it makes the first one bigger. Two more presses turn a grave into a tier 3
    // graveyard, and the tier is exactly the variant tier everything it raises comes up at.
    if (owner === 'player' && this.arena.hasUpgrade('r')) {
      const near = this.graves.find((g) => g.owner === owner && g.tier < GRAVE_MAX_TIER
        && Phaser.Math.Distance.Between(x, y, g.x, g.y) <= GRAVEYARD_RADIUS);
      if (near) {
        near.tier = (near.tier + 1) as 1 | 2 | 3;
        this.applyGraveTint(near);
        const gt = near.tier === 3 ? ANGERED_TONES : tones;
        fx.bloom(near.x, near.y, 30 + near.tier * 6, 10, 4, gt);
        fx.wisps(near.x, near.y, 8, { speed: 90, size: 3, life: 620, rise: -44, depth: 6, tones: gt });
        fx.ring(near.x, near.y, 8, 46 + near.tier * 12, gt.glow, 460, 4, 5);
        fx.motes(near.x, near.y, 5, 28, 5, gt);
        this.arena.showFloatingText(near.x, near.y - 30,
          `🪦 GRAVEYARD — TIER ${near.tier}`, near.tier === 3 ? '#ff3333' : '#ccaaff');
        return;
      }
    }

    const sprite = scene.add.image(x, y, 'soul-grave').setDepth(3);
    this.graves.push({
      sprite, aura: scene.add.graphics().setDepth(2), auraT: Math.random() * 10,
      x, y, owner, nextSpawnAt: scene.time.now + GRAVE_SPAWN_INTERVAL_MS, tier: 1,
    });
    fx.stain(x, y + 20, 26, 1, tones);
    fx.bloom(x, y + 6, 26, 8, 4, tones);
    fx.ring(x, y + 14, 6, 44, tones.glow, 420, 3.5, 4);
    fx.motes(x, y, 4, 22, 5, tones);
    this.arena.showFloatingText(x, y - 26, '🪦 GRAVE PLACED', '#ccaaff');
  }

  /** A graveyard's stone reddens as it is built up, so its tier reads off the field. */
  private applyGraveTint(g: Grave): void {
    if (g.tier >= 3) g.sprite.setTint(0xff4444);
    else if (g.tier === 2) g.sprite.setTint(0xffaa55);
    else g.sprite.clearTint();
  }

  doDeathWhistle(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    const fx = this.fx(owner);
    const tones = this.tonesOf(owner);
    // Hands cupped to the mouth, then flung apart with the sound.
    this.avatar(owner)?.play('clap', Math.atan2(ty - caster.y, tx - caster.x));
    fx.shriek(tx, ty, 96, 640, 8, tones);
    fx.motes(tx, ty, 6, 60, 6, tones);

    let count = 0;
    for (const rec of this.amalgams) {
      if (rec.owner === owner && rec.husk.active && rec.husk.hp > 0) {
        rec.waypoint = { x: tx, y: ty };
        // The thread each amalgam is being hauled along, so the recall reads at a glance.
        fx.tether(rec.husk.x, rec.husk.y, tx, ty, 460, 5, tones);
        count++;
      }
    }
    if (count > 0) {
      this.arena.showFloatingText(caster.x, caster.y - 40, `📯 ${count} RECALLED`, '#ccaaff');
    }

    if (this.arena.hasPerk(owner, 'call-of-the-void')) this.answerTheCall(tx, ty, owner);
  }

  /**
   * Call of the Void (divine perk): the whistle stops being a recall order and becomes an
   * invitation. Anything already dying within earshot simply accepts. A whistle that claims
   * something is answered louder next time; the first one that claims nothing sends the
   * threshold all the way back down, so this cannot be idled up to its cap.
   */
  private answerTheCall(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    const fx = this.fx(owner);
    const tones = this.tonesOf(owner);
    const threshold = this.voidThreshold[owner];
    let claimed = 0;

    for (const foe of this.foesOf(owner)) {
      if (Phaser.Math.Distance.Between(tx, ty, foe.x, foe.y) > VOID_CALL_RADIUS) continue;
      if (foe.hp > foe.maxHp * threshold) continue;
      const fx0 = foe.x, fy0 = foe.y;
      // Pierce: an execute is the void taking what is already owed. No shield answers it.
      foe.takeDamage(foe.hp, { pierce: true });
      claimed++;
      // The soul going out of it — a stain, a collapsing throat, and the thing itself rising.
      fx.stain(fx0, fy0, 30, 1, tones);
      fx.ring(fx0, fy0, 54, 4, SOUL.crypt, 420, 5, 6);
      fx.soulRise(fx0, fy0, 70, 700, 7, tones);
      fx.wisps(fx0, fy0, 8, { speed: 90, size: 3, life: 620, rise: -70, depth: 7, tones });
      this.arena.showFloatingText(fx0, fy0 - 44, '🕳️ CALLED', '#9955ee');
    }

    if (claimed > 0) {
      const next = Math.min(VOID_CALL_MAX, threshold + VOID_CALL_STEP);
      this.voidThreshold[owner] = next;
      fx.shriek(tx, ty, 150, 780, 8, tones);
      this.arena.showFloatingText(caster.x, caster.y - 56,
        `🕳️ THE VOID ANSWERS — ${Math.round(next * 100)}%`, '#cc99ff');
    } else if (threshold > VOID_CALL_BASE) {
      this.voidThreshold[owner] = VOID_CALL_BASE;
      this.arena.showFloatingText(caster.x, caster.y - 56,
        `🕳️ UNANSWERED — ${Math.round(VOID_CALL_BASE * 100)}%`, '#775588');
    }
  }

  /**
   * Turn (Q): every hostile body within reach changes sides on the spot. The enemy's Amalgams
   * and grave zombies, your own grave zombies and a loose Grave Mistake Alpha all rise again as
   * this side's Amalgams, keeping their HP, tier and variant. A Corpse Prince is never turned.
   * The Amalgam boss is the one thing too big to take: it loses half its current health instead.
   *
   * Turned bodies are deliberately exempt from `SOUL_HUSK_CAP` — the ultimate's payout is taking
   * the other side's crew, and refusing it at the ceiling would make the button dead exactly
   * when the enemy is strongest. Arise still refuses until the count drops back under it.
   */
  doTurn(owner: Owner): void {
    const caster = this.fighterOf(owner);
    const fx = this.fx(owner);
    const tones = this.tonesOf(owner);
    const cx = caster.x, cy = caster.y;
    const inReach = (x: number, y: number): boolean => Phaser.Math.Distance.Between(cx, cy, x, y) <= TURN_RADIUS;
    // Both hands out, palms up — the command that calls them over.
    this.avatar(owner)?.play('raise', undefined, 700);
    fx.shriek(cx, cy, TURN_RADIUS, 760, 8, tones);
    fx.ring(cx, cy, TURN_RADIUS, 16, tones.glow, 620, 4, 6);
    fx.motes(cx, cy, 8, TURN_RADIUS * 0.7, 6, tones);

    const legion = owner === 'player' ? this.arena.hasUpgrade('q') : this.arena.hasNpcUpgrade('q');
    let turned = 0;
    const turnOne = (fromX: number, fromY: number, corpse: Corpse, hp: number): void => {
      // A thread from the caster to the body, then it comes up again in the caster's colours.
      fx.tether(cx, cy, fromX, fromY, 420, 5, tones);
      fx.soulRise(fromX, fromY + 6, 44, 560, 5, tones);
      fx.wisps(fromX, fromY, 6, { speed: 80, size: 2.8, life: 560, rise: -36, depth: 7, tones });
      const bonus = legion ? LEGION_BONUS_HP : 0;
      const rec = this.spawnAmalgam(owner, { ...corpse, maxHp: corpse.maxHp + bonus }, { x: fromX, y: fromY, hp: hp + bonus, quiet: true });
      if (legion) this.applyCarrion(rec, this.arena.scene.time.now, false);
      turned++;
    };

    // In Invasion the other side is a co-op ally, so only this side's own bodies are fair game.
    const coop = this.arena.isInvasion;
    // Grave zombies: the enemy's, and this side's own (they hunt their raiser until turned).
    for (const gz of [...this.graveZombies]) {
      const h = gz.husk;
      if ((coop && gz.owner !== owner) || !h.active || h.hp <= 0 || !inReach(h.x, h.y)) continue;
      const corpse: Corpse = { maxHp: h.maxHp, variant: gz.variant.id !== 'basic' ? gz.variant : undefined, angered: gz.angered || undefined };
      const x = h.x, y = h.y, hp = h.hp;
      this.removeGraveZombieQuietly(gz);
      turnOne(x, y, corpse, hp);
    }
    // The enemy's Amalgams.
    for (const rec of [...this.amalgams]) {
      const h = rec.husk;
      if (coop || rec.owner === owner || rec.prince || !h.active || h.hp <= 0 || !inReach(h.x, h.y)) continue;
      const corpse: Corpse = { maxHp: h.maxHp, variant: rec.variant.id !== 'basic' ? rec.variant : undefined, angered: rec.angered || undefined };
      const x = h.x, y = h.y, hp = h.hp;
      if (rec.isAlpha) {
        // An enemy's friendly Alpha changes hands whole rather than shrinking into a plain body.
        this.removeAmalgamQuietly(rec);
        this.spawnFriendlyAlpha(owner, { x, y, hp, legion });
        turned++;
        continue;
      }
      this.removeAmalgamQuietly(rec);
      turnOne(x, y, corpse, hp);
    }
    // A loose Grave Mistake Alpha: turning it counts as beating it — Soul Screech unlocks.
    const alpha = owner === 'player' ? this.looseAlpha() : null;
    if (alpha && inReach(alpha.x, alpha.y)) {
      const x = alpha.x, y = alpha.y, hp = alpha.hp;
      fx.tether(cx, cy, x, y, 420, 6, tones);
      this.alphaBody?.collapse(); this.alphaBody = null;
      alpha.removeAllListeners('defeated');
      if (alpha.scene) alpha.destroy();
      this.alphaHusk = null;
      this.alphaState = 'defeated';
      this.spawnFriendlyAlpha('player', { x, y, hp, legion });
      this.arena.showFloatingText(x, y - 50, '💀 ALPHA TURNED — SOUL SCREECH UNLOCKED', '#cc88ff');
      turned++;
    }

    // The Amalgam boss is made of more than this can hold. It pays in flesh instead.
    if (owner === 'player' && this.arena.isAmalgamBoss) {
      const boss = this.arena.npc;
      if (boss.active && boss.hp > 0 && Phaser.Math.Distance.Between(cx, cy, boss.x, boss.y) <= TURN_RADIUS + 40) {
        const dmg = Math.max(1, Math.round(boss.hp * TURN_BOSS_FRAC));
        fx.tether(cx, cy, boss.x, boss.y, 520, 7, tones);
        fx.immolate(boss.x, boss.y, 90, { tones, wisps: 16, motes: 6, duration: 640 });
        this.arena.scene.cameras.main.shake(260, 0.008);
        boss.takeDamage(dmg, { pierce: true });
        this.arena.showFloatingText(boss.x, boss.y - 70, '🔄 IT WILL NOT TURN — HALF TORN AWAY', '#ff6a7a');
      }
    }

    if (turned > 0) {
      if (owner === 'player') this.arena.recordMasteryStat('amalgamsTurned', turned);
      this.arena.showFloatingText(cx, cy - 46, legion ? `🔄 WE ARE LEGION — ${turned} TURNED` : `🔄 ${turned} TURNED`, legion ? '#ff5577' : '#cc99ff');
    } else if (owner === 'player' && !this.arena.isAmalgamBoss) {
      this.arena.showFloatingText(cx, cy - 46, '🔄 NOTHING TO TURN', '#775588');
    }
  }

  /** Takes a grave zombie off the field with no corpse, no decay cloud and no death blast. */
  private removeGraveZombieQuietly(gz: GraveZombie): void {
    const i = this.graveZombies.indexOf(gz);
    if (i !== -1) this.graveZombies.splice(i, 1);
    gz.auraGfx?.destroy();
    gz.husk.removeAllListeners('defeated');
    if (gz.husk.scene) gz.husk.destroy();
  }

  /** Takes an Amalgam off the field with none of its death consequences (it is changing sides). */
  private removeAmalgamQuietly(rec: Amalgam): void {
    const i = this.amalgams.indexOf(rec);
    if (i !== -1) this.amalgams.splice(i, 1);
    rec.body.destroy();
    rec.shroud?.destroy();
    rec.husk.removeAllListeners('defeated');
    rec.husk.removeAllListeners('damaged');
    if (rec.husk.scene) rec.husk.destroy();
  }

  /** Carrion Call's buff — from the F+ whistle, or from We are Legion on a turned body. */
  private applyCarrion(rec: Amalgam, time: number, announce = true): void {
    const husk = rec.husk;
    rec.carrionUntil = time + CARRION_BUFF_MS;
    husk.walkSpeedMult = CARRION_SPEED_MULT;
    if (rec.dashUntil === 0) husk.biteDamage = this.effectiveDamage(rec, rec.baseBiteDamage, time);
    if (announce) this.arena.showFloatingText(husk.x, husk.y - 46, '🩸 CARRION CALL', '#ff3333');
  }

  // ── Corpse queue ─────────────────────────────────────────────────────

  private corpseCap(owner: Owner): number {
    void owner;
    return CORPSE_CAP_BASE;
  }

  /**
   * A soul user walks in with an empty queue — every body is earned. The one exception is
   * Soul Mastery's Corpse Prince, who is already waiting at the front.
   */
  private seedStartingCorpses(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const isSoul = owner === 'player' ? this.arena.elementId === 'soul' : this.arena.npcElementId === 'soul';
      if (!isSoul || !this.masteryOn(owner)) continue;
      this.pushCorpse(owner, { maxHp: PRINCE_HP, prince: true });
    }
  }

  private masteryOn(owner: Owner): boolean {
    return owner === 'player' ? this.arena.masteryActive : this.arena.npcMasteryActive;
  }

  private pushCorpse(owner: Owner, corpse: Corpse): void {
    const queue = this.corpseQueue[owner];
    queue.unshift({ ...corpse, maxHp: Math.max(1, Math.round(corpse.maxHp)) });
    const cap = this.corpseCap(owner);
    // Overflow drops the oldest body — but never the prince, who is only ever away on a timer.
    while (queue.length > cap) {
      let drop = queue.length - 1;
      while (drop >= 0 && queue[drop].prince) drop--;
      if (drop < 0) break;
      queue.splice(drop, 1);
    }
  }

  /** Mastery — Corpse Prince: twelve seconds after he falls, he is back at the front of the queue. */
  private updatePrinceReturn(time: number): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const at = this.princeReturnAt[owner];
      if (at === 0 || time < at) continue;
      this.princeReturnAt[owner] = 0;
      if (!this.masteryOn(owner)) continue;
      this.pushCorpse(owner, { maxHp: PRINCE_HP, prince: true });
      const caster = this.fighterOf(owner);
      if (caster.active) {
        this.fx(owner).soulRise(caster.x, caster.y + 4, 40, 520, 4, GOLD_TONES);
        if (owner === 'player') this.arena.showFloatingText(caster.x, caster.y - 52, '👑 THE PRINCE AWAITS', '#ffd24a');
      }
    }
  }

  /** Seconds until the fallen prince is back in the queue, or 0 — read by the HUD. */
  princeReturnIn(owner: Owner, time: number): number {
    const at = this.princeReturnAt[owner];
    return at > time ? Math.ceil((at - time) / 1000) : 0;
  }

  /**
   * Your Amalgams take 20% of every hit aimed at you. The multiplier is written on both fighters
   * every frame (this kit is its only writer), and the hit's own 'damaged' event hands the share
   * to the standing Amalgam nearest the caster. Online, both sims run this over their own copy of
   * the crew: the attacker's replica takes the reduced hit, and each machine hurts its own copy.
   */
  private updateSoulTank(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const f = this.fighterOf(owner);
      if (!f) continue;
      const isSoul = owner === 'player' ? this.arena.elementId === 'soul' : this.arena.npcElementId === 'soul';
      f.soulTankIncomingMult = isSoul && this.amalgamCount(owner) > 0 ? 1 - TANK_SHARE : 1;
      if (isSoul && !this.tankHooked.has(f)) {
        this.tankHooked.add(f);
        f.on('damaged', (amount: number) => this.shareHit(f, amount));
      }
    }
  }

  private shareHit(f: Fighter, amount: number): void {
    if (amount <= 0 || f.soulTankIncomingMult >= 1) return;
    const owner: Owner | null = f === this.arena.player ? 'player' : f === this.arena.npc ? 'npc' : null;
    if (!owner) return;
    let best: Amalgam | null = null;
    let bestD = Infinity;
    for (const rec of this.amalgams) {
      if (rec.owner !== owner || !rec.husk.active || rec.husk.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, rec.husk.x, rec.husk.y);
      if (d < bestD) { bestD = d; best = rec; }
    }
    if (!best) return;
    // `amount` is what got through at 80%, so the Amalgam's 20% of the original is a quarter of it.
    const share = Math.max(1, Math.round(amount * TANK_SHARE / (1 - TANK_SHARE)));
    const h = best.husk;
    this.fx(owner).tether(f.x, f.y, h.x, h.y, 220, 3, this.tonesOf(owner));
    h.takeDamage(share);
  }

  // ── Amalgams ─────────────────────────────────────────────────────────

  /** The shades an amalgam's flesh is painted in — its tier wins over whose it is. */
  private amalgamTones(rec: Amalgam): SoulTones {
    if (rec.prince) return GOLD_TONES;
    if (rec.angered) return ANGERED_TONES;
    return this.tonesOf(rec.owner);
  }

  /**
   * Builds the drawn creature for an amalgam and hides the husk sprite behind it. The sprite
   * stays alive (it owns the physics body, the health bar and every status field) — it just
   * isn't what you look at any more.
   */
  private buildAmalgamBody(husk: Husk, owner: Owner, variant: HuskVariantDef, isAlpha = false, prince = false): SoulAmalgamBody {
    husk.setVisible(false);
    return new SoulAmalgamBody(this.arena.scene, this.col(owner), {
      size: AMALGAM_BODY_SIZE * husk.sizeMult,
      fleshColor: variant.id !== 'basic' ? variant.color : undefined,
      quirk: variant.quirk,
      alpha: isAlpha,
      prince,
      depth: 6,
    });
  }

  /**
   * Raises a corpse as this side's Amalgam. Arise raises it beside the caster at full health;
   * Turn passes `at` to raise it where the body already stood, at the health it already had.
   */
  private spawnAmalgam(
    owner: Owner, corpse: Corpse, at?: { x: number; y: number; hp: number; quiet?: boolean },
  ): Amalgam {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    const ox = at ? at.x : caster.x + (Math.random() - 0.5) * 50;
    const oy = at ? at.y : caster.y + (Math.random() - 0.5) * 50;

    const prince = !!corpse.prince;
    const variant = prince ? BASIC_HUSK : (corpse.variant ?? BASIC_HUSK);
    const angered = !prince && !!corpse.angered;

    const maxHp = Math.max(10, corpse.maxHp);
    let biteDmg: number;
    let dashDmg: number;
    let speed: number;
    if (prince) {
      biteDmg = PRINCE_SWORD_DMG;
      dashDmg = PRINCE_LUNGE_DMG;
      speed = PRINCE_SPEED;
    } else {
      biteDmg = Math.max(1, Math.round(AMALGAM_BITE_DMG * variant.damageMult));
      dashDmg = Math.max(1, Math.round(AMALGAM_DASH_BITE_DMG * variant.damageMult));
      speed = AMALGAM_SPEED * variant.speedMult * (angered ? ANGERED_SPEED_MULT : 1);
    }

    const husk = new Husk(scene, ox, oy, maxHp, Math.round(speed), biteDmg, AMALGAM_BITE_CD_MS, variant);
    husk.world = this.huskWorld;
    if (at) husk.hp = Phaser.Math.Clamp(Math.round(at.hp), 1, maxHp);
    husk.onBite = (dmg, target) => {
      target.takeDamage(dmg);
      if (owner === 'player') this.arena.recordMasteryStat('amalgamDamage', dmg);
    };
    if (owner === 'player' && !at) this.arena.recordMasteryStat('amalgamsSummoned', 1);

    const now = scene.time.now;
    const rec: Amalgam = {
      husk, owner, waypoint: null,
      baseBiteDamage: biteDmg,
      dashBiteDamage: dashDmg,
      nextDashAt: now + AMALGAM_DASH_INTERVAL_MIN_MS + Math.random() * (AMALGAM_DASH_INTERVAL_MAX_MS - AMALGAM_DASH_INTERVAL_MIN_MS),
      dashUntil: 0,
      body: this.buildAmalgamBody(husk, owner, variant, false, prince),
      meleeTickAccum: 0,
      carrionUntil: 0,
      nextTrailAt: 0,
      variant,
      angered,
      prince: prince || undefined,
      shroud: null,
      t: Math.random() * 10,
    };
    husk.once('defeated', () => this.onAmalgamDefeated(rec));
    husk.on('damaged', (amount: number) => {
      if (amount <= 0 || !husk.active) return;
      this.arena.spawnDamageNumber(husk.x, husk.y - 20, amount);
    });
    this.amalgams.push(rec);
    if (!at?.quiet) {
      const label = prince ? '👑 THE CORPSE PRINCE RISES'
        : angered ? '🧟 ANGERED AMALGAM RISES'
        : variant.id !== 'basic' ? `🧟 ${variant.name.toUpperCase()} RECRUITED`
        : '🧟 AMALGAM RISES';
      this.arena.showFloatingText(caster.x, caster.y - 44, label, prince ? '#ffd24a' : '#9966cc');
    }
    return rec;
  }

  private effectiveDamage(rec: Amalgam, base: number, time: number): number {
    return rec.carrionUntil > time ? Math.round(base * CARRION_DMG_MULT) : base;
  }

  private amalgamTargets(owner: Owner): Fighter[] {
    if (this.arena.isInvasion) {
      return this.arena.enemies.filter((e) => e.active && e.hp > 0 && e.element.id === 'husk');
    }
    const opposing = owner === 'player' ? this.arena.npc : this.arena.player;
    const out: Fighter[] = opposing.active && opposing.hp > 0 ? [opposing] : [];
    // Your zombies also swarm a loose hostile alpha (Grave Mistake).
    if (owner === 'player' && this.alphaState === 'hostile' && this.alphaHusk?.active && this.alphaHusk.hp > 0) {
      out.push(this.alphaHusk);
    }
    return out;
  }

  private nearestOf(list: Fighter[], x: number, y: number): Fighter | null {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const f of list) {
      const d = Phaser.Math.Distance.Between(x, y, f.x, f.y);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  }

  private updateAmalgams(time: number, delta: number): void {
    const scene = this.arena.scene;
    for (let i = this.amalgams.length - 1; i >= 0; i--) {
      const rec = this.amalgams[i];
      const husk = rec.husk;
      if (!husk.active || husk.hp <= 0) {
        rec.body.collapse();
        rec.shroud?.destroy();
        this.amalgams.splice(i, 1);
        continue;
      }

      rec.t += delta / 1000;
      const col = this.col(rec.owner);
      const tones = this.amalgamTones(rec);
      const size = AMALGAM_BODY_SIZE * husk.sizeMult;

      // The creature itself, repainted from scratch every frame.
      const vel = (husk.body as Phaser.Physics.Arcade.Body).velocity;
      const hunted = this.nearestOf(this.amalgamTargets(rec.owner), husk.x, husk.y);
      rec.body.update(delta, {
        x: husk.x, y: husk.y, vx: vel.x, vy: vel.y,
        alpha: husk.alpha,
        // The bite lunge is a scale tween on the (hidden) sprite — read it back as a body pop.
        pop: husk.scaleX / Math.max(0.01, husk.sizeMult),
        aim: hunted ? Math.atan2(hunted.y - husk.y, hunted.x - husk.x) : null,
        tones,
        dashing: rec.dashUntil > 0,
        angered: rec.angered,
      });

      // A buffed amalgam wears a live veil, so its state reads at a glance.
      const wantShroud = rec.carrionUntil > time;
      if (wantShroud && !rec.shroud) {
        rec.shroud = new SoulShroud(scene, col, ANGERED_TONES, size * 1.5, 0.9, 5, 6);
      } else if (!wantShroud && rec.shroud) {
        rec.shroud.destroy();
        rec.shroud = null;
      }
      if (rec.shroud) rec.shroud.update(delta, husk.x, husk.y, husk.alpha);

      const body = husk.body as Phaser.Physics.Arcade.Body;

      if (rec.waypoint) {
        const dx = rec.waypoint.x - husk.x, dy = rec.waypoint.y - husk.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist <= WHISTLE_ARRIVE_RADIUS) {
          body.setVelocity(0, 0);
          // Mastery — Grave Mistake anti-heal blocks ally healing from the whistle.
          if (!(rec.owner === 'player' && time < this.soulAntiHealUntil)) {
            const healAmt = Math.round(husk.maxHp * WHISTLE_HEAL_FRAC);
            husk.heal(healAmt);
            if (rec.owner === 'player') this.arena.recordMasteryStat('amalgamHealed', healAmt);
            this.arena.showFloatingText(husk.x, husk.y - 30, '💜 HEALED', '#cc99ff');
          } else {
            this.arena.showFloatingText(husk.x, husk.y - 30, '🚫 ANTI-HEAL', '#ff5555');
          }
          if (rec.owner === 'player' && this.arena.hasUpgrade('f')) this.applyCarrion(rec, time);
          rec.waypoint = null;
        } else {
          body.setVelocity((dx / dist) * husk.speed, (dy / dist) * husk.speed);
        }
      } else {
        const targets = this.amalgamTargets(rec.owner);
        husk.update(targets, time, delta);

        // Recruited invasion variants fight with their own AI (kiting/charging/healing).
        // The dash-burst flourish is only for plain/angered amalgams (and the prince's lunge).
        if (rec.variant.id === 'basic') {
          if (time >= rec.nextDashAt && rec.dashUntil === 0 && targets.length > 0) {
            const target = this.nearestOf(targets, husk.x, husk.y);
            if (target) {
              const dx = target.x - husk.x, dy = target.y - husk.y;
              const len = Math.hypot(dx, dy) || 1;
              body.setVelocity((dx / len) * husk.speed * AMALGAM_DASH_SPEED_MULT, (dy / len) * husk.speed * AMALGAM_DASH_SPEED_MULT);
              husk.biteDamage = this.effectiveDamage(rec, rec.dashBiteDamage, time);
              rec.dashUntil = time + AMALGAM_DASH_DURATION_MS;
              // It comes apart a little as it throws itself forward.
              this.fx(rec.owner).wisps(husk.x, husk.y, 4, {
                speed: 70, angle: Math.atan2(-dy, -dx), spread: 0.7, size: 3,
                life: 380, rise: -14, depth: 5, tones,
              });
            }
          }
          if (rec.dashUntil > 0 && time >= rec.dashUntil) {
            rec.dashUntil = 0;
            husk.biteDamage = this.effectiveDamage(rec, rec.baseBiteDamage, time);
            rec.nextDashAt = time + AMALGAM_DASH_INTERVAL_MIN_MS + Math.random() * (AMALGAM_DASH_INTERVAL_MAX_MS - AMALGAM_DASH_INTERVAL_MIN_MS);
          }
        }
      }

      // Carrion Call (F+) buff expiry.
      if (rec.carrionUntil > 0 && time >= rec.carrionUntil) {
        rec.carrionUntil = 0;
        husk.walkSpeedMult = 1;
        if (rec.dashUntil === 0) husk.biteDamage = this.effectiveDamage(rec, rec.baseBiteDamage, time);
      }
      // Carrion Call: blood-wisps torn off it as it runs.
      if (rec.carrionUntil > time && time >= rec.nextTrailAt) {
        rec.nextTrailAt = time + CARRION_TRAIL_INTERVAL_MS;
        const body = husk.body as Phaser.Physics.Arcade.Body;
        const back = Math.atan2(-body.velocity.y, -body.velocity.x);
        this.fx(rec.owner).wisps(husk.x, husk.y, 1, {
          speed: 26, angle: back, spread: 0.5, size: 2.6, life: 340, rise: -8, depth: 4, tones: ANGERED_TONES,
        });
      }

      // Damage taken: opposing projectiles passing near the amalgam.
      const wantFromPlayer = rec.owner === 'npc';
      for (const go of this.arena.projectiles.getChildren() as Projectile[]) {
        if (!go.active || go.isFromPlayer !== wantFromPlayer) continue;
        if (Phaser.Math.Distance.Between(go.x, go.y, husk.x, husk.y) <= AMALGAM_PROJECTILE_HIT_RADIUS) {
          husk.takeDamage(go.damage);
          this.arena.spawnHitFlash(husk.x, husk.y, 0xff6600);
          go.setActive(false).setVisible(false);
          (go.body as Phaser.Physics.Arcade.Body).stop();
          break;
        }
      }

      // Damage taken: melee-range proximity to the opposing Fighter itself, only against melee elements.
      if (!this.arena.isInvasion) {
        const opposing = rec.owner === 'player' ? this.arena.npc : this.arena.player;
        if (opposing.active && opposing.hp > 0 && MELEE_ELEMENT_IDS.has(opposing.element.id)
            && Phaser.Math.Distance.Between(opposing.x, opposing.y, husk.x, husk.y) <= AMALGAM_MELEE_RANGE) {
          rec.meleeTickAccum += delta;
          if (rec.meleeTickAccum >= AMALGAM_MELEE_TICK_MS) {
            rec.meleeTickAccum -= AMALGAM_MELEE_TICK_MS;
            husk.takeDamage(AMALGAM_MELEE_DMG);
          }
        } else {
          rec.meleeTickAccum = 0;
        }
      }

    }
  }

  private onAmalgamDefeated(rec: Amalgam): void {
    const idx = this.amalgams.indexOf(rec);
    if (idx !== -1) this.amalgams.splice(idx, 1);
    // The stitches give and the body sinks in on itself rather than blinking out.
    rec.body.collapse();
    rec.shroud?.destroy();
    rec.shroud = null;

    const husk = rec.husk;
    const fx = this.fx(rec.owner);
    // Cruel Offering (E+): every one of your risen leaves its rot where it fell.
    if (rec.owner === 'player' && this.arena.hasUpgrade('e')) this.spawnDecayCloud(rec.owner, husk.x, husk.y);

    // Even a quiet death gives the spirit back: it comes apart into wisps and drifts off.
    const tones = this.amalgamTones(rec);
    fx.wisps(husk.x, husk.y, rec.prince ? 10 : 7, { speed: 70, size: 3, life: 720, rise: -46, depth: 6, tones });
    fx.stain(husk.x, husk.y, 22, 1, tones);
    // Mastery — the prince is never lost, only away.
    if (rec.prince) {
      this.princeReturnAt[rec.owner] = this.arena.scene.time.now + PRINCE_RETURN_MS;
      if (rec.owner === 'player') {
        this.arena.showFloatingText(husk.x, husk.y - 34, `👑 THE PRINCE FALLS — BACK IN ${PRINCE_RETURN_MS / 1000}s`, '#ffd24a');
      }
    }

    if (rec.variant.explodes) this.emitBlast(husk.x, husk.y, Math.round(husk.biteDamage * 2), this.foesOf(rec.owner), rec.owner);

    husk.hideHealthBar();
    this.arena.scene.tweens.add({
      targets: husk, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 350,
      onComplete: () => { if (husk.scene) husk.destroy(); },
    });
  }

  // ── Mastery — Grave Mistake ───────────────────────────────────────────

  private graveMistakeSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'grave-mistake') return s;
    }
    return null;
  }

  /** Once the alpha is defeated the slot becomes Soul Screech (real cooldown); before that it's always ready. */
  getGraveMistakeCooldownRatio(time: number): number {
    if (this.alphaState !== 'defeated') return 1;
    return Math.min(1, (time - this.soulScreechLastCastAt) / SOUL_SCREECH_COOLDOWN_MS);
  }

  private tryCastGraveMistake(time: number, mouseX: number, mouseY: number): void {
    void mouseX; void mouseY;
    this.playerAvatar?.play('slam');
    if (this.alphaState === 'defeated') { this.doSoulScreech(time); return; }
    if (this.alphaState === 'hostile') {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, 'THE ALPHA IS LOOSE', '#ff5555');
      return;
    }
    this.spawnHostileAlpha();
  }

  private spawnHostileAlpha(): void {
    const scene = this.arena.scene;
    const player = this.arena.player;
    // Destroy the nearest player grave to awaken the alpha there.
    let gi = -1, gd = Infinity;
    this.graves.forEach((gr, idx) => {
      if (gr.owner !== 'player') return;
      const d = Phaser.Math.Distance.Between(player.x, player.y, gr.x, gr.y);
      if (d < gd) { gd = d; gi = idx; }
    });
    let sx = player.x + 130, sy = player.y;
    if (gi >= 0) {
      const gr = this.graves[gi];
      sx = gr.x; sy = gr.y;
      // The headstone is torn apart from below rather than blinking out.
      this.pfx.immolate(sx, sy, 52, { tones: ANGERED_TONES, wisps: 10, motes: 3, duration: 520 });
      gr.sprite.destroy(); gr.aura.destroy();
      this.graves.splice(gi, 1);
    }

    const husk = new Husk(scene, sx, sy, ALPHA_HP, ALPHA_SPEED, ALPHA_BITE_DMG, 1000, BASIC_HUSK);
    husk.sizeMult = 2.1; husk.applySizeMult();
    husk.world = this.huskWorld;
    husk.onBite = (dmg, target) => target.takeDamage(dmg); // hostile → bites the player
    husk.once('defeated', () => this.onAlphaDefeated());
    this.alphaHusk = husk;
    this.alphaState = 'hostile';
    this.alphaNextConeAt = scene.time.now + ALPHA_CONE_INTERVAL_MS;
    this.alphaBody = this.buildAmalgamBody(husk, 'player', BASIC_HUSK, true);
    // It comes up out of the plot: a tall column of spirits, then the thing standing in it.
    this.pfx.soulRise(sx, sy + 10, 92, 900, 5, ANGERED_TONES);
    this.pfx.shriek(sx, sy, 130, 720, 8, ANGERED_TONES);
    scene.cameras.main.shake(320, 0.007);
    this.arena.showFloatingText(sx, sy - 46, '☠️ ALPHA AMALGAM AWAKENED', '#aa44cc');
  }

  private updateAlpha(time: number, delta: number): void {
    const husk = this.alphaHusk;
    if (this.alphaState !== 'hostile' || !husk) return;
    if (!husk.active || husk.hp <= 0) return; // defeat handled by the event
    const player = this.arena.player;
    // Chase & bite the player.
    husk.update([player], time, delta);

    // The thing itself: the same stitched mass as your own amalgams, turned on you.
    if (this.alphaBody) {
      const vel = (husk.body as Phaser.Physics.Arcade.Body).velocity;
      this.alphaBody.update(delta, {
        x: husk.x, y: husk.y, vx: vel.x, vy: vel.y,
        alpha: husk.alpha,
        pop: husk.scaleX / Math.max(0.01, husk.sizeMult),
        aim: Math.atan2(player.y - husk.y, player.x - husk.x),
        tones: ANGERED_TONES,
        angered: true,
      });
    }

    // Player projectiles can damage the loose alpha (kit-side overlap; it isn't in ArenaScene's groups).
    for (const go of this.arena.projectiles.getChildren()) {
      const p = go as Projectile;
      if (!p.active || !p.isFromPlayer) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, husk.x, husk.y) <= 22 * husk.sizeMult) {
        husk.takeDamage((p as unknown as { damage: number }).damage);
        p.setActive(false).setVisible(false);
        (p.body as Phaser.Physics.Arcade.Body).stop();
      }
    }

    // Periodic green cone at the player → anti-heal on hit.
    if (time >= this.alphaNextConeAt) {
      this.alphaNextConeAt = time + ALPHA_CONE_INTERVAL_MS;
      this.fireAlphaCone(husk, player, true, true);
    }
  }

  private onAlphaDefeated(): void {
    const husk = this.alphaHusk;
    if (husk) {
      // Everything it was made of gets loose at once.
      this.pfx.immolate(husk.x, husk.y, 110, { tones: ANGERED_TONES, wisps: 22, motes: 8, duration: 760 });
      this.pfx.shriek(husk.x, husk.y, 160, 820, 8, this.tonesOf('player'));
      this.arena.scene.cameras.main.shake(360, 0.009);
    }
    this.alphaBody?.collapse(); this.alphaBody = null;
    this.alphaHusk = null;
    this.alphaState = 'defeated';
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 50, '💀 ALPHA SLAIN — SOUL SCREECH UNLOCKED', '#cc88ff');
    this.spawnFriendlyAlpha('player');
  }

  /**
   * The Alpha you beat (or Turned), joining you. Deliberately exempt from `SOUL_HUSK_CAP`: it is
   * the payout for beating a 200 HP horror rather than something you can raise on demand, and it
   * replaced a body that was already on the field. Turn passes `at` to keep it where it stood,
   * at the health it had — and can hand an enemy's friendly Alpha to the npc side too.
   */
  private spawnFriendlyAlpha(owner: Owner, at?: { x: number; y: number; hp: number; legion?: boolean }): void {
    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);
    const tones = this.tonesOf(owner);
    const ox = at ? at.x : caster.x + (Math.random() - 0.5) * 50;
    const oy = at ? at.y : caster.y + (Math.random() - 0.5) * 50;
    const bonus = at?.legion ? LEGION_BONUS_HP : 0;
    const husk = new Husk(scene, ox, oy, ALPHA_HP + bonus, ALPHA_SPEED, ALPHA_BITE_DMG, 1000, BASIC_HUSK);
    husk.sizeMult = 2.1; husk.applySizeMult();
    husk.world = this.huskWorld;
    if (at) husk.hp = Phaser.Math.Clamp(Math.round(at.hp + bonus), 1, husk.maxHp);
    husk.onBite = (dmg, target) => {
      target.takeDamage(dmg);
      if (owner === 'player') this.arena.recordMasteryStat('amalgamDamage', dmg);
    };
    this.fx(owner).soulRise(ox, oy + 8, 76, 780, 5, tones);
    this.fx(owner).bloom(ox, oy, 40, 11, 5, tones);
    const now = scene.time.now;
    const rec: Amalgam = {
      husk, owner, waypoint: null,
      baseBiteDamage: ALPHA_BITE_DMG, dashBiteDamage: ALPHA_BITE_DMG,
      nextDashAt: now + 99999, dashUntil: 0,
      body: this.buildAmalgamBody(husk, owner, BASIC_HUSK, true),
      meleeTickAccum: 0, carrionUntil: 0, nextTrailAt: 0,
      variant: BASIC_HUSK, angered: false,
      shroud: null, t: 0,
      isAlpha: true, alphaNextConeAt: now + ALPHA_CONE_INTERVAL_MS,
    };
    husk.once('defeated', () => this.onAmalgamDefeated(rec));
    this.amalgams.push(rec);
    if (at?.legion) this.applyCarrion(rec, now, false);
    if (owner === 'player' && !at) this.arena.recordMasteryStat('amalgamsSummoned', 1);
    this.arena.showFloatingText(ox, oy - 46, '🧟 ALPHA JOINS YOU', '#cc88ff');
  }

  private fireAlphaCone(from: Husk, target: Fighter, hitsCaster: boolean, antiHeal: boolean, owner: Owner = 'player'): void {
    const scene = this.arena.scene;
    const base = Math.atan2(target.y - from.y, target.x - from.x);
    const spread = Phaser.Math.DegToRad(42);
    // The retch that throws the cone — a bile-green muzzle at the alpha's mouth.
    this.pfx.muzzleWisp(from.x + Math.cos(base) * 18, from.y + Math.sin(base) * 18, base, 1.5, 7, ROT_TONES);
    this.pfx.ring(from.x, from.y, 8, 44, SOUL.rot, 320, 3, 6);
    for (let i = 0; i < ALPHA_CONE_BULLETS; i++) {
      const t = i / (ALPHA_CONE_BULLETS - 1);
      const ang = base - spread + t * spread * 2;
      this.soulShots.push({
        gfx: scene.add.graphics().setDepth(7), x: from.x, y: from.y,
        vx: Math.cos(ang) * SOUL_SHOT_SPEED, vy: Math.sin(ang) * SOUL_SHOT_SPEED,
        damage: ALPHA_CONE_DAMAGE, owner, hitsCaster, antiHeal,
        tones: ROT_TONES, t: Math.random() * 6,
        expiresAt: scene.time.now + SOUL_SHOT_LIFETIME_MS,
      });
    }
  }

  private doSoulScreech(time: number): void {
    if (time - this.soulScreechLastCastAt < SOUL_SCREECH_COOLDOWN_MS) return;
    this.soulScreechLastCastAt = time;
    const scene = this.arena.scene;
    const player = this.arena.player;
    // 25 AoE damage to enemies around you.
    this.dealSoulAoe(player.x, player.y, SOUL_SCREECH_RADIUS, SOUL_SCREECH_DAMAGE, 'player');
    this.playerAvatar?.play('flex');
    this.pfx.shriek(player.x, player.y, SOUL_SCREECH_RADIUS, 700, 9, this.tonesOf('player'));
    this.pfx.wisps(player.x, player.y, 14, {
      speed: SOUL_SCREECH_RADIUS * 1.6, size: 3.4, life: 640, rise: -50, depth: 8, tones: this.tonesOf('player'),
    });
    this.pfx.motes(player.x, player.y, 7, SOUL_SCREECH_RADIUS * 0.8, 7, this.tonesOf('player'));
    scene.cameras.main.shake(180, 0.005);
    // Heal nearby allies for 50% of the HP you're missing this round; overheal becomes weak HP.
    const missing = Math.max(0, player.maxHp - player.hp);
    const healAmt = Math.round(missing * 0.5);
    if (healAmt > 0) {
      this.healAllyWithOverheal(player, healAmt);
      for (const a of this.amalgams) {
        if (a.owner !== 'player' || !a.husk.active || a.husk.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(player.x, player.y, a.husk.x, a.husk.y) <= SOUL_SCREECH_RADIUS) {
          this.healAllyWithOverheal(a.husk, healAmt);
        }
      }
    }
    this.arena.showFloatingText(player.x, player.y - 46, '👻 SOUL SCREECH', '#cc88ff');
  }

  /** The friendly alpha keeps its powerful cone blast, aimed at the opposing fighter. */
  private updateAlphaAllies(time: number): void {
    for (const rec of this.amalgams) {
      if (!rec.isAlpha || !rec.husk.active || rec.husk.hp <= 0) continue;
      if (time < (rec.alphaNextConeAt ?? 0)) continue;
      rec.alphaNextConeAt = time + ALPHA_CONE_INTERVAL_MS;
      if (this.arena.isInvasion) continue;
      const foe = rec.owner === 'player' ? this.arena.npc : this.arena.player;
      if (foe.active && foe.hp > 0) this.fireAlphaCone(rec.husk, foe, false, false, rec.owner);
    }
  }

  private healAllyWithOverheal(f: Fighter, amount: number): void {
    const before = f.hp;
    f.heal(amount);
    const overflow = amount - (f.hp - before);
    if (overflow > 0) f.weakHp = Math.min(f.maxHp, f.weakHp + overflow); // weak HP
  }

  /** Blaster variant: friendly amalgams hit foes, hostile grave zombies hit the given targets directly. */
  private emitBlast(x: number, y: number, dmg: number, targets: Fighter[], owner: Owner): void {
    this.fx(owner).immolate(x, y, BLASTER_BOOM_RADIUS * 0.7, {
      tones: TORMENT_TONES, wisps: 12, motes: 4, duration: 460,
    });
    this.arena.scene.cameras.main.shake(120, 0.004);
    for (const t of targets) {
      if (t.active && t.hp > 0 && Phaser.Math.Distance.Between(x, y, t.x, t.y) <= BLASTER_BOOM_RADIUS) t.takeDamage(dmg);
    }
  }

  // ── Graves ───────────────────────────────────────────────────────────

  private updateGraves(time: number, delta: number): void {
    for (const g of this.graves) {
      g.auraT += delta / 1000;
      // The plot exhales while it works on the next one, and the light swells as it gets close.
      const tones = g.tier >= 3 ? ANGERED_TONES : this.tonesOf(g.owner);
      const ready = 1 - Phaser.Math.Clamp((g.nextSpawnAt - time) / GRAVE_SPAWN_INTERVAL_MS, 0, 1);
      const gfx = g.aura;
      gfx.clear();
      // A graveyard's plot is wider than a single grave's, so a built-up one is obvious.
      SoulFx.drawPuddle(gfx, this.col(g.owner), tones, g.x, g.y + 20,
        (13 + ready * 7) * (1 + (g.tier - 1) * 0.35), g.auraT, 0.35 + ready * 0.45);
      if (time >= g.nextSpawnAt) {
        // The clock keeps running while the field is full, so a capped-out grave does not bank
        // up a backlog that all arrives the instant a slot opens.
        g.nextSpawnAt = time + GRAVE_SPAWN_INTERVAL_MS;
        if (this.huskCount(g.owner) < SOUL_HUSK_CAP) this.spawnGraveZombie(g);
      }
    }
  }

  private spawnGraveZombie(grave: Grave): void {
    const scene = this.arena.scene;
    const ang = Math.random() * Math.PI * 2;
    const ox = grave.x + Math.cos(ang) * 20;
    const oy = grave.y + Math.sin(ang) * 20;

    // Base R raises plain bodies and nothing else. Restless Ground (R+) makes every one of them
    // an elemental variant, at exactly the tier the plot has been built up to.
    let variant: HuskVariantDef = BASIC_HUSK;
    if (grave.owner === 'player' && this.arena.hasUpgrade('r')) {
      const pool = VARIANTS_BY_TIER[grave.tier].length ? VARIANTS_BY_TIER[grave.tier] : RECRUITABLE_VARIANTS;
      variant = pool[Math.floor(Math.random() * pool.length)];
    }
    // The top of the graveyard ladder raises them angry as well as branded.
    const angered = grave.tier >= 3;
    const hpMult = variant.hpMult * (angered ? ANGERED_HP_MULT : 1);
    const speedMult = variant.speedMult * (angered ? ANGERED_SPEED_MULT : 1);
    const hp = Math.max(1, Math.round(GRAVE_ZOMBIE_HP * hpMult));
    const speed = Math.max(1, Math.round(GRAVE_ZOMBIE_SPEED * speedMult));
    const biteDmg = Math.max(1, Math.round(GRAVE_ZOMBIE_BITE_DMG * variant.damageMult));

    const husk = new Husk(scene, ox, oy, hp, speed, biteDmg, GRAVE_ZOMBIE_BITE_CD_MS, variant);
    husk.world = this.huskWorld;
    husk.onBite = (dmg, target) => target.takeDamage(dmg);

    const auraGfx = angered ? scene.add.graphics().setDepth(4) : null;
    const rec: GraveZombie = { husk, owner: grave.owner, variant, angered, auraGfx, t: Math.random() * 10 };
    husk.once('defeated', () => this.onGraveZombieDefeated(rec));
    this.graveZombies.push(rec);
    // Clawing its way out: the plot opens and the thing is standing in the column of light.
    const fx = this.fx(grave.owner);
    fx.soulRise(ox, oy + 8, angered ? 54 : 40, 560, 4, angered ? ANGERED_TONES : this.tonesOf(grave.owner));
  }

  private updateGraveZombies(time: number, delta: number): void {
    for (let i = this.graveZombies.length - 1; i >= 0; i--) {
      const rec = this.graveZombies[i];
      const husk = rec.husk;
      if (!husk.active || husk.hp <= 0) {
        rec.auraGfx?.destroy();
        this.graveZombies.splice(i, 1);
        continue;
      }
      rec.t += delta / 1000;
      if (rec.auraGfx) {
        rec.auraGfx.clear();
        SoulFx.drawAngeredAura(rec.auraGfx, this.col(rec.owner), husk.x, husk.y, 16 * husk.sizeMult, rec.t);
      }
      const targetFighter = rec.owner === 'player' ? this.arena.player : this.arena.npc;
      husk.update(targetFighter.active && targetFighter.hp > 0 ? [targetFighter] : [], time, delta);
    }
  }

  private onGraveZombieDefeated(rec: GraveZombie): void {
    const idx = this.graveZombies.indexOf(rec);
    if (idx !== -1) this.graveZombies.splice(idx, 1);
    rec.auraGfx?.destroy();
    const husk = rec.husk;

    if (rec.variant.explodes) this.emitBlast(husk.x, husk.y, Math.round(husk.biteDamage * 2), [this.fighterOf(rec.owner)], rec.owner);

    // Burning one of your own zombies down is how the corpse queue is fed, so the spirit
    // visibly comes loose and drifts back toward the caster's side of the fight.
    const tones = rec.angered ? ANGERED_TONES : this.tonesOf(rec.owner);
    this.fx(rec.owner).wisps(husk.x, husk.y, 6, { speed: 60, size: 2.8, life: 700, rise: -48, depth: 6, tones });
    this.fx(rec.owner).stain(husk.x, husk.y, 18, 1, tones);

    // Cruel Offering (E+): whatever you raise leaves its rot behind when it falls.
    if (rec.owner === 'player' && this.arena.hasUpgrade('e')) this.spawnDecayCloud(rec.owner, husk.x, husk.y);

    husk.hideHealthBar();
    this.arena.scene.tweens.add({
      targets: husk, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 300,
      onComplete: () => { if (husk.scene) husk.destroy(); },
    });
    this.pushCorpse(rec.owner, {
      maxHp: husk.maxHp,
      variant: rec.variant.id !== 'basic' ? rec.variant : undefined,
      angered: rec.angered || undefined,
    });
    const label = rec.angered ? '+💀 angered corpse' : rec.variant.id !== 'basic' ? `+💀 ${rec.variant.name}` : '+💀 corpse';
    this.arena.showFloatingText(husk.x, husk.y - 20, label, '#ccaaff');
  }

  // ── Recruited-variant HuskWorld (fireShot/heal/telegraph) ────────────

  private doFireShot(from: Husk, tx: number, ty: number, damage: number): void {
    const zRec = this.graveZombies.find((z) => z.husk === from);
    const aRec = zRec ? undefined : this.amalgams.find((a) => a.husk === from);
    const owner = zRec?.owner ?? aRec?.owner;
    if (!owner) return;

    const scene = this.arena.scene;
    const ang = Math.atan2(ty - from.y, tx - from.x);
    const vx = Math.cos(ang) * SOUL_SHOT_SPEED;
    const vy = Math.sin(ang) * SOUL_SHOT_SPEED;
    // Bile from a hostile spitter, the owner's own shades from a recruited one.
    const tones = zRec ? ROT_TONES : this.tonesOf(owner);
    this.fx(owner).muzzleWisp(from.x + Math.cos(ang) * 14, from.y + Math.sin(ang) * 14, ang, 0.9, 7, tones);
    this.soulShots.push({
      gfx: scene.add.graphics().setDepth(7), x: from.x, y: from.y, vx, vy, damage, owner,
      hitsCaster: !!zRec, tones, t: Math.random() * 6,
      expiresAt: scene.time.now + SOUL_SHOT_LIFETIME_MS,
    });
  }

  private updateSoulShots(time: number, delta: number): void {
    const W = this.arena.width, H = this.arena.height;
    for (let i = this.soulShots.length - 1; i >= 0; i--) {
      const s = this.soulShots[i];
      if (time >= s.expiresAt) { s.gfx.destroy(); this.soulShots.splice(i, 1); continue; }
      s.x += s.vx * delta / 1000;
      s.y += s.vy * delta / 1000;
      s.t += delta / 1000;
      s.gfx.clear();
      SoulFx.drawShot(s.gfx, this.col(s.owner), s.tones, s.x, s.y, Math.atan2(s.vy, s.vx), SOUL_SHOT_RADIUS, s.t);
      if (s.x < 0 || s.x > W || s.y < 0 || s.y > H) { s.gfx.destroy(); this.soulShots.splice(i, 1); continue; }

      const targets = s.hitsCaster ? [this.fighterOf(s.owner)] : this.foesOf(s.owner);
      let hit = false;
      for (const t of targets) {
        if (t.active && t.hp > 0 && Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= SOUL_SHOT_RADIUS + 16) {
          t.takeDamage(s.damage);
          this.arena.spawnHitFlash(t.x, t.y, 0x9944cc);
          this.fx(s.owner).wisps(s.x, s.y, 4, {
            speed: 80, angle: Math.atan2(s.vy, s.vx) + Math.PI, spread: 1.1,
            size: 2.4, life: 380, rise: -16, depth: 7, tones: s.tones,
          });
          if (s.antiHeal) {
            this.soulAntiHealUntil = time + ALPHA_ANTIHEAL_MS;
            this.arena.showFloatingText(t.x, t.y - 34, '🚫 ANTI-HEAL (5s)', '#ff5555');
          }
          hit = true;
          break;
        }
      }
      if (hit) { s.gfx.destroy(); this.soulShots.splice(i, 1); }
    }
  }

  private doHealNearby(source: Husk, radius: number, frac: number): void {
    const zRec = this.graveZombies.find((z) => z.husk === source);
    const aRec = zRec ? undefined : this.amalgams.find((a) => a.husk === source);
    const owner = zRec?.owner ?? aRec?.owner;
    if (!owner) return;

    const fx = this.fx(owner);
    const tones = this.tonesOf(owner);
    fx.ring(source.x, source.y, radius * 0.25, radius, tones.core, 500, 3.5, 3);
    fx.motes(source.x, source.y, 5, radius * 0.7, 4, tones);

    const pool = zRec ? this.graveZombies : this.amalgams;
    for (const rec of pool) {
      if (rec.husk === source || rec.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(source.x, source.y, rec.husk.x, rec.husk.y) <= radius) {
        rec.husk.heal(Math.round(rec.husk.maxHp * frac));
        // A visible thread of spirit passing from the healer to each recipient.
        fx.tether(source.x, source.y, rec.husk.x, rec.husk.y, 420, 4, tones);
      }
    }
  }

  private doTelegraph(x1: number, y1: number, x2: number, y2: number, color: number, durationMs: number): void {
    void color;
    // Whatever is about to charge draws its line of intent as a spectral thread.
    this.pfx.tether(x1, y1, x2, y2, durationMs, 6, ROT_TONES);
  }

  // ── Clouds of decay (E+) ─────────────────────────────────────────────

  private spawnDecayCloud(owner: Owner, x: number, y: number): void {
    const scene = this.arena.scene;
    this.decayClouds.push({
      sprite: scene.add.graphics().setDepth(2),
      x, y, radius: DECAY_RADIUS, owner,
      expiresAt: scene.time.now + DECAY_LIFETIME_MS, tickAccum: 0,
      t: Math.random() * 10,
    });
    this.fx(owner).wisps(x, y, 7, { speed: 70, size: 3.2, life: 700, rise: -30, depth: 6, tones: ROT_TONES });
    this.fx(owner).ring(x, y, 8, DECAY_RADIUS, SOUL.rot, 520, 3.5, 4);
    this.arena.showFloatingText(x, y - 22, '☠️ DECAY', '#66cc55');
  }

  /**
   * Rot burns whatever is standing in it and feeds whatever you raised. The damage and healing
   * tick here; the slow is pulled, not pushed — `getPlayerSpeedMult`/`getNpcSpeedMult` read the
   * clouds live so nothing has to be un-applied when a cloud expires under somebody's feet.
   */
  private updateDecayClouds(time: number, delta: number): void {
    for (let i = this.decayClouds.length - 1; i >= 0; i--) {
      const c = this.decayClouds[i];
      if (time >= c.expiresAt) { c.sprite.destroy(); this.decayClouds.splice(i, 1); continue; }

      c.t += delta / 1000;
      const life = Phaser.Math.Clamp((c.expiresAt - time) / DECAY_LIFETIME_MS, 0, 1);
      c.sprite.clear();
      SoulFx.drawDecay(c.sprite, this.col(c.owner), c.x, c.y, c.radius, c.t, 0.4 + life * 0.6);

      // Hostile husks the kit owns are slowed directly; the fighter pair is handled by the
      // speed-mult accessors, which is the only path that reaches them.
      for (const gz of this.graveZombies) {
        if (gz.owner !== c.owner || !gz.husk.active || gz.husk.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, gz.husk.x, gz.husk.y) <= c.radius) gz.husk.walkSpeedMult = DECAY_SLOW_MULT;
      }

      c.tickAccum += delta;
      if (c.tickAccum < DECAY_TICK_MS) continue;
      c.tickAccum -= DECAY_TICK_MS;

      for (const f of this.foesOf(c.owner)) {
        if (Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) <= c.radius) {
          f.takeDamage(DECAY_DPS);
          this.arena.spawnHitFlash(f.x, f.y, 0x33cc44);
        }
      }
      for (const gz of this.graveZombies) {
        if (gz.owner !== c.owner || !gz.husk.active || gz.husk.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, gz.husk.x, gz.husk.y) <= c.radius) gz.husk.takeDamage(DECAY_DPS);
      }
      for (const rec of this.amalgams) {
        if (rec.owner !== c.owner || !rec.husk.active || rec.husk.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, rec.husk.x, rec.husk.y) <= c.radius) {
          this.healAllyWithOverheal(rec.husk, DECAY_HPS);
        }
      }
    }
    // Anything that walked back out of a cloud gets its stride back.
    for (const gz of this.graveZombies) {
      if (gz.husk.walkSpeedMult !== 1 && !this.inDecay(gz.owner, gz.husk.x, gz.husk.y)) gz.husk.walkSpeedMult = 1;
    }
  }

  private inDecay(owner: Owner, x: number, y: number): boolean {
    return this.decayClouds.some((c) => c.owner === owner
      && Phaser.Math.Distance.Between(c.x, c.y, x, y) <= c.radius);
  }

  /** Pulled by ArenaScene: a cloud the NPC's soul user left slows the player. */
  getPlayerSpeedMult(): number {
    const { player } = this.arena;
    return this.inDecay('npc', player.x, player.y) ? DECAY_SLOW_MULT : 1;
  }

  /** Pulled by ArenaScene: a cloud the player's soul user left slows the NPC. */
  getNpcSpeedMult(): number {
    const { npc } = this.arena;
    return this.inDecay('player', npc.x, npc.y) ? DECAY_SLOW_MULT : 1;
  }

  // ── Ward perk (Soul) ─────────────────────────────────────────────────

  private updateWardPerk(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const fighter = this.fighterOf(owner);
      if (!fighter.active) continue;
      const hasWard = this.arena.hasPerk(owner, 'ward');
      const nearby = hasWard ? this.amalgams.filter((r) => r.owner === owner && r.husk.active && r.husk.hp > 0
        && Phaser.Math.Distance.Between(fighter.x, fighter.y, r.husk.x, r.husk.y) <= WARD_RADIUS).length : 0;
      // Written to Ward's own multiplier rather than the shared one: `incomingDamageMultiplier`
      // has nine other raw writers, and the Order mutation reassigns it every frame, which
      // used to cancel this perk outright in any fight running it.
      fighter.wardIncomingMult = hasWard && nearby >= WARD_MIN_AMALGAMS ? WARD_MULT : 1;
    }
  }

  // ── HUD (corpse queue) ───────────────────────────────────────────────

  private ensureHud(): void {
    if (this.hudIcons.length > 0 || this.arena.elementId !== 'soul') return;
    const scene = this.arena.scene;
    const cx = scene.scale.width / 2;
    const cap = this.corpseCap('player');
    for (let i = 0; i < cap; i++) {
      const img = scene.add.image(cx - (cap - 1) * 13 + i * 26, HUD_Y, huskTextureKey(BASIC_HUSK))
        .setOrigin(0.5).setDepth(20).setScale(0.42).setAlpha(0.25);
      this.hudIcons.push(img);
    }
    this.hudGfx = scene.add.graphics().setDepth(19.6);
    this.hudBodyCount = scene.add.text(cx + (cap - 1) * 13 + 26, HUD_Y, '', {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: '#9977bb', stroke: '#0a0410', strokeThickness: 4,
    }).setOrigin(0, 0.5).setDepth(20);
    this.hudKills = scene.add.text(cx - (cap - 1) * 13 - 26, HUD_Y, '', {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: '#ccaaff', stroke: '#0a0410', strokeThickness: 4,
    }).setOrigin(1, 0.5).setDepth(20);
  }

  private updateHud(): void {
    if (this.arena.elementId !== 'soul') return;
    this.ensureHud();
    const queue = this.corpseQueue.player;
    for (let i = 0; i < this.hudIcons.length; i++) {
      const icon = this.hudIcons[i];
      const corpse = queue[i];
      if (!corpse) {
        icon.setTexture(huskTextureKey(BASIC_HUSK)).clearTint().setAlpha(0.25);
        continue;
      }
      icon.setTexture(huskTextureKey(corpse.variant ?? BASIC_HUSK)).setAlpha(1);
      if (corpse.prince) icon.setTint(PRINCE_ICON_TINT);
      else if (corpse.angered) icon.setTint(0xff4444);
      else icon.clearTint();
    }
    // Bodies standing, against the cap — turns red at the ceiling, which is when Arise refuses.
    const bodies = this.huskCount('player');
    // Corpse Prince: while he is away, how long until he is back in the queue.
    const princeIn = this.princeReturnIn('player', this.arena.scene.time.now);
    this.hudBodyCount?.setText(`🧟 ${bodies}/${SOUL_HUSK_CAP}${princeIn > 0 ? `  👑 ${princeIn}s` : ''}`)
      .setColor(bodies >= SOUL_HUSK_CAP ? '#ff7777' : '#9977bb');
    // Kills, and — with Soul Lord — how many more until the next power.
    const k = this.kills.player;
    let label = `☠ ${k}`;
    if (this.lordActive('player')) {
      const next = [LORD_SPLIT_KILLS, LORD_HEMO_KILLS, LORD_ORB_KILLS, LORD_ASCEND_KILLS].find((n) => n > k);
      label += next ? ` → ${next}` : ' ✨';
    }
    this.hudKills?.setText(label).setColor(this.ascended.player ? '#ffe07a' : '#ccaaff');
    this.drawHudPlate(queue, bodies >= SOUL_HUSK_CAP);
  }

  /**
   * The corpse queue as a crypt: a carved stone lintel with a coffin niche per slot. A filled
   * niche glows from inside and lets a little wisp curl up out of its lid; an Inflamed corpse
   * smoulders, an angered one bleeds red. The kill tally and body count sit on the lintel's
   * carved end-plaques. Redrawn every frame on one Graphics, under the husk icons.
   */
  private drawHudPlate(queue: Corpse[], atCap: boolean): void {
    const g = this.hudGfx;
    if (!g) return;
    g.clear();
    const now = this.arena.scene.time.now / 1000;
    const cx = this.arena.scene.scale.width / 2;
    const n = this.hudIcons.length;
    const half = (n - 1) * 13;
    const lift = this.kills.player;
    const gold = this.ascended.player;
    const trim = gold ? SOUL.gold : SOUL.orchid;
    const trimHi = gold ? SOUL.sun : SOUL.lilac;
    const x0 = cx - half - 100, x1 = cx + half + 76, top = HUD_Y - 14, bot = HUD_Y + 14;

    // Shadow, then the stone slab with a gently arched top over the coffin row.
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(x0 + 2, top + 3, x1 - x0, bot - top, 6);
    g.fillStyle(0x1a0f24, 0.95);
    g.fillRoundedRect(x0, top, x1 - x0, bot - top, 6);
    g.fillStyle(0x1a0f24, 0.95);
    g.fillEllipse(cx, top + 2, half * 2 + 44, 14);
    // Masonry: staggered brick joints.
    g.lineStyle(1, 0x2e1d3d, 0.9);
    g.lineBetween(x0 + 4, HUD_Y, x1 - 4, HUD_Y);
    for (let bx = x0 + 18; bx < x1 - 6; bx += 24) {
      g.lineBetween(bx, top + 2, bx, HUD_Y);
      g.lineBetween(bx + 12, HUD_Y, bx + 12, bot - 2);
    }
    // Carved trim.
    g.lineStyle(2, trim, 0.85);
    g.strokeRoundedRect(x0, top, x1 - x0, bot - top, 6);
    g.lineStyle(1, trimHi, 0.25);
    g.strokeRoundedRect(x0 + 3, top + 3, x1 - x0 - 6, bot - top - 6, 4);
    // Little skull-and-candle studs on each end.
    for (const sx of [x0 + 9, x1 - 9]) {
      const fl = 0.7 + 0.3 * Math.sin(now * 9 + sx);
      g.fillStyle(SOUL.bone, 0.9);
      g.fillRect(sx - 2, HUD_Y - 2, 4, 10);
      g.fillStyle(gold ? SOUL.sun : SOUL.lilac, 0.45 * fl);
      g.fillCircle(sx, HUD_Y - 6, 5);
      g.fillStyle(gold ? SOUL.halo : SOUL.pale, fl);
      g.fillEllipse(sx, HUD_Y - 5, 3, 5 * fl);
    }
    // Kill-milestone glow under the tally — swells as Soul Lord milestones approach.
    if (lift > 0) {
      g.fillStyle(trim, 0.12 + 0.06 * Math.sin(now * 3));
      g.fillEllipse(cx - half - 60, HUD_Y, 72, 20);
    }
    g.fillStyle(atCap ? SOUL.blood : SOUL.stone, atCap ? 0.18 : 0.1);
    g.fillEllipse(cx + half + 46, HUD_Y, 48, 20);

    // Coffin niches.
    for (let i = 0; i < n; i++) {
      const sx = cx - half + i * 26;
      const corpse = queue[i];
      const hw = 9, sh = HUD_Y - 7, ttop = HUD_Y - 13, tbot = HUD_Y + 13;
      const coffin = (inset: number) => {
        g.beginPath();
        g.moveTo(sx - (hw - 4) + inset, ttop + inset);
        g.lineTo(sx + (hw - 4) - inset, ttop + inset);
        g.lineTo(sx + hw - inset, sh);
        g.lineTo(sx + (hw - 3) - inset, tbot - inset);
        g.lineTo(sx - (hw - 3) + inset, tbot - inset);
        g.lineTo(sx - hw + inset, sh);
        g.closePath();
      };
      const glowCol = corpse?.prince ? SOUL.gold : corpse?.angered ? SOUL.blood : gold ? SOUL.gold : SOUL.orchid;
      coffin(0);
      g.fillStyle(0x07030c, 1);
      g.fillPath();
      if (corpse) {
        const pulse = 0.6 + 0.4 * Math.sin(now * 3 + i);
        coffin(1.5);
        g.fillStyle(glowCol, 0.28 + pulse * 0.18);
        g.fillPath();
        // A wisp curling up out of the lid.
        for (let w = 0; w < 3; w++) {
          const ph = (now * 0.9 + w / 3 + i * 0.37) % 1;
          const wy = ttop - ph * 12;
          const wx = sx + Math.sin(ph * 7 + i) * 3;
          g.fillStyle(corpse.prince ? SOUL.sun : gold ? SOUL.sun : SOUL.lilac, (1 - ph) * 0.7);
          g.fillCircle(wx, wy, 2.2 * (1 - ph) + 0.6);
        }
      }
      coffin(0);
      g.lineStyle(1.5, corpse ? glowCol : SOUL.grape, corpse ? 1 : 0.7);
      g.strokePath();
      // Lid cross.
      g.lineStyle(1, corpse ? trimHi : SOUL.crypt, corpse ? 0.35 : 0.8);
      g.lineBetween(sx, ttop + 3, sx, tbot - 3);
      g.lineBetween(sx - 4, sh, sx + 4, sh);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private fighterOf(owner: Owner): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /**
   * Real opposing targets: the 1v1 opponent (or live invasion husks), plus a loose Grave Mistake
   * alpha for the player. The alpha lives in this kit rather than in ArenaScene's enemy group, so
   * every damage path that doesn't go through it has to be told about the thing explicitly.
   */
  private foesOf(owner: Owner): Fighter[] {
    const out: Fighter[] = this.arena.isInvasion
      ? this.arena.enemies.filter((e) => e.active && e.hp > 0)
      : [];
    if (!this.arena.isInvasion) {
      const opposing = owner === 'player' ? this.arena.npc : this.arena.player;
      if (opposing.active && opposing.hp > 0) out.push(opposing);
    }
    const alpha = this.looseAlpha();
    if (owner === 'player' && alpha) out.push(alpha);
    return out;
  }

  /** The hostile Grave Mistake alpha while it is up, or null. */
  private looseAlpha(): Husk | null {
    const husk = this.alphaHusk;
    if (this.alphaState !== 'hostile' || !husk || !husk.active || husk.hp <= 0) return null;
    return husk;
  }

  /**
   * Owner AoE that also reaches the loose alpha. ArenaScene's own AoE only sweeps the fighters
   * and husks it owns, so a kit-side sweep is the only way the alpha eats a soul blast.
   */
  private dealSoulAoe(x: number, y: number, radius: number, damage: number, owner: Owner): void {
    this.arena.dealAoeDamageFromOwner(x, y, radius, damage, owner);
    const alpha = owner === 'player' ? this.looseAlpha() : null;
    if (alpha && Phaser.Math.Distance.Between(x, y, alpha.x, alpha.y) <= radius) {
      alpha.takeDamage(damage);
    }
  }

  /**
   * Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`).
   * Headstones, the zombies they raise and the amalgams stitched out of them.
   *
   * The risen are husks rather than plain records, so they are killed through their own death
   * path instead of being spliced out from under it — a summon that skipped `defeated` would
   * leave its aura Graphics and its corpse bookkeeping behind, and an amalgam owes the
   * arena its death blast on the way out. The Alpha is left alone: it turns on whoever raised
   * it, which makes it an enemy rather than a summon.
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
    for (let i = this.graves.length - 1; i >= 0; i--) {
      const g = this.graves[i];
      if (g.owner === exceptOwner || !near(g.x, g.y)) continue;
      this.fx(g.owner).stain(g.x, g.y, 20, 1, this.tonesOf(g.owner));
      g.sprite.destroy();
      g.aura.destroy();
      this.graves.splice(i, 1);
      razed++;
    }
    for (const rec of [...this.graveZombies, ...this.amalgams]) {
      const husk = rec.husk;
      if (rec.owner === exceptOwner || !husk.active || husk.hp <= 0) continue;
      if (!near(husk.x, husk.y)) continue;
      husk.takeDamage(husk.hp + 9999, { pierce: true });
      razed++;
    }
    return razed;
  }
}
