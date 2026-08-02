import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Husk, HuskWorld } from '../../invasion/Husk';
import { BASIC_HUSK, HUSK_VARIANTS, HuskVariantDef, huskTextureKey } from '../../invasion/HuskVariants';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import {
  AmalgamQuirk, ANGERED_TONES, NPC_TONES, ROT_TONES, SOUL, SPIRIT_TONES, SoulAmalgamBody,
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

interface SoulPuddle {
  /** Repainted every frame — a pool of grave-light with wisps standing out of it. */
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  radius: number;
  owner: Owner;
  expiresAt: number;
  tickAccum: number;
  /** Own clock, so neighbouring pools ripple out of phase. */
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
  /** Cruel Offering (E+): enhanced graves spawn Angered Zombies instead of plain ones. */
  enhanced: boolean;
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
const LANTERN_PUDDLE_RADIUS = 14;
const LANTERN_PUDDLE_LIFETIME_MS = 2500;
const LANTERN_DPS = 5;
const LANTERN_HPS = 3;
const LANTERN_TICK_MS = 1000;

const GRAVE_SPAWN_INTERVAL_MS = 5000;
const GRAVE_ZOMBIE_HP = 20;
const GRAVE_ZOMBIE_SPEED = 70;
const GRAVE_ZOMBIE_BITE_DMG = 5;
const GRAVE_ZOMBIE_BITE_CD_MS = 1200;

const CRUEL_OFFERING_RADIUS = 70;
const VARIANT_ZOMBIE_CHANCE = 0.35;
const RECRUITABLE_VARIANTS: HuskVariantDef[] = HUSK_VARIANTS.filter((v) => !v.isBoss && v.id !== 'basic');
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

/**
 * The silhouette quirk a recruited invasion variant brings with it, so a Tank amalgam and a
 * Spitter amalgam are told apart by shape and not only by the colour bled into their flesh.
 */
const VARIANT_QUIRKS: Record<string, AmalgamQuirk> = {
  tank: 'bulk',
  speedster: 'lean',
  spitter: 'sac',
  medic: 'halo',
  rusher: 'horns',
  blaster: 'gut',
};

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
  /** Timestamp the lantern was last ticked, per side — drives the sustained spray pose. */
  private lanternHeldUntil: Record<Owner, number> = { player: 0, npc: 0 };
  /** Call of the Void: the HP fraction this side's next whistle will claim at. Per-owner. */
  private voidThreshold: Record<Owner, number> = { player: VOID_CALL_BASE, npc: VOID_CALL_BASE };

  private puddles: SoulPuddle[] = [];
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
    this.lanternHeldUntil = { player: 0, npc: 0 };
    this.voidThreshold = { player: VOID_CALL_BASE, npc: VOID_CALL_BASE };

    for (const p of this.puddles) p.sprite.destroy();
    this.puddles = [];
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
    this.arena.player.incomingDamageMultiplier = this.arena.player.incomingDamageMultiplier === WARD_MULT ? 1 : this.arena.player.incomingDamageMultiplier;
    this.arena.npc.incomingDamageMultiplier = this.arena.npc.incomingDamageMultiplier === WARD_MULT ? 1 : this.arena.npc.incomingDamageMultiplier;
  }

  // ── Public accessors ───────────────────────────────────────────────────

  corpseCount(owner: Owner): number { return this.corpseQueue[owner].length; }

  amalgamCount(owner: Owner): number {
    return this.amalgams.filter((r) => r.owner === owner && r.husk.active && r.husk.hp > 0).length;
  }

  graveCount(owner: Owner): number { return this.graves.filter((g) => g.owner === owner).length; }

  /** Invasion: a real husk died — feed it into the player's corpse queue. */
  onRealHuskKilled(husk: Husk): void {
    this.pushCorpse('player', { maxHp: husk.maxHp, variant: husk.variant.id !== 'basic' ? husk.variant : undefined });
  }

  // ── Input ────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    const { player, eKey, rKey, fKey, qKey } = this.arena;
    // `update` has no pointer, so the aim the rig faces is cached here.
    this.aimX = mouseX;
    this.aimY = mouseY;
    if (!player.active || player.hp <= 0) return;
    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);

    // ── Mastery — Grave Mistake takes over its bound slot ────────────────
    const graveSlot = this.arena.masteryActive ? this.graveMistakeSlot() : null;
    if (graveSlot) {
      const gk = graveSlot === 'e' ? eKey : graveSlot === 'r' ? rKey : graveSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(gk)) this.tryCastGraveMistake(time, mouseX, mouseY);
    }

    // Click: Lantern Light — held down, rate-limited by the ability's own short cooldown.
    if (pointer.isDown) player.castAbility('soul-lantern-light', ctx());

    if (graveSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('soul-arise', ctx());
    if (graveSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) player.castAbility('soul-grave', ctx());
    if (graveSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) player.castAbility('soul-death-whistle', ctx());
    if (graveSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('soul-hells-torment', ctx());
  }

  // ── Per-frame update ────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.updateAvatars(time, delta);
    this.updatePuddles(time, delta);
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
      // Holding the lantern down is a sustained pose, not a string of jabs.
      this.playerAvatar.setHold(time < this.lanternHeldUntil.player ? 'spray' : null, aim);
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
      this.npcAvatar.setHold(time < this.lanternHeldUntil.npc ? 'spray' : null, aim);
      this.npcAvatar.setIntensity(this.amalgamCount('npc') >= 2 ? 1.3 : 1);
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Cast entry points (from CastContext) ────────────────────────────

  doLanternTick(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    // Held down, so the pose is sustained: the window outlives one 150ms tick.
    this.lanternHeldUntil[owner] = scene.time.now + 320;
    this.spawnLanternTrail(caster.x, caster.y, tx, ty, owner);

    const spr = scene.add.graphics().setDepth(2);
    this.puddles.push({
      sprite: spr, x: tx, y: ty, radius: LANTERN_PUDDLE_RADIUS, owner,
      expiresAt: scene.time.now + LANTERN_PUDDLE_LIFETIME_MS, tickAccum: 0,
      t: Math.random() * 10,
    });
  }

  doArise(owner: Owner): void {
    const caster = this.fighterOf(owner);
    const fx = this.fx(owner);
    const tones = tonesFor(owner);
    if (owner === 'player' && this.arena.hasUpgrade('e')) {
      const grave = this.graves.find((g) => g.owner === owner && !g.enhanced
        && Phaser.Math.Distance.Between(caster.x, caster.y, g.x, g.y) <= CRUEL_OFFERING_RADIUS);
      if (grave) {
        grave.enhanced = true;
        grave.sprite.setTint(0xff4444);
        // Blood poured into the plot: the grave-light turns over to red on the spot.
        this.avatar(owner)?.play('slam', Math.atan2(grave.y - caster.y, grave.x - caster.x));
        fx.bloom(grave.x, grave.y, 30, 9, 4, ANGERED_TONES);
        fx.wisps(grave.x, grave.y, 8, { speed: 90, size: 3, life: 620, rise: -40, depth: 6, tones: ANGERED_TONES });
        fx.ring(grave.x, grave.y, 8, 54, SOUL.blood, 420, 4, 5);
        this.arena.showFloatingText(grave.x, grave.y - 30, '🔴 GRAVE ENHANCED', '#ff3333');
        return;
      }
    }
    const queue = this.corpseQueue[owner];
    if (queue.length === 0) {
      // The gesture still fires on an empty queue — reaching into a grave and finding nothing.
      this.avatar(owner)?.play('raise', undefined, 420);
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
    const sprite = scene.add.image(x, y, 'soul-grave').setDepth(3);
    this.graves.push({
      sprite, aura: scene.add.graphics().setDepth(2), auraT: Math.random() * 10,
      x, y, owner, nextSpawnAt: scene.time.now + GRAVE_SPAWN_INTERVAL_MS, enhanced: false,
    });
    fx.stain(x, y + 20, 26, 1, tones);
    fx.bloom(x, y + 6, 26, 8, 4, tones);
    fx.ring(x, y + 14, 6, 44, tones.glow, 420, 3.5, 4);
    fx.motes(x, y, 4, 22, 5, tones);
    this.arena.showFloatingText(x, y - 26, '⚰️ GRAVE PLACED', '#ccaaff');
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
      quirk: VARIANT_QUIRKS[variant.id],
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
            this.arena.showFloatingText(husk.x, husk.y - 46, '🔴 CARRION CALL', '#ff3333');
          }
          rec.waypoint = null;
        } else {
          body.setVelocity((dx / dist) * husk.speed, (dy / dist) * husk.speed);
        }
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

    const husk = rec.husk;
    const fx = this.fx(rec.owner);

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
      const tones = g.enhanced ? ANGERED_TONES : tonesFor(g.owner);
      const ready = 1 - Phaser.Math.Clamp((g.nextSpawnAt - time) / GRAVE_SPAWN_INTERVAL_MS, 0, 1);
      const gfx = g.aura;
      gfx.clear();
      SoulFx.drawPuddle(gfx, this.col(g.owner), tones, g.x, g.y + 20, 13 + ready * 7, g.auraT, 0.35 + ready * 0.45);
      if (time >= g.nextSpawnAt) {
        g.nextSpawnAt = time + GRAVE_SPAWN_INTERVAL_MS;
        this.spawnGraveZombie(g);
      }
    }
  }

  private spawnGraveZombie(grave: Grave): void {
    const scene = this.arena.scene;
    const ang = Math.random() * Math.PI * 2;
    const ox = grave.x + Math.cos(ang) * 20;
    const oy = grave.y + Math.sin(ang) * 20;

    let variant: HuskVariantDef = BASIC_HUSK;
    if (grave.owner === 'player' && this.arena.hasUpgrade('r') && Math.random() < VARIANT_ZOMBIE_CHANCE) {
      variant = RECRUITABLE_VARIANTS[Math.floor(Math.random() * RECRUITABLE_VARIANTS.length)];
    }
    const angered = grave.enhanced;
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

  // ── Lantern puddles ──────────────────────────────────────────────────

  private spawnLanternTrail(sx: number, sy: number, tx: number, ty: number, owner: Owner): void {
    this.fx(owner).lanternArc(sx, sy, tx, ty, 6, tonesFor(owner));
  }

  /** Heals an amalgam; with Click+ (`overheal`), any healing above its max HP becomes shield HP (capped at max HP). */
  private healAmalgam(husk: Husk, amount: number, overheal: boolean): void {
    const before = husk.hp;
    husk.heal(amount);
    if (!overheal) return;
    const overflow = amount - (husk.hp - before);
    if (overflow > 0) husk.shieldHp = Math.min(husk.maxHp, husk.shieldHp + overflow);
  }

  private updatePuddles(time: number, delta: number): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const p = this.puddles[i];
      if (time >= p.expiresAt) { p.sprite.destroy(); this.puddles.splice(i, 1); continue; }

      // The pool ripples on its own clock and thins out as its life runs down.
      p.t += delta / 1000;
      const life = Phaser.Math.Clamp((p.expiresAt - time) / LANTERN_PUDDLE_LIFETIME_MS, 0, 1);
      p.sprite.clear();
      SoulFx.drawPuddle(p.sprite, this.col(p.owner), tonesFor(p.owner), p.x, p.y, p.radius, p.t, 0.35 + life * 0.6);

      p.tickAccum += delta;
      if (p.tickAccum < LANTERN_TICK_MS) continue;
      p.tickAccum -= LANTERN_TICK_MS;

      for (const f of this.foesOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) <= p.radius + 18) {
          f.takeDamage(LANTERN_DPS);
          this.arena.spawnHitFlash(f.x, f.y, 0x9955ee);
        }
      }
      for (const gz of this.graveZombies) {
        if (gz.husk.active && gz.husk.hp > 0 && Phaser.Math.Distance.Between(p.x, p.y, gz.husk.x, gz.husk.y) <= p.radius + 18) {
          gz.husk.takeDamage(LANTERN_DPS);
        }
      }
      const casterFighter = this.fighterOf(p.owner);
      if (casterFighter.active && Phaser.Math.Distance.Between(p.x, p.y, casterFighter.x, casterFighter.y) <= p.radius + 18) {
        casterFighter.heal(LANTERN_HPS);
      }
      const overheal = p.owner === 'player' && this.arena.hasUpgrade('click');
      for (const rec of this.amalgams) {
        if (rec.owner === p.owner && rec.husk.active && rec.husk.hp > 0
          && Phaser.Math.Distance.Between(p.x, p.y, rec.husk.x, rec.husk.y) <= p.radius + 18) {
          this.healAmalgam(rec.husk, LANTERN_HPS, overheal);
        }
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
  purgeSummons(x: number, y: number, radius: number, exceptOwner: 'player' | 'npc'): number {
    const near = (px: number, py: number): boolean => Phaser.Math.Distance.Between(x, y, px, py) <= radius;
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
