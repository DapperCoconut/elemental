import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import {
  ArmGesture, GUNPOWDER, GunpowderAura, GunpowderAuraStyle, GunpowderAvatar, GunpowderColorFn,
  GunpowderFx, musket, smokePuff,
} from './GunpowderVisuals';

// ── Type definitions ──────────────────────────────────────────────────────────

type WeaponType =
  | 'pistol' | 'ar' | 'shotgun' | 'rifle' | 'grenade' | 'machinegun'
  | 'flamethrower' | 'rpg' | 'minigun' | 'sniper' | 'raygun' | 'freezeray' | 'gunblade';

interface WeaponDef {
  type: WeaponType;
  name: string;
  emoji: string;
  desc: string;
}

const WEAPON_DEFS: Record<WeaponType, WeaponDef> = {
  pistol: { type: 'pistol', name: 'Pistol', emoji: '🔫', desc: 'Hitscan, 10 dmg. Each copy: -10% Fire at Will cooldown.' },
  ar: { type: 'ar', name: 'AR', emoji: '💥', desc: '3 hitscan shots in quick succession, 6 dmg each.' },
  shotgun: { type: 'shotgun', name: 'Shotgun', emoji: '💨', desc: 'Cone of 10 pellets, 2 dmg each, short range.' },
  rifle: { type: 'rifle', name: 'Rifle', emoji: '🎯', desc: 'Large hitscan, 15 dmg. Each copy: +25% Musket Shot damage.' },
  grenade: { type: 'grenade', name: 'Grenade Launcher', emoji: '💣', desc: 'Lobs a grenade that explodes after a short fuse.' },
  machinegun: { type: 'machinegun', name: 'Machine Gun', emoji: '🔥', desc: '20 hitscan shots, 2 dmg each, up to 10° inaccurate.' },
  flamethrower: { type: 'flamethrower', name: 'Flamethrower', emoji: '🧯', desc: '10 flame clouds, 3 dmg each, fade in 3s or on contact. Each copy: muskets cool 20% slower.' },
  rpg: { type: 'rpg', name: 'RPG', emoji: '🚀', desc: 'Explosive rocket, 20 dmg in a large AOE. Each copy: +20% Fire at Will cooldown.' },
  minigun: { type: 'minigun', name: 'Minigun', emoji: '🌪️', desc: '30 hitscan shots, 2 dmg each. Slows you 50% while firing. Each copy: muskets cool 35% slower.' },
  sniper: { type: 'sniper', name: 'Sniper', emoji: '🔭', desc: 'Hitscan, 20 dmg. Only fires every other Fire at Will (red slot = will skip next).' },
  raygun: { type: 'raygun', name: 'Ray-Gun', emoji: '🟢', desc: 'Bouncy piercing bullet, 5 dmg + knockback, up to 3 hits before it burns out.' },
  freezeray: { type: 'freezeray', name: 'Freeze-Ray', emoji: '❄️', desc: 'Hitscan, 3 dmg + 1s stun. Each copy: muskets cool 20% faster.' },
  gunblade: { type: 'gunblade', name: 'Gunblade', emoji: '⚔️', desc: 'Long shot (10 dmg) or point-blank slash (15 dmg). Grants 20% damage reduction for 2s after firing.' },
};
const BASE_WEAPON_TYPES: WeaponType[] = ['pistol', 'ar', 'shotgun', 'rifle', 'grenade', 'machinegun'];
const EXTRA_WEAPON_TYPES: WeaponType[] = ['flamethrower', 'rpg', 'minigun', 'sniper', 'raygun', 'freezeray', 'gunblade'];

const MUSKET_MAX_AMMO = 3;
const ARSENAL_MAX = 3;
const ARSENAL_MAX_R_UPGRADED = 6;
const FIRE_AT_WILL_BASE_CD = 9000;

// ── Corruption (perk) — rotten powder: balls leave rot, dropped muskets fester ──
const ROT_MS = 5000;
const ROT_TICK_MS = 1000;
const ROT_DPS_PER_STACK = 3;
const ROT_MAX_STACKS = 3;
/** How close an enemy has to get to a still-hot musket to catch the rot off it. */
const ROT_FESTER_RADIUS = 40;
const ROT_FESTER_INTERVAL_MS = 1000;

// ── Demon (perk) — the volley you fired echoes back out of the demon behind you ──
const DEMON_ECHO_DELAY_MS = 600;
const DEMON_ECHO_DAMAGE_MULT = 0.6;
const DEMON_THIRD_VOLLEY_HP_RATIO = 0.35;
const DEMON_SHOT_SPEED = 620;
const DEMON_SHOT_LIFETIME_MS = 2600;
const DEMON_SHOT_HIT_RADIUS = 22;
const DEMON_SHOT_TURN_RATE = 3.4;   // rad/s of homing authority
const DEMON_SHOT_BASE_DAMAGE = 24;

// ── BlunderBlast (Q) — a silver vacuum cone that swallows enemy projectiles for
//    5s, then coughs the whole hoard back out (double damage) on the next shot. ──
const BLUNDERBLAST_DURATION = 5000;
const BLUNDERBLAST_RADIUS = 180;
const BLUNDERBLAST_HALF_ANGLE = Math.PI / 12; // 15° half → 30° cone
const BLUNDERBLAST_RADIUS_Q = 240;
const BLUNDERBLAST_HALF_ANGLE_Q = Math.PI / 8; // 22.5° half → 45° cone (Q+)
const BLUNDERBLAST_BLAST_SPREAD = Math.PI / 6; // 30° fan when the hoard is coughed back out
const BLUNDERBLAST_COLOR = 0xcfd4da; // silver
const BLUNDERBLAST_MAX_CAPTURE = 30;

// ── Gunpowder Mastery — Fireworks (passive) ───────────────────────────────────
// Scraping the arena wall plants a firework on it. A second later it screams
// straight across the arena and goes off on whatever it runs into.
const FIREWORK_PLANT_CD_MS = 500;
const FIREWORK_FUSE_MS = 1000;
/** No two fireworks may share a patch of wall — a spot this close to one is refused. */
const FIREWORK_MIN_GAP = 48;
/** How close the fighter's body edge has to get to a wall to count as touching it. */
const FIREWORK_WALL_PAD = 6;
const FIREWORK_SPEED = 780;
const FIREWORK_HIT_RADIUS = 14;
const FIREWORK_DAMAGE = 10;
const FIREWORK_AOE_DAMAGE = 10;
const FIREWORK_AOE_RADIUS = 74;
const FIREWORK_SHELL_COLORS = [
  GUNPOWDER.ember, GUNPOWDER.gold, GUNPOWDER.lilac, GUNPOWDER.orchid, GUNPOWDER.blaze, GUNPOWDER.glow,
];

/** Heading of a unit vector — spelled out because it reads better than the inline atan2. */
function angleOf(nx: number, ny: number): number { return Math.atan2(ny, nx); }

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'gunpowder-musket-shot': 'punch',
  'gunpowder-explosive-retreat': 'dash',
  'gunpowder-fire-at-will': 'sweep',
  'gunpowder-arsenal-expansion': 'flex',
  'gunpowder-blunderblast': 'raise',
};


// ── Q+ Vortex Cannon — the coughed-up hoard comes back out alight ─────────────
const BLUNDER_FIRE_TINT = 0xff7733;
const BLUNDER_FIRE_DOT_MS = 3000;
const BLUNDER_FIRE_AOE_DAMAGE = 5;
const BLUNDER_FIRE_AOE_RADIUS = 55;

// ── Gunpowder Mastery — Overload (bindable) ───────────────────────────────────
const OVERLOAD_COOLDOWN_MS = 16000;
const OVERLOAD_AIM_MS = 2000;
const OVERLOAD_SHOT_DAMAGE = 15;
const OVERLOAD_EXTRA_HEAT_MS = 3000;
const OVERLOAD_BURN_DAMAGE = 20;
const OVERLOAD_BURN_RADIUS = 30;
const OVERLOAD_BURN_INTERVAL_MS = 1000;
const OVERLOAD_LASER_COLOR = 0xff3322;

// Every world object below is plain data painted into the kit's own Graphics layers — nothing
// here owns a sprite, so a barrel can glow, a grenade's fuse can burn down and a rocket can
// stream exhaust instead of sitting there as a coloured disc.

interface DroppedMusket {
  x: number;
  y: number;
  droppedAt: number;
  hotUntil: number;
  cooled: boolean;
  owner: 'player' | 'npc';
  /** Barrel heading — where it landed pointing, or where it's currently aimed. */
  angle: number;
  /** Recoil offset along the barrel, decaying back to zero after a shot. */
  kick: number;
  // Click+ Attached Bayonet fields — only set when this musket was thrown, not fired.
  isBayonet?: boolean;
  flying?: boolean;
  vx?: number;
  vy?: number;
  targetX?: number;
  targetY?: number;
  lastGroundHitAt?: number;
  // Overload (mastery) fields.
  /** Timestamp of the volley this musket is currently lining up for, 0 when it isn't aiming. */
  aimingFor?: number;
  /** While `time` is under this, the musket is scalding and burns its own owner on contact. */
  overloadBurnUntil?: number;
  lastOwnerBurnAt?: number;
  /** Corruption perk: last time this festering musket dosed someone standing over it. */
  lastFesterAt?: number;
}

/** Corruption perk: rot ticking on a victim, deepened by each fresh ball that lands. */
interface RotStack {
  target: Fighter;
  owner: 'player' | 'npc';
  stacks: number;
  until: number;
  nextTickAt: number;
}

/** Demon perk: one hellfire round out of the echoed volley, homing on whoever it was aimed at. */
interface DemonShot {
  x: number;
  y: number;
  angle: number;
  owner: 'player' | 'npc';
  damage: number;
  diesAt: number;
  seed: number;
}

type WallSide = 'left' | 'right' | 'top' | 'bottom';

/** One Fireworks (mastery passive) shell — first stuck to a wall, then flying across. */
interface Firework {
  owner: 'player' | 'npc';
  /** The spot on the wall it was planted at. */
  x: number;
  y: number;
  side: WallSide;
  /** Unit vector straight across the arena, away from its own wall. */
  dx: number;
  dy: number;
  plantedAt: number;
  launchAt: number;
  launched: boolean;
  /** Live position — equal to (x, y) until it lifts off. */
  px: number;
  py: number;
  color: number;
}

/** One Overload cast: every grounded musket of that owner aims, then fires together. */
interface OverloadVolley {
  owner: 'player' | 'npc';
  startedAt: number;
  firesAt: number;
}

interface Grenade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  thrownAt: number;
  explodeAt: number;
  owner: 'player' | 'npc';
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnX: number;
  spawnY: number;
  spawnAt: number;
  owner: 'player' | 'npc';
}

interface FlameCloud {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnedAt: number;
  expiresAt: number;
  owner: 'player' | 'npc';
  /** Fixed scatter seed, so a cloud keeps its shape instead of boiling frame to frame. */
  seed: number;
}

interface RayBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hits: number;
  lastHitAt: number;
  spawnAt: number;
  owner: 'player' | 'npc';
}

/** A projectile swallowed by BlunderBlast — only its texture + damage are kept so it
 *  can be re-spawned facing the other way when the hoard is released. */
interface CapturedShot {
  textureKey: string;
  damage: number;
}

interface ArsenalSlot {
  type: WeaponType;
  /** R+: marked for removal via right-click — fires one last volley, then is deleted after. */
  pendingRemoval?: boolean;
  /** Sniper: toggles every Fire at Will cast so it only fires every other volley. */
  skipFire?: boolean;
}

interface ArsenalMenuBtn {
  x: number;
  y: number;
  w: number;
  h: number;
  type: WeaponType;
}

interface ArsenalHudSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  idx: number;
}

// ── Arena API ─────────────────────────────────────────────────────────────────

export interface GunpowderArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, empty in a plain 1v1. */
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly nukeChanneling: boolean;
  readonly elementId: string;
  readonly npcElementId: string;
  /** Player-only: skips WASD movement while true, so a burst dash isn't overwritten same-frame. */
  isDodging: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  applyNpcSpeedMult(factor: number): void;
  applyPlayerSpeedMult(factor: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnFloatingText(x: number, y: number, text: string, color: string): void;
  /** `except` is spared the blast — used by Fireworks, whose direct victim doesn't eat the burst too. */
  dealAoeDamageFromOwner(
    x: number, y: number, radius: number, damage: number,
    owner: 'player' | 'npc', except?: Fighter,
  ): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  /** True only when the player is gunpowder AND Gunpowder Mastery is switched on. */
  readonly masteryActive: boolean;
  /** Online: true when the remote opponent is a gunpowder player with mastery on. */
  readonly npcMasteryActive: boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
  /** Ratchet a "best single instance" mastery stat. */
  recordMasteryBestStat(key: string, value: number): void;
  getMasteryStat(key: string): number;
  readonly npcCastId: string | null;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  gunpowderColor(owner: 'player' | 'npc', base: number): number;
}

// ── GunpowderKit (Gunpowder) ────────────────────────────────────────────────────

export class GunpowderKit {
  // ── Visuals ────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: GunpowderColorFn;
  private readonly ncol: GunpowderColorFn;
  private readonly pfx: GunpowderFx;
  private readonly nfx: GunpowderFx;
  /** The powder-monkey rig (bomb hands, eyes, bandolier, carried musket) for each side. */
  private playerAvatar: GunpowderAvatar | null = null;
  private npcAvatar: GunpowderAvatar | null = null;
  /** Stance tells, per side where both can run one. */
  private auras: Partial<Record<`${'player' | 'npc'}:${GunpowderAuraStyle}`, GunpowderAura>> = {};
  /**
   * Two layers, because these objects are not all in the same place. Dropped muskets, scorch and
   * planted fireworks lie on the floor and pass *under* the fighters; grenades, rockets, flame
   * and everything in flight goes over.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;

  // ── Muskets ───────────────────────────────────────────────────────────────
  private playerAmmo = MUSKET_MAX_AMMO;
  private npcAmmo = MUSKET_MAX_AMMO;
  private muskets: DroppedMusket[] = [];
  /** Corruption perk */
  private rots: RotStack[] = [];
  /** Demon perk */
  private demonShots: DemonShot[] = [];
  private demonAvatars: Array<{ owner: 'player' | 'npc'; x: number; y: number; angle: number; bornAt: number; diesAt: number }> = [];

  // ── Arsenal ───────────────────────────────────────────────────────────────
  private playerArsenal: ArsenalSlot[] = [];
  private npcArsenal: ArsenalSlot[] = [];

  // ── Arsenal picker menu (player only) ────────────────────────────────────
  private menuOpen = false;
  private menuOffered: WeaponType[] = [];
  private menuGfx: Phaser.GameObjects.Graphics | null = null;
  private menuLabels: Phaser.GameObjects.Text[] = [];
  private menuBtnAreas: ArsenalMenuBtn[] = [];

  // ── Arsenal HUD ───────────────────────────────────────────────────────────
  private arsenalHudCx = 0;
  private arsenalHudTexts: Phaser.GameObjects.Text[] = [];
  private arsenalHudBgs: Phaser.GameObjects.Rectangle[] = [];
  private arsenalHudAreas: ArsenalHudSlot[] = [];
  private wasRightDown = false;

  // ── Weapon projectiles ──────────────────────────────────────────────────────
  private grenades: Grenade[] = [];
  private rockets: Rocket[] = [];
  private flameClouds: FlameCloud[] = [];
  private rayBullets: RayBullet[] = [];

  // ── BlunderBlast (Q) ──────────────────────────────────────────────────────
  private playerVacuumUntil = 0;
  private npcVacuumUntil = 0;
  /** Live cone pose per side while the vacuum is open, or null. Painted in paintWorld. */
  private vacuumView: Record<'player' | 'npc', { dir: number; radius: number; half: number } | null> =
    { player: null, npc: null };
  private playerCaptured: CapturedShot[] = [];
  private npcCaptured: CapturedShot[] = [];
  private lastMouseX = 0;
  private lastMouseY = 0;

  // ── Stun (this codebase's earthStunnedUntil field isn't consumed by NPC
  // movement or player input anywhere, so we enforce our own stun by zeroing
  // velocity every frame — same approach FateKit uses for its Lightning stun). ──
  private playerStunUntil = 0;
  private npcStunUntil = 0;

  // ── Transient weapon buffs ────────────────────────────────────────────────
  private playerDamageReductionUntil = 0;
  private npcDamageReductionUntil = 0;
  private playerMinigunFiringUntil = 0;
  private npcMinigunFiringUntil = 0;

  // ── Mastery: Fireworks (passive) ──────────────────────────────────────────
  private fireworks: Firework[] = [];
  private playerLastPlantAt = -FIREWORK_PLANT_CD_MS;
  private npcLastPlantAt = -FIREWORK_PLANT_CD_MS;

  // ── Q+ Vortex Cannon: the lit bullets currently in the air ────────────────
  private blunderFireShots: Projectile[] = [];

  // ── Mastery: Overload (bindable) ──────────────────────────────────────────
  private overloadLastCastAt = -OVERLOAD_COOLDOWN_MS;
  private overloadVolleys: OverloadVolley[] = [];

  constructor(private arena: GunpowderArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.gunpowderColor('player', base);
    this.ncol = (base) => arena.gunpowderColor('npc', base);
    this.pfx = new GunpowderFx(arena.scene, this.pcol);
    this.nfx = new GunpowderFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ─────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): GunpowderFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): GunpowderColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Gunpowder. */
  private avatar(owner: 'player' | 'npc'): GunpowderAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private fighter(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /** The floor layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.arena.scene.add.graphics().setDepth(3);
    }
    return this.groundGfx;
  }

  /** The in-flight layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.arena.scene.add.graphics().setDepth(10);
    }
    return this.airGfx;
  }

  /** Build/tear down one stance aura from a single "is it up?" flag. */
  private syncAura(
    owner: 'player' | 'npc', style: GunpowderAuraStyle, on: boolean,
    delta: number, intensity: number, angle: number, count = 0, radius = 28,
  ): void {
    const key = `${owner}:${style}` as const;
    let aura = this.auras[key];
    const f = this.fighter(owner);
    if (!on || !f.active) {
      if (aura) { aura.destroy(); delete this.auras[key]; }
      return;
    }
    if (!aura) {
      aura = new GunpowderAura(this.arena.scene, this.col(owner), style, radius, style === 'heat' ? 3 : 4);
      this.auras[key] = aura;
    }
    aura.setIntensity(intensity);
    aura.setAngle(angle);
    aura.setCount(count);
    aura.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
  }

  private destroyAuras(): void {
    for (const a of Object.values(this.auras)) a?.destroy();
    this.auras = {};
  }

  // ── Public accessors ──────────────────────────────────────────────────────

  getArsenalSize(owner: 'player' | 'npc'): number {
    return (owner === 'player' ? this.playerArsenal : this.npcArsenal).length;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.destroyAuras();
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    this.vizT = 0;

    this.muskets = [];
    this.rots = [];
    this.demonShots = [];
    this.demonAvatars = [];
    this.playerAmmo = MUSKET_MAX_AMMO;
    this.npcAmmo = MUSKET_MAX_AMMO;

    this.grenades = [];
    this.rockets = [];
    this.flameClouds = [];
    this.rayBullets = [];

    this.vacuumView = { player: null, npc: null };
    this.playerVacuumUntil = 0;
    this.npcVacuumUntil = 0;
    this.playerCaptured = [];
    this.npcCaptured = [];

    this.playerArsenal = [];
    this.npcArsenal = [];
    this.closeArsenalMenu();
    this.destroyArsenalHud();

    this.playerStunUntil = 0;
    this.npcStunUntil = 0;
    this.playerDamageReductionUntil = 0;
    this.npcDamageReductionUntil = 0;
    this.playerMinigunFiringUntil = 0;
    this.npcMinigunFiringUntil = 0;
    this.wasRightDown = false;

    this.fireworks = [];
    this.playerLastPlantAt = -FIREWORK_PLANT_CD_MS;
    this.npcLastPlantAt = -FIREWORK_PLANT_CD_MS;

    this.blunderFireShots = [];

    // Readiness is measured against the absolute clock, so a 0 here would lock the
    // ability out for the first OVERLOAD_COOLDOWN_MS of the match.
    this.overloadLastCastAt = -OVERLOAD_COOLDOWN_MS;
    this.overloadVolleys = [];
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  handleInput(
    time: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    void time;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    if (this.arena.nukeChanneling) return;
    const { player, eKey, fKey, rKey, qKey, pointerWasDown } = this.arena;
    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);

    // Right-click: discard a weapon from the arsenal HUD.
    const rightDown = pointer.rightButtonDown();
    if (rightDown && !this.wasRightDown && !this.menuOpen) {
      this.tryRemoveArsenalWeapon(pointer.x, pointer.y);
    }
    this.wasRightDown = rightDown;

    // ── Click: Musket Shot / menu selection ──────────────────────────────
    if (pointer.isDown && !pointerWasDown) {
      if (this.menuOpen) {
        this.handleMenuClick(pointer.x, pointer.y);
      } else {
        player.castAbility('gunpowder-musket-shot', ctx());
      }
    }

    // Gunpowder Mastery — Overload may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const ovSlot = this.arena.masteryActive ? this.overloadSlot() : null;

    // ── E: Explosive Retreat ─────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(eKey) && !this.menuOpen) {
      if (ovSlot === 'e') this.tryCastOverload();
      else player.castAbility('gunpowder-explosive-retreat', ctx());
    }

    // ── R: Fire at Will ──────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(rKey) && !this.menuOpen) {
      if (ovSlot === 'r') this.tryCastOverload();
      else player.castAbility('gunpowder-fire-at-will', ctx());
    }

    // ── F: Arsenal Expansion ─────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      if (this.menuOpen) this.autoPickArsenalMenu();
      else if (ovSlot === 'f') this.tryCastOverload();
      else player.castAbility('gunpowder-arsenal-expansion', ctx());
    }

    // ── Q: BlunderBlast ──────────────────────────────────────────────────
    if (Phaser.Input.Keyboard.JustDown(qKey) && !this.menuOpen) {
      if (ovSlot === 'q') this.tryCastOverload();
      else player.castAbility('gunpowder-blunderblast', ctx());
    }
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.vizT += delta / 1000;
    this.mirrorNpcCast();
    this.updateMuskets(time, delta);
    this.updateRots(time);
    this.updateFestering(time);
    this.updateDemonShots(time, delta);
    this.updateGrenades(time, delta);
    this.updateRockets(time, delta);
    this.updateFlameClouds(time, delta);
    this.updateRayBullets(time, delta);
    this.updateBlunderBlast(time);
    this.updateStuns(time);
    this.updateBuffs(time);
    this.updateOverload(time);
    this.updateFireworks(time, delta);
    this.updateBlunderFire(time);
    this.paintWorld(time);
    this.updateAvatars(time, delta);
  }

  /** Mirror the player's gestures on the NPC rig, so a gunpowder opponent visibly casts. */
  private mirrorNpcCast(): void {
    const id = this.arena.npcCastId;
    if (!id) return;
    const gesture = CAST_GESTURES[id];
    if (!gesture) return;
    const { npc, player } = this.arena;
    this.npcAvatar?.play(gesture, Math.atan2(player.y - npc.y, player.x - npc.x));
  }

  /**
   * Every per-frame painter in one pass. The two layers are cleared and redrawn from live state,
   * so a barrel cools, a fuse burns down and a rocket streams exhaust rather than sitting there.
   */
  private paintWorld(time: number): void {
    const t = this.vizT;

    // ── Floor: grounded muskets, planted fireworks, overload heat ──
    const grounded = this.muskets.filter((m) => !m.flying);
    const hasGround = grounded.length > 0 || this.fireworks.some((f) => !f.launched)
      || this.rots.length > 0;
    if (hasGround || this.groundGfx) {
      const g = this.ground();
      g.clear();
      this.paintRot(g, t);
      for (const m of grounded) {
        // Corruption: a hot barrel weeps rot into the dirt around it until it cools.
        if (!m.cooled && this.arena.hasPerk(m.owner, 'corruption')) {
          const wobble = 0.5 + 0.5 * Math.sin(t * 3 + m.droppedAt);
          g.fillStyle(0x557722, 0.10 + 0.06 * wobble);
          g.fillCircle(m.x, m.y, ROT_FESTER_RADIUS);
          // Blisters of it bubbling up round the rim, each on its own phase.
          for (let b = 0; b < 5; b++) {
            const a = m.droppedAt + b * 1.257 + t * 0.5;
            const rr = ROT_FESTER_RADIUS * (0.45 + 0.4 * ((b * 0.37 + 0.2) % 1));
            const pop = (Math.sin(t * 4 + b * 2.1) + 1) / 2;
            g.fillStyle(0x88bb33, 0.10 + 0.22 * pop);
            g.fillCircle(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr, 1.6 + 2.4 * pop);
          }
        }
        // Overloaded barrels sit there radiating, so their danger zone is never a surprise.
        if (m.overloadBurnUntil && time < m.overloadBurnUntil) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 6 + m.droppedAt);
          g.fillStyle(this.col(m.owner)(GUNPOWDER.ember), 0.05 + 0.07 * pulse);
          g.fillCircle(m.x, m.y, OVERLOAD_BURN_RADIUS);
          smokePuff(g, this.col(m.owner), m.x + Math.sin(t * 2 + m.droppedAt) * 6, m.y - 14 - (t % 1) * 10,
            5 + (t % 1) * 6, m.droppedAt % 6, GUNPOWDER.smoke, 0.16 * (1 - (t % 1)));
        }
        const heat = m.cooled ? 0
          : Phaser.Math.Clamp(1 - (time - m.droppedAt) / Math.max(1, m.hotUntil - m.droppedAt), 0, 1);
        const kx = m.x - Math.cos(m.angle) * m.kick;
        const ky = m.y - Math.sin(m.angle) * m.kick;
        musket(g, this.col(m.owner), kx, ky, m.angle, 40, heat, 1, !!m.isBayonet);
      }
      for (const fw of this.fireworks) {
        if (fw.launched) continue;
        const fuse = Phaser.Math.Clamp((time - fw.plantedAt) / FIREWORK_FUSE_MS, 0, 1);
        GunpowderFx.drawFireworkTube(g, this.col(fw.owner), fw.x, fw.y, fw.dx, fw.dy, fuse, fw.color, t);
      }
    }

    // ── Air: everything in flight, plus the vacuum cones and overload sights ──
    const hasAir = this.muskets.some((m) => m.flying) || this.grenades.length > 0
      || this.rockets.length > 0 || this.flameClouds.length > 0 || this.rayBullets.length > 0
      || this.fireworks.some((f) => f.launched) || this.blunderFireShots.length > 0
      || this.vacuumView.player !== null || this.vacuumView.npc !== null
      || this.overloadVolleys.length > 0
      || this.demonShots.length > 0 || this.demonAvatars.length > 0;
    if (hasAir || this.airGfx) {
      const g = this.air();
      g.clear();
      this.paintDemons(g, time, t);

      for (const owner of ['player', 'npc'] as const) {
        const v = this.vacuumView[owner];
        if (!v) continue;
        const f = this.fighter(owner);
        const hoard = (owner === 'player' ? this.playerCaptured : this.npcCaptured).length;
        GunpowderFx.drawVacuumCone(g, this.col(owner), f.x, f.y, v.dir, v.radius, v.half, hoard, t);
      }

      for (const m of this.muskets) {
        if (!m.flying) continue;
        musket(g, this.col(m.owner), m.x, m.y, m.angle, 40, 1, 1, true);
      }
      for (const gr of this.grenades) {
        const fuse = Phaser.Math.Clamp((time - gr.thrownAt) / Math.max(1, gr.explodeAt - gr.thrownAt), 0, 1);
        GunpowderFx.drawGrenade(g, this.col(gr.owner), gr.x, gr.y, fuse, t * 6 + gr.thrownAt, t);
      }
      for (const r of this.rockets) {
        GunpowderFx.drawRocket(g, this.col(r.owner), r.x, r.y, Math.atan2(r.vy, r.vx), t);
      }
      for (const c of this.flameClouds) {
        const life = Phaser.Math.Clamp((c.expiresAt - time) / 3000, 0, 1);
        GunpowderFx.drawFlameCloud(g, this.col(c.owner), c.x, c.y, Math.atan2(c.vy, c.vx), life, c.seed, t);
      }
      for (const b of this.rayBullets) {
        GunpowderFx.drawRayBullet(g, this.col(b.owner), b.x, b.y, Math.atan2(b.vy, b.vx), b.hits, t);
      }
      for (const fw of this.fireworks) {
        if (!fw.launched) continue;
        GunpowderFx.drawFireworkFlight(g, this.col(fw.owner), fw.px, fw.py, fw.dx, fw.dy, fw.color, t);
      }
      for (const p of this.blunderFireShots) {
        const body = p.body as Phaser.Physics.Arcade.Body | null;
        if (!p.active || !body) continue;
        GunpowderFx.drawBurningShot(g, this.pcol, p.x, p.y, Math.atan2(body.velocity.y, body.velocity.x), t);
      }
      this.drawOverloadSights(g, time);
    }
  }

  /**
   * The character rigs and every stance aura, for whichever sides are playing Gunpowder. Built
   * lazily so a scene restart (which destroys them all) simply rebuilds on the next frame, and
   * torn down the moment a side stops being Gunpowder.
   */
  private updateAvatars(time: number, delta: number): void {
    const { scene, player, npc } = this.arena;
    const isPlayerGp = this.arena.elementId === 'gunpowder';
    const isNpcGp = this.arena.npcElementId === 'gunpowder';

    for (const owner of ['player', 'npc'] as const) {
      const isGp = owner === 'player' ? isPlayerGp : isNpcGp;
      const f = owner === 'player' ? player : npc;
      let av = this.avatar(owner);

      if (!isGp || !f.active) {
        if (av) {
          av.destroy();
          if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
          for (const style of ['hoard', 'guard', 'heat'] as const) {
            this.auras[`${owner}:${style}`]?.destroy();
            delete this.auras[`${owner}:${style}`];
          }
        }
        continue;
      }

      if (!av) {
        av = new GunpowderAvatar(scene, this.col(owner), owner);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }

      const aim = owner === 'player'
        ? Math.atan2(this.lastMouseY - player.y, this.lastMouseX - player.x)
        : Math.atan2(player.y - npc.y, player.x - npc.x);
      const ammo = owner === 'player' ? this.playerAmmo : this.npcAmmo;
      const vacuuming = this.vacuumView[owner] !== null;
      const hoard = (owner === 'player' ? this.playerCaptured : this.npcCaptured).length;
      const guardUntil = owner === 'player' ? this.playerDamageReductionUntil : this.npcDamageReductionUntil;
      const hot = this.muskets.some((m) => m.owner === owner && m.overloadBurnUntil && time < m.overloadBurnUntil);

      av.setFacing(aim);
      av.setAmmo(ammo, MUSKET_MAX_AMMO);
      av.setIntensity(hoard > 0 ? 1.2 : 1);
      av.setMastered(owner === 'player' ? this.arena.masteryActive : this.arena.npcMasteryActive);
      // Single owner of setHold: an open vacuum cone braces the blunderbuss against the shoulder.
      av.setHold(vacuuming ? 'brace' : null, aim);
      av.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);

      // The armed hoard is the one status a gunpowder fighter must never lose track of.
      this.syncAura(owner, 'hoard', !vacuuming && hoard > 0, delta, 1, aim, hoard, 32);
      this.syncAura(owner, 'guard', time < guardUntil, delta,
        Phaser.Math.Clamp((guardUntil - time) / 2000, 0, 1), aim, 0, 28);
      this.syncAura(owner, 'heat', hot, delta, 1, aim, 0, 26);
    }
  }

  private updateStuns(time: number): void {
    if (time < this.playerStunUntil) {
      (this.arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
    if (time < this.npcStunUntil) {
      (this.arena.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  /** Weapon-passive windows (Gunblade damage reduction, Minigun slow) — self-contained toggles
   * that only touch shared Fighter fields while their own timer is active, and reset exactly
   * once on natural expiry, so they never clobber another element's use of the same field. */
  private updateBuffs(time: number): void {
    if (this.playerDamageReductionUntil > 0) {
      if (time < this.playerDamageReductionUntil) this.arena.player.incomingDamageMultiplier = 0.8;
      else { this.arena.player.incomingDamageMultiplier = 1; this.playerDamageReductionUntil = 0; }
    }
    if (this.npcDamageReductionUntil > 0) {
      if (time < this.npcDamageReductionUntil) this.arena.npc.incomingDamageMultiplier = 0.8;
      else { this.arena.npc.incomingDamageMultiplier = 1; this.npcDamageReductionUntil = 0; }
    }
    if (this.playerMinigunFiringUntil > 0) {
      if (time < this.playerMinigunFiringUntil) this.arena.applyPlayerSpeedMult(0.5);
      else this.playerMinigunFiringUntil = 0;
    }
    if (this.npcMinigunFiringUntil > 0) {
      if (time < this.npcMinigunFiringUntil) this.arena.applyNpcSpeedMult(0.5);
      else this.npcMinigunFiringUntil = 0;
    }
  }

  /** F+ weapons in the arsenal that adjust how long a dropped musket stays hot (stacking). */
  private musketCoolMult(): number {
    let mult = 1;
    for (const s of this.playerArsenal) {
      if (s.type === 'flamethrower') mult += 0.2;
      else if (s.type === 'minigun') mult += 0.35;
      else if (s.type === 'freezeray') mult -= 0.2;
    }
    return Math.max(0.2, mult);
  }

  // ── Public do* methods (called from ArenaScene CastContext wiring) ─────────

  doGunpowderMusketShot(tx: number, ty: number, owner: 'player' | 'npc'): void {
    // BlunderBlast: if a swallowed hoard is armed, this shot coughs it all back out
    // *instead* of firing a musket ball — no ammo spent, no musket dropped.
    if (this.releaseBlunderHoard(tx, ty, owner)) return;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const ammo = owner === 'player' ? this.playerAmmo : this.npcAmmo;
    if (ammo <= 0) {
      this.arena.showFloatingText(caster.x, caster.y - 30, '🔫 Empty!', '#886644');
      return;
    }
    if (owner === 'player') this.playerAmmo--;
    else this.npcAmmo--;
    if (owner === 'player') this.rebuildArsenalHud();

    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;
    const angle = Math.atan2(ny, nx);
    const { scene } = this.arena;
    const hotMs = 12000 * (owner === 'player' ? this.musketCoolMult() : 1);

    // Fire the bullet — always, regardless of the Click+ bayonet upgrade.
    const rifleCount = (owner === 'player' ? this.playerArsenal : this.npcArsenal).filter((s) => s.type === 'rifle').length;
    const dmg = Math.round(35 * (1 + 0.25 * rifleCount));

    const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-gunpowder-musket', dmg, owner === 'player');
    (proj as unknown as { isMusketShot?: boolean }).isMusketShot = true;
    this.arena.projectiles.add(proj);
    proj.launch(nx * 900, ny * 900);
    proj.setRotation(angle);

    // A black-powder musket going off: torn flame out the muzzle, sparks, and a cloud of smoke
    // that hangs around long after the ball has gone.
    const fx = this.fx(owner);
    fx.muzzle(caster.x + nx * 26, caster.y + ny * 26, angle, 1 + rifleCount * 0.2, 10);
    this.avatar(owner)?.play('punch', angle);
    scene.cameras.main.shake(70, 0.002);

    // Click+ Attached Bayonet: instead of dropping the spent musket behind, hurl it to the cursor.
    if (owner === 'player' && this.arena.hasUpgrade('click')) {
      const speed = 640;
      const droppedAt = scene.time.now;
      this.muskets.push({
        x: caster.x, y: caster.y, droppedAt, hotUntil: droppedAt + hotMs, cooled: false, owner,
        angle, kick: 0,
        isBayonet: true, flying: true, vx: nx * speed, vy: ny * speed, targetX: tx, targetY: ty,
        lastGroundHitAt: 0,
      });
      return;
    }

    // Drop the spent musket behind the caster — glowing hot, then pick-up-able once it cools.
    const dropX = caster.x - nx * 68, dropY = caster.y - ny * 68;
    const droppedAt = scene.time.now;
    this.muskets.push({
      x: dropX, y: dropY, droppedAt, hotUntil: droppedAt + hotMs, cooled: false, owner,
      angle, kick: 0,
    });
    fx.smoke(dropX, dropY, 2, { radius: 6, life: 900, depth: 4 });
  }

  doGunpowderExplosiveRetreat(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;
    const doubleBarrel = owner === 'player' && this.arena.hasUpgrade('e');

    const fx = this.fx(owner);
    const blastAt = (bx: number, by: number): void => {
      fx.boom(bx, by, 55, { color: GUNPOWDER.blaze, petals: 7, shrapnel: 6 });
      this.arena.dealAoeDamageFromOwner(bx, by, 45, 20, owner);
    };

    const frontX = caster.x + nx * 65, frontY = caster.y + ny * 65;
    blastAt(frontX, frontY);
    // The charge kicking the caster backwards, and the smoke it leaves in the gap.
    this.avatar(owner)?.play('dash', angleOf(nx, ny));
    fx.smoke(caster.x, caster.y, 4, { angle: angleOf(nx, ny), spread: 1.4, radius: 8, life: 900, depth: 5 });
    scene.cameras.main.shake(130, 0.004);

    if (doubleBarrel) {
      const backX = caster.x - nx * 65, backY = caster.y - ny * 65;
      blastAt(backX, backY);
      const target = owner === 'player' ? this.arena.npc : this.arena.player;
      if (target.active && target.hp > 0) {
        const d = Phaser.Math.Distance.Between(backX, backY, target.x, target.y);
        if (d <= 45) (target.body as Phaser.Physics.Arcade.Body).setVelocity(-nx * 300, -ny * 300);
      }
    }

    const body = caster.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(-nx * 620, -ny * 620);
    caster.isInvincible = true;
    if (owner === 'player') this.arena.isDodging = true;
    scene.time.delayedCall(220, () => {
      if (caster.active) { caster.isInvincible = false; body.setVelocity(0, 0); }
      if (owner === 'player') this.arena.isDodging = false;
    });
    this.arena.showFloatingText(caster.x, caster.y - 30, '💥 EXPLOSIVE RETREAT', '#ffaa33');
  }

  doGunpowderFireAtWill(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const arsenal = owner === 'player' ? this.playerArsenal : this.npcArsenal;
    if (arsenal.length === 0) {
      this.arena.showFloatingText(caster.x, caster.y - 30, '⚠ Arsenal Empty', '#ff6644');
      return;
    }
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.arena.scene.time.now;

    let pistolCount = 0, rpgCount = 0, hasGunblade = false;
    const toRemove: number[] = [];

    arsenal.forEach((slot, idx) => {
      // Sniper only fires every other Fire at Will — toggle first, so a fresh sniper fires immediately.
      if (slot.type === 'sniper') {
        if (slot.skipFire) { slot.skipFire = false; return; }
        slot.skipFire = true;
      }
      this.fireWeapon(slot.type, owner, angle);
      if (slot.type === 'pistol') pistolCount++;
      if (slot.type === 'rpg') rpgCount++;
      if (slot.type === 'gunblade') hasGunblade = true;
      if (owner === 'player' && slot.pendingRemoval) toRemove.push(idx);
    });

    for (let i = toRemove.length - 1; i >= 0; i--) arsenal.splice(toRemove[i], 1);
    if (owner === 'player' && toRemove.length > 0) this.rebuildArsenalHud();

    if (pistolCount > 0) caster.reduceCooldown('gunpowder-fire-at-will', pistolCount * FIRE_AT_WILL_BASE_CD * 0.10);
    if (rpgCount > 0) caster.reduceCooldown('gunpowder-fire-at-will', -rpgCount * FIRE_AT_WILL_BASE_CD * 0.20);
    if (hasGunblade) {
      if (owner === 'player') this.playerDamageReductionUntil = now + 2000;
      else this.npcDamageReductionUntil = now + 2000;
    }

    // The whole arsenal going off at once — the smoke scales with how many barrels fired.
    this.avatar(owner)?.play('sweep', angle);
    this.fx(owner).smoke(caster.x, caster.y, 2 + arsenal.length * 2, {
      angle, spread: 1.6, radius: 8, life: 1100, depth: 5,
    });
    this.arena.scene.cameras.main.shake(90 + arsenal.length * 40, 0.002 + arsenal.length * 0.001);
    this.arena.showFloatingText(caster.x, caster.y - 40, '🔥 FIRE AT WILL', '#dd8833');

    // Demon perk: whatever just went downrange, something behind you fires it again.
    if (this.arena.hasPerk(owner, 'demon')) {
      this.summonDemonEcho(tx, ty, owner, Math.max(2, arsenal.length + 1));
    }
  }

  doGunpowderArsenalExpansion(owner: 'player' | 'npc'): void {
    const arsenal = owner === 'player' ? this.playerArsenal : this.npcArsenal;
    const max = owner === 'player' && this.arena.hasUpgrade('r') ? ARSENAL_MAX_R_UPGRADED : ARSENAL_MAX;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;

    if (arsenal.length >= max) {
      caster.resetCooldown('gunpowder-arsenal-expansion');
      this.arena.showFloatingText(caster.x, caster.y - 30, '⚠ Arsenal Full', '#ff6644');
      return;
    }

    if (owner === 'npc') {
      const pick = BASE_WEAPON_TYPES[Math.floor(Math.random() * BASE_WEAPON_TYPES.length)];
      arsenal.push({ type: pick });
      this.arena.showFloatingText(caster.x, caster.y - 30, `+${WEAPON_DEFS[pick].name}`, '#ffaa44');
      return;
    }

    this.openArsenalMenu();
    caster.resetCooldown('gunpowder-arsenal-expansion');
  }

  doGunpowderBlunderBlast(tx: number, ty: number, owner: 'player' | 'npc'): void {
    void tx; void ty; // aim is read live each frame while the cone is open
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const now = scene.time.now;

    if (owner === 'player') {
      this.playerVacuumUntil = now + BLUNDERBLAST_DURATION;
      this.playerCaptured = [];
    } else {
      this.npcVacuumUntil = now + BLUNDERBLAST_DURATION;
      this.npcCaptured = [];
    }
    // The bell of the blunderbuss opening: a silver ring drawn inward, not a flash outward.
    const aimX = owner === 'player' ? this.lastMouseX : this.arena.player.x;
    const aimY = owner === 'player' ? this.lastMouseY : this.arena.player.y;
    const dir = Math.atan2(aimY - caster.y, aimX - caster.x);
    this.avatar(owner)?.play('raise', dir, 700);
    this.fx(owner).ring(caster.x, caster.y, BLUNDERBLAST_RADIUS * 0.9, 20, BLUNDERBLAST_COLOR, 480, 7, 3);
    void scene;
    this.arena.showFloatingText(caster.x, caster.y - 40, '🌀 BLUNDERBLAST', '#cfd4da');
  }

  // ── BlunderBlast per-frame vacuum ──────────────────────────────────────────

  private updateBlunderBlast(time: number): void {
    this.updateVacuumCone('player', time);
    this.updateVacuumCone('npc', time);
  }

  private updateVacuumCone(owner: 'player' | 'npc', time: number): void {
    const until = owner === 'player' ? this.playerVacuumUntil : this.npcVacuumUntil;
    // Window closed — the hoard stays armed for the next shot, but the funnel is gone.
    if (time >= until) { this.vacuumView[owner] = null; return; }

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    // Player aims at the cursor; the NPC aims at the player.
    const aimX = owner === 'player' ? this.lastMouseX : this.arena.player.x;
    const aimY = owner === 'player' ? this.lastMouseY : this.arena.player.y;
    const dir = Math.atan2(aimY - caster.y, aimX - caster.x);
    const upgraded = owner === 'player' && this.arena.hasUpgrade('q');
    const radius = upgraded ? BLUNDERBLAST_RADIUS_Q : BLUNDERBLAST_RADIUS;
    const half = upgraded ? BLUNDERBLAST_HALF_ANGLE_Q : BLUNDERBLAST_HALF_ANGLE;

    // Painted in paintWorld, where the funnel gets its intake streaks and the churning hoard.
    this.vacuumView[owner] = { dir, radius, half };

    // Swallow the opponent's projectiles that drift into the cone.
    const captured = owner === 'player' ? this.playerCaptured : this.npcCaptured;
    if (captured.length >= BLUNDERBLAST_MAX_CAPTURE) return;
    const wantFromPlayer = owner === 'npc'; // capture the *other* fighter's shots
    for (const obj of this.arena.projectiles.getChildren().slice()) {
      const p = obj as Projectile;
      if (!p.active || p.isHeal || p.isFromPlayer !== wantFromPlayer) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, p.x, p.y) > radius) continue;
      const ang = Math.atan2(p.y - caster.y, p.x - caster.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(ang - dir)) > half) continue;
      captured.push({ textureKey: p.texture.key, damage: p.damage });
      if (owner === 'player') this.arena.recordMasteryStat('bulletsVacuumed', 1);
      this.arena.spawnHitFlash(p.x, p.y, BLUNDERBLAST_COLOR);
      // Swallowed: it gets dragged down the throat of the funnel rather than blinking out.
      this.fx(owner).sparks(p.x, p.y, 3, Math.atan2(caster.y - p.y, caster.x - p.x), 10, GUNPOWDER.chrome);
      p.destroy();
      if (captured.length >= BLUNDERBLAST_MAX_CAPTURE) break;
    }
  }

  /** On the first shot after the vacuum window closes, cough the whole hoard back out
   *  in a cone toward the aim point, each shot dealing 100% more damage — or 125% more
   *  and alight, if Q+ Vortex Cannon is owned. */
  private releaseBlunderHoard(tx: number, ty: number, owner: 'player' | 'npc'): boolean {
    const now = this.arena.scene.time.now;
    const until = owner === 'player' ? this.playerVacuumUntil : this.npcVacuumUntil;
    if (now < until) return false; // still vacuuming — not armed yet
    const captured = owner === 'player' ? this.playerCaptured : this.npcCaptured;
    if (captured.length === 0) return false;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const upgraded = owner === 'player' && this.arena.hasUpgrade('q');
    const dmgMult = upgraded ? 2.25 : 2;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const n = captured.length;
    const spread = Math.min(BLUNDERBLAST_BLAST_SPREAD, 0.16 * (n - 1)); // fan widens with the hoard, capped at 30°

    for (let i = 0; i < n; i++) {
      const c = captured[i];
      const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5..0.5 across the fan
      const ang = baseAngle + t * spread;
      const dmg = Math.max(1, Math.round(c.damage * dmgMult));
      const proj = new Projectile(this.arena.scene, caster.x, caster.y, c.textureKey, dmg, owner === 'player');
      this.arena.projectiles.add(proj);
      proj.launch(Math.cos(ang) * 820, Math.sin(ang) * 820);
      proj.setRotation(ang);
      if (upgraded) {
        // Tagged rather than tracked by texture — the hoard is whatever the enemy shot,
        // so there is no single key to test for at the hit choke point.
        (proj as unknown as { gpBlunderFire?: boolean }).gpBlunderFire = true;
        proj.setTint(BLUNDER_FIRE_TINT);
        this.blunderFireShots.push(proj);
      }
    }

    if (owner === 'player') this.playerCaptured = [];
    else this.npcCaptured = [];
    // The whole hoard coming back out at once — a blast that scales with how much was eaten.
    const fx = this.fx(owner);
    fx.muzzle(caster.x + Math.cos(baseAngle) * 26, caster.y + Math.sin(baseAngle) * 26, baseAngle,
      1.2 + Math.min(n, 20) * 0.08, 11, upgraded ? GUNPOWDER.flame : BLUNDERBLAST_COLOR);
    fx.smoke(caster.x, caster.y, 3 + Math.round(n / 4), {
      angle: baseAngle, spread: 1.5, radius: 9, life: 1100, depth: 5,
    });
    this.avatar(owner)?.play('punch', baseAngle);
    this.arena.scene.cameras.main.shake(120 + Math.min(n, 20) * 8, 0.003 + Math.min(n, 20) * 0.0004);
    this.arena.showFloatingText(
      caster.x, caster.y - 55,
      upgraded ? `🔥 BLUNDERBLAST ×${n}` : `🌀 BLUNDERBLAST ×${n}`,
      upgraded ? '#ff8844' : '#cfd4da',
    );
    return true;
  }

  // ── Weapon firing (used by Fire at Will) ────────────────────────────────────

  private fireWeapon(type: WeaponType, owner: 'player' | 'npc', angle: number): void {
    const { scene } = this.arena;
    switch (type) {
      case 'pistol':
        this.resolveHitscan(owner, angle, 500, 20, 10, GUNPOWDER.chrome);
        break;
      case 'ar':
        for (let i = 0; i < 3; i++) {
          scene.time.delayedCall(i * 110, () => this.resolveHitscan(owner, angle, 450, 20, 6, GUNPOWDER.gold));
        }
        break;
      case 'shotgun': {
        const pelletCount = 10;
        for (let i = 0; i < pelletCount; i++) {
          const off = (-22 + (44 * i) / (pelletCount - 1)) * (Math.PI / 180);
          this.resolveHitscan(owner, angle + off, 160, 12, 2, GUNPOWDER.blaze);
        }
        break;
      }
      case 'rifle':
        this.resolveHitscan(owner, angle, 700, 35, 15, GUNPOWDER.brass);
        break;
      case 'grenade':
        this.launchGrenade(owner, angle);
        break;
      case 'machinegun':
        for (let i = 0; i < 20; i++) {
          scene.time.delayedCall(i * 18, () => {
            const off = (Math.random() * 20 - 10) * (Math.PI / 180);
            this.resolveHitscan(owner, angle + off, 400, 18, 2, GUNPOWDER.flame);
          });
        }
        break;
      case 'flamethrower':
        this.launchFlamethrower(owner, angle);
        break;
      case 'rpg':
        this.launchRocket(owner, angle);
        break;
      case 'minigun': {
        for (let i = 0; i < 30; i++) {
          scene.time.delayedCall(i * 15, () => {
            const off = (Math.random() * 20 - 10) * (Math.PI / 180);
            this.resolveHitscan(owner, angle + off, 400, 18, 2, GUNPOWDER.orchid);
          });
        }
        const until = scene.time.now + 460;
        if (owner === 'player') this.playerMinigunFiringUntil = Math.max(this.playerMinigunFiringUntil, until);
        else this.npcMinigunFiringUntil = Math.max(this.npcMinigunFiringUntil, until);
        break;
      }
      case 'sniper':
        this.resolveHitscan(owner, angle, 900, 10, 20, GUNPOWDER.lilac);
        break;
      case 'raygun':
        this.launchRayBullet(owner, angle);
        break;
      case 'freezeray': {
        const hit = this.resolveHitscan(owner, angle, 700, 14, 3, GUNPOWDER.chrome);
        if (hit) {
          if (owner === 'player') this.npcStunUntil = Math.max(this.npcStunUntil, scene.time.now + 1000);
          else this.playerStunUntil = Math.max(this.playerStunUntil, scene.time.now + 1000);
        }
        break;
      }
      case 'gunblade': {
        const caster = owner === 'player' ? this.arena.player : this.arena.npc;
        const target = owner === 'player' ? this.arena.npc : this.arena.player;
        const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
        if (dist <= 100 && target.active && target.hp > 0) {
          const rd = Math.round(15 * target.incomingDamageMultiplier);
          const hx = target.x, hy = target.y;
          target.takeDamage(rd);
          this.arena.spawnHitFlash(target.x, target.y, 0xdddddd);
          // A point-blank slash: a silver arc across the victim rather than a beam through them.
          this.fx(owner).shrapnel(hx, hy, 5, {
            speed: 240, angle, spread: 0.7, size: 6, color: GUNPOWDER.silver, depth: 10,
          });
          this.fx(owner).sparks(hx, hy, 6, angle, 10, GUNPOWDER.chrome);
          this.maybeExecute(owner, target);
        } else {
          this.resolveHitscan(owner, angle, 700, 12, 10, GUNPOWDER.silver);
        }
        break;
      }
    }
  }

  private resolveHitscan(
    owner: 'player' | 'npc',
    angle: number,
    range: number,
    halfWidth: number,
    dmg: number,
    color: number,
  ): boolean {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const fx = this.fx(owner);

    // A tracer with its own muzzle flash and smoke, so every barrel in a volley reads
    // separately instead of the whole thing being one flat line.
    const mx = caster.x + dx * 24, my = caster.y + dy * 24;
    fx.tracer(mx, my, caster.x + dx * range, caster.y + dy * range, color, 2.4, 9);

    if (!target.active || target.hp <= 0) return false;
    const tx = target.x - caster.x, ty = target.y - caster.y;
    const proj = tx * dx + ty * dy;
    if (proj < 0 || proj > range) return false;
    const perpX = tx - dx * proj, perpY = ty - dy * proj;
    if (Math.sqrt(perpX * perpX + perpY * perpY) > halfWidth) return false;

    const rd = Math.round(dmg * target.incomingDamageMultiplier);
    const hx = target.x, hy = target.y;
    target.takeDamage(rd);
    this.arena.spawnHitFlash(target.x, target.y, color);
    // Impact spall: bits kicked back the way the round came, scaled by how hard it hit.
    fx.shrapnel(hx, hy, 2 + Math.round(dmg / 6), {
      speed: 160 + dmg * 6, angle: angle + Math.PI, spread: 0.9, size: 5, color, depth: 10,
    });
    this.maybeExecute(owner, target);
    return true;
  }

  private launchGrenade(owner: 'player' | 'npc', angle: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const speed = 380;
    const now = scene.time.now;
    this.grenades.push({
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      thrownAt: now, explodeAt: now + 900, owner,
    });
    this.fx(owner).sparks(caster.x, caster.y, 3, angle, 10, GUNPOWDER.glow);
  }

  private explodeGrenade(g: Grenade): void {
    this.fx(g.owner).boom(g.x, g.y, 72, { color: GUNPOWDER.flame, petals: 9, shrapnel: 10, smoke: 4 });
    this.arena.scene.cameras.main.shake(160, 0.005);
    this.arena.dealAoeDamageFromOwner(g.x, g.y, 60, 25, g.owner);

    const target = g.owner === 'player' ? this.arena.npc : this.arena.player;
    if (target.active && target.hp > 0 && Phaser.Math.Distance.Between(g.x, g.y, target.x, target.y) <= 60) {
      this.maybeExecute(g.owner, target);
    }
  }

  /** F+ RPG: explosive rocket that detonates on proximity to the enemy, or at its max range/lifetime. */
  private launchRocket(owner: 'player' | 'npc', angle: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const speed = 520;
    this.rockets.push({
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      spawnX: caster.x, spawnY: caster.y, spawnAt: scene.time.now, owner,
    });
    this.fx(owner).muzzle(caster.x, caster.y, angle + Math.PI, 0.9, 9, GUNPOWDER.flame);
  }

  private explodeRocket(r: Rocket): void {
    this.fx(r.owner).boom(r.x, r.y, 84, { color: GUNPOWDER.ember, petals: 10, shrapnel: 10, smoke: 5 });
    this.arena.scene.cameras.main.shake(180, 0.005);
    this.arena.dealAoeDamageFromOwner(r.x, r.y, 70, 20, r.owner);
  }

  /** F+ Flamethrower: a barrage of short-lived flame clouds that vanish on their first hit. */
  private launchFlamethrower(owner: 'player' | 'npc', angle: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const now = scene.time.now;
    for (let i = 0; i < 10; i++) {
      const off = (-18 + Math.random() * 36) * (Math.PI / 180);
      const a = angle + off;
      const speed = 150 + Math.random() * 90;
      this.flameClouds.push({
        x: caster.x, y: caster.y,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        spawnedAt: now, expiresAt: now + 3000, owner, seed: Math.random() * 10,
      });
    }
    this.fx(owner).muzzle(caster.x + Math.cos(angle) * 20, caster.y + Math.sin(angle) * 20, angle, 1.1, 10, GUNPOWDER.flame);
  }

  /** F+ Ray-Gun: bounces off arena walls, pierces through the enemy up to 3 total hits. */
  private launchRayBullet(owner: 'player' | 'npc', angle: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const speed = 460;
    this.rayBullets.push({
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      hits: 0, lastHitAt: 0, spawnAt: scene.time.now, owner,
    });
    this.fx(owner).muzzle(caster.x + Math.cos(angle) * 20, caster.y + Math.sin(angle) * 20, angle, 0.7, 10, GUNPOWDER.orchid);
  }

  /** R+ / Execution Volley: any weapon hit that leaves the enemy at or below 15% HP finishes them off. */
  private maybeExecute(owner: 'player' | 'npc', target: Fighter): void {
    if (owner !== 'player' || !this.arena.hasUpgrade('r')) return;
    if (target.active && target.hp > 0 && target.hp / target.maxHp <= 0.15) {
      target.takeDamage(target.hp);
      this.arena.showFloatingText(target.x, target.y - 40, '☠ EXECUTED', '#ff2222');
    }
  }

  // ── Muskets ──────────────────────────────────────────────────────────────

  private updateMuskets(time: number, delta: number): void {
    for (let i = this.muskets.length - 1; i >= 0; i--) {
      const m = this.muskets[i];

      // Recoil settles back onto the barrel's real position over a few frames.
      if (m.kick > 0) m.kick = Math.max(0, m.kick - (delta / 1000) * 60);

      if (m.flying) {
        m.x += (m.vx! * delta) / 1000;
        m.y += (m.vy! * delta) / 1000;

        const target = m.owner === 'player' ? this.arena.npc : this.arena.player;
        if (target.active && target.hp > 0 && Phaser.Math.Distance.Between(m.x, m.y, target.x, target.y) <= 24) {
          const rd = Math.round(10 * target.incomingDamageMultiplier);
          const hx = target.x, hy = target.y;
          target.takeDamage(rd);
          this.arena.spawnHitFlash(target.x, target.y, 0xcccccc);
          // The bayonet going in: sparks off the steel and a spray of splinters.
          this.fx(m.owner).sparks(hx, hy, 6, m.angle, 10, GUNPOWDER.chrome);
          this.fx(m.owner).shrapnel(hx, hy, 4, {
            speed: 200, angle: m.angle + Math.PI, spread: 0.8, size: 6, color: GUNPOWDER.wood, depth: 10,
          });
          m.flying = false;
        }

        if (m.flying && Phaser.Math.Distance.Between(m.x, m.y, m.targetX!, m.targetY!) <= 12) {
          m.flying = false;
          this.fx(m.owner).smoke(m.x, m.y, 2, { radius: 5, life: 700, depth: 4 });
        }
        if (m.flying) continue;
      }

      // Heat is read straight off the clock by the painter — nothing to restyle here.
      if (!m.cooled && time >= m.hotUntil) {
        m.cooled = true;
        this.fx(m.owner).smoke(m.x, m.y, 1, { radius: 4, life: 800, depth: 4 });
      }

      // Attached Bayonet: grounded muskets damage anyone who steps over them (1s cooldown).
      if (m.isBayonet) {
        const target = m.owner === 'player' ? this.arena.npc : this.arena.player;
        if (target.active && target.hp > 0 && time >= (m.lastGroundHitAt ?? 0) + 1000
          && Phaser.Math.Distance.Between(m.x, m.y, target.x, target.y) <= 26) {
          const rd = Math.round(10 * target.incomingDamageMultiplier);
          target.takeDamage(rd);
          this.arena.spawnHitFlash(target.x, target.y, 0xaaaaaa);
          this.fx(m.owner).sparks(m.x, m.y, 4, -Math.PI / 2, 10, GUNPOWDER.chrome);
          m.lastGroundHitAt = time;
        }
      }

      // Overload (mastery): the volley leaves the barrel glowing — its own owner
      // scalds themselves for walking over it, once a second at most.
      if (m.overloadBurnUntil) {
        if (time >= m.overloadBurnUntil) {
          m.overloadBurnUntil = 0;
        } else {
          const ownerFighter = m.owner === 'player' ? this.arena.player : this.arena.npc;
          if (ownerFighter.active && ownerFighter.hp > 0
            && time >= (m.lastOwnerBurnAt ?? 0) + OVERLOAD_BURN_INTERVAL_MS
            && Phaser.Math.Distance.Between(m.x, m.y, ownerFighter.x, ownerFighter.y) <= OVERLOAD_BURN_RADIUS) {
            ownerFighter.takeDamage(OVERLOAD_BURN_DAMAGE);
            this.arena.spawnHitFlash(ownerFighter.x, ownerFighter.y, 0xff5522);
            this.arena.showFloatingText(m.x, m.y - 22, '🔥 SCALDING', '#ff7733');
            m.lastOwnerBurnAt = time;
          }
        }
      }

      if (!m.cooled) continue;

      const caster = m.owner === 'player' ? this.arena.player : this.arena.npc;
      const ammo = m.owner === 'player' ? this.playerAmmo : this.npcAmmo;
      if (ammo >= MUSKET_MAX_AMMO) continue;

      const d = Phaser.Math.Distance.Between(caster.x, caster.y, m.x, m.y);
      if (d <= 30) {
        if (m.owner === 'player') { this.playerAmmo++; this.rebuildArsenalHud(); }
        else this.npcAmmo++;
        this.arena.showFloatingText(m.x, m.y - 20, '+1 🔫', '#dd9944');
        this.fx(m.owner).sparks(m.x, m.y, 4, -Math.PI / 2, 9, GUNPOWDER.brass);
        this.muskets.splice(i, 1);
      }
    }
  }

  // ── Grenades ─────────────────────────────────────────────────────────────

  private updateGrenades(time: number, delta: number): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.x += (g.vx * delta) / 1000;
      g.y += (g.vy * delta) / 1000;
      if (time >= g.explodeAt) {
        this.explodeGrenade(g);
        this.grenades.splice(i, 1);
      }
    }
  }

  // ── Rockets (RPG) ────────────────────────────────────────────────────────

  private updateRockets(time: number, delta: number): void {
    const wb = this.arena.scene.physics.world.bounds;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.x += (r.vx * delta) / 1000;
      r.y += (r.vy * delta) / 1000;

      const target = r.owner === 'player' ? this.arena.npc : this.arena.player;
      const hitTarget = target.active && target.hp > 0 && Phaser.Math.Distance.Between(r.x, r.y, target.x, target.y) <= 30;
      const traveled = Phaser.Math.Distance.Between(r.spawnX, r.spawnY, r.x, r.y);
      const outOfBounds = r.x < wb.x || r.x > wb.x + wb.width || r.y < wb.y || r.y > wb.y + wb.height;

      if (hitTarget) { this.explodeRocket(r); this.rockets.splice(i, 1); continue; }
      if (traveled > 620 || time - r.spawnAt > 1600 || outOfBounds) {
        this.explodeRocket(r);
        this.rockets.splice(i, 1);
      }
    }
  }

  // ── Flame clouds (Flamethrower) ──────────────────────────────────────────

  private updateFlameClouds(time: number, delta: number): void {
    for (let i = this.flameClouds.length - 1; i >= 0; i--) {
      const c = this.flameClouds[i];
      c.x += (c.vx * delta) / 1000;
      c.y += (c.vy * delta) / 1000;
      // Flame drags: it slows and spreads rather than sailing on at launch speed.
      c.vx *= 0.985;
      c.vy *= 0.985;

      const target = c.owner === 'player' ? this.arena.npc : this.arena.player;
      const hit = target.active && target.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, target.x, target.y) <= 20;
      if (hit) {
        const rd = Math.round(3 * target.incomingDamageMultiplier);
        target.takeDamage(rd);
        this.arena.spawnHitFlash(target.x, target.y, 0xff6622);
        this.fx(c.owner).smoke(c.x, c.y, 2, { radius: 6, life: 600, depth: 8, color: GUNPOWDER.char });
      }
      if (hit || time >= c.expiresAt) this.flameClouds.splice(i, 1);
    }
  }

  // ── Ray bullets (Ray-Gun) ────────────────────────────────────────────────

  private updateRayBullets(time: number, delta: number): void {
    const wb = this.arena.scene.physics.world.bounds;
    for (let i = this.rayBullets.length - 1; i >= 0; i--) {
      const b = this.rayBullets[i];
      b.x += (b.vx * delta) / 1000;
      b.y += (b.vy * delta) / 1000;

      let bounced = false;
      if (b.x < wb.x) { b.x = wb.x; b.vx *= -1; bounced = true; }
      else if (b.x > wb.x + wb.width) { b.x = wb.x + wb.width; b.vx *= -1; bounced = true; }
      if (b.y < wb.y) { b.y = wb.y; b.vy *= -1; bounced = true; }
      else if (b.y > wb.y + wb.height) { b.y = wb.y + wb.height; b.vy *= -1; bounced = true; }
      if (bounced) this.fx(b.owner).sparks(b.x, b.y, 4, Math.atan2(b.vy, b.vx), 10, GUNPOWDER.lilac);

      const target = b.owner === 'player' ? this.arena.npc : this.arena.player;
      if (target.active && target.hp > 0 && time >= b.lastHitAt + 350
        && Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) <= 20) {
        const rd = Math.round(5 * target.incomingDamageMultiplier);
        const hx = target.x, hy = target.y;
        target.takeDamage(rd);
        this.arena.spawnHitFlash(target.x, target.y, 0x33ff77);
        // Piercing straight through: a ring at the entry and a spray out the far side.
        this.fx(b.owner).ring(hx, hy, 6, 30, GUNPOWDER.orchid, 260, 9, 2);
        this.fx(b.owner).shrapnel(hx, hy, 4, {
          speed: 200, angle: Math.atan2(b.vy, b.vx), spread: 0.7, size: 5, color: GUNPOWDER.lilac, depth: 10,
        });
        (target.body as Phaser.Physics.Arcade.Body).setVelocity(b.vx * 0.5, b.vy * 0.5);
        b.hits++;
        b.lastHitAt = time;
      }

      if (b.hits >= 3 || time - b.spawnAt > 5000) {
        // Burning out: the last of its charge goes up rather than the bead just vanishing.
        this.fx(b.owner).ring(b.x, b.y, 4, 24, GUNPOWDER.orchid, 240, 9, 2);
        this.rayBullets.splice(i, 1);
      }
    }
  }

  // ── Arsenal picker menu (F) ──────────────────────────────────────────────

  private openArsenalMenu(): void {
    if (this.menuOpen) return;
    const pool = this.arena.hasUpgrade('f') ? [...BASE_WEAPON_TYPES, ...EXTRA_WEAPON_TYPES] : BASE_WEAPON_TYPES;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    this.menuOffered = shuffled.slice(0, 3);

    const { scene } = this.arena;
    const W = scene.scale.width;
    const panelW = 260, rowH = 46, panelH = this.menuOffered.length * rowH + 16;
    const px = (W - panelW) / 2, py = 110;

    this.menuGfx = scene.add.graphics().setDepth(48).setScrollFactor(0);
    this.menuGfx.fillStyle(0x1a1208, 0.94);
    this.menuGfx.fillRect(px, py, panelW, panelH);
    this.menuGfx.lineStyle(2, 0xdd9944, 1);
    this.menuGfx.strokeRect(px, py, panelW, panelH);

    this.menuLabels = [];
    this.menuBtnAreas = [];
    this.menuOffered.forEach((type, i) => {
      const def = WEAPON_DEFS[type];
      const ry = py + 8 + i * rowH;
      const label = scene.add.text(px + 12, ry + rowH / 2 - 8, `${def.emoji} ${def.name}`, {
        fontSize: '15px', fontFamily: 'Arial', color: '#ffddaa', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0.5).setDepth(49).setScrollFactor(0);
      const desc = scene.add.text(px + 12, ry + rowH / 2 + 10, def.desc, {
        fontSize: '10px', fontFamily: 'Arial', color: '#aaaaaa',
      }).setOrigin(0, 0.5).setDepth(49).setScrollFactor(0);
      this.menuLabels.push(label, desc);
      this.menuBtnAreas.push({ x: px, y: ry, w: panelW, h: rowH, type });
    });

    this.menuOpen = true;
  }

  private closeArsenalMenu(): void {
    this.menuGfx?.destroy(); this.menuGfx = null;
    for (const l of this.menuLabels) l.destroy();
    this.menuLabels = [];
    this.menuBtnAreas = [];
    this.menuOpen = false;
  }

  private handleMenuClick(px: number, py: number): void {
    for (const btn of this.menuBtnAreas) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        this.commitArsenalPick(btn.type);
        return;
      }
    }
  }

  private autoPickArsenalMenu(): void {
    if (!this.menuOpen || this.menuBtnAreas.length === 0) return;
    const btn = this.menuBtnAreas[Math.floor(Math.random() * this.menuBtnAreas.length)];
    this.commitArsenalPick(btn.type);
  }

  private commitArsenalPick(type: WeaponType): void {
    this.playerArsenal.push({ type });
    this.noteWeaponCollected(type);
    if (this.playerArsenal.length >= ARSENAL_MAX_R_UPGRADED) this.arena.recordMasteryStat('fullArsenals', 1);
    this.closeArsenalMenu();
    this.arena.player.triggerCooldown('gunpowder-arsenal-expansion');
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `+${WEAPON_DEFS[type].name}`, '#ffaa44');
    this.rebuildArsenalHud();
  }

  private tryRemoveArsenalWeapon(px: number, py: number): void {
    for (const area of this.arsenalHudAreas) {
      if (px >= area.x && px <= area.x + area.w && py >= area.y && py <= area.y + area.h) {
        if (area.idx < this.playerArsenal.length) {
          const slot = this.playerArsenal[area.idx];
          if (this.arena.hasUpgrade('r')) {
            if (!slot.pendingRemoval) {
              slot.pendingRemoval = true;
              this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `${WEAPON_DEFS[slot.type].name} misfiring...`, '#ffaa66');
              this.rebuildArsenalHud();
            }
          } else {
            const removed = this.playerArsenal.splice(area.idx, 1)[0];
            this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `-${WEAPON_DEFS[removed.type].name}`, '#ff8866');
            this.rebuildArsenalHud();
          }
        }
        return;
      }
    }
  }

  // ── Arsenal / ammo HUD ───────────────────────────────────────────────────

  initArsenalHud(cx: number): void {
    this.arsenalHudCx = cx;
    this.rebuildArsenalHud();
  }

  private destroyArsenalHud(): void {
    for (const t of this.arsenalHudTexts) t.destroy();
    this.arsenalHudTexts = [];
    for (const b of this.arsenalHudBgs) b.destroy();
    this.arsenalHudBgs = [];
    this.arsenalHudAreas = [];
  }

  private rebuildArsenalHud(): void {
    this.destroyArsenalHud();
    const { scene } = this.arena;
    const maxSlots = this.arena.hasUpgrade('r') ? ARSENAL_MAX_R_UPGRADED : ARSENAL_MAX;
    const slotSize = 32, gap = 6;
    const totalW = maxSlots * slotSize + (maxSlots - 1) * gap;
    const startX = this.arsenalHudCx - totalW / 2;
    const y = 74;

    for (let i = 0; i < maxSlots; i++) {
      const x = startX + i * (slotSize + gap);
      const slot = this.playerArsenal[i];
      const flagged = !!(slot && (slot.pendingRemoval || slot.skipFire));
      const bgFill = slot ? (flagged ? 0x3a1a12 : 0x2a1e10) : 0x14100a;
      const bgStroke = slot ? (flagged ? 0xdd5533 : 0xdd9944) : 0x554433;
      const bg = scene.add.rectangle(x + slotSize / 2, y, slotSize, slotSize, bgFill, 0.9)
        .setStrokeStyle(1.5, bgStroke, 0.9).setDepth(20).setScrollFactor(0);
      this.arsenalHudBgs.push(bg);
      if (slot) {
        const icon = scene.add.text(x + slotSize / 2, y, WEAPON_DEFS[slot.type].emoji, { fontSize: '18px' })
          .setOrigin(0.5).setDepth(21).setScrollFactor(0);
        this.arsenalHudTexts.push(icon);
      }
      this.arsenalHudAreas.push({ x, y: y - slotSize / 2, w: slotSize, h: slotSize, idx: i });
    }

    const ammoText = scene.add.text(this.arsenalHudCx, y - 22, `🔫 ${this.playerAmmo}/${MUSKET_MAX_AMMO}`, {
      fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#dd9944', stroke: '#220044', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21).setScrollFactor(0);
    this.arsenalHudTexts.push(ammoText);
  }

  // ── Perk painters ────────────────────────────────────────────────────────

  /** Rot creeping over a victim: a sickly slick under them, thicker per stack. */
  private paintRot(g: Phaser.GameObjects.Graphics, t: number): void {
    for (const r of this.rots) {
      const tg = r.target;
      if (!tg.active || tg.hp <= 0) continue;
      const breathe = 0.5 + 0.5 * Math.sin(t * 2.4 + r.stacks);
      g.fillStyle(0x557722, 0.08 * r.stacks + 0.05 * breathe);
      g.fillCircle(tg.x, tg.y + 6, 20 + 5 * r.stacks);
      // Drips running off the edge of the slick — more of them the deeper the rot.
      for (let d = 0; d < r.stacks * 3; d++) {
        const a = d * 1.9 + t * 0.8;
        const rr = 14 + 6 * r.stacks;
        const sag = ((t * 22 + d * 13) % 14);
        g.fillStyle(0x88bb33, 0.35 * (1 - sag / 14));
        g.fillCircle(tg.x + Math.cos(a) * rr, tg.y + 6 + Math.sin(a) * rr * 0.5 + sag, 1.8);
      }
    }
  }

  /**
   * The demon: a hunched silhouette of smoke with horns and two coal eyes, rising as it
   * is summoned and guttering out once its volleys are spent. Its rounds are drawn as
   * clawed flames rather than dots, so hellfire never reads as a plain bullet.
   */
  private paintDemons(g: Phaser.GameObjects.Graphics, time: number, t: number): void {
    for (const d of this.demonAvatars) {
      const col = this.col(d.owner);
      const age = Phaser.Math.Clamp((time - d.bornAt) / 260, 0, 1);
      const life = Phaser.Math.Clamp((d.diesAt - time) / 400, 0, 1);
      const a = age * life;
      const rise = (1 - age) * 14;
      const cx = d.x, cy = d.y + rise;
      const h = 30 * age;

      // Body: a smoke column that widens at the shoulders.
      g.fillStyle(col(GUNPOWDER.void), 0.55 * a);
      g.fillEllipse(cx, cy, 26, h);
      g.fillStyle(col(GUNPOWDER.violet), 0.28 * a);
      g.fillEllipse(cx, cy - h * 0.18, 34, h * 0.5);
      // Horns, swept back off the skull.
      g.lineStyle(3, col(GUNPOWDER.char), 0.75 * a);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + s * 8, cy - h * 0.42);
        g.lineTo(cx + s * 15, cy - h * 0.66 - 3);
        g.lineTo(cx + s * 11, cy - h * 0.78);
        g.strokePath();
      }
      // Coal eyes, flaring on the beat of the echo.
      const flare = 0.6 + 0.4 * Math.sin(t * 9 + d.bornAt);
      for (const s of [-1, 1]) {
        g.fillStyle(col(GUNPOWDER.ember), a * flare);
        g.fillCircle(cx + s * 5, cy - h * 0.38, 2.2 + flare);
      }
      // Smoke shedding off its shoulders.
      for (let p = 0; p < 4; p++) {
        const ph = (t * 0.7 + p * 0.25) % 1;
        smokePuff(g, col, cx + Math.sin(t * 2 + p) * 9, cy - h * 0.5 - ph * 16,
          4 + ph * 7, p, GUNPOWDER.smoke, 0.2 * a * (1 - ph));
      }
    }

    for (const s of this.demonShots) {
      const col = this.col(s.owner);
      const flick = Math.sin(t * 22 + s.seed);
      const back = s.angle + Math.PI;
      // A head of white heat with a torn tail streaming behind it.
      g.fillStyle(col(GUNPOWDER.glow), 0.9);
      g.fillCircle(s.x, s.y, 3.4);
      g.fillStyle(col(GUNPOWDER.ember), 0.75);
      g.fillCircle(s.x, s.y, 5.5 + flick * 0.6);
      for (let i = 1; i <= 4; i++) {
        const f = i / 4;
        const wob = Math.sin(t * 16 + s.seed + i) * 3 * f;
        g.fillStyle(col(i > 2 ? GUNPOWDER.violet : GUNPOWDER.flame), 0.5 * (1 - f));
        g.fillCircle(
          s.x + Math.cos(back) * i * 7 + Math.cos(back + Math.PI / 2) * wob,
          s.y + Math.sin(back) * i * 7 + Math.sin(back + Math.PI / 2) * wob,
          4.4 * (1 - f * 0.6),
        );
      }
      // Two little claws of flame raking forward off the head.
      g.lineStyle(1.5, col(GUNPOWDER.blaze), 0.6);
      for (const sd of [-1, 1]) {
        const a = s.angle + sd * 0.5;
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(s.x + Math.cos(a) * (7 + flick), s.y + Math.sin(a) * (7 + flick));
        g.strokePath();
      }
    }
  }

  // ── Corruption (perk) ────────────────────────────────────────────────────

  /**
   * Rot from a corrupted ball or a festering musket. Stacking is what makes the perk
   * worth carrying: three landed shots triple the tick, and every new one resets the clock.
   */
  applyCorruptionRot(target: Fighter, owner: 'player' | 'npc'): void {
    if (!target.active || target.hp <= 0) return;
    const time = this.arena.scene.time.now;
    const existing = this.rots.find((r) => r.target === target && r.owner === owner);
    if (existing) {
      existing.until = time + ROT_MS;
      if (existing.stacks < ROT_MAX_STACKS) {
        existing.stacks++;
        this.arena.showFloatingText(target.x, target.y - 52, `☠️ ROT ×${existing.stacks}`, '#88bb33');
      }
      return;
    }
    this.rots.push({ target, owner, stacks: 1, until: time + ROT_MS, nextTickAt: time + ROT_TICK_MS });
    this.arena.showFloatingText(target.x, target.y - 52, '☠️ ROT', '#88bb33');
  }

  /** ArenaScene chokepoint: an npc musket ball that just landed on the player. */
  onNpcMusketHitPlayer(target: Fighter): void {
    if (this.arena.hasPerk('npc', 'corruption')) this.applyCorruptionRot(target, 'npc');
  }

  private updateRots(time: number): void {
    for (let i = this.rots.length - 1; i >= 0; i--) {
      const r = this.rots[i];
      if (!r.target.active || r.target.hp <= 0 || time >= r.until) {
        this.rots.splice(i, 1);
        continue;
      }
      if (time < r.nextTickAt) continue;
      r.nextTickAt += ROT_TICK_MS;
      r.target.takeDamage(ROT_DPS_PER_STACK * r.stacks);
      this.arena.spawnHitFlash(r.target.x, r.target.y, 0x88bb33);
    }
  }

  /** A hot musket lying in the grass is a hazard while the perk is up, not just litter. */
  private updateFestering(time: number): void {
    for (const m of this.muskets) {
      if (m.flying || m.cooled || !this.arena.hasPerk(m.owner, 'corruption')) continue;
      if (time - (m.lastFesterAt ?? 0) < ROT_FESTER_INTERVAL_MS) continue;
      for (const foe of this.foesOf(m.owner)) {
        if (!foe.active || foe.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(m.x, m.y, foe.x, foe.y) > ROT_FESTER_RADIUS) continue;
        m.lastFesterAt = time;
        this.applyCorruptionRot(foe, m.owner);
        break;
      }
    }
  }

  // ── Demon (perk) ─────────────────────────────────────────────────────────

  /**
   * The demon echo: the same volley again out of the thing standing behind you, as
   * homing hellfire at reduced damage. Scheduled rather than fired inline so the two
   * volleys read as call and answer.
   */
  private summonDemonEcho(tx: number, ty: number, owner: 'player' | 'npc', shots: number): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = scene.time.now;
    // The demon rises at the caster's back, facing the same way the volley went.
    this.demonAvatars.push({
      owner, angle,
      x: caster.x - Math.cos(angle) * 34,
      y: caster.y - Math.sin(angle) * 34,
      bornAt: now, diesAt: now + DEMON_ECHO_DELAY_MS + 900,
    });
    this.arena.showFloatingText(caster.x, caster.y - 56, '😈 DEMON', '#ff4422');

    const volleys = caster.hp / Math.max(1, caster.maxHp) < DEMON_THIRD_VOLLEY_HP_RATIO ? 2 : 1;
    for (let v = 0; v < volleys; v++) {
      scene.time.delayedCall(DEMON_ECHO_DELAY_MS * (v + 1), () => {
        if (!caster.active || caster.hp <= 0) return;
        const ox = caster.x - Math.cos(angle) * 34, oy = caster.y - Math.sin(angle) * 34;
        for (let i = 0; i < shots; i++) {
          // Fanned out of the demon's spread so a big arsenal reads as a wall of hellfire.
          const spread = (i - (shots - 1) / 2) * 0.16;
          this.demonShots.push({
            x: ox, y: oy, angle: angle + spread, owner,
            damage: Math.round(DEMON_SHOT_BASE_DAMAGE * DEMON_ECHO_DAMAGE_MULT),
            diesAt: scene.time.now + DEMON_SHOT_LIFETIME_MS,
            seed: Math.random() * Math.PI * 2,
          });
        }
        this.fx(owner).smoke(ox, oy, 3, { angle, spread: 1.2, radius: 7, life: 800, depth: 5 });
        scene.cameras.main.shake(80, 0.002);
      });
    }
  }

  private updateDemonShots(time: number, delta: number): void {
    const dt = delta / 1000;
    const { width: W, height: H } = this.arena.scene.scale;
    for (let i = this.demonShots.length - 1; i >= 0; i--) {
      const s = this.demonShots[i];
      if (time >= s.diesAt || s.x < -30 || s.x > W + 30 || s.y < -30 || s.y > H + 30) {
        this.demonShots.splice(i, 1);
        continue;
      }
      // Hellfire steers, but lazily — it can still be outrun on a hard cut.
      const foes = this.foesOf(s.owner).filter((f) => f.active && f.hp > 0);
      if (foes.length > 0) {
        let best = foes[0], bestD = Infinity;
        for (const f of foes) {
          const d = Phaser.Math.Distance.Between(s.x, s.y, f.x, f.y);
          if (d < bestD) { bestD = d; best = f; }
        }
        const want = Math.atan2(best.y - s.y, best.x - s.x);
        s.angle += Phaser.Math.Angle.Wrap(want - s.angle) * Math.min(1, DEMON_SHOT_TURN_RATE * dt);
      }
      s.x += Math.cos(s.angle) * DEMON_SHOT_SPEED * dt;
      s.y += Math.sin(s.angle) * DEMON_SHOT_SPEED * dt;

      for (const f of this.foesOf(s.owner)) {
        if (!f.active || f.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, f.x, f.y) > DEMON_SHOT_HIT_RADIUS) continue;
        f.takeDamage(s.damage);
        this.arena.spawnHitFlash(f.x, f.y, 0xff3311);
        this.fx(s.owner).sparks(s.x, s.y, 5, s.angle, 9, GUNPOWDER.ember);
        this.demonShots.splice(i, 1);
        break;
      }
    }
    for (let i = this.demonAvatars.length - 1; i >= 0; i--) {
      if (time >= this.demonAvatars[i].diesAt) this.demonAvatars.splice(i, 1);
    }
  }

  /**
   * Live enemies of `owner`. Same convention the fireworks use: the npc side only ever
   * faces the player, while the player side faces the husk pool when there is one.
   */
  private foesOf(owner: 'player' | 'npc'): Fighter[] {
    const foes = owner === 'npc'
      ? [this.arena.player]
      : this.arena.enemies.length > 0 ? this.arena.enemies : [this.arena.npc];
    return foes.filter((f) => f && f.active && f.hp > 0);
  }

  // ── Mastery requirement tracking ─────────────────────────────────────────

  /** ArenaScene's projectile-hit choke point — counts Musket Shot balls that connect,
   *  and sets off the Q+ lit bullets. */
  onPlayerProjectileHit(proj: Projectile, target?: Fighter): void {
    if ((proj as unknown as { isMusketShot?: boolean }).isMusketShot) {
      this.arena.recordMasteryStat('musketHits', 1);
      // Corruption: the ball was rotten before it left the barrel.
      if (target && this.arena.hasPerk('player', 'corruption')) this.applyCorruptionRot(target, 'player');
    }
    if ((proj as unknown as { gpBlunderFire?: boolean }).gpBlunderFire) {
      this.igniteBlunderShot(proj, target);
    }
  }

  /**
   * "Collect every weapon type at least once" is a set, not a counter, so each type
   * gets its own persisted flag and the requirement key is re-derived as their sum —
   * monotonic, so it rides the existing best-value ratchet.
   */
  private noteWeaponCollected(type: WeaponType): void {
    this.arena.recordMasteryBestStat(`gpWeapon_${type}`, 1);
    let owned = 0;
    for (const t of [...BASE_WEAPON_TYPES, ...EXTRA_WEAPON_TYPES]) {
      if (this.arena.getMasteryStat(`gpWeapon_${t}`) > 0) owned++;
    }
    this.arena.recordMasteryBestStat('weaponTypes', owned);
  }

  // ── Mastery: Fireworks (passive) ─────────────────────────────────────────

  private updateFireworks(time: number, delta: number): void {
    const playerOn = this.arena.masteryActive;
    // Online only: the remote gunpowder player's fireworks must be simulated on this
    // (victim) sim, since hits on their replica never touch their real HP.
    const npcOn = this.arena.npcMasteryActive && this.arena.npcElementId === 'gunpowder';
    if (!playerOn && !npcOn && this.fireworks.length === 0) return;

    this.tryPlantFirework('player', playerOn, time);
    this.tryPlantFirework('npc', npcOn, time);
    this.advanceFireworks(time, delta);
  }

  /** Which wall the fighter is currently scraping, or null when they're out in the open. */
  private wallTouchedBy(f: Fighter): WallSide | null {
    const wb = this.arena.scene.physics.world.bounds;
    const r = (f.body as Phaser.Physics.Arcade.Body | null)?.halfWidth ?? 22;
    if (f.x - r <= wb.x + FIREWORK_WALL_PAD) return 'left';
    if (f.x + r >= wb.right - FIREWORK_WALL_PAD) return 'right';
    if (f.y - r <= wb.y + FIREWORK_WALL_PAD) return 'top';
    if (f.y + r >= wb.bottom - FIREWORK_WALL_PAD) return 'bottom';
    return null;
  }

  private tryPlantFirework(owner: 'player' | 'npc', enabled: boolean, time: number): void {
    if (!enabled) return;
    const self = owner === 'player' ? this.arena.player : this.arena.npc;
    if (!self.active || self.hp <= 0) return;
    const last = owner === 'player' ? this.playerLastPlantAt : this.npcLastPlantAt;
    if (time - last < FIREWORK_PLANT_CD_MS) return;
    const side = this.wallTouchedBy(self);
    if (!side) return;

    // Pin it to the wall itself, at whatever point along it the fighter is standing.
    const wb = this.arena.scene.physics.world.bounds;
    const x = side === 'left' ? wb.x : side === 'right' ? wb.right : Phaser.Math.Clamp(self.x, wb.x, wb.right);
    const y = side === 'top' ? wb.y : side === 'bottom' ? wb.bottom : Phaser.Math.Clamp(self.y, wb.y, wb.bottom);

    // Fireworks can't be stacked. A refused plant doesn't spend the cooldown, so
    // stepping clear of your own tube lets you plant the moment you're past it.
    for (const fw of this.fireworks) {
      if (fw.launched || fw.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(fw.x, fw.y, x, y) < FIREWORK_MIN_GAP) return;
    }

    const dx = side === 'left' ? 1 : side === 'right' ? -1 : 0;
    const dy = side === 'top' ? 1 : side === 'bottom' ? -1 : 0;
    this.fireworks.push({
      owner, x, y, side, dx, dy,
      plantedAt: time,
      launchAt: time + FIREWORK_FUSE_MS,
      launched: false,
      px: x, py: y,
      color: FIREWORK_SHELL_COLORS[Math.floor(Math.random() * FIREWORK_SHELL_COLORS.length)],
    });
    if (owner === 'player') this.playerLastPlantAt = time;
    else this.npcLastPlantAt = time;
  }

  private advanceFireworks(time: number, delta: number): void {
    const dt = delta / 1000;
    const wb = this.arena.scene.physics.world.bounds;

    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];

      if (!fw.launched) {
        if (time < fw.launchAt) continue; // painted from its fuse timer in paintWorld
        fw.launched = true;
        this.playFireworkLiftoff(fw);
      }

      fw.px += fw.dx * FIREWORK_SPEED * dt;
      fw.py += fw.dy * FIREWORK_SPEED * dt;

      // Direct hit — 10 damage, and the star shell around it deliberately skips
      // the fighter it just buried itself in.
      const foe = this.firstFoeAt(fw);
      if (foe) {
        foe.takeDamage(FIREWORK_DAMAGE);
        this.arena.spawnHitFlash(foe.x, foe.y, fw.color);
        this.arena.showFloatingText(foe.x, foe.y - 44, '🎆 FIREWORK', '#ffcc55');
        this.burstFirework(fw, foe);
        this.fireworks.splice(i, 1);
        continue;
      }

      // Nothing in the way — it goes off against the far wall instead.
      if (fw.px <= wb.x || fw.px >= wb.right || fw.py <= wb.y || fw.py >= wb.bottom) {
        this.burstFirework(fw, null);
        this.fireworks.splice(i, 1);
        continue;
      }
    }
  }

  /** The first thing the shell is currently overlapping that its owner may hurt. */
  private firstFoeAt(fw: Firework): Fighter | null {
    const foes = fw.owner === 'npc'
      ? [this.arena.player]
      : this.arena.enemies.length > 0 ? this.arena.enemies : [this.arena.npc];
    for (const f of foes) {
      if (!f.active || f.hp <= 0) continue;
      const r = (f.body as Phaser.Physics.Arcade.Body | null)?.halfWidth ?? 22;
      if (Phaser.Math.Distance.Between(fw.px, fw.py, f.x, f.y) <= FIREWORK_HIT_RADIUS + r) return f;
    }
    return null;
  }

  private burstFirework(fw: Firework, except: Fighter | null): void {
    this.arena.dealAoeDamageFromOwner(
      fw.px, fw.py, FIREWORK_AOE_RADIUS, FIREWORK_AOE_DAMAGE, fw.owner, except ?? undefined,
    );
    this.drawFireworkBurst(fw);
  }

  /** Liftoff: a torn muzzle petal off the wall and a cloud of launch smoke left behind. */
  private playFireworkLiftoff(fw: Firework): void {
    const ang = Math.atan2(fw.dy, fw.dx);
    const fx = this.fx(fw.owner);
    fx.muzzle(fw.x, fw.y, ang, 1, 11, fw.color);
    fx.smoke(fw.x, fw.y, 5, { angle: ang + Math.PI, spread: 1.7, radius: 6, life: 700, depth: 9 });
  }

  /** The shell going off: the full star-shell chrysanthemum, sized to its AOE. */
  private drawFireworkBurst(fw: Firework): void {
    this.fx(fw.owner).starShell(fw.px, fw.py, FIREWORK_AOE_RADIUS, fw.color, 11);
    this.arena.scene.cameras.main.shake(90, 0.002);
  }

  // ── Q+ Vortex Cannon: lit bullets ────────────────────────────────────────

  /** Prunes dead lit bullets; the live ones are painted with the rest of the world. */
  private updateBlunderFire(_time: number): void {
    for (let i = this.blunderFireShots.length - 1; i >= 0; i--) {
      const p = this.blunderFireShots[i];
      if (!p.active || !p.body) this.blunderFireShots.splice(i, 1);
    }
  }

  /** Impact of a lit bullet: sets the victim burning, then bursts for a small fire AOE. */
  private igniteBlunderShot(proj: Projectile, target?: Fighter): void {
    const now = this.arena.scene.time.now;
    if (target) {
      target.burningUntil = Math.max(
        target.burningUntil, now + Math.round(BLUNDER_FIRE_DOT_MS * target.statusDurMult),
      );
      this.arena.showFloatingText(target.x, target.y - 40, '🔥 BURNING', '#ff7733');
    }
    this.arena.dealAoeDamageFromOwner(
      proj.x, proj.y, BLUNDER_FIRE_AOE_RADIUS, BLUNDER_FIRE_AOE_DAMAGE, 'player',
    );
    // A lit round going off: torn petals, a pressure ring and smoke left hanging.
    this.pfx.boom(proj.x, proj.y, BLUNDER_FIRE_AOE_RADIUS, {
      color: GUNPOWDER.flame, petals: 8, shrapnel: 5, smoke: 4,
    });
  }

  // ── Mastery: Overload (bindable) ─────────────────────────────────────────

  /** The slot Overload is bound over this match, or null when it isn't bound anywhere. */
  private overloadSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'overload') return s;
    }
    return null;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar when Overload is bound to a slot. */
  getOverloadCooldownRatio(time: number): number {
    return Math.min(1, (time - this.overloadLastCastAt) / OVERLOAD_COOLDOWN_MS);
  }

  private tryCastOverload(): void {
    const time = this.arena.scene.time.now;
    if (time - this.overloadLastCastAt < OVERLOAD_COOLDOWN_MS) return;
    if (!this.beginOverload('player')) {
      const p = this.arena.player;
      this.arena.showFloatingText(p.x, p.y - 30, '⚠ No Muskets Down', '#ff6644');
      return; // nothing to aim — the cooldown isn't spent
    }
    this.overloadLastCastAt = time;
    // Private timer, so this cast never flows through onCastStamp — broadcast it by hand.
    this.arena.broadcastMasteryCast('overload');
  }

  /** Online replay: the remote gunpowder player overloaded their muskets at us. */
  doNpcOverload(): void {
    this.beginOverload('npc');
  }

  private beginOverload(owner: 'player' | 'npc'): boolean {
    const { scene } = this.arena;
    const now = scene.time.now;
    const grounded = this.muskets.filter((m) => m.owner === owner && !m.flying);
    if (grounded.length === 0) return false;

    const firesAt = now + OVERLOAD_AIM_MS;
    for (const m of grounded) m.aimingFor = firesAt;
    this.overloadVolleys.push({ owner, startedAt: now, firesAt });
    void scene;

    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.avatar(owner)?.play('flex');
    this.arena.showFloatingText(caster.x, caster.y - 44, `🔫 OVERLOAD ×${grounded.length}`, '#dddddd');
    return true;
  }

  private updateOverload(time: number): void {
    if (this.overloadVolleys.length === 0) return;

    for (let i = this.overloadVolleys.length - 1; i >= 0; i--) {
      const v = this.overloadVolleys[i];
      const aiming = this.muskets.filter((m) => m.owner === v.owner && m.aimingFor === v.firesAt);
      if (aiming.length === 0) { this.overloadVolleys.splice(i, 1); continue; }

      const target = v.owner === 'player' ? this.arena.npc : this.arena.player;
      if (time < v.firesAt) {
        // The barrels swing onto the target and tremble harder as the hammers pull back; the
        // laser sights themselves are painted with the rest of the world.
        const t = Phaser.Math.Clamp((time - v.startedAt) / OVERLOAD_AIM_MS, 0, 1);
        for (const m of aiming) {
          m.angle = Math.atan2(target.y - m.y, target.x - m.x) + 0.05 * t * Math.sin(time / 22 + m.droppedAt);
        }
        continue;
      }

      for (const m of aiming) this.fireOverloadShot(m, target, time);
      this.arena.scene.cameras.main.shake(200, 0.005);
      this.overloadVolleys.splice(i, 1);
    }
  }

  /**
   * The laser sights and closing crosshairs of every volley currently lining up. Drawn over the
   * fighters so the sight isn't buried under the sprite it is aimed at.
   */
  private drawOverloadSights(g: Phaser.GameObjects.Graphics, time: number): void {
    for (const v of this.overloadVolleys) {
      if (time >= v.firesAt) continue;
      const t = Phaser.Math.Clamp((time - v.startedAt) / OVERLOAD_AIM_MS, 0, 1);
      const target = v.owner === 'player' ? this.arena.npc : this.arena.player;
      const tint = this.col(v.owner);
      const aiming = this.muskets.filter((m) => m.owner === v.owner && m.aimingFor === v.firesAt);

      for (const m of aiming) {
        const muzzleX = m.x + Math.cos(m.angle) * 22;
        const muzzleY = m.y + Math.sin(m.angle) * 22;
        // Wide haze, body, hot core — each tighter and brighter than the last.
        g.lineStyle(6, tint(OVERLOAD_LASER_COLOR), 0.06 + 0.10 * t);
        g.lineBetween(muzzleX, muzzleY, target.x, target.y);
        g.lineStyle(2, tint(OVERLOAD_LASER_COLOR), 0.18 + 0.35 * t);
        g.lineBetween(muzzleX, muzzleY, target.x, target.y);
        g.lineStyle(1, tint(GUNPOWDER.glow), 0.25 + 0.6 * t);
        g.lineBetween(muzzleX, muzzleY, target.x, target.y);
        // Heat blooming out of the breech as the charge builds.
        g.fillStyle(tint(GUNPOWDER.ember), 0.10 + 0.22 * t);
        g.fillCircle(m.x, m.y, 6 + 7 * t + Math.sin(time / 90) * 1.5);
      }

      if (aiming.length === 0) continue;
      // Converging crosshair over the target — four ticks closing in, rotating slowly. Stays
      // wider than the sprite it sits on so the tightening still reads.
      const ring = 46 - 20 * t;
      const spin = time / 400;
      g.lineStyle(1.5, tint(OVERLOAD_LASER_COLOR), 0.35 + 0.5 * t);
      for (let k = 0; k < 4; k++) {
        const a = spin + (k * Math.PI) / 2;
        g.lineBetween(
          target.x + Math.cos(a) * ring, target.y + Math.sin(a) * ring,
          target.x + Math.cos(a) * (ring + 8), target.y + Math.sin(a) * (ring + 8),
        );
      }
      g.strokeCircle(target.x, target.y, ring);
    }
  }

  /** The volley itself: one musket ball each, then the barrel is left glowing. */
  private fireOverloadShot(m: DroppedMusket, target: Fighter, time: number): void {
    const { scene } = this.arena;
    m.aimingFor = 0;

    const angle = Math.atan2(target.y - m.y, target.x - m.x);
    const nx = Math.cos(angle), ny = Math.sin(angle);
    const isPlayer = m.owner === 'player';

    const proj = new Projectile(scene, m.x + nx * 20, m.y + ny * 20, 'proj-gunpowder-musket', OVERLOAD_SHOT_DAMAGE, isPlayer);
    (proj as unknown as { isMusketShot?: boolean }).isMusketShot = true;
    this.arena.projectiles.add(proj);
    proj.launch(nx * 900, ny * 900);
    proj.setRotation(angle);

    // A remote-fired barrel goes off harder than a hand-held one — bigger petal, more smoke.
    this.fx(m.owner).muzzle(m.x + nx * 22, m.y + ny * 22, angle, 1.3, 11, GUNPOWDER.glow);
    m.angle = angle;
    m.kick = 10; // decays back to zero in updateMuskets

    // Straight back to full heat, plus the Overload surcharge on top.
    const hotMs = 12000 * (isPlayer ? this.musketCoolMult() : 1) + OVERLOAD_EXTRA_HEAT_MS;
    m.droppedAt = time;
    m.hotUntil = time + hotMs;
    m.cooled = false;
    m.overloadBurnUntil = m.hotUntil;
    m.lastOwnerBurnAt = 0;
  }
}
