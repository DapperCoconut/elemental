import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Husk, HuskWorld } from '../../invasion/Husk';
import { BASIC_HUSK, HUSK_VARIANTS, HuskVariantDef, huskTextureKey } from '../../invasion/HuskVariants';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import {
  ANGERED_TONES, NPC_TONES, ROT_TONES, SOUL, SPIRIT_TONES, SoulAmalgamBody,
  SoulAvatar, SoulColorFn, SoulFx, SoulShroud, SoulTones, TORMENT_TONES, tonesFor,
} from './SoulVisuals';

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
  /** Possession drives the ridden amalgam off the same four keys the caster walks on. */
  readonly wKey: Phaser.Input.Keyboard.Key;
  readonly aKey: Phaser.Input.Keyboard.Key;
  readonly sKey: Phaser.Input.Keyboard.Key;
  readonly dKey: Phaser.Input.Keyboard.Key;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly isInvasion: boolean;
  readonly width: number;
  readonly height: number;
  hasUpgrade(slot: string): boolean;
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
const AMALGAM_RESIST_PER = 0.05;
const AMALGAM_RESIST_CAP = 0.75;
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

/** A live siphon cord. `mend` lines feed an amalgam; `drain` lines empty anything else. */
interface SiphonLine {
  owner: Owner;
  kind: 'drain' | 'mend';
  target: Fighter;
  /** Repainted every frame — a taut cord with spirit crawling along it. */
  gfx: Phaser.GameObjects.Graphics;
  tickAccum: number;
  /** Own clock, so three cords off one hand don't pulse in lockstep. */
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
  inflamed?: boolean;
}

interface Amalgam {
  husk: Husk;
  owner: Owner;
  waypoint: { x: number; y: number } | null;
  burning: boolean;
  baseBiteDamage: number;
  dashBiteDamage: number;
  nextDashAt: number;
  dashUntil: number;
  nextEmberAt: number;
  /** The drawn creature. The husk sprite underneath it is hidden — this *is* the amalgam. */
  body: SoulAmalgamBody;
  burnTickAccum: number;
  meleeTickAccum: number;
  /** Carrion Call (F+): timestamp until which +speed/+damage is active. */
  carrionUntil: number;
  nextTrailAt: number;
  variant: HuskVariantDef;
  angered: boolean;
  inflamed: boolean;
  /** Inflamed: cumulative damage taken since the last 20-dmg ember release. */
  damageAccum: number;
  /** Grave Mistake: the friendly alpha fires a periodic cone. */
  isAlpha?: boolean;
  alphaNextConeAt?: number;
  /** Live veil of wisps while Hell's Torment (or Carrion Call) has hold of it. */
  shroud: SoulShroud | null;
  /** Own clock for the stitch seam and aura art. */
  t: number;
}

interface Ember {
  /** Repainted every frame — a burning scrap of spirit with its tail streaming behind it. */
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: Owner;
  expiresAt: number;
  big: boolean;
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

// ── Click: Siphon ──────────────────────────────────────────────────────
const SIPHON_MAX_LINES = 3;
/** The leash. A cord stretched past this snaps on its own. */
const SIPHON_RANGE = 330;
/** How near the cursor something has to be to catch a cord. */
const SIPHON_GRAB_RADIUS = 72;
const SIPHON_TICK_MS = 500;
const SIPHON_DRAIN_PER_TICK = 2;
const SIPHON_HEAL_PER_TICK = 4;

// ── Click+: Possession ───────────────────────────────────────────────
const POSSESS_DURATION_MS = 12000;
/** Runs from the moment you are put back in your own body, however that happened. */
const POSSESS_COOLDOWN_MS = 30000;
const POSSESS_BITE_CD_MS = 650;
const POSSESS_SPECIAL_CD_MS = 4000;
const POSSESS_CHARGE_MS = 400;
const POSSESS_CHARGE_SPEED_MULT = 3;

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

const TORMENT_SELF_DPS = 5;
const TORMENT_EMBER_COUNT = 3;
const TORMENT_EMBER_DMG = 5;
const TORMENT_AOE_RADIUS = 60;
const TORMENT_AOE_DMG = 15;
const TORMENT_DEATH_EMBER_COUNT = 12;
const TORMENT_DEATH_AOE_RADIUS = 120;
const TORMENT_DEATH_AOE_DMG = 30;
const FIRE_DOT_MS = 3000;
const EMBER_SPEED = 260;
const EMBER_LIFETIME_MS = 1200;
const EMBER_HIT_RADIUS = 24;

const INFLAMED_HP = 100;
const INFLAMED_BITE_DMG = 15;
const INFLAMED_DASH_DMG = 20;
const INFLAMED_DAMAGE_THRESHOLD = 20;
const INFLAMED_DEATH_EMBER_COUNT = 20;
const INFLAMED_DEATH_AOE_RADIUS = 170;
const INFLAMED_DEATH_AOE_DMG = 45;
/** HUD only — the corpse-queue icon for an Inflamed corpse. The body itself is drawn, not tinted. */
const INFLAMED_ICON_TINT = 0x882222;

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
 * Soul remaster: Lantern Light puddles, a 5-slot corpse queue fed by Grave
 * zombies (and real Invasion husk kills), Amalgam allies raised from that
 * queue, Death Whistle recalls + heals them, and Hell's Torment burns them
 * out in a blaze of embers. Amalgams and grave zombies are plain `Husk`
 * instances SoulKit owns and ticks manually — never added to `arena.enemies`.
 *
 * Upgrades layer on: overheal shields (Click+), grave enhancement into
 * Angered Zombies (E+), Invasion-variant recruitment via a friendly/hostile
 * `HuskWorld` (R+), a temporary speed+damage buff off Death Whistle (F+),
 * and a burnt "Inflamed" amalgam tier reborn from Hell's Torment kills (Q).
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
  /** Soul Mastery — Strength in Numbers: an always-on veil while mastery is enabled. */
  private masteryShroud: SoulShroud | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  /** Timestamp a cord was last opened, per side — drives the sustained reaching pose. */
  private siphonHeldUntil: Record<Owner, number> = { player: 0, npc: 0 };
  /** Call of the Void: the HP fraction this side's next whistle will claim at. Per-owner. */
  private voidThreshold: Record<Owner, number> = { player: VOID_CALL_BASE, npc: VOID_CALL_BASE };

  private siphons: SiphonLine[] = [];
  private decayClouds: DecayCloud[] = [];
  /** Click+ Possession — the amalgam the caster is currently riding, and its own clocks. */
  private possessed: Amalgam | null = null;
  private possessNextBiteAt = 0;
  private possessNextSpecialAt = 0;
  private possessChargeUntil = 0;
  private possessEndsAt = 0;
  /** When the caster was last put back in their own body — the 30s cooldown runs from here. */
  private possessLastEndedAt = -POSSESS_COOLDOWN_MS;
  private possessOpen = 0;
  private possessFlower: Phaser.GameObjects.Graphics | null = null;
  private possessT = 0;
  /** Screen-space panel naming whatever you are currently wearing. Player side only. */
  private possessHudPanel: Phaser.GameObjects.Graphics | null = null;
  private possessHudName: Phaser.GameObjects.Text | null = null;
  private possessHudKeys: Phaser.GameObjects.Text | null = null;
  private playerPointerWasDown = false;
  private graves: Grave[] = [];
  private graveZombies: GraveZombie[] = [];
  private amalgams: Amalgam[] = [];
  private embers: Ember[] = [];
  private soulShots: SoulShot[] = [];

  // ── Mastery: Strength in Numbers + Grave Mistake ──────────────────────
  private soulGreyLines: Phaser.GameObjects.Graphics | null = null;
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
    this.siphonHeldUntil = { player: 0, npc: 0 };
    this.voidThreshold = { player: VOID_CALL_BASE, npc: VOID_CALL_BASE };

    for (const s of this.siphons) s.gfx.destroy();
    this.siphons = [];
    for (const c of this.decayClouds) c.sprite.destroy();
    this.decayClouds = [];
    // Possession — the caster gets their body back whatever state the match ended in.
    this.possessed = null;
    this.possessNextBiteAt = 0;
    this.possessNextSpecialAt = 0;
    this.possessChargeUntil = 0;
    this.possessEndsAt = 0;
    this.possessLastEndedAt = -POSSESS_COOLDOWN_MS;
    this.possessOpen = 0;
    this.possessT = 0;
    this.possessFlower?.destroy(); this.possessFlower = null;
    this.possessHudPanel?.destroy(); this.possessHudPanel = null;
    this.possessHudName?.destroy(); this.possessHudName = null;
    this.possessHudKeys?.destroy(); this.possessHudKeys = null;
    this.playerPointerWasDown = false;
    if (this.arena.player.damageAbsorber) this.arena.player.damageAbsorber = null;
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
    for (const e of this.embers) e.sprite.destroy();
    this.embers = [];
    for (const s of this.soulShots) s.gfx.destroy();
    this.soulShots = [];

    // Mastery — Strength in Numbers + Grave Mistake
    this.soulGreyLines?.destroy(); this.soulGreyLines = null;
    if (this.alphaHusk?.scene) this.alphaHusk.destroy();
    this.alphaHusk = null;
    this.alphaBody?.destroy(); this.alphaBody = null;
    this.alphaState = 'none';
    this.alphaNextConeAt = 0;
    this.soulAntiHealUntil = 0;
    this.soulScreechLastCastAt = -SOUL_SCREECH_COOLDOWN_MS;
    this.corpseQueue = { player: [], npc: [] };
    for (const t of this.hudIcons) t.destroy();
    this.hudIcons = [];
    this.hudBodyCount?.destroy(); this.hudBodyCount = null;
    this.arena.player.incomingDamageMultiplier = this.arena.player.incomingDamageMultiplier === WARD_MULT ? 1 : this.arena.player.incomingDamageMultiplier;
    this.arena.npc.incomingDamageMultiplier = this.arena.npc.incomingDamageMultiplier === WARD_MULT ? 1 : this.arena.npc.incomingDamageMultiplier;
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

  siphonCount(owner: Owner): number { return this.siphons.filter((s) => s.owner === owner).length; }

  /**
   * Bot synergy — the kit's own loop, published for the AI: a grave zombie is a corpse waiting
   * to happen, and Siphon is the only thing that turns one into the other. This returns where
   * the npc's nearest drainable zombie is standing, or null. Side-effect free.
   */
  npcDrainPoint(): { x: number; y: number } | null {
    const { npc } = this.arena;
    let best: Husk | null = null;
    let bestD = SIPHON_RANGE;
    for (const gz of this.graveZombies) {
      if (gz.owner !== 'npc' || !gz.husk.active || gz.husk.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(npc.x, npc.y, gz.husk.x, gz.husk.y);
      if (d <= bestD) { bestD = d; best = gz.husk; }
    }
    return best ? { x: best.x, y: best.y } : null;
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
    const pointerJustDown = pointer.isDown && !this.playerPointerWasDown;
    this.playerPointerWasDown = pointer.isDown;
    if (!player.active || player.hp <= 0) return;
    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);

    // ── Click+ Possession: while riding, Click bites and E is the amalgam's own move ──
    // The caster's own R, F and Q still answer — the body is open, not asleep — but E belongs
    // to whatever you are wearing for as long as it lives, ahead of everything including a
    // mastery bound to that key. JustDown consumes the flag, so this ordering is the whole
    // arbitration: whoever reads E first owns the press.
    const riding = this.possessed;

    // ── Mastery — Grave Mistake takes over its bound slot ────────────────
    const graveSlot = this.arena.masteryActive ? this.graveMistakeSlot() : null;
    if (graveSlot && !(riding && graveSlot === 'e')) {
      const gk = graveSlot === 'e' ? eKey : graveSlot === 'r' ? rKey : graveSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(gk)) this.tryCastGraveMistake(time, mouseX, mouseY);
    }

    if (riding) {
      if (pointerJustDown) this.possessBite(time);
      if (Phaser.Input.Keyboard.JustDown(eKey)) this.possessSpecial(time);
    } else {
      // Click: Siphon — one cord per press, caught on whatever is nearest the cursor.
      if (pointerJustDown) player.castAbility('soul-siphon', ctx());
      if (graveSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('soul-arise', ctx());
    }

    if (graveSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) player.castAbility('soul-grave', ctx());
    if (graveSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) player.castAbility('soul-death-whistle', ctx());
    if (graveSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('soul-hells-torment', ctx());
  }

  // ── Per-frame update ────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.updateAvatars(time, delta);
    this.updateSiphons(time, delta);
    this.updateDecayClouds(time, delta);
    this.updatePossession(time, delta);
    this.updatePossessHud(time);
    this.updateGraves(time, delta);
    this.updateGraveZombies(time, delta);
    this.updateAmalgams(time, delta);
    this.updateEmbers(time, delta);
    this.updateSoulShots(time, delta);
    this.updateStrengthInNumbers();
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
      // A cord being held open is a sustained pose, not a string of jabs.
      this.playerAvatar.setHold(time < this.siphonHeldUntil.player ? 'spray' : null, aim);
      // A caster surrounded by their own dead is the character at full stretch.
      const host = this.amalgamCount('player');
      this.playerAvatar.setIntensity(host >= 3 ? 1.4 : host >= 1 ? 1.15 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);

      if (this.arena.masteryActive) {
        if (!this.masteryShroud) this.masteryShroud = new SoulShroud(scene, this.pcol, SPIRIT_TONES, 42, 0.7, 2, 7);
        // The veil thickens with the crowd, which is exactly what the passive scales on.
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
      this.npcAvatar.setHold(time < this.siphonHeldUntil.npc ? 'spray' : null, aim);
      this.npcAvatar.setIntensity(this.amalgamCount('npc') >= 2 ? 1.3 : 1);
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Cast entry points (from CastContext) ────────────────────────────

  /**
   * Siphon (Click). One press opens one cord onto whatever is nearest the cursor. A cord on
   * anything hostile — the other fighter, an invasion husk, the loose alpha, or one of your own
   * grave zombies — empties it a little at a time; a cord on one of your amalgams feeds it
   * instead, and anything above its maximum becomes shield HP without needing the upgrade.
   *
   * Three cords is the ceiling, and they may all land on the same thing. A fourth press recycles
   * the oldest rather than being refused, because the cords have no duration of their own and a
   * refusal would leave you stuck holding three lines onto something already dead in the water.
   */
  doSiphon(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    const fx = this.fx(owner);
    this.siphonHeldUntil[owner] = scene.time.now + 320;

    // Nearest valid anchor to the cursor, inside the grab radius.
    let best: { f: Fighter; kind: 'drain' | 'mend' } | null = null;
    let bestD = SIPHON_GRAB_RADIUS;
    for (const c of this.siphonCandidates(owner)) {
      const d = Phaser.Math.Distance.Between(tx, ty, c.f.x, c.f.y);
      if (d <= bestD) { bestD = d; best = c; }
    }
    if (!best) {
      // The gesture still fires on empty air — reaching for a spirit that isn't there.
      this.avatar(owner)?.play('raise', Math.atan2(ty - caster.y, tx - caster.x), 320);
      return;
    }
    if (Phaser.Math.Distance.Between(caster.x, caster.y, best.f.x, best.f.y) > SIPHON_RANGE) {
      if (owner === 'player') this.arena.showFloatingText(caster.x, caster.y - 40, 'TOO FAR', '#775588');
      return;
    }

    const mine = this.siphons.filter((s) => s.owner === owner);
    if (mine.length >= SIPHON_MAX_LINES) this.releaseSiphon(mine[0]);

    const tones = best.kind === 'drain' ? ROT_TONES : tonesFor(owner);
    this.siphons.push({
      owner, kind: best.kind, target: best.f,
      gfx: scene.add.graphics().setDepth(6),
      tickAccum: 0, t: Math.random() * 6,
    });
    this.avatar(owner)?.play('punch', Math.atan2(best.f.y - caster.y, best.f.x - caster.x));
    fx.tether(caster.x, caster.y, best.f.x, best.f.y, 320, 6, tones);
    fx.muzzleWisp(caster.x, caster.y, Math.atan2(best.f.y - caster.y, best.f.x - caster.x), 0.9, 6, tones);
    fx.ring(best.f.x, best.f.y, 20, 6, tones.glow, 320, 2.5, 6);

    // Click+ Possession: three mend cords on the same amalgam and you climb into it.
    if (owner === 'player' && best.kind === 'mend' && this.arena.hasUpgrade('click') && !this.possessed) {
      const rec = this.amalgams.find((a) => a.husk === best!.f);
      const full = rec && this.siphons.filter((s) => s.owner === 'player' && s.target === best!.f).length >= SIPHON_MAX_LINES;
      if (full) {
        const now = scene.time.now;
        const readyAt = this.possessLastEndedAt + POSSESS_COOLDOWN_MS;
        if (now >= readyAt) this.beginPossession(rec!);
        else {
          this.arena.showFloatingText(caster.x, caster.y - 44,
            `🌸 ${Math.ceil((readyAt - now) / 1000)}s`, '#775588');
        }
      }
    }
  }

  /** Everything a cord can be thrown onto this frame, tagged with what the cord would do. */
  private siphonCandidates(owner: Owner): { f: Fighter; kind: 'drain' | 'mend' }[] {
    const out: { f: Fighter; kind: 'drain' | 'mend' }[] = [];
    for (const f of this.foesOf(owner)) out.push({ f, kind: 'drain' });
    // Your own grave zombies are hostile bodies: draining them is how the corpse queue is fed.
    for (const gz of this.graveZombies) {
      if (gz.owner === owner && gz.husk.active && gz.husk.hp > 0) out.push({ f: gz.husk, kind: 'drain' });
    }
    for (const rec of this.amalgams) {
      if (rec.owner === owner && rec.husk.active && rec.husk.hp > 0) out.push({ f: rec.husk, kind: 'mend' });
    }
    return out;
  }

  private releaseSiphon(line: SiphonLine): void {
    const idx = this.siphons.indexOf(line);
    if (idx !== -1) this.siphons.splice(idx, 1);
    line.gfx.destroy();
  }

  private updateSiphons(time: number, delta: number): void {
    for (let i = this.siphons.length - 1; i >= 0; i--) {
      const s = this.siphons[i];
      const caster = this.fighterOf(s.owner);
      const target = s.target;
      if (!caster.active || !target.active || target.hp <= 0) { this.releaseSiphon(s); continue; }

      const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
      if (dist > SIPHON_RANGE) {
        // Snapped. The spirit that was in the cord comes apart where it broke.
        this.fx(s.owner).wisps((caster.x + target.x) / 2, (caster.y + target.y) / 2, 5, {
          speed: 90, size: 2.6, life: 420, rise: -20, depth: 6,
          tones: s.kind === 'drain' ? ROT_TONES : tonesFor(s.owner),
        });
        if (s.owner === 'player') this.arena.showFloatingText(target.x, target.y - 30, 'SNAPPED', '#775588');
        this.releaseSiphon(s);
        continue;
      }

      s.t += delta / 1000;
      s.gfx.clear();
      SoulFx.drawSiphon(
        s.gfx, this.col(s.owner), s.kind === 'drain' ? ROT_TONES : tonesFor(s.owner),
        caster.x, caster.y, target.x, target.y, s.t, s.kind === 'drain',
        Phaser.Math.Clamp(dist / SIPHON_RANGE, 0, 1),
      );

      s.tickAccum += delta;
      while (s.tickAccum >= SIPHON_TICK_MS) {
        s.tickAccum -= SIPHON_TICK_MS;
        if (s.kind === 'drain') {
          target.takeDamage(SIPHON_DRAIN_PER_TICK);
          this.arena.spawnHitFlash(target.x, target.y, 0x33cc44);
        } else {
          this.healAllyWithOverheal(target, SIPHON_HEAL_PER_TICK);
        }
      }
    }
  }

  doArise(owner: Owner): void {
    const caster = this.fighterOf(owner);
    const fx = this.fx(owner);
    const tones = tonesFor(owner);
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
    fx.soulRise(caster.x, caster.y + 6, 46, 620, 5, corpse.inflamed ? TORMENT_TONES : tones);
    this.spawnAmalgam(owner, corpse);
  }

  doGrave(tx: number, ty: number, owner: Owner): void {
    const scene = this.arena.scene;
    const caster = this.fighterOf(owner);
    const x = Phaser.Math.Clamp(tx, 20, this.arena.width - 20);
    const y = Phaser.Math.Clamp(ty, 20, this.arena.height - 20);
    const fx = this.fx(owner);
    const tones = tonesFor(owner);
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
    const tones = tonesFor(owner);
    // Hands cupped to the mouth, then flung apart with the sound.
    this.avatar(owner)?.play('clap', Math.atan2(ty - caster.y, tx - caster.x));
    fx.shriek(tx, ty, 96, 640, 8, tones);
    fx.motes(tx, ty, 6, 60, 6, tones);

    let count = 0;
    for (const rec of this.amalgams) {
      // The one you are riding answers to you, not to the whistle.
      if (this.possessed === rec) continue;
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
    const tones = tonesFor(owner);
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

  doHellsTorment(owner: Owner): void {
    const caster = this.fighterOf(owner);
    const fx = this.fx(owner);
    let count = 0;
    const now = this.arena.scene.time.now;
    // The ultimate: both arms thrust up and held while the fire takes hold.
    this.avatar(owner)?.play('raise');
    for (const rec of this.amalgams) {
      if (rec.owner === owner && rec.husk.active && rec.husk.hp > 0) {
        if (!rec.burning && owner === 'player') this.arena.recordMasteryStat('tormentBurns', 1);
        rec.burning = true;
        rec.nextEmberAt = now;
        // Ignition burst on the frame each one catches.
        fx.bloom(rec.husk.x, rec.husk.y, 26, 8, 5, TORMENT_TONES);
        fx.ring(rec.husk.x, rec.husk.y, 6, 46, SOUL.ember, 380, 3.5, 5);
        count++;
      }
    }
    if (count > 0) {
      // The command itself lands as a front rolling off the caster.
      fx.ring(caster.x, caster.y, 14, 120, SOUL.flame, 520, 5, 6);
      fx.wisps(caster.x, caster.y, 10, { speed: 150, size: 3.4, life: 700, rise: -50, depth: 6, tones: TORMENT_TONES });
      this.arena.showFloatingText(caster.x, caster.y - 44, "🔥 HELL'S TORMENT", '#ff4411');
    }
  }

  // ── Corpse queue ─────────────────────────────────────────────────────

  private corpseCap(owner: Owner): number {
    void owner;
    return CORPSE_CAP_BASE;
  }

  private pushCorpse(owner: Owner, corpse: Corpse): void {
    const queue = this.corpseQueue[owner];
    queue.unshift({ ...corpse, maxHp: Math.max(1, Math.round(corpse.maxHp)) });
    const cap = this.corpseCap(owner);
    if (queue.length > cap) queue.length = cap;
  }

  // ── Amalgams ─────────────────────────────────────────────────────────

  /** The shades an amalgam's flesh is painted in — its tier wins over whose it is. */
  private amalgamTones(rec: Amalgam): SoulTones {
    if (rec.inflamed || rec.burning) return TORMENT_TONES;
    if (rec.angered) return ANGERED_TONES;
    return tonesFor(rec.owner);
  }

  /**
   * Builds the drawn creature for an amalgam and hides the husk sprite behind it. The sprite
   * stays alive (it owns the physics body, the health bar and every status field) — it just
   * isn't what you look at any more.
   */
  private buildAmalgamBody(husk: Husk, owner: Owner, variant: HuskVariantDef, isAlpha = false): SoulAmalgamBody {
    husk.setVisible(false);
    return new SoulAmalgamBody(this.arena.scene, this.col(owner), {
      size: AMALGAM_BODY_SIZE * husk.sizeMult,
      fleshColor: variant.id !== 'basic' ? variant.color : undefined,
      quirk: variant.quirk,
      alpha: isAlpha,
      depth: 6,
    });
  }

  private spawnAmalgam(owner: Owner, corpse: Corpse): void {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    const ox = caster.x + (Math.random() - 0.5) * 50;
    const oy = caster.y + (Math.random() - 0.5) * 50;

    const inflamed = !!corpse.inflamed;
    const variant = inflamed ? BASIC_HUSK : (corpse.variant ?? BASIC_HUSK);
    const angered = !!corpse.angered;

    let maxHp = Math.max(10, corpse.maxHp);
    let biteDmg: number;
    let dashDmg: number;
    let speed: number;

    if (inflamed) {
      maxHp = INFLAMED_HP;
      biteDmg = INFLAMED_BITE_DMG;
      dashDmg = INFLAMED_DASH_DMG;
      speed = AMALGAM_SPEED;
    } else {
      biteDmg = Math.max(1, Math.round(AMALGAM_BITE_DMG * variant.damageMult));
      dashDmg = Math.max(1, Math.round(AMALGAM_DASH_BITE_DMG * variant.damageMult));
      speed = AMALGAM_SPEED * variant.speedMult * (angered ? ANGERED_SPEED_MULT : 1);
    }

    const husk = new Husk(scene, ox, oy, maxHp, Math.round(speed), biteDmg, AMALGAM_BITE_CD_MS, variant);
    husk.world = this.huskWorld;
    husk.onBite = (dmg, target) => {
      target.takeDamage(dmg);
      if (owner === 'player') this.arena.recordMasteryStat('amalgamDamage', dmg);
    };
    if (owner === 'player') this.arena.recordMasteryStat('amalgamsSummoned', 1);

    const now = scene.time.now;
    const rec: Amalgam = {
      husk, owner, waypoint: null, burning: false,
      baseBiteDamage: biteDmg,
      dashBiteDamage: dashDmg,
      nextDashAt: now + AMALGAM_DASH_INTERVAL_MIN_MS + Math.random() * (AMALGAM_DASH_INTERVAL_MAX_MS - AMALGAM_DASH_INTERVAL_MIN_MS),
      dashUntil: 0,
      nextEmberAt: 0,
      body: this.buildAmalgamBody(husk, owner, variant),
      burnTickAccum: 0,
      meleeTickAccum: 0,
      carrionUntil: 0,
      nextTrailAt: 0,
      variant,
      angered,
      inflamed,
      damageAccum: 0,
      shroud: null,
      t: Math.random() * 10,
    };
    husk.once('defeated', () => this.onAmalgamDefeated(rec));
    husk.on('damaged', (amount: number) => {
      if (amount <= 0 || !husk.active) return;
      this.arena.spawnDamageNumber(husk.x, husk.y - 20, amount);
      if (rec.inflamed) {
        rec.damageAccum += amount;
        while (rec.damageAccum >= INFLAMED_DAMAGE_THRESHOLD && husk.active && husk.hp > 0) {
          rec.damageAccum -= INFLAMED_DAMAGE_THRESHOLD;
          this.emitTormentTick(rec);
        }
      }
    });
    this.amalgams.push(rec);
    const label = inflamed ? '🔥 THE INFLAMED RISES'
      : angered ? '🧟 ANGERED AMALGAM RISES'
      : variant.id !== 'basic' ? `🧟 ${variant.name.toUpperCase()} RECRUITED`
      : '🧟 AMALGAM RISES';
    this.arena.showFloatingText(caster.x, caster.y - 44, label, inflamed ? '#ff5522' : '#9966cc');
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
        if (this.possessed === rec) this.endPossession('the amalgam fell');
        this.amalgams.splice(i, 1);
        continue;
      }

      rec.t += delta / 1000;
      const col = this.col(rec.owner);
      const tones = this.amalgamTones(rec);
      const size = AMALGAM_BODY_SIZE * husk.sizeMult;

      // The creature itself, repainted from scratch every frame.
      const vel = (husk.body as Phaser.Physics.Arcade.Body).velocity;
      // A ridden body faces what *you* could bite, not what its AI would have picked.
      const hunted = this.nearestOf(
        this.possessed === rec ? this.possessTargets(rec) : this.amalgamTargets(rec.owner), husk.x, husk.y,
      );
      rec.body.update(delta, {
        x: husk.x, y: husk.y, vx: vel.x, vy: vel.y,
        alpha: husk.alpha,
        // The bite lunge is a scale tween on the (hidden) sprite — read it back as a body pop.
        pop: husk.scaleX / Math.max(0.01, husk.sizeMult),
        aim: hunted ? Math.atan2(hunted.y - husk.y, hunted.x - husk.x) : null,
        tones,
        dashing: rec.dashUntil > 0,
        burning: rec.burning,
        inflamed: rec.inflamed,
        angered: rec.angered,
      });

      // A burning or buffed amalgam wears a live veil, so its state reads at a glance.
      const wantShroud = rec.burning || rec.carrionUntil > time;
      if (wantShroud && !rec.shroud) {
        rec.shroud = new SoulShroud(scene, col, rec.burning ? TORMENT_TONES : ANGERED_TONES, size * 1.5, 0.9, 5, 6);
      } else if (!wantShroud && rec.shroud) {
        rec.shroud.destroy();
        rec.shroud = null;
      }
      if (rec.shroud) {
        rec.shroud.setTones(rec.burning ? TORMENT_TONES : ANGERED_TONES);
        rec.shroud.update(delta, husk.x, husk.y, husk.alpha);
      }

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
          if (rec.owner === 'player' && this.arena.hasUpgrade('f')) {
            rec.carrionUntil = time + CARRION_BUFF_MS;
            husk.walkSpeedMult = CARRION_SPEED_MULT;
            if (rec.dashUntil === 0) husk.biteDamage = this.effectiveDamage(rec, rec.baseBiteDamage, time);
            this.arena.showFloatingText(husk.x, husk.y - 46, '🩸 CARRION CALL', '#ff3333');
          }
          rec.waypoint = null;
        } else {
          body.setVelocity((dx / dist) * husk.speed, (dy / dist) * husk.speed);
        }
      } else if (this.possessed === rec) {
        // You are steering it. Its own AI stays out of the way; `updatePossession` owns the
        // velocity, and the bite is a key rather than a proximity check.
        rec.nextDashAt = time + AMALGAM_DASH_INTERVAL_MAX_MS;
      } else {
        const targets = this.amalgamTargets(rec.owner);
        husk.update(targets, time, delta);

        // Recruited invasion variants fight with their own AI (kiting/charging/healing).
        // The dash-burst flourish is only for plain/angered amalgams.
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

      // Hell's Torment burn.
      if (rec.burning && husk.active) {
        rec.burnTickAccum += delta;
        while (rec.burnTickAccum >= 1000 && husk.hp > 0) {
          rec.burnTickAccum -= 1000;
          husk.takeDamage(TORMENT_SELF_DPS);
        }
        if (husk.active && husk.hp > 0 && time >= rec.nextEmberAt) {
          rec.nextEmberAt = time + 1000;
          this.emitTormentTick(rec);
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
    // Possession lasts exactly as long as the thing you are wearing.
    if (this.possessed === rec) this.endPossession('the amalgam fell');

    const husk = rec.husk;
    const fx = this.fx(rec.owner);
    // Cruel Offering (E+): every one of your risen leaves its rot where it fell.
    if (rec.owner === 'player' && this.arena.hasUpgrade('e')) this.spawnDecayCloud(rec.owner, husk.x, husk.y);

    if (rec.burning) {
      const radius = rec.inflamed ? INFLAMED_DEATH_AOE_RADIUS : TORMENT_DEATH_AOE_RADIUS;
      const dmg = rec.inflamed ? INFLAMED_DEATH_AOE_DMG : TORMENT_DEATH_AOE_DMG;
      const emberCount = rec.inflamed ? INFLAMED_DEATH_EMBER_COUNT : TORMENT_DEATH_EMBER_COUNT;
      this.emitEmbers(rec.owner, husk.x, husk.y, emberCount, true);
      // An Inflamed goes off harder than a plain torment kill, so the *content* scales too.
      fx.immolate(husk.x, husk.y, radius * 0.62, {
        tones: TORMENT_TONES,
        wisps: rec.inflamed ? 18 : 11,
        motes: rec.inflamed ? 7 : 4,
        duration: rec.inflamed ? 640 : 480,
      });
      this.arena.scene.cameras.main.shake(rec.inflamed ? 220 : 140, rec.inflamed ? 0.008 : 0.004);
      this.dealSoulAoe(husk.x, husk.y, radius, dmg, rec.owner);
      this.applyDotToFoesInRadius(rec.owner, husk.x, husk.y, radius);
      this.arena.showFloatingText(husk.x, husk.y - 30, '💥 IMMOLATED', '#ff6622');

      if (!rec.inflamed && rec.owner === 'player' && this.arena.hasUpgrade('q')) {
        this.pushCorpse(rec.owner, { maxHp: INFLAMED_HP, inflamed: true });
        this.arena.showFloatingText(husk.x, husk.y - 50, '😈 INFLAMED', '#ff3333');
      }
    } else if (rec.inflamed) {
      // The Inflamed always detonate on death, torment or not.
      this.emitEmbers(rec.owner, husk.x, husk.y, INFLAMED_DEATH_EMBER_COUNT, true);
      fx.immolate(husk.x, husk.y, INFLAMED_DEATH_AOE_RADIUS * 0.62, {
        tones: TORMENT_TONES, wisps: 18, motes: 7, duration: 640,
      });
      this.arena.scene.cameras.main.shake(220, 0.008);
      this.dealSoulAoe(husk.x, husk.y, INFLAMED_DEATH_AOE_RADIUS, INFLAMED_DEATH_AOE_DMG, rec.owner);
      this.applyDotToFoesInRadius(rec.owner, husk.x, husk.y, INFLAMED_DEATH_AOE_RADIUS);
      this.arena.showFloatingText(husk.x, husk.y - 30, '💥 IMMOLATED', '#ff6622');
    } else {
      // Even a quiet death gives the spirit back: it comes apart into wisps and drifts off.
      const tones = tonesFor(rec.owner);
      fx.wisps(husk.x, husk.y, 7, { speed: 70, size: 3, life: 720, rise: -46, depth: 6, tones });
      fx.stain(husk.x, husk.y, 22, 1, tones);
    }

    if (rec.variant.explodes) this.emitBlast(husk.x, husk.y, Math.round(husk.biteDamage * 2), this.foesOf(rec.owner), rec.owner);

    husk.hideHealthBar();
    this.arena.scene.tweens.add({
      targets: husk, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 350,
      onComplete: () => { if (husk.scene) husk.destroy(); },
    });
  }

  private emitTormentTick(rec: Amalgam): void {
    const husk = rec.husk;
    const fx = this.fx(rec.owner);
    this.emitEmbers(rec.owner, husk.x, husk.y, TORMENT_EMBER_COUNT, false);
    // The once-a-second cough of fire: a front plus a rosette, not a bare damage call.
    fx.ring(husk.x, husk.y, 10, TORMENT_AOE_RADIUS, SOUL.ember, 420, 4, 5);
    fx.wispBloom(husk.x, husk.y, TORMENT_AOE_RADIUS * 0.5, 400, 5, TORMENT_TONES);
    this.dealSoulAoe(husk.x, husk.y, TORMENT_AOE_RADIUS, TORMENT_AOE_DMG, rec.owner);
    this.applyDotToFoesInRadius(rec.owner, husk.x, husk.y, TORMENT_AOE_RADIUS);
  }

  // ── Mastery — Strength in Numbers passive ─────────────────────────────

  private updateStrengthInNumbers(): void {
    if (!this.arena.masteryActive) {
      if (this.soulGreyLines) { this.soulGreyLines.clear(); }
      return;
    }
    const mine = this.amalgams.filter((a) => a.owner === 'player' && a.husk.active && a.husk.hp > 0);
    const resist = Math.min(AMALGAM_RESIST_CAP, AMALGAM_RESIST_PER * Math.max(0, mine.length - 1));
    const mult = 1 - resist;
    for (const a of mine) a.husk.incomingDamageMultiplier = mult;
    if (!this.soulGreyLines) this.soulGreyLines = this.arena.scene.add.graphics().setDepth(2);
    const g = this.soulGreyLines;
    g.clear();
    // Each bond thickens and brightens as the resist climbs, so the passive's strength is a
    // visual quantity rather than a number you have to remember.
    const strength = resist / AMALGAM_RESIST_CAP;
    const t = this.arena.scene.time.now / 1000;
    for (let i = 0; i < mine.length; i++) {
      for (let j = i + 1; j < mine.length; j++) {
        SoulFx.drawBond(g, this.pcol, SPIRIT_TONES,
          mine[i].husk.x, mine[i].husk.y, mine[j].husk.x, mine[j].husk.y, t + i + j, strength);
      }
    }
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
      this.pfx.shriek(husk.x, husk.y, 160, 820, 8, SPIRIT_TONES);
      this.arena.scene.cameras.main.shake(360, 0.009);
    }
    this.alphaBody?.collapse(); this.alphaBody = null;
    this.alphaHusk = null;
    this.alphaState = 'defeated';
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 50, '💀 ALPHA SLAIN — SOUL SCREECH UNLOCKED', '#cc88ff');
    this.spawnFriendlyAlpha();
  }

  /**
   * The Alpha you beat, joining you. Deliberately exempt from `SOUL_HUSK_CAP`: it is the payout
   * for killing a 200 HP horror rather than something you can raise on demand, and it replaced a
   * body that was already on the field.
   */
  private spawnFriendlyAlpha(): void {
    const scene = this.arena.scene;
    const caster = this.arena.player;
    const ox = caster.x + (Math.random() - 0.5) * 50, oy = caster.y + (Math.random() - 0.5) * 50;
    const husk = new Husk(scene, ox, oy, ALPHA_HP, ALPHA_SPEED, ALPHA_BITE_DMG, 1000, BASIC_HUSK);
    husk.sizeMult = 2.1; husk.applySizeMult();
    husk.world = this.huskWorld;
    husk.onBite = (dmg, target) => {
      target.takeDamage(dmg);
      this.arena.recordMasteryStat('amalgamDamage', dmg);
    };
    this.pfx.soulRise(ox, oy + 8, 76, 780, 5, SPIRIT_TONES);
    this.pfx.bloom(ox, oy, 40, 11, 5, SPIRIT_TONES);
    const now = scene.time.now;
    const rec: Amalgam = {
      husk, owner: 'player', waypoint: null, burning: false,
      baseBiteDamage: ALPHA_BITE_DMG, dashBiteDamage: ALPHA_BITE_DMG,
      nextDashAt: now + 99999, dashUntil: 0, nextEmberAt: 0,
      body: this.buildAmalgamBody(husk, 'player', BASIC_HUSK, true),
      burnTickAccum: 0, meleeTickAccum: 0, carrionUntil: 0, nextTrailAt: 0,
      variant: BASIC_HUSK, angered: false, inflamed: false, damageAccum: 0,
      shroud: null, t: 0,
      isAlpha: true, alphaNextConeAt: now + ALPHA_CONE_INTERVAL_MS,
    };
    husk.once('defeated', () => this.onAmalgamDefeated(rec));
    this.amalgams.push(rec);
    this.arena.recordMasteryStat('amalgamsSummoned', 1);
    this.arena.showFloatingText(ox, oy - 46, '🧟 ALPHA JOINS YOU', '#cc88ff');
  }

  private fireAlphaCone(from: Husk, target: Fighter, hitsCaster: boolean, antiHeal: boolean): void {
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
        damage: ALPHA_CONE_DAMAGE, owner: 'player', hitsCaster, antiHeal,
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
    this.pfx.shriek(player.x, player.y, SOUL_SCREECH_RADIUS, 700, 9, SPIRIT_TONES);
    this.pfx.wisps(player.x, player.y, 14, {
      speed: SOUL_SCREECH_RADIUS * 1.6, size: 3.4, life: 640, rise: -50, depth: 8, tones: SPIRIT_TONES,
    });
    this.pfx.motes(player.x, player.y, 7, SOUL_SCREECH_RADIUS * 0.8, 7, SPIRIT_TONES);
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
      if (!rec.isAlpha || rec.owner !== 'player' || !rec.husk.active || rec.husk.hp <= 0) continue;
      if (time < (rec.alphaNextConeAt ?? 0)) continue;
      rec.alphaNextConeAt = time + ALPHA_CONE_INTERVAL_MS;
      const foe = this.arena.npc;
      if (foe.active && foe.hp > 0) this.fireAlphaCone(rec.husk, foe, false, false);
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
      const tones = g.tier >= 3 ? ANGERED_TONES : tonesFor(g.owner);
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
    fx.soulRise(ox, oy + 8, angered ? 54 : 40, 560, 4, angered ? ANGERED_TONES : tonesFor(grave.owner));
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
    const tones = rec.angered ? ANGERED_TONES : tonesFor(rec.owner);
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
    const tones = zRec ? ROT_TONES : tonesFor(owner);
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
    const tones = tonesFor(owner);
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

  // ── Click+ Possession ────────────────────────────────────────────────
  //
  // Three heal cords on one amalgam and the caster stops being a person: the body opens like a
  // flower and nothing can reach what is no longer in it, while everything you press goes to the
  // thing you are wearing. The trade is that the amalgam's health bar is now your clock — the
  // moment it dies you are standing back in the middle of the fight at whatever HP you left.

  /**
   * What a ridden body may bite. Its own AI only ever cared about the opposing fighter, but a
   * player driving it is standing in a field full of the dead — so every grave zombie on the
   * board (yours are how the corpse queue is fed) and the other side's risen are fair game too.
   */
  private possessTargets(rec: Amalgam): Fighter[] {
    const out = this.amalgamTargets(rec.owner);
    for (const gz of this.graveZombies) {
      if (gz.husk.active && gz.husk.hp > 0 && !out.includes(gz.husk)) out.push(gz.husk);
    }
    for (const a of this.amalgams) {
      if (a !== rec && a.owner !== rec.owner && a.husk.active && a.husk.hp > 0) out.push(a.husk);
    }
    return out;
  }

  /** The label E carries while riding — the variant's own move, named. */
  private possessSpecialName(rec: Amalgam): string {
    switch (rec.variant.behavior) {
      case 'ranged': return 'SPIT';
      case 'medic': return 'PULSE';
      default: return 'LUNGE';
    }
  }

  private beginPossession(rec: Amalgam): void {
    const { player } = this.arena;
    this.possessed = rec;
    rec.waypoint = null;
    this.possessOpen = 0;
    this.possessT = 0;
    this.possessNextBiteAt = 0;
    this.possessNextSpecialAt = 0;
    this.possessChargeUntil = 0;
    this.possessEndsAt = this.arena.scene.time.now + POSSESS_DURATION_MS;
    // Invincible: the absorber intercepts ahead of every shield, and swallows it whole.
    player.damageAbsorber = () => true;
    (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    this.playerAvatar?.play('raise', undefined, 700);
    this.pfx.bloom(player.x, player.y, 54, 14, 6, SPIRIT_TONES);
    this.pfx.ring(player.x, player.y, 10, 110, SOUL.orchid, 620, 5, 6);
    this.pfx.soulRise(player.x, player.y, 90, 800, 7, SPIRIT_TONES);
    this.pfx.tether(player.x, player.y, rec.husk.x, rec.husk.y, 620, 7, SPIRIT_TONES);
    this.pfx.shriek(rec.husk.x, rec.husk.y, 110, 640, 8, SPIRIT_TONES);
    this.arena.scene.cameras.main.shake(200, 0.005);
    this.arena.showFloatingText(player.x, player.y - 50, '🌸 POSSESSION — 12s', '#cc99ff');
    this.arena.showFloatingText(rec.husk.x, rec.husk.y - 46, 'YOU ARE IT NOW', '#eeddff');
  }

  private endPossession(reason: string): void {
    const { player } = this.arena;
    this.possessed = null;
    this.possessLastEndedAt = this.arena.scene.time.now;
    this.possessEndsAt = 0;
    this.possessOpen = 0;
    this.possessFlower?.destroy(); this.possessFlower = null;
    player.damageAbsorber = null;
    this.pfx.wisps(player.x, player.y, 12, {
      speed: 120, size: 3, life: 640, rise: -50, depth: 7, tones: SPIRIT_TONES,
    });
    this.pfx.ring(player.x, player.y, 90, 8, SOUL.orchid, 520, 4, 6);
    this.arena.showFloatingText(player.x, player.y - 50, `🌸 ${reason.toUpperCase()}`, '#9977bb');
    // The cords that opened it are spent with it.
    for (const s of [...this.siphons]) if (s.owner === 'player' && s.kind === 'mend') this.releaseSiphon(s);
  }

  /**
   * The ride itself. The caster's body is pinned and painted open; the amalgam takes WASD
   * straight off the same keys, so possession never needs a second control scheme.
   */
  private updatePossession(time: number, delta: number): void {
    const { player, scene } = this.arena;
    const rec = this.possessed;
    if (!rec) return;
    if (!rec.husk.active || rec.husk.hp <= 0) { this.endPossession('the amalgam fell'); return; }
    if (!player.active || player.hp <= 0) { this.endPossession('possession broken'); return; }
    // Twelve seconds is the whole ride, whatever state the body is in when it runs out.
    if (time >= this.possessEndsAt) { this.endPossession('possession spent'); return; }

    this.possessT += delta / 1000;
    this.possessOpen = Math.min(1, this.possessOpen + delta / 420);

    // The caster is not there to be moved.
    (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (!this.possessFlower) this.possessFlower = scene.add.graphics().setDepth(7);
    this.possessFlower.clear();
    SoulFx.drawFlower(this.possessFlower, this.pcol, SPIRIT_TONES,
      player.x, player.y, 30, this.possessT, this.possessOpen, 1);

    // WASD drives the husk. A charge started by E overrides it until it runs out.
    const body = rec.husk.body as Phaser.Physics.Arcade.Body;
    if (time < this.possessChargeUntil) return;
    const dx = (this.arena.dKey.isDown ? 1 : 0) - (this.arena.aKey.isDown ? 1 : 0);
    const dy = (this.arena.sKey.isDown ? 1 : 0) - (this.arena.wKey.isDown ? 1 : 0);
    if (dx === 0 && dy === 0) { body.setVelocity(0, 0); return; }
    const len = Math.hypot(dx, dy);
    const speed = rec.husk.speed * rec.husk.walkSpeedMult;
    body.setVelocity((dx / len) * speed, (dy / len) * speed);
  }

  /**
   * The possession readout: a screen-space plate under the corpse queue naming the body you are
   * wearing, its health, how much of the twelve seconds is left, and what the three keys now do.
   * While it is spent the same plate becomes the recovery clock, so the slot never goes blank and
   * you always know whether the third cord is going to do anything.
   *
   * Depth 21/22 — above the corpse-queue icons at 20, below anything a cast raises.
   */
  private updatePossessHud(time: number): void {
    const { scene, elementId } = this.arena;
    if (elementId !== 'soul' || !this.arena.hasUpgrade('click')) {
      if (this.possessHudPanel) {
        this.possessHudPanel.destroy(); this.possessHudPanel = null;
        this.possessHudName?.destroy(); this.possessHudName = null;
        this.possessHudKeys?.destroy(); this.possessHudKeys = null;
      }
      return;
    }
    const cx = scene.scale.width / 2;
    const y = HUD_Y + 30;
    const w = 190, h = 34;

    if (!this.possessHudPanel) {
      this.possessHudPanel = scene.add.graphics().setDepth(21).setScrollFactor(0);
      this.possessHudName = scene.add.text(cx, y - 7, '', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#eeddff',
      }).setOrigin(0.5).setDepth(22).setScrollFactor(0);
      this.possessHudKeys = scene.add.text(cx, y + 8, '', {
        fontSize: '9px', fontFamily: 'Arial', color: '#9977bb',
      }).setOrigin(0.5).setDepth(22).setScrollFactor(0);
    }
    const g = this.possessHudPanel;
    const name = this.possessHudName!;
    const keys = this.possessHudKeys!;
    g.clear();

    const rec = this.possessed;
    const ready = time - this.possessLastEndedAt >= POSSESS_COOLDOWN_MS;

    // The plate. Lilac while you are riding, dead grey while it recovers.
    g.fillStyle(0x0b0d16, 0.86);
    g.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 6);
    g.lineStyle(1.4, this.pcol(rec ? SOUL.orchid : ready ? SOUL.grape : SOUL.stone), rec ? 0.95 : 0.5);
    g.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 6);

    if (!rec) {
      name.setText(ready ? '🌸 POSSESSION READY' : `🌸 RECOVERING — ${Math.ceil((this.possessLastEndedAt + POSSESS_COOLDOWN_MS - time) / 1000)}s`)
        .setColor(ready ? '#cc99ff' : '#775588');
      keys.setText(ready ? 'three heal cords on one amalgam' : '');
      if (!ready) {
        // The recovery bar fills left to right along the bottom of the plate.
        const p = Phaser.Math.Clamp((time - this.possessLastEndedAt) / POSSESS_COOLDOWN_MS, 0, 1);
        g.fillStyle(this.pcol(SOUL.grape), 0.7);
        g.fillRoundedRect(cx - w / 2 + 3, y + h / 2 - 6, (w - 6) * p, 3, 1.5);
      }
      return;
    }

    const husk = rec.husk;
    const label = rec.inflamed ? '🔥 THE INFLAMED'
      : rec.isAlpha ? '☠️ ALPHA AMALGAM'
        : rec.variant.id !== 'basic' ? `${rec.variant.emoji ?? '🧟'} ${rec.variant.name.toUpperCase()}`
          : '🧟 AMALGAM';
    name.setText(`🌸 ${label}`).setColor(rec.angered ? '#ff7777' : '#eeddff');
    keys.setText(`WASD move · CLICK bite ${rec.baseBiteDamage} · E ${this.possessSpecialName(rec)}`);

    // Two stacked readouts: the body's health (with its shield laid over it) and the ride's clock.
    const barW = w - 12;
    const hpFrac = Phaser.Math.Clamp(husk.hp / Math.max(1, husk.maxHp), 0, 1);
    const shFrac = Phaser.Math.Clamp(husk.shieldHp / Math.max(1, husk.maxHp), 0, 1);
    g.fillStyle(0x2a1230, 0.9);
    g.fillRoundedRect(cx - barW / 2, y + h / 2 - 9, barW, 4, 2);
    g.fillStyle(0x44ff88, 0.95);
    g.fillRoundedRect(cx - barW / 2, y + h / 2 - 9, barW * hpFrac, 4, 2);
    if (shFrac > 0) {
      g.fillStyle(this.pcol(SOUL.lilac), 0.9);
      g.fillRoundedRect(cx - barW / 2, y + h / 2 - 9, barW * shFrac, 4, 2);
    }
    const left = Phaser.Math.Clamp((this.possessEndsAt - time) / POSSESS_DURATION_MS, 0, 1);
    g.fillStyle(0x2a1230, 0.9);
    g.fillRoundedRect(cx - barW / 2, y + h / 2 - 4, barW, 3, 1.5);
    g.fillStyle(this.pcol(left < 0.25 ? SOUL.blood : SOUL.orchid), 0.95);
    g.fillRoundedRect(cx - barW / 2, y + h / 2 - 4, barW * left, 3, 1.5);
  }

  private possessBite(time: number): void {
    const rec = this.possessed;
    if (!rec || time < this.possessNextBiteAt) return;
    this.possessNextBiteAt = time + POSSESS_BITE_CD_MS;
    const husk = rec.husk;
    const dmg = this.effectiveDamage(rec, rec.baseBiteDamage, time);
    const target = this.nearestOf(this.possessTargets(rec), husk.x, husk.y);
    const aim = target ? Math.atan2(target.y - husk.y, target.x - husk.x) : 0;
    // The lunge reads on the drawn body via the sprite's scale pop, the same as an AI bite.
    this.arena.scene.tweens.add({
      targets: husk, scaleX: husk.sizeMult * 1.25, scaleY: husk.sizeMult * 1.25,
      yoyo: true, duration: 110,
    });
    this.fx(rec.owner).muzzleWisp(husk.x + Math.cos(aim) * 14, husk.y + Math.sin(aim) * 14, aim, 1, 7, this.amalgamTones(rec));
    if (target && Phaser.Math.Distance.Between(husk.x, husk.y, target.x, target.y) <= AMALGAM_MELEE_RANGE + 8) {
      target.takeDamage(dmg);
      this.arena.spawnHitFlash(target.x, target.y, 0x9944cc);
      this.arena.recordMasteryStat('amalgamDamage', dmg);
    }
  }

  /**
   * E while riding: whatever this body could already do on its own. A spitter spits, a medic
   * pulses, and everything else throws itself forward — the same three moves the AI has, just
   * on your timing instead of its own.
   */
  private possessSpecial(time: number): void {
    const rec = this.possessed;
    if (!rec || time < this.possessNextSpecialAt) return;
    this.possessNextSpecialAt = time + POSSESS_SPECIAL_CD_MS;
    const husk = rec.husk;
    const target = this.nearestOf(this.possessTargets(rec), husk.x, husk.y);
    const aimX = target ? target.x : this.aimX;
    const aimY = target ? target.y : this.aimY;

    switch (rec.variant.behavior) {
      case 'ranged':
        this.doFireShot(husk, aimX, aimY, this.effectiveDamage(rec, rec.baseBiteDamage, time));
        this.arena.showFloatingText(husk.x, husk.y - 34, '🤮 SPIT', '#88ee99');
        break;
      case 'medic':
        this.doHealNearby(husk, 165, 0.12);
        this.arena.showFloatingText(husk.x, husk.y - 34, '💜 PULSE', '#cc99ff');
        break;
      default: {
        const ang = Math.atan2(aimY - husk.y, aimX - husk.x);
        const speed = husk.speed * husk.walkSpeedMult * POSSESS_CHARGE_SPEED_MULT;
        (husk.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
        this.possessChargeUntil = time + POSSESS_CHARGE_MS;
        this.fx(rec.owner).wisps(husk.x, husk.y, 6, {
          speed: 90, angle: ang + Math.PI, spread: 0.8, size: 3,
          life: 420, rise: -16, depth: 5, tones: this.amalgamTones(rec),
        });
        this.arena.showFloatingText(husk.x, husk.y - 34, '💨 LUNGE', '#eeddff');
        break;
      }
    }
  }

  // ── Embers (Hell's Torment) ──────────────────────────────────────────

  private emitEmbers(owner: Owner, x: number, y: number, count: number, big: boolean): void {
    const scene = this.arena.scene;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      this.embers.push({
        sprite: scene.add.graphics().setDepth(7), x, y,
        vx: Math.cos(ang) * EMBER_SPEED, vy: Math.sin(ang) * EMBER_SPEED,
        owner, expiresAt: scene.time.now + EMBER_LIFETIME_MS, big,
        t: Math.random() * 6,
      });
    }
  }

  private updateEmbers(time: number, delta: number): void {
    const W = this.arena.width, H = this.arena.height;
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      if (time >= e.expiresAt) { e.sprite.destroy(); this.embers.splice(i, 1); continue; }
      e.x += e.vx * delta / 1000;
      e.y += e.vy * delta / 1000;
      e.t += delta / 1000;
      e.sprite.clear();
      SoulFx.drawEmber(e.sprite, this.col(e.owner), e.x, e.y, Math.atan2(e.vy, e.vx), e.big ? 6 : 4, e.t, e.big);
      if (e.x < 0 || e.x > W || e.y < 0 || e.y > H) { e.sprite.destroy(); this.embers.splice(i, 1); continue; }

      let hit = false;
      for (const f of this.foesOf(e.owner)) {
        if (Phaser.Math.Distance.Between(e.x, e.y, f.x, f.y) <= EMBER_HIT_RADIUS) {
          f.takeDamage(TORMENT_EMBER_DMG);
          f.burningUntil = Math.max(f.burningUntil, time + FIRE_DOT_MS);
          this.arena.spawnHitFlash(f.x, f.y, 0xff6622);
          this.fx(e.owner).wisps(e.x, e.y, e.big ? 6 : 3, {
            speed: 90, size: 2.6, life: 420, rise: -22, depth: 7, tones: TORMENT_TONES,
          });
          hit = true;
          break;
        }
      }
      if (hit) { e.sprite.destroy(); this.embers.splice(i, 1); }
    }
  }

  private applyDotToFoesInRadius(owner: Owner, x: number, y: number, radius: number): void {
    const now = this.arena.scene.time.now;
    for (const f of this.foesOf(owner)) {
      if (Phaser.Math.Distance.Between(x, y, f.x, f.y) <= radius) {
        f.burningUntil = Math.max(f.burningUntil, now + FIRE_DOT_MS);
      }
    }
  }

  // ── Ward perk (Soul) ─────────────────────────────────────────────────

  private updateWardPerk(): void {
    for (const owner of ['player', 'npc'] as Owner[]) {
      const fighter = this.fighterOf(owner);
      if (!fighter.active) continue;
      const hasWard = this.arena.hasPerk(owner, 'ward');
      const nearby = hasWard ? this.amalgams.filter((r) => r.owner === owner && r.husk.active && r.husk.hp > 0
        && Phaser.Math.Distance.Between(fighter.x, fighter.y, r.husk.x, r.husk.y) <= WARD_RADIUS).length : 0;
      const shouldReduce = hasWard && nearby >= WARD_MIN_AMALGAMS;
      if (shouldReduce) {
        if (fighter.incomingDamageMultiplier > WARD_MULT) fighter.incomingDamageMultiplier = WARD_MULT;
      } else if (fighter.incomingDamageMultiplier === WARD_MULT) {
        fighter.incomingDamageMultiplier = 1;
      }
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
    this.hudBodyCount = scene.add.text(cx + (cap - 1) * 13 + 24, HUD_Y, '', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#9977bb',
    }).setOrigin(0, 0.5).setDepth(20);
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
      if (corpse.inflamed) icon.setTint(INFLAMED_ICON_TINT);
      else if (corpse.angered) icon.setTint(0xff4444);
      else icon.clearTint();
    }
    // Bodies standing, against the cap — turns red at the ceiling, which is when Arise refuses.
    const bodies = this.huskCount('player');
    this.hudBodyCount?.setText(`🧟 ${bodies}/${SOUL_HUSK_CAP}`)
      .setColor(bodies >= SOUL_HUSK_CAP ? '#ff7777' : '#9977bb');
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
   * and husks it owns, so a kit-side sweep is the only way the alpha eats a Torment blast.
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
   * leave its aura Graphics and its corpse bookkeeping behind, and a burning amalgam owes the
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
      this.fx(g.owner).stain(g.x, g.y, 20, 1, tonesFor(g.owner));
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
