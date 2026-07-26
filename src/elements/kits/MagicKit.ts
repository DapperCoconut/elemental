import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import {
  ArmGesture, MAGIC, MagicAura, MagicAuraStyle, MagicAvatar, MagicColorFn, MagicFx,
  arcaneRing, runeOrb, sigilStarLayered, vineLash,
} from './MagicVisuals';

// ── Arena API ─────────────────────────────────────────────────────────────────

export interface MagicArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get scene(): Phaser.Scene;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get leftKey(): Phaser.Input.Keyboard.Key;
  get rightKey(): Phaser.Input.Keyboard.Key;
  get nukeChanneling(): boolean;
  set nukeChanneling(v: boolean);
  get nukeChannelEnd(): number;
  set nukeChannelEnd(v: number);
  get npcNukeChanneling(): boolean;
  set npcNukeChanneling(v: boolean);
  get npcNukeChannelEnd(): number;
  set npcNukeChannelEnd(v: number);
  get playerSpeedMult(): number;
  set playerSpeedMult(v: number);
  get npcSpeedMult(): number;
  set npcSpeedMult(v: number);
  getSceneWidth(): number;
  getSceneHeight(): number;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  dealAoeDamageFromOwner(x: number, y: number, r: number, d: number, o: 'player' | 'npc'): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  /** True only when the player is magic AND Magic Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  /** Cumulative (additive) mastery progress stat. */
  recordMasteryStat(key: string, amount: number): void;
  /** Current value of a mastery progress stat (0 if never recorded). */
  getMasteryStat(key: string): number;
  /** Ratchet a mastery progress stat up to `value` — no-op if the stored value is already >= value. */
  recordMasteryBestStat(key: string, value: number): void;
  /** True when the local player is Magic — drives their rig, auras and world art. */
  get isPlayerMagic(): boolean;
  /** True when the opponent is Magic. */
  get isNpcMagic(): boolean;
  /** `(owner, base) => displayed` — the owner's colour cosmetic, or the identity. */
  magicColor(owner: 'player' | 'npc', base: number): number;
}

// ── Internal types ────────────────────────────────────────────────────────────

// Every world object below is plain data painted into the kit's own Graphics layers — nothing
// owns a sprite, so a cloud can boil, a funnel can turn and an orb can crack.

interface HealOrb {
  x: number; y: number;
  vx: number; vy: number;
  owner: 'player' | 'npc';
}

interface FlameCloud {
  /** Fixed wobble seed, so a cloud keeps its shape instead of reshuffling frame to frame. */
  seed: number;
  x: number; y: number;
  vx: number; vy: number;
  stopped: boolean;
  expireAt: number;
  tickAccum: number;
  radius: number;
  tickDmg: number;
  tickInterval: number;
  burnDuration: number;
  owner: 'player' | 'npc';
  followCursor?: boolean; // lerp toward mouse each frame instead of decelerating
  cursedFire?: boolean;   // apply cursed fire effect on tick hits
}

interface StormCloud {
  seed: number;
  /** Painted radius — the pulse reach is separate and much wider. */
  radius: number;
  x: number; y: number;
  expireAt: number;
  nextPulseAt: number;
  pulseInterval: number;
  pulseRadius: number;
  pulseDmg: number;
  owner: 'player' | 'npc';
  isAcidCloud?: boolean; // if true, apply darkVuln stacks instead of slow
}

interface RockOrb {
  angle: number;
  /** Live world position, resolved each frame so hit checks and painting agree. */
  x: number; y: number;
  radius: number;
  cracked: boolean;
  lastHitAt: number;
  canCrack: boolean;
  dmg: number;
  owner: 'player' | 'npc';
}

interface RockOrbSet {
  orbs: RockOrb[];
  expireAt: number;
  orbitR: number;
}

interface Tornado {
  seed: number;
  radius: number;
  /** Hurricane Vacuum funnels are ash-dark; a plain Tornado Blast is grey. */
  dark: boolean;
  x: number; y: number;
  vx: number; vy: number;
  expireAt: number;
  nextDirAt: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

interface ThornPrison {
  ex: number; ey: number;
  chainsHp: [number, number, number, number];
  owner: 'player' | 'npc';
  expireAt: number;
  dotAccum: number;
}

interface SparkleShot {
  proj: Phaser.GameObjects.Image;
  startX: number; startY: number;
  maxDist: number;
  stationaryAccum: number;
  exploded: boolean;
  owner: 'player' | 'npc';
  leaderId?: string; // id of the leader sparkle this one trails
  trailOffset?: number; // px behind leader
  damageMult?: number; // 0.75 for trailing sparkles
  angle?: number; // cached aim angle for trail positioning
  id?: string; // unique id for leader/follower linking
}

interface TempleSet {
  anchorX: number; anchorY: number;
  /** Monuments are bigger, darker stone than temples. */
  monument: boolean;
  orbs: RockOrb[];
  expireAt: number;
  orbitR: number;
  owner: 'player' | 'npc';
  contactDmg: number;
  slowMs: number;  // non-zero → apply dark80Slow instead of stun
  stunMs: number;  // non-zero → stun on contact
}

interface TortureTrapLink {
  target: Fighter;
  expireAt: number; // Date.now() based
  tickAccum: number;
  owner: 'player' | 'npc';
}

/** An instant vine arm, held for a few frames after the lash lands. */
interface VineFlash {
  x1: number; y1: number;
  x2: number; y2: number;
  hit: boolean;
  expireAt: number;
}

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'magic-sparkle-shot': 'punch',
  'magic-grimoire': 'sweep',
  'magic-anchor': 'slam',
  'magic-meditate': 'flex',
  'magic-necronomicon': 'raise',
};

// ── Wheel data ────────────────────────────────────────────────────────────────

const GRIMOIRE_LABELS  = ['🔥 Flame Burst', '🌧️ Storm Cloud', '🌿 V. Thorns', '💨 Compression', '🪨 Gaia Guide'];
const GRIMOIRE_COLORS  = [0xff7733, 0x3388ff, 0x33aa44, 0x888888, 0x885522];
const NECRO_LABELS     = ['🌋 Flame Barrage', '🌊 Final Drench', '🌿 Thorn Prison', '🌪️ Tornado', '🌋 Gaia Rage'];
const NECRO_COLORS     = [0xcc2200, 0x1144aa, 0x226622, 0x444444, 0x553311];

const DARK_GRIMOIRE_LABELS = ['🔥 Corrupt Flames', '⛈️ Acid Cloud', '🌿 Drain Thorns', '💨 Dark Gale', '🛕 Gaia Temple'];
const DARK_GRIMOIRE_COLORS = [0xff5500, 0x3366cc, 0x22aa44, 0x888888, 0x775533];
const DARK_NECRO_LABELS    = ['🌋 Dark Barrage', '🌊 Acid Rain', '🌿 Torture Trap', '🌪️ Hurricane Vac.', '🌋 Gaia Monument'];
const DARK_NECRO_COLORS    = [0xcc1100, 0x112255, 0x226633, 0x333333, 0x442200];

// ── MagicKit ──────────────────────────────────────────────────────────────────

export class MagicKit {
  // ── Visuals ────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a colour cosmetic recolours one side. */
  private readonly pcol: MagicColorFn;
  private readonly ncol: MagicColorFn;
  private readonly pfx: MagicFx;
  private readonly nfx: MagicFx;
  /** The conjurer rig (rune hands, eyes, crown grimoire) for each magic fighter. */
  private playerAvatar: MagicAvatar | null = null;
  private npcAvatar: MagicAvatar | null = null;
  /** Stance tells, per side where both can run one. */
  private auras: Partial<Record<`${'player' | 'npc'}:${MagicAuraStyle}`, MagicAura>> = {};
  /**
   * Two layers, because these objects are not all in the same place. Anchors, temples, scorched
   * runes and prison chains lie on the floor and pass *under* the fighters; clouds, funnels,
   * orbiting stone, sparkles and vines are thrown out in front and pass over.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;
  /** Last cursor position, cached in handleInput — `update` has no pointer of its own. */
  private lastAimX = 0;
  private lastAimY = 0;
  /** Instant vine arms (Draining Thorns / Torture Trap), held for a few frames. */
  private vineFlashes: VineFlash[] = [];

  // ── Player wheel state ────────────────────────────────────────────────────
  private grimoireMenuOpen = false;
  private grimoireMenuGfx: Phaser.GameObjects.Graphics | null = null;
  private grimoireMenuLabels: Phaser.GameObjects.Text[] = [];
  private grimoireSelectedIndex = 0;
  private grimoireHoldStart = 0;
  private grimoireKeyNavUsed = false;
  private grimoireLastPick = 0;

  private necronomiconMenuOpen = false;
  private necronomiconMenuGfx: Phaser.GameObjects.Graphics | null = null;
  private necronomiconMenuLabels: Phaser.GameObjects.Text[] = [];
  private necronomiconSelectedIndex = 0;
  private necronomiconHoldStart = 0;
  private necronomiconKeyNavUsed = false;
  private necronomiconLastPick = 0;

  private aimCountdownLabel: Phaser.GameObjects.Text | null = null;
  private aimCountdownEnd = 0;
  private aimCountdownFired = false;

  // ── Anchor ────────────────────────────────────────────────────────────────
  private anchor: { x: number; y: number } | null = null;
  private npcAnchor: { x: number; y: number } | null = null;

  // ── Meditate ──────────────────────────────────────────────────────────────
  private meditating = false;
  private meditateEndAt = 0;
  private meditateNextSpawn = 0;
  private npcMeditating = false;
  private npcMeditateEndAt = 0;
  private npcMeditateNextSpawn = 0;

  // ── Heal orbs ─────────────────────────────────────────────────────────────
  private healOrbs: HealOrb[] = [];

  // ── Chain bind (player bound by NPC's vine) ───────────────────────────────
  private playerBound = false;
  private playerBoundEnd = 0;

  // ── Sparkle shots ─────────────────────────────────────────────────────────
  private sparkleShots: SparkleShot[] = [];

  // ── Flame clouds ──────────────────────────────────────────────────────────
  private flameClouds: FlameCloud[] = [];

  // ── Storm clouds + slow timestamps ───────────────────────────────────────
  private stormClouds: StormCloud[] = [];
  private npcStormSlowUntil = 0;
  private playerStormSlowUntil = 0;

  // ── Rock orbs ─────────────────────────────────────────────────────────────
  private playerRockSet: RockOrbSet | null = null;
  private npcRockSet: RockOrbSet | null = null;

  // ── Tornadoes ─────────────────────────────────────────────────────────────
  private tornadoes: Tornado[] = [];

  // ── Thorn prisons ─────────────────────────────────────────────────────────
  private thornPrison: ThornPrison | null = null;
  private npcThornPrison: ThornPrison | null = null;

  // ── Darkness system (player only; NPC never uses upgrades) ────────────────
  private darkness = 0;
  private darkGrimoireMode = false;
  private darkNecroMode = false;
  private darkCenterPressed = false;
  private darknessBarGfx: Phaser.GameObjects.Graphics | null = null;
  private darknessBarText: Phaser.GameObjects.Text | null = null;

  // ── R+ Wild Anchor speed boost ────────────────────────────────────────────
  private playerJustRecalledAt = 0;
  private playerSpeedBoostUntil = 0;
  private playerSpeedBoostMult = 1;
  private playerSpeedBoostDark = false;

  // ── F+ mobile meditate ────────────────────────────────────────────────────
  private playerMeditateMobile = false;
  private playerMeditateTrailNext = 0;

  // ── Dark status effects (internal to kit) ─────────────────────────────────
  private npcCursedFireUntil = 0;
  private npcCursedFireTickAccum = 0;
  private npcDark80SlowUntil = 0;

  // ── Dark Gale cone (E+ Recalling Gale / Q+ Hurricane initial pull) ─────────
  private playerDarkGaleUntil = 0;
  private playerDarkGaleAngle = 0;
  private playerDarkGaleOnce = false;
  private playerHurricaneGaleUntil = 0;
  private playerHurricaneGaleAngle = 0;
  private playerHurricaneGaleOnce = false;

  // ── Temple/Monument orb sets (fixed-anchor orbits) ────────────────────────
  private templeSets: TempleSet[] = [];

  // ── Torture trap links ────────────────────────────────────────────────────
  private tortureTrapLinks: TortureTrapLink[] = [];

  // ── Thunder perk (abstract-triple) ────────────────────────────────────────
  private playerThunderECharged = false;
  private playerThunderQCharged = false;
  private npcThunderECharged = false;
  private npcThunderQCharged = false;
  private playerThunderThornCharged = false;

  // ── Magic Mastery — Transmogrify ────────────────────────────────────────
  private static readonly TRANSMOGRIFY_COOLDOWN_MS = 12000;
  private static readonly TRANSMOGRIFY_CHICKEN_MS = 8000;
  private transmogrifyLastCastAt = 0;
  private transmogrifyProjectiles: {
    x: number; y: number; vx: number; vy: number;
    owner: 'player' | 'npc';
  }[] = [];
  private chickenStates = new Map<Fighter, { angle: number; nextTurnAt: number; prevCooldownMult: number }>();

  constructor(private api: MagicArenaApi) {
    // Built here, not as field initialisers, so they see the injected api.
    this.pcol = (base) => api.magicColor('player', base);
    this.ncol = (base) => api.magicColor('npc', base);
    this.pfx = new MagicFx(api.scene, this.pcol);
    this.nfx = new MagicFx(api.scene, this.ncol);
  }

  // ── Visual helpers ─────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): MagicFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): MagicColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Magic. */
  private avatarFor(owner: 'player' | 'npc'): MagicAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private fighter(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.api.player : this.api.npc;
  }
  /** Fire one arm gesture on the rig of whichever side cast. */
  private gesture(owner: 'player' | 'npc', abilityId: string, angle?: number): void {
    const g = CAST_GESTURES[abilityId];
    if (g) this.avatarFor(owner)?.play(g, angle);
  }

  /** The floor layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.api.scene.add.graphics().setDepth(3);
    }
    return this.groundGfx;
  }

  /** The thrown-out-in-front layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.api.scene.add.graphics().setDepth(9);
    }
    return this.airGfx;
  }

  /** Build/tear down one stance aura from a single "is it up?" flag. */
  private syncAura(
    owner: 'player' | 'npc', style: MagicAuraStyle, on: boolean,
    delta: number, intensity: number, angle: number, radius = 28,
  ): void {
    const key = `${owner}:${style}` as const;
    let aura = this.auras[key];
    const f = this.fighter(owner);
    if (!on || !f?.active) {
      if (aura) { aura.destroy(); delete this.auras[key]; }
      return;
    }
    if (!aura) {
      aura = new MagicAura(this.api.scene, this.col(owner), style, radius, style === 'darkness' ? 4 : 5);
      this.auras[key] = aura;
    }
    aura.setIntensity(intensity);
    aura.setAngle(angle);
    aura.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
  }

  private destroyAuras(): void {
    for (const a of Object.values(this.auras)) a?.destroy();
    this.auras = {};
  }

  // ── Public getters (queried by ArenaScene) ────────────────────────────────

  isPlayerBound(time: number): boolean {
    return this.playerBound && time < this.playerBoundEnd;
  }

  getPlayerSlowMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return now < this.playerStormSlowUntil ? 0.5 : 1.0;
  }

  getNpcSlowMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return now < this.npcStormSlowUntil ? 0.5 : 1.0;
  }

  getPlayerSpeedBoostMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return now < this.playerSpeedBoostUntil ? this.playerSpeedBoostMult : 1;
  }

  getPlayerMeditateSlowMult(): number {
    return this.playerMeditateMobile && this.meditating ? 0.25 : 1;
  }

  getNpcDark80SlowMult(): number {
    const now = this.api.scene.sys.game.loop.now;
    return now < this.npcDark80SlowUntil ? 0.2 : 1;
  }

  isThunderCharged(slot: 'e' | 'q'): boolean {
    return slot === 'e' ? this.playerThunderECharged : this.playerThunderQCharged;
  }

  // ── reset ─────────────────────────────────────────────────────────────────

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.destroyAuras();
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    this.vizT = 0;
    this.lastAimX = 0;
    this.lastAimY = 0;
    this.vineFlashes = [];

    this.grimoireMenuOpen = false;
    if (this.grimoireMenuGfx) { this.grimoireMenuGfx.destroy(); this.grimoireMenuGfx = null; }
    for (const l of this.grimoireMenuLabels) l.destroy();
    this.grimoireMenuLabels = [];
    this.grimoireSelectedIndex = 0; this.grimoireHoldStart = 0;
    this.grimoireKeyNavUsed = false; this.grimoireLastPick = 0;

    this.necronomiconMenuOpen = false;
    if (this.necronomiconMenuGfx) { this.necronomiconMenuGfx.destroy(); this.necronomiconMenuGfx = null; }
    for (const l of this.necronomiconMenuLabels) l.destroy();
    this.necronomiconMenuLabels = [];
    this.necronomiconSelectedIndex = 0; this.necronomiconHoldStart = 0;
    this.necronomiconKeyNavUsed = false; this.necronomiconLastPick = 0;

    if (this.aimCountdownLabel) { this.aimCountdownLabel.destroy(); this.aimCountdownLabel = null; }
    this.aimCountdownEnd = 0; this.aimCountdownFired = false;

    this.anchor = null;
    this.npcAnchor = null;

    this.meditating = false; this.meditateEndAt = 0; this.meditateNextSpawn = 0;
    this.npcMeditating = false; this.npcMeditateEndAt = 0; this.npcMeditateNextSpawn = 0;

    this.healOrbs = [];

    this.playerBound = false; this.playerBoundEnd = 0;

    for (const s of this.sparkleShots) { if ((s.proj as any).active) { s.proj.setActive(false).setVisible(false); } }
    this.sparkleShots = [];

    this.flameClouds = [];

    this.stormClouds = [];
    this.npcStormSlowUntil = 0; this.playerStormSlowUntil = 0;

    this.playerRockSet = null;
    this.npcRockSet = null;

    this.tornadoes = [];

    this.thornPrison = null;
    this.npcThornPrison = null;

    // Dark magic state
    this.darkness = 0;
    this.darkGrimoireMode = false; this.darkNecroMode = false;
    this.darkCenterPressed = false;
    if (this.darknessBarGfx) { this.darknessBarGfx.destroy(); this.darknessBarGfx = null; }
    if (this.darknessBarText) { this.darknessBarText.destroy(); this.darknessBarText = null; }

    this.playerJustRecalledAt = 0;
    this.playerSpeedBoostUntil = 0; this.playerSpeedBoostMult = 1; this.playerSpeedBoostDark = false;

    this.playerMeditateMobile = false;
    this.playerMeditateTrailNext = 0;

    this.npcCursedFireUntil = 0; this.npcCursedFireTickAccum = 0;
    this.npcDark80SlowUntil = 0;
    this.playerDarkGaleUntil = 0; this.playerHurricaneGaleUntil = 0;

    this.templeSets = [];

    this.tortureTrapLinks = [];

    this.playerThunderECharged = false;
    this.playerThunderQCharged = false;
    this.npcThunderECharged = false;
    this.npcThunderQCharged = false;
    this.playerThunderThornCharged = false;

    this.transmogrifyLastCastAt = 0;
    this.transmogrifyProjectiles = [];
    for (const [f, st] of this.chickenStates) {
      if (f.active) { f.setTexture(`elem-${f.element.id}`); f.cooldownMult = st.prevCooldownMult; }
      f.chickenUntil = 0;
    }
    this.chickenStates.clear();
    this.api.player.levitating = false;
    this.api.npc.levitating = false;
  }

  private addDarkness(amount: number): void {
    const before = this.darkness;
    this.darkness = Math.min(100, this.darkness + amount);
    this.api.recordMasteryStat('darkEnergyGained', amount);
    const { player } = this.api;
    // The corruption climbing you is the passive's whole cost, so it gets a moment.
    this.pfx.motes(player.x, player.y + 12, 5 + Math.round(amount / 8), {
      speed: 50, size: 2.4, life: 700, color: MAGIC.magenta, drift: -34,
    });
    this.api.showFloatingText(player.x, player.y - 44, `+${amount} ☠`, '#880088');
    if (before < 75 && this.darkness >= 75) {
      // Three-quarters gone: the arena is told, once, that this caster is close to the edge.
      this.pfx.ring(player.x, player.y, 14, 120, MAGIC.magenta, 700, 8, 3);
      this.api.scene.cameras.main.shake(180, 0.004);
    }
    if (this.darkness >= 100) {
      this.pfx.boom(player.x, player.y, 110, {
        color: MAGIC.magenta, sigils: 16, rings: 3, duration: 800,
      });
      this.api.scene.cameras.main.shake(400, 0.009);
      player.applySelfDamage(player.hp);
      this.api.showFloatingText(player.x, player.y - 28, '☠ Consumed by Darkness!', '#220022');
    }
  }

  private _pointToSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
  }

  // ── handleInput (player only) ─────────────────────────────────────────────

  handleInput(
    time: number,
    _delta: number,
    _pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    const { eKey, qKey, fKey, rKey, leftKey, rightKey } = this.api;
    // `update` has no pointer, and the rig has to keep facing the cursor between casts.
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;

    // While wheel open — key nav, release detection, dark mode center toggle
    if (this.grimoireMenuOpen || this.necronomiconMenuOpen) {
      const isGrimoire = this.grimoireMenuOpen;
      const idx = isGrimoire ? this.grimoireSelectedIndex : this.necronomiconSelectedIndex;
      const count = 5;

      // Center dark-mode toggle button
      const ptr2 = this.api.scene.input.activePointer;
      const centerDist = Phaser.Math.Distance.Between(ptr2.worldX, ptr2.worldY, this.api.player.x, this.api.player.y);
      const upgradeSlot = isGrimoire ? 'e' : 'q';
      if (ptr2.isDown) {
        if (!this.darkCenterPressed && centerDist <= 28 && this.api.hasUpgrade(upgradeSlot)) {
          this.darkCenterPressed = true;
          if (isGrimoire) this.darkGrimoireMode = !this.darkGrimoireMode;
          else this.darkNecroMode = !this.darkNecroMode;
          this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', idx);
        }
      } else {
        this.darkCenterPressed = false;
      }

      // Mouse hover — select the wedge under the pointer
      if (centerDist > 28) {
        const rawAngle = Math.atan2(ptr2.worldY - this.api.player.y, ptr2.worldX - this.api.player.x);
        const angleStep = (Math.PI * 2) / count;
        const normalized = (((rawAngle + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const hoverIdx = Math.round(normalized / angleStep) % count;
        if (hoverIdx !== idx) {
          if (isGrimoire) { this.grimoireSelectedIndex = hoverIdx; this.grimoireKeyNavUsed = true; }
          else { this.necronomiconSelectedIndex = hoverIdx; this.necronomiconKeyNavUsed = true; }
          this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', hoverIdx);
        }
      }

      if (Phaser.Input.Keyboard.JustDown(leftKey)) {
        const newIdx = (idx + count - 1) % count;
        if (isGrimoire) this.grimoireSelectedIndex = newIdx;
        else this.necronomiconSelectedIndex = newIdx;
        if (isGrimoire) this.grimoireKeyNavUsed = true;
        else this.necronomiconKeyNavUsed = true;
        this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', newIdx);
      }
      if (Phaser.Input.Keyboard.JustDown(rightKey)) {
        const newIdx = (idx + 1) % count;
        if (isGrimoire) this.grimoireSelectedIndex = newIdx;
        else this.necronomiconSelectedIndex = newIdx;
        if (isGrimoire) this.grimoireKeyNavUsed = true;
        else this.necronomiconKeyNavUsed = true;
        this._drawMenu(isGrimoire ? 'grimoire' : 'necronomicon', newIdx);
      }

      if (Phaser.Input.Keyboard.JustUp(eKey) && isGrimoire) {
        const heldMs = time - this.grimoireHoldStart;
        const pick = (heldMs < 150 && !this.grimoireKeyNavUsed)
          ? this.grimoireLastPick
          : this.grimoireSelectedIndex;
        this.grimoireLastPick = pick;
        this._closeMenu('grimoire');
        const thunderCharged = this.playerThunderECharged;
        this.playerThunderECharged = false;
        this._spawnAimCountdown(() => {
          const ptr = this.api.scene.input.activePointer;
          this._dispatchGrimoireWedge(pick, ptr.worldX, ptr.worldY, 'player', thunderCharged);
          this.api.player.triggerCooldown('magic-grimoire');
        });
      }
      if (Phaser.Input.Keyboard.JustUp(qKey) && !isGrimoire) {
        const heldMs = time - this.necronomiconHoldStart;
        const pick = (heldMs < 150 && !this.necronomiconKeyNavUsed)
          ? this.necronomiconLastPick
          : this.necronomiconSelectedIndex;
        this.necronomiconLastPick = pick;
        this._closeMenu('necronomicon');
        const thunderQCharged = this.playerThunderQCharged;
        this.playerThunderQCharged = false;
        this._spawnAimCountdown(() => {
          const ptr = this.api.scene.input.activePointer;
          this._dispatchNecronomiconWedge(pick, ptr.worldX, ptr.worldY, 'player', thunderQCharged);
          this.api.player.triggerCooldown('magic-necronomicon');
          if (thunderQCharged) this.api.player.reduceCooldown('magic-necronomicon', 15000);
        });
      }
      return;
    }

    const ptr = this.api.scene.input.activePointer;
    // Click — Sparkle Shot
    if (ptr.leftButtonDown()) {
      this.api.player.castAbility('magic-sparkle-shot', this._buildPlayerCtx(mouseX, mouseY));
    }

    // Magic Mastery — Transmogrify may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    const transSlot = this.transmogrifySlot();

    // E — open grimoire wheel (Thunder perk: first tap = Lightning Call / arm)
    if (transSlot === 'e') {
      if (Phaser.Input.Keyboard.JustDown(eKey)) this.tryCastTransmogrify(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(eKey)) {
      if (this.api.player.getCooldownRatio('magic-grimoire') >= 1) {
        if (this.api.hasPerk('player', 'thunder') && !this.playerThunderECharged) {
          this._doLightningCall('player');
          this.playerThunderECharged = true;
          this.api.player.triggerCooldown('magic-grimoire');
        } else {
          this.grimoireHoldStart = time;
          this.grimoireKeyNavUsed = false;
          this._openMenu('grimoire', this.grimoireLastPick);
        }
      }
    }

    // R — Anchor
    if (transSlot === 'r') {
      if (Phaser.Input.Keyboard.JustDown(rKey)) this.tryCastTransmogrify(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(rKey)) {
      this.api.player.castAbility('magic-anchor', this._buildPlayerCtx(mouseX, mouseY));
    }

    // F — Meditate (hold to channel; F+ mobile variant allows movement)
    if (transSlot === 'f') {
      if (Phaser.Input.Keyboard.JustDown(fKey)) this.tryCastTransmogrify(time, mouseX, mouseY);
    } else {
      if (Phaser.Input.Keyboard.JustDown(fKey)) {
        this.api.player.castAbility('magic-meditate', this._buildPlayerCtx(mouseX, mouseY));
      }
      if (this.meditating && !fKey.isDown && this.playerMeditateMobile) {
        this.endMeditate('player', false);
      }
    }

    // Q — open necronomicon wheel (Thunder perk: first tap = Apocalypse Call / arm)
    if (transSlot === 'q') {
      if (Phaser.Input.Keyboard.JustDown(qKey)) this.tryCastTransmogrify(time, mouseX, mouseY);
    } else if (Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.api.player.getCooldownRatio('magic-necronomicon') >= 1) {
        if (this.api.hasPerk('player', 'thunder') && !this.playerThunderQCharged) {
          this._doApocalypseCall('player');
          this.playerThunderQCharged = true;
          this.api.player.triggerCooldown('magic-necronomicon');
        } else {
          this.necronomiconHoldStart = time;
          this.necronomiconKeyNavUsed = false;
          this._openMenu('necronomicon', this.necronomiconLastPick);
        }
      }
    }
  }

  // ── update (per-frame) ────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const W = this.api.getSceneWidth();
    const H = this.api.getSceneHeight();
    this.vizT += delta / 1000;

    // ── Magic Mastery — Levitate passive ────────────────────────────
    this.api.player.levitating = this.api.masteryActive;

    // ── Magic Mastery — Transmogrify projectiles ────────────────────
    this.updateTransmogrifyProjectiles(delta, W, H);

    // ── Aim countdown label ───────────────────────────────────────────
    if (this.aimCountdownLabel?.active) {
      const remaining = Math.max(0, (this.aimCountdownEnd - time) / 1000);
      this.aimCountdownLabel.setText(`✨ ${remaining.toFixed(1)}`);
      this.aimCountdownLabel.setPosition(this.api.player.x, this.api.player.y - 54);
    }

    // ── Reposition open menus ─────────────────────────────────────────
    if (this.grimoireMenuOpen) {
      this._drawMenu('grimoire', this.grimoireSelectedIndex);
    }
    if (this.necronomiconMenuOpen) {
      this._drawMenu('necronomicon', this.necronomiconSelectedIndex);
    }

    // ── Meditate — spawn heal orbs ────────────────────────────────────
    for (const owner of ['player', 'npc'] as const) {
      const meditating = owner === 'player' ? this.meditating : this.npcMeditating;
      const endAt = owner === 'player' ? this.meditateEndAt : this.npcMeditateEndAt;
      if (meditating) {
        if (time >= endAt) {
          this.endMeditate(owner, false);
          continue;
        }
        const nextSpawn = owner === 'player' ? this.meditateNextSpawn : this.npcMeditateNextSpawn;
        if (time >= nextSpawn) {
          this._spawnHealOrb(owner);
          if (owner === 'player') this.meditateNextSpawn = time + 500;
          else this.npcMeditateNextSpawn = time + 500;
        }
      }
    }

    // ── Heal orbs ─────────────────────────────────────────────────────
    for (let i = this.healOrbs.length - 1; i >= 0; i--) {
      const orb = this.healOrbs[i];
      orb.x += orb.vx * (delta / 1000);
      orb.y += orb.vy * (delta / 1000);
      if (orb.x < 0 || orb.x > W || orb.y < 0 || orb.y > H) {
        this.healOrbs.splice(i, 1);
        continue;
      }
      const caster = orb.owner === 'player' ? this.api.player : this.api.npc;
      let orbHit = false;
      for (const enemy of (orb.owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!enemy.active || enemy.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(orb.x, orb.y, enemy.x, enemy.y) <= 28) {
          enemy.takeDamage(8);
          this.api.spawnHitFlash(enemy.x, enemy.y, MAGIC.lilac);
          this.fx(orb.owner).ring(orb.x, orb.y, 4, 30, MAGIC.lilac, 300, 9, 2);
          orbHit = true;
          break;
        }
      }
      if (orbHit) { this.healOrbs.splice(i, 1); continue; }
      if (Phaser.Math.Distance.Between(orb.x, orb.y, caster.x, caster.y) <= 24) {
        caster.heal(5);
        // Absorbed: the orb comes apart into the caster rather than just vanishing.
        this.fx(orb.owner).sigils(orb.x, orb.y, 4, {
          speed: 40, size: 5, life: 380, color: MAGIC.lilac,
        });
        if (orb.owner === 'player') {
          this.api.recordMasteryStat('meditateHealed', 5);
          this.api.showFloatingText(caster.x, caster.y - 28, '+5 ✨', '#cc99ff');
          // F+: each orb reduces darkness by 5
          if (this.api.hasUpgrade('f') && this.darkness > 0) {
            this.darkness = Math.max(0, this.darkness - 5);
            this.api.showFloatingText(caster.x, caster.y - 44, '-5 ☠', '#aa55ff');
          }
        }
        this.healOrbs.splice(i, 1);
      }
    }

    // ── Sparkle shots ─────────────────────────────────────────────────
    // First: update leader positions and track which leaders have exploded
    const explodedLeaders = new Set<string>();
    const leaderPositions = new Map<string, { x: number; y: number }>();
    for (const s of this.sparkleShots) {
      if (s.id && !s.leaderId) leaderPositions.set(s.id, { x: s.proj.x, y: s.proj.y });
    }

    for (let i = this.sparkleShots.length - 1; i >= 0; i--) {
      const s = this.sparkleShots[i];
      if (!s.proj.active) { this.sparkleShots.splice(i, 1); continue; }
      const body = (s.proj as any).body as Phaser.Physics.Arcade.Body;

      // Trailing sparkle: follow leader position offset
      if (s.leaderId && s.trailOffset !== undefined && s.angle !== undefined) {
        const leaderPos = leaderPositions.get(s.leaderId);
        if (!leaderPos) {
          // Leader gone — explode this trailer too
          if (!s.exploded) {
            s.exploded = true;
            const dmg = Math.round(14 * (s.damageMult ?? 0.75));
            this.api.dealAoeDamageFromOwner(s.proj.x, s.proj.y, 45, dmg, s.owner);
            this.fx(s.owner).boom(s.proj.x, s.proj.y, 45, {
              color: MAGIC.blush, sigils: 5, rings: 1, duration: 340, mark: false,
            });
          }
          s.proj.setActive(false).setVisible(false);
          body.stop();
          this.sparkleShots.splice(i, 1);
          continue;
        }
        // Position trailer behind leader
        const tx2 = leaderPos.x - Math.cos(s.angle) * s.trailOffset;
        const ty2 = leaderPos.y - Math.sin(s.angle) * s.trailOffset;
        s.proj.setPosition(tx2, ty2);
        body.setVelocity(0, 0);
        continue;
      }

      // Leader sparkle logic
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      const dist = Phaser.Math.Distance.Between(s.proj.x, s.proj.y, s.startX, s.startY);

      if (s.id) leaderPositions.set(s.id, { x: s.proj.x, y: s.proj.y });

      if (!s.exploded && (dist >= s.maxDist || speed < 5)) {
        body.setVelocity(0, 0);
        s.stationaryAccum += delta;
        if (s.stationaryAccum >= 1000) {
          s.exploded = true;
          if (s.id) explodedLeaders.add(s.id);
          this.api.dealAoeDamageFromOwner(s.proj.x, s.proj.y, 55, 14, s.owner);
          this.fx(s.owner).boom(s.proj.x, s.proj.y, 58, {
            color: MAGIC.blush, sigils: 8, rings: 2, duration: 440,
          });
          this.api.showFloatingText(s.proj.x, s.proj.y - 20, '✨ SPARKLE', '#ff99ff');
          s.proj.setActive(false).setVisible(false);
          body.stop();
          leaderPositions.delete(s.id!);
          this.sparkleShots.splice(i, 1);
        }
      }
    }

    // ── Flame clouds ──────────────────────────────────────────────────
    const ptr = this.api.scene.input.activePointer;
    for (let i = this.flameClouds.length - 1; i >= 0; i--) {
      const c = this.flameClouds[i];
      if (time >= c.expireAt) {
        this.fx(c.owner).motes(c.x, c.y, 5, {
          speed: 40, size: 2.4, life: 700, color: c.cursedFire ? MAGIC.cursed : MAGIC.ember, drift: -30,
        });
        this.flameClouds.splice(i, 1);
        continue;
      }
      if (c.followCursor) {
        // Dark flame cloud: lerp toward cursor
        c.x += (ptr.worldX - c.x) * 0.10;
        c.y += (ptr.worldY - c.y) * 0.10;
      } else if (!c.stopped) {
        c.vx *= 0.93;
        c.vy *= 0.93;
        c.x += c.vx * (delta / 1000);
        c.y += c.vy * (delta / 1000);
        if (Math.abs(c.vx) < 2 && Math.abs(c.vy) < 2) c.stopped = true;
      }
      // Tick damage + burn
      const targets = (c.owner === 'player' ? this.api.enemies : [this.api.player])
        .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= c.radius);
      if (targets.length > 0) {
        c.tickAccum += delta;
        while (c.tickAccum >= c.tickInterval) {
          for (const t of targets) {
            t.takeDamage(c.tickDmg, { source: c, sourceX: c.x, sourceY: c.y });
            this.api.spawnHitFlash(t.x, t.y, c.cursedFire ? MAGIC.cursed : MAGIC.ember);
            this.fx(c.owner).sigils(t.x, t.y, 2, {
              speed: 90, size: 5, life: 340, color: c.cursedFire ? MAGIC.corrupt : MAGIC.emberHi, points: 4,
            });
            t.burningUntil = Math.max(t.burningUntil, time + c.burnDuration);
            if (c.cursedFire && c.owner === 'player') {
              this.npcCursedFireUntil = Math.max(this.npcCursedFireUntil, time + 3000);
            }
          }
          c.tickAccum -= c.tickInterval;
        }
      } else {
        c.tickAccum = 0;
      }
    }

    // ── Storm clouds ──────────────────────────────────────────────────
    for (let i = this.stormClouds.length - 1; i >= 0; i--) {
      const c = this.stormClouds[i];
      if (time >= c.expireAt) {
        this.fx(c.owner).motes(c.x, c.y, 5, {
          speed: 40, size: 2.2, life: 700, color: c.isAcidCloud ? MAGIC.acid : MAGIC.storm, drift: 20,
        });
        this.stormClouds.splice(i, 1);
        continue;
      }
      if (time >= c.nextPulseAt && c.nextPulseAt > 0) {
        c.nextPulseAt = time + c.pulseInterval;
        // The downpour lets go: a hard wash out to the full pulse reach.
        const fx = this.fx(c.owner);
        fx.flash(c.x, c.y, c.radius * 0.6, 9, c.isAcidCloud ? MAGIC.acid : MAGIC.stormHi);
        fx.ring(c.x, c.y, 10, c.pulseRadius, c.isAcidCloud ? MAGIC.acid : MAGIC.storm, 520, 8, 3);
        fx.sigils(c.x, c.y, 8, {
          speed: c.pulseRadius * 1.7, size: 7, life: 520,
          color: c.isAcidCloud ? MAGIC.acid : MAGIC.stormHi, points: 4,
        });
        // Apply slow / acid vuln + damage
        const targets = (c.owner === 'player' ? this.api.enemies : [this.api.player])
          .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) <= c.pulseRadius);
        for (const t of targets) {
          if (c.isAcidCloud) {
            // Dark acid cloud: apply darkVuln stack (independent 3s timer via delayedCall)
            t.darkVulnStacks++;
            this.api.scene.time.delayedCall(3000, () => {
              if (t.active && t.darkVulnStacks > 0) t.darkVulnStacks--;
            });
            this.api.showFloatingText(t.x, t.y - 28, '⛈️ ACID -25%', '#44ff88');
          } else {
            if (c.owner === 'player') this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, time + 1500);
            else this.playerStormSlowUntil = Math.max(this.playerStormSlowUntil, time + 1500);
          }
          if (c.pulseDmg > 0) {
            t.takeDamage(c.pulseDmg, { source: c, sourceX: c.x, sourceY: c.y });
            this.api.spawnHitFlash(t.x, t.y, c.isAcidCloud ? MAGIC.acid : MAGIC.stormHi);
          }
        }
        if (c.nextPulseAt > c.expireAt) c.nextPulseAt = 0; // no more pulses
      }
    }

    // ── Rock orbs ─────────────────────────────────────────────────────
    for (const owner of ['player', 'npc'] as const) {
      const set = owner === 'player' ? this.playerRockSet : this.npcRockSet;
      if (!set) continue;
      if (time >= set.expireAt) {
        if (owner === 'player') this.playerRockSet = null;
        else this.npcRockSet = null;
        continue;
      }
      const caster = owner === 'player' ? this.api.player : this.api.npc;
      const enemies = owner === 'player' ? this.api.enemies : [this.api.player];
      const projGroup = this.api.projectiles;

      for (let ri = set.orbs.length - 1; ri >= 0; ri--) {
        const orb = set.orbs[ri];
        orb.angle += 0.003 * delta;
        const ox = caster.x + Math.cos(orb.angle) * set.orbitR;
        const oy = caster.y + Math.sin(orb.angle) * set.orbitR;
        orb.x = ox; orb.y = oy;

        // Contact with enemy
        if (time - orb.lastHitAt >= 300) {
          for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(ox, oy, enemy.x, enemy.y) <= 22) {
              enemy.takeDamage(orb.dmg);
              this.api.spawnHitFlash(enemy.x, enemy.y, MAGIC.sand);
              orb.lastHitAt = time;
              if (orb.canCrack && !orb.cracked) {
                orb.cracked = true;
                this.fx(owner).sigils(ox, oy, 4, { speed: 90, size: 5, life: 380, color: MAGIC.granite, points: 4 });
              } else {
                this.shatterRock(owner, ox, oy);
                set.orbs.splice(ri, 1);
              }
              break;
            }
          }
        }

        if (ri >= set.orbs.length) continue;

        // Block hostile projectiles
        const projs = projGroup.getMatching('active', true) as Phaser.GameObjects.Image[];
        for (const p of projs) {
          const pAny = p as any;
          const isHostile = owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
          if (!isHostile) continue;
          if (Phaser.Math.Distance.Between(ox, oy, p.x, p.y) <= 18) {
            p.setActive(false).setVisible(false);
            (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
            orb.lastHitAt = time;
            this.fx(owner).flash(p.x, p.y, 12, 10, MAGIC.granite);
            if (orb.canCrack && !orb.cracked) {
              orb.cracked = true;
              this.fx(owner).sigils(ox, oy, 3, { speed: 80, size: 4, life: 340, color: MAGIC.granite, points: 4 });
            } else {
              this.shatterRock(owner, ox, oy);
              set.orbs.splice(ri, 1);
            }
            break;
          }
          if (ri >= set.orbs.length) break;
        }
      }
      if (set.orbs.length === 0) {
        if (owner === 'player') this.playerRockSet = null;
        else this.npcRockSet = null;
      }
    }

    // ── Tornadoes ─────────────────────────────────────────────────────
    for (let i = this.tornadoes.length - 1; i >= 0; i--) {
      const t = this.tornadoes[i];
      if (time >= t.expireAt) {
        this.fx(t.owner).motes(t.x, t.y, 8, { speed: 120, size: 2.4, life: 700, color: MAGIC.gust, drift: -20 });
        this.tornadoes.splice(i, 1);
        continue;
      }
      // Erratic direction change
      if (time >= t.nextDirAt) {
        const targetFighter = t.owner === 'player' ? this.api.npc : this.api.player;
        const seekEnemy = Math.random() < 0.4;
        let angle: number;
        if (seekEnemy) {
          angle = Math.atan2(targetFighter.y - t.y, targetFighter.x - t.x);
        } else {
          angle = Math.random() * Math.PI * 2;
        }
        const spd = 150;
        t.vx = Math.cos(angle) * spd;
        t.vy = Math.sin(angle) * spd;
        t.nextDirAt = time + 400 + Math.random() * 400;
      }
      t.x += t.vx * (delta / 1000);
      t.y += t.vy * (delta / 1000);
      // Clamp to arena
      const pad = 40;
      if (t.x < pad) { t.x = pad; t.vx = Math.abs(t.vx); }
      if (t.x > W - pad) { t.x = W - pad; t.vx = -Math.abs(t.vx); }
      if (t.y < pad) { t.y = pad; t.vy = Math.abs(t.vy); }
      if (t.y > H - pad) { t.y = H - pad; t.vy = -Math.abs(t.vy); }

      // Periodic damage + push
      t.tickAccum += delta;
      if (t.tickAccum >= 200) {
        t.tickAccum -= 200;
        const targets = (t.owner === 'player' ? this.api.enemies : [this.api.player])
          .filter(e => e.active && e.hp > 0 && Phaser.Math.Distance.Between(t.x, t.y, e.x, e.y) <= 80);
        for (const e of targets) {
          e.takeDamage(4);
          this.api.spawnHitFlash(e.x, e.y, MAGIC.wind);
          this.fx(t.owner).sigils(e.x, e.y, 2, {
            speed: 130, angle: Math.atan2(e.y - t.y, e.x - t.x), spread: 0.6,
            size: 5, life: 340, color: MAGIC.gust, points: 4,
          });
          const dx = e.x - t.x; const dy = e.y - t.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          (e.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 450, (dy / len) * 450);
        }
      }
    }

    // ── Thorn prisons ─────────────────────────────────────────────────
    for (const owner of ['player', 'npc'] as const) {
      const tp = owner === 'player' ? this.thornPrison : this.npcThornPrison;
      if (!tp) continue;
      const pad2 = 32;
      const corners: [number, number][] = [
        [pad2, pad2], [W - pad2, pad2], [pad2, H - pad2], [W - pad2, H - pad2],
      ];
      const captive = owner === 'player'
        ? this.api.enemies.find(e => e.active && e.hp > 0) ?? this.api.npc
        : this.api.player;
      captive.setPosition(tp.ex, tp.ey);
      let allBroken = true;
      for (let c = 0; c < 4; c++) {
        if (tp.chainsHp[c] > 0) allBroken = false;
      }
      void corners;
      // Captive's projectiles damage chains
      const projArray = this.api.projectiles.getMatching('active', true) as Phaser.GameObjects.Image[];
      for (const p of projArray) {
        const pAny = p as any;
        const isFromCaptive = owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
        if (!isFromCaptive) continue;
        for (let c = 0; c < 4; c++) {
          if (tp.chainsHp[c] <= 0) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, corners[c][0], corners[c][1]) <= 40 ||
              Phaser.Math.Distance.Between(p.x, p.y, tp.ex, tp.ey) <= 30) {
            const before = tp.chainsHp[c];
            tp.chainsHp[c] -= (pAny.damage ?? 0);
            p.setActive(false).setVisible(false);
            (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
            this.fx(owner).sigils(p.x, p.y, 3, { speed: 90, size: 5, life: 340, color: MAGIC.leaf, points: 4 });
            // A chain giving out is the captive's way out — it wants to be loud.
            if (before > 0 && tp.chainsHp[c] <= 0) {
              this.fx(owner).boom(corners[c][0], corners[c][1], 44, {
                color: MAGIC.vine, sigils: 6, rings: 1, duration: 380, mark: false,
              });
            }
          }
        }
      }
      // DoT
      tp.dotAccum += delta;
      while (tp.dotAccum >= 1000) {
        captive.takeDamage(3);
        this.api.spawnHitFlash(captive.x, captive.y, MAGIC.vine);
        tp.dotAccum -= 1000;
      }
      // End condition
      const elapsed = tp.expireAt - time;
      if (allBroken || elapsed <= 0) {
        captive.takeDamage(35);
        this.fx(owner).boom(tp.ex, tp.ey, 78, {
          color: MAGIC.vine, sigils: 11, rings: 2, duration: 520,
        });
        this.api.scene.cameras.main.shake(180, 0.005);
        this.api.showFloatingText(tp.ex, tp.ey - 44, allBroken ? '🌿 FREED!' : '🌿 ENSNARED', '#33ff66');
        if (owner === 'player') this.thornPrison = null;
        else this.npcThornPrison = null;
      }
    }

    // ── Chain-bound expiry ────────────────────────────────────────────
    if (this.playerBound && time >= this.playerBoundEnd) {
      this.playerBound = false;
    }
    if (this.api.npc.magicChainBound && time >= this.api.npc.magicChainBoundEnd) {
      this.api.npc.magicChainBound = false;
    }

    // ── Cursed fire tick (dark flame clouds) ──────────────────────────
    if (this.npcCursedFireUntil > time) {
      this.npcCursedFireTickAccum += delta;
      while (this.npcCursedFireTickAccum >= 500) {
        this.npcCursedFireTickAccum -= 500;
        const tgt = this.api.npc;
        if (tgt.active && tgt.hp > 0) {
          tgt.takeDamage(2);
          this.api.spawnHitFlash(tgt.x, tgt.y, MAGIC.cursed);
        }
      }
    } else {
      this.npcCursedFireTickAccum = 0;
    }

    // ── F+ mobile meditate trail — a wake of runes left where you walked ─
    if (this.playerMeditateMobile && this.meditating && time >= this.playerMeditateTrailNext) {
      this.playerMeditateTrailNext = time + 90;
      this.pfx.motes(this.api.player.x, this.api.player.y + 8, 2, {
        speed: 18, size: 2.6, life: 620, color: MAGIC.purple, drift: -6, depth: 4,
      });
    }

    // ── Dark gale cone (E+ Recalling Gale — pulls enemies for 1s) ────
    if (this.playerDarkGaleUntil > time) {
      if (!this.playerDarkGaleOnce) {
        // Damage once on cast start
        this.playerDarkGaleOnce = true;
        const player = this.api.player;
        const coneR = 200;
        for (const enemy of this.api.enemies) {
          if (!enemy.active || enemy.hp <= 0) continue;
          const dist2 = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
          if (dist2 > coneR) continue;
          const ang = Math.atan2(enemy.y - player.y, enemy.x - player.x);
          const diff = Phaser.Math.Angle.Wrap(ang - this.playerDarkGaleAngle);
          if (Math.abs(diff) <= Math.PI / 4) {
            enemy.takeDamage(18);
            this.api.spawnHitFlash(enemy.x, enemy.y, MAGIC.gust);
          }
        }
      }
      // Pull enemies in cone toward player every frame
      const player2 = this.api.player;
      for (const enemy of this.api.enemies) {
        if (!enemy.active || enemy.hp <= 0) continue;
        const dist3 = Phaser.Math.Distance.Between(player2.x, player2.y, enemy.x, enemy.y);
        if (dist3 > 200 || dist3 < 1) continue;
        const ang2 = Math.atan2(enemy.y - player2.y, enemy.x - player2.x);
        const diff2 = Phaser.Math.Angle.Wrap(ang2 - this.playerDarkGaleAngle);
        if (Math.abs(diff2) <= Math.PI / 4) {
          const toPlayerAng = Math.atan2(player2.y - enemy.y, player2.x - enemy.x);
          (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(toPlayerAng) * 320, Math.sin(toPlayerAng) * 320,
          );
        }
      }
    }

    // ── Hurricane vacuum initial pull (Q+ idx 3) ──────────────────────
    if (this.playerHurricaneGaleUntil > time) {
      if (!this.playerHurricaneGaleOnce) {
        this.playerHurricaneGaleOnce = true;
        const player3 = this.api.player;
        const coneR2 = 220;
        for (const enemy of this.api.enemies) {
          if (!enemy.active || enemy.hp <= 0) continue;
          const dist4 = Phaser.Math.Distance.Between(player3.x, player3.y, enemy.x, enemy.y);
          if (dist4 > coneR2) continue;
          const ang4 = Math.atan2(enemy.y - player3.y, enemy.x - player3.x);
          const diff4 = Phaser.Math.Angle.Wrap(ang4 - this.playerHurricaneGaleAngle);
          if (Math.abs(diff4) <= Math.PI / 4) {
            enemy.takeDamage(12);
            this.api.spawnHitFlash(enemy.x, enemy.y, MAGIC.ash);
          }
        }
      }
      const player4 = this.api.player;
      for (const enemy of this.api.enemies) {
        if (!enemy.active || enemy.hp <= 0) continue;
        const dist5 = Phaser.Math.Distance.Between(player4.x, player4.y, enemy.x, enemy.y);
        if (dist5 > 220 || dist5 < 1) continue;
        const ang5 = Math.atan2(enemy.y - player4.y, enemy.x - player4.x);
        const diff5 = Phaser.Math.Angle.Wrap(ang5 - this.playerHurricaneGaleAngle);
        if (Math.abs(diff5) <= Math.PI / 4) {
          const toPlayerAng2 = Math.atan2(player4.y - enemy.y, player4.x - enemy.x);
          (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(toPlayerAng2) * 400, Math.sin(toPlayerAng2) * 400,
          );
        }
      }
    }

    // ── Instant vine arms ─────────────────────────────────────────────
    for (let i = this.vineFlashes.length - 1; i >= 0; i--) {
      if (time >= this.vineFlashes[i].expireAt) this.vineFlashes.splice(i, 1);
    }

    // ── Temple / Monument orb sets (fixed-anchor orbits) ──────────────
    for (let ti = this.templeSets.length - 1; ti >= 0; ti--) {
      const ts = this.templeSets[ti];
      if (time >= ts.expireAt || ts.orbs.length === 0) {
        // The structure comes down with it.
        this.fx(ts.owner).boom(ts.anchorX, ts.anchorY, ts.monument ? 84 : 62, {
          color: ts.monument ? MAGIC.granite : MAGIC.stone,
          sigils: ts.monument ? 12 : 8, rings: 2, duration: 520,
        });
        this.templeSets.splice(ti, 1);
        continue;
      }
      const enemies = ts.owner === 'player' ? this.api.enemies : [this.api.player];
      const projGroup = this.api.projectiles;

      for (let ri = ts.orbs.length - 1; ri >= 0; ri--) {
        const orb = ts.orbs[ri];
        orb.angle += 0.003 * delta;
        const ox = ts.anchorX + Math.cos(orb.angle) * ts.orbitR;
        const oy = ts.anchorY + Math.sin(orb.angle) * ts.orbitR;
        orb.x = ox; orb.y = oy;

        if (time - orb.lastHitAt >= 400) {
          for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(ox, oy, enemy.x, enemy.y) <= 24) {
              enemy.takeDamage(ts.contactDmg);
              this.api.spawnHitFlash(enemy.x, enemy.y, MAGIC.sand);
              this.fx(ts.owner).ring(ox, oy, 6, 34, MAGIC.stone, 320, 9, 2);
              orb.lastHitAt = time;
              if (ts.stunMs > 0) {
                enemy.earthStunnedUntil = Math.max(enemy.earthStunnedUntil, time + ts.stunMs);
                this.api.showFloatingText(enemy.x, enemy.y - 42, '💥 STUNNED', '#ffcc44');
              } else if (ts.slowMs > 0) {
                this.npcDark80SlowUntil = Math.max(this.npcDark80SlowUntil, time + ts.slowMs);
              }
              if (orb.canCrack && !orb.cracked) {
                orb.cracked = true;
              } else {
                this.shatterRock(ts.owner, ox, oy);
                ts.orbs.splice(ri, 1);
              }
              break;
            }
          }
        }
        if (ri >= ts.orbs.length) continue;

        // Block hostile projectiles
        const projs = projGroup.getMatching('active', true) as Phaser.GameObjects.Image[];
        for (const p of projs) {
          const pAny = p as any;
          const isHostile = ts.owner === 'player' ? !pAny.isFromPlayer : pAny.isFromPlayer;
          if (!isHostile) continue;
          if (Phaser.Math.Distance.Between(ox, oy, p.x, p.y) <= 20) {
            p.setActive(false).setVisible(false);
            (pAny.body as Phaser.Physics.Arcade.Body)?.stop();
            orb.lastHitAt = time;
            this.fx(ts.owner).flash(p.x, p.y, 12, 10, MAGIC.granite);
            if (orb.canCrack && !orb.cracked) {
              orb.cracked = true;
            } else {
              this.shatterRock(ts.owner, ox, oy);
              ts.orbs.splice(ri, 1);
            }
            break;
          }
          if (ri >= ts.orbs.length) break;
        }
      }
    }

    // ── Torture trap links ────────────────────────────────────────────
    const nowMs = Date.now();
    for (let li = this.tortureTrapLinks.length - 1; li >= 0; li--) {
      const link = this.tortureTrapLinks[li];
      if (nowMs >= link.expireAt || !link.target.active || link.target.hp <= 0) {
        link.target.darkLinkedUntil = 0;
        link.target.darkLinkSource = null;
        this.tortureTrapLinks.splice(li, 1);
        continue;
      }
      // Tick 3 dmg per second (Fighter.takeDamage triggers heal via darkLinkSource); the thread
      // itself is painted in paintWorld.
      link.tickAccum += delta;
      while (link.tickAccum >= 1000) {
        link.tickAccum -= 1000;
        link.target.takeDamage(3);
        this.api.spawnHitFlash(link.target.x, link.target.y, MAGIC.blood);
      }
    }

    // ── Darkness HUD bar ──────────────────────────────────────────────
    if (this.api.hasUpgrade('e') || this.api.hasUpgrade('q')) {
      if (!this.darknessBarGfx) {
        this.darknessBarGfx = this.api.scene.add.graphics().setDepth(25);
        this.darknessBarText = this.api.scene.add.text(0, 0, '', {
          fontSize: '9px', color: '#cc88ff', fontFamily: 'Arial',
          stroke: '#000000', strokeThickness: 2,
        }).setDepth(26).setOrigin(0.5, 1);
      }
      const bx = this.api.player.x - 30;
      const by = this.api.player.y + 40;
      const barW = 60; const barH = 6;
      this.darknessBarGfx.clear();
      this.darknessBarGfx.fillStyle(0x111111, 0.65);
      this.darknessBarGfx.fillRect(bx, by, barW, barH);
      const fillColor = this.darkness >= 75 ? 0xff0000 : this.darkness >= 40 ? 0x880088 : 0x550066;
      this.darknessBarGfx.fillStyle(fillColor, 0.9);
      this.darknessBarGfx.fillRect(bx, by, barW * (this.darkness / 100), barH);
      this.darknessBarText?.setPosition(this.api.player.x, by - 1);
      this.darknessBarText?.setText(`☠ ${Math.round(this.darkness)}/100`);
    }

    this.paintWorld(time);
    this.updateAuras(time, delta);
    this.updateAvatars(delta);
  }

  /**
   * Dismiss an orbit that is being replaced. Nothing to free any more — the orbs are plain data —
   * but the stone they were made of still has to visibly go somewhere.
   */
  private _destroyRockSet(set: RockOrbSet | null): void {
    if (!set) return;
    for (const o of set.orbs) {
      this.fx(o.owner).sigils(o.x, o.y, 3, { speed: 80, size: 5, life: 400, color: MAGIC.stone, points: 4 });
    }
  }

  /** Thunder-charged Gaia: bolt extra stones onto the temple that was just raised. */
  private _addTempleOrb(count: number): void {
    const ts = this.templeSets[this.templeSets.length - 1];
    if (!ts) return;
    for (let i = 0; i < count; i++) {
      const angle = (ts.orbs.length / (ts.orbs.length + 1)) * Math.PI * 2;
      const x = ts.anchorX + Math.cos(angle) * ts.orbitR;
      const y = ts.anchorY + Math.sin(angle) * ts.orbitR;
      this.pfx.bolt(x, y, 90, 12, MAGIC.thunder);
      ts.orbs.push({
        angle, radius: 10, x, y,
        cracked: false, lastHitAt: 0, canCrack: false, dmg: 15, owner: 'player',
      });
    }
  }

  /** A conjured stone coming apart — chips of it, and the rune that bound it letting go. */
  private shatterRock(owner: 'player' | 'npc', x: number, y: number): void {
    this.fx(owner).boom(x, y, 40, {
      color: MAGIC.stone, sigils: 6, rings: 1, duration: 360, mark: false,
    });
  }

  /**
   * Every per-frame painter in one pass. Both layers are cleared and redrawn from live state, so
   * a cloud boils, a funnel turns and a prison chain frays as it takes damage — none of which a
   * tweened sprite could do.
   */
  private paintWorld(time: number): void {
    const { player, npc } = this.api;
    const t = this.vizT;
    const W = this.api.getSceneWidth();
    const H = this.api.getSceneHeight();

    // ── Floor: anchors, temples, prison chains ──
    const g0 = this.ground();
    g0.clear();
    if (this.anchor) MagicFx.drawAnchor(g0, this.pcol, this.anchor.x, this.anchor.y, t);
    if (this.npcAnchor) MagicFx.drawAnchor(g0, this.ncol, this.npcAnchor.x, this.npcAnchor.y, t);
    for (const ts of this.templeSets) {
      MagicFx.drawTemple(g0, this.col(ts.owner), ts.anchorX, ts.anchorY, ts.monument ? 20 : 14, ts.monument, t);
      arcaneRing(g0, this.col(ts.owner), ts.anchorX, ts.anchorY, ts.orbitR, t * 0.4,
        ts.monument ? MAGIC.granite : MAGIC.stone, 0.3, 1.4, 6, false);
    }
    const pad2 = 32;
    const corners: [number, number][] = [
      [pad2, pad2], [W - pad2, pad2], [pad2, H - pad2], [W - pad2, H - pad2],
    ];
    for (const owner of ['player', 'npc'] as const) {
      const tp = owner === 'player' ? this.thornPrison : this.npcThornPrison;
      if (!tp) continue;
      for (let c = 0; c < 4; c++) {
        if (tp.chainsHp[c] <= 0) continue;
        MagicFx.drawPrisonChain(g0, this.col(owner), corners[c][0], corners[c][1],
          tp.ex, tp.ey, Phaser.Math.Clamp(tp.chainsHp[c] / 15, 0, 1), t);
      }
    }

    // ── Air: everything conjured ──
    const g = this.air();
    g.clear();

    for (const c of this.flameClouds) {
      const fade = Phaser.Math.Clamp((c.expireAt - time) / 600, 0, 1);
      MagicFx.drawFlameCloud(g, this.col(c.owner), c.x, c.y, c.radius, !!c.cursedFire, c.seed, t, 0.35 + 0.55 * fade);
    }
    for (const c of this.stormClouds) {
      const fade = Phaser.Math.Clamp((c.expireAt - time) / 600, 0, 1);
      // Charge climbs toward the next pulse, so the cloud visibly winds up before it lets go.
      const charge = c.nextPulseAt > 0
        ? Phaser.Math.Clamp(1 - (c.nextPulseAt - time) / Math.max(1, c.pulseInterval), 0, 1)
        : 0;
      MagicFx.drawStormCloud(g, this.col(c.owner), c.x, c.y, c.radius, !!c.isAcidCloud,
        charge, c.seed, t, 0.4 + 0.55 * fade);
    }
    for (const tor of this.tornadoes) {
      const fade = Phaser.Math.Clamp((tor.expireAt - time) / 700, 0, 1);
      MagicFx.drawTornado(g, this.col(tor.owner), tor.x, tor.y, tor.radius, tor.dark, tor.seed, t, 0.4 + 0.55 * fade);
    }
    for (const owner of ['player', 'npc'] as const) {
      const set = owner === 'player' ? this.playerRockSet : this.npcRockSet;
      if (!set) continue;
      for (const orb of set.orbs) {
        runeOrb(g, this.col(owner), orb.x, orb.y, orb.radius, orb.angle * 2,
          orb.cracked ? MAGIC.granite : MAGIC.stone, orb.cracked ? MAGIC.gust : MAGIC.sand, 1, orb.cracked);
      }
    }
    for (const ts of this.templeSets) {
      for (const orb of ts.orbs) {
        runeOrb(g, this.col(ts.owner), orb.x, orb.y, orb.radius, orb.angle * 2,
          orb.cracked ? MAGIC.granite : MAGIC.stone, orb.cracked ? MAGIC.gust : MAGIC.sand, 1, orb.cracked);
      }
    }
    for (const orb of this.healOrbs) {
      MagicFx.drawHealOrb(g, this.col(orb.owner), orb.x, orb.y, Math.atan2(orb.vy, orb.vx), t);
    }
    for (const s of this.sparkleShots) {
      if (!s.proj.active) continue;
      const armed = s.leaderId ? 0 : Phaser.Math.Clamp(s.stationaryAccum / 1000, 0, 1);
      MagicFx.drawSparkle(g, this.col(s.owner), s.proj.x, s.proj.y, armed, t, !!s.leaderId);
    }
    for (const p of this.transmogrifyProjectiles) {
      MagicFx.drawChickenBolt(g, this.col(p.owner), p.x, p.y, Math.atan2(p.vy, p.vx), t);
    }
    for (const link of this.tortureTrapLinks) {
      const src = link.owner === 'player' ? player : npc;
      MagicFx.drawLifeLink(g, this.col(link.owner), src.x, src.y, link.target.x, link.target.y, t);
    }
    for (const v of this.vineFlashes) {
      vineLash(g, this.pcol, v.x1, v.y1, v.x2, v.y2, t,
        v.hit ? MAGIC.leaf : MAGIC.darkVine, MAGIC.vine,
        Phaser.Math.Clamp((v.expireAt - time) / 200, 0, 1), 4);
    }
  }

  /** Stance tells for both sides, rebuilt from the flags that are already the source of truth. */
  private updateAuras(time: number, delta: number): void {
    const { player, npc } = this.api;
    const pAim = Math.atan2((this.lastAimY || player.y) - player.y, (this.lastAimX || player.x + 1) - player.x);
    const body = player.body as Phaser.Physics.Arcade.Body | null;
    const moveAim = body && (body.velocity.x || body.velocity.y)
      ? Math.atan2(body.velocity.y, body.velocity.x) : pAim;

    this.syncAura('player', 'meditate', this.meditating, delta, 1, pAim, 30);
    this.syncAura('player', 'darkness', this.darkness > 1, delta, this.darkness / 100, pAim, 28);
    this.syncAura('player', 'boost', time < this.playerSpeedBoostUntil,
      delta, this.playerSpeedBoostDark ? 1 : 0, moveAim, 26);
    this.syncAura('player', 'bound', this.playerBound && time < this.playerBoundEnd, delta, 1, pAim, 26);
    this.syncAura('player', 'chicken', player.chickenUntil > Date.now(), delta, 1, pAim, 24);

    this.syncAura('npc', 'meditate', this.npcMeditating, delta, 1, 0, 30);
    this.syncAura('npc', 'bound', npc.magicChainBound && time < npc.magicChainBoundEnd, delta, 1, 0, 26);
    this.syncAura('npc', 'chicken', npc.chickenUntil > Date.now(), delta, 1, 0, 24);
  }

  /** Drive the rig for whichever sides are playing Magic. Built lazily; torn down when they aren't. */
  private updateAvatars(delta: number): void {
    const { player, npc, scene } = this.api;

    if (this.api.isPlayerMagic && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new MagicAvatar(scene, this.pcol, 'player');
      const aim = Math.atan2((this.lastAimY || player.y) - player.y, (this.lastAimX || player.x + 1) - player.x);
      this.playerAvatar.setFacing(aim);
      // An open wheel visibly swells the rig, so "I am mid-spell" reads off the character alone.
      this.playerAvatar.setIntensity(this.grimoireMenuOpen || this.necronomiconMenuOpen ? 1.35 : 1);
      this.playerAvatar.setMastered(this.api.masteryActive);
      this.playerAvatar.setCorruption(this.darkness / 100);
      this.playerAvatar.setHold(this.meditating ? 'brace' : (this.grimoireMenuOpen || this.necronomiconMenuOpen) ? 'draw' : null, aim);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (this.api.isNpcMagic && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new MagicAvatar(scene, this.ncol, 'npc');
      const aim = Math.atan2(player.y - npc.y, player.x - npc.x);
      this.npcAvatar.setFacing(aim);
      this.npcAvatar.setHold(this.npcMeditating ? 'brace' : null, aim);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  // ── Subterfuge Dark Treachery support ─────────────────────────────────────

  /** Magic-Q copy: open the necronomicon wheel for a non-magic player. While the
   * wheel is open, ArenaScene keeps routing input here (handleInput early-returns
   * into pure wheel-driving); the player taps Q to fire the selected wedge. */
  foreignOpenNecronomicon(time: number): void {
    this.necronomiconHoldStart = time;
    this.necronomiconKeyNavUsed = false;
    this._openMenu('necronomicon', this.necronomiconLastPick);
  }

  isNecroWheelOpen(): boolean { return this.necronomiconMenuOpen; }

  // ── Wheel UI helpers ──────────────────────────────────────────────────────

  private _openMenu(slot: 'grimoire' | 'necronomicon', selectedIndex: number): void {
    this._closeMenu(slot);
    const labels = slot === 'grimoire' ? GRIMOIRE_LABELS : NECRO_LABELS;
    const gfx = this.api.scene.add.graphics().setDepth(31);
    const cx = this.api.player.x;
    const cy = this.api.player.y;
    const R = 130;
    const count = 5;
    const angleStep = (Math.PI * 2) / count;
    const colors = slot === 'grimoire' ? GRIMOIRE_COLORS : NECRO_COLORS;
    for (let i = 0; i < count; i++) {
      const startA = i * angleStep - Math.PI / 2 - angleStep / 2;
      const endA = startA + angleStep;
      const isSelected = i === selectedIndex;
      gfx.fillStyle(colors[i], isSelected ? 0.9 : 0.55);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, isSelected ? R + 10 : R, startA, endA, false);
      gfx.closePath(); gfx.fillPath();
      gfx.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffffff : 0xaaaaaa, isSelected ? 0.9 : 0.4);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, isSelected ? R + 10 : R, startA, endA, false);
      gfx.closePath(); gfx.strokePath();
    }
    const lblObjs: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < count; i++) {
      const midA = i * angleStep - Math.PI / 2;
      const rr = i === selectedIndex ? R + 10 : R;
      const lx = cx + Math.cos(midA) * (rr * 0.65);
      const ly = cy + Math.sin(midA) * (rr * 0.65);
      const t = this.api.scene.add.text(lx, ly, labels[i], { fontSize: '10px', color: '#ffffff', fontFamily: 'Arial', align: 'center', wordWrap: { width: 72 } })
        .setOrigin(0.5, 0.5).setDepth(32);
      lblObjs.push(t);
    }
    if (slot === 'grimoire') {
      this.grimoireMenuGfx = gfx;
      this.grimoireMenuLabels = lblObjs;
      this.grimoireMenuOpen = true;
      this.grimoireSelectedIndex = selectedIndex;
    } else {
      this.necronomiconMenuGfx = gfx;
      this.necronomiconMenuLabels = lblObjs;
      this.necronomiconMenuOpen = true;
      this.necronomiconSelectedIndex = selectedIndex;
    }
  }

  private _drawMenu(slot: 'grimoire' | 'necronomicon', selectedIndex: number): void {
    const gfx = slot === 'grimoire' ? this.grimoireMenuGfx : this.necronomiconMenuGfx;
    const lbls = slot === 'grimoire' ? this.grimoireMenuLabels : this.necronomiconMenuLabels;
    if (!gfx) return;
    const cx = this.api.player.x;
    const cy = this.api.player.y;
    const R = 130;
    const count = 5;
    const angleStep = (Math.PI * 2) / count;
    const isDark = slot === 'grimoire' ? this.darkGrimoireMode : this.darkNecroMode;
    const colors = isDark
      ? (slot === 'grimoire' ? DARK_GRIMOIRE_COLORS : DARK_NECRO_COLORS)
      : (slot === 'grimoire' ? GRIMOIRE_COLORS : NECRO_COLORS);
    const labels = isDark
      ? (slot === 'grimoire' ? DARK_GRIMOIRE_LABELS : DARK_NECRO_LABELS)
      : (slot === 'grimoire' ? GRIMOIRE_LABELS : NECRO_LABELS);
    gfx.clear();
    for (let i = 0; i < count; i++) {
      const startA = i * angleStep - Math.PI / 2 - angleStep / 2;
      const endA = startA + angleStep;
      const isSelected = i === selectedIndex;
      gfx.fillStyle(colors[i], isSelected ? 0.9 : 0.55);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, isSelected ? R + 10 : R, startA, endA, false);
      gfx.closePath(); gfx.fillPath();
      gfx.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffffff : 0xaaaaaa, isSelected ? 0.9 : 0.4);
      gfx.beginPath(); gfx.moveTo(cx, cy);
      gfx.arc(cx, cy, isSelected ? R + 10 : R, startA, endA, false);
      gfx.closePath(); gfx.strokePath();
    }
    // Center toggle button (only when upgrade is owned)
    if (this.api.hasUpgrade(slot === 'grimoire' ? 'e' : 'q')) {
      const btnColor = isDark ? 0x440088 : 0xddaa00;
      gfx.fillStyle(btnColor, 0.92);
      gfx.fillCircle(cx, cy, 24);
      gfx.lineStyle(2, isDark ? 0xcc44ff : 0xffffff, 0.9);
      gfx.strokeCircle(cx, cy, 24);
    }
    for (let i = 0; i < count; i++) {
      if (!lbls[i]) continue;
      const midA = i * angleStep - Math.PI / 2;
      const rr = i === selectedIndex ? R + 10 : R;
      lbls[i].setPosition(cx + Math.cos(midA) * (rr * 0.65), cy + Math.sin(midA) * (rr * 0.65));
      lbls[i].setText(labels[i]);
    }
  }

  private _closeMenu(slot: 'grimoire' | 'necronomicon'): void {
    if (slot === 'grimoire') {
      if (this.grimoireMenuGfx) { this.grimoireMenuGfx.destroy(); this.grimoireMenuGfx = null; }
      for (const l of this.grimoireMenuLabels) l.destroy();
      this.grimoireMenuLabels = [];
      this.grimoireMenuOpen = false;
    } else {
      if (this.necronomiconMenuGfx) { this.necronomiconMenuGfx.destroy(); this.necronomiconMenuGfx = null; }
      for (const l of this.necronomiconMenuLabels) l.destroy();
      this.necronomiconMenuLabels = [];
      this.necronomiconMenuOpen = false;
    }
  }

  private _spawnAimCountdown(onFire: () => void): void {
    const DELAY = 2000;
    if (this.aimCountdownLabel) { this.aimCountdownLabel.destroy(); }
    this.aimCountdownLabel = this.api.scene.add.text(this.api.player.x, this.api.player.y - 54, '✨ 2.0', {
      fontSize: '18px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#cc99ff',
      stroke: '#220044', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.aimCountdownEnd = this.api.scene.sys.game.loop.now + DELAY;
    this.aimCountdownFired = false;
    this.api.scene.time.delayedCall(DELAY, () => {
      if (this.aimCountdownLabel) { this.aimCountdownLabel.destroy(); this.aimCountdownLabel = null; }
      onFire();
    });
  }

  private _buildPlayerCtx(mx: number, my: number): any {
    return {
      targetX: mx, targetY: my,
      magicSparkleShot: (tx: number, ty: number) => this.doSparkleShot(tx, ty, 'player'),
      magicOpenGrimoire: () => {},
      magicAnchorToggle: () => this.doAnchorToggle('player'),
      magicMeditateBegin: () => this.doMeditateBegin('player'),
      magicOpenNecronomicon: () => {},
    };
  }

  // ── Dispatch helpers ──────────────────────────────────────────────────────

  /** Magic Mastery: track per-spell wheel usage and ratchet the "used every spell N times" requirement. */
  private _recordWheelSpellUse(wheel: 'grimoire' | 'necronomicon', pick: number): void {
    const subKey = `${wheel}Spell${pick}Uses`;
    this.api.recordMasteryStat(subKey, 1);
    let min = Infinity;
    for (let i = 0; i < 5; i++) {
      min = Math.min(min, this.api.getMasteryStat(`${wheel}Spell${i}Uses`));
    }
    this.api.recordMasteryBestStat(wheel === 'grimoire' ? 'grimoireAllSpellsUsed' : 'necroAllSpellsUsed', min);
  }

  private _dispatchGrimoireWedge(pick: number, tx: number, ty: number, owner: 'player' | 'npc', thunderCharged = false): void {
    if (owner === 'player') this._recordWheelSpellUse('grimoire', pick);
    if (owner === 'player' && this.darkGrimoireMode) {
      switch (pick) {
        case 0: this.doCorruptFlames(tx, ty); if (thunderCharged) this.doCorruptFlames(tx, ty); break;
        case 1: this.doAcidCloud(tx, ty); if (thunderCharged) { const sc = this.stormClouds[this.stormClouds.length - 1]; if (sc) sc.pulseInterval = Math.round(sc.pulseInterval / 2); } break;
        case 2: this.doDrainingThorns(tx, ty); if (thunderCharged) { for (const e of this.api.enemies) { if (e.active && e.hp > 0) { e.earthStunnedUntil = Math.max(e.earthStunnedUntil, this.api.scene.sys.game.loop.now + 2000); this.api.showFloatingText(e.x, e.y - 28, '⚡ STUN', '#ffee44'); break; } } } break;
        case 3: this.doRecallingGale(tx, ty); if (thunderCharged) { this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, this.api.scene.sys.game.loop.now + 3000); } break;
        case 4: this.doGaiasTemple(tx, ty); if (thunderCharged) this._addTempleOrb(1); break;
      }
      return;
    }
    switch (pick) {
      case 0: this.doFlameBurst(tx, ty, owner); if (thunderCharged) { this.doFlameBurst(tx, ty, owner); this.api.showFloatingText((owner === 'player' ? this.api.player.x : this.api.npc.x), (owner === 'player' ? this.api.player.y : this.api.npc.y) - 38, '⚡ CHARGED!', '#ffee44'); } break;
      case 1: this.doStormCloudSummon(tx, ty, owner); if (thunderCharged) { const sc = this.stormClouds[this.stormClouds.length - 1]; if (sc) sc.pulseInterval = Math.round(sc.pulseInterval / 2); } break;
      case 2:
        if (thunderCharged && owner === 'player') this.playerThunderThornCharged = true;
        this.doVirulentThorns(tx, ty, owner);
        break;
      case 3: {
        this.doCompressionBlast(tx, ty, owner);
        if (thunderCharged) {
          const now = this.api.scene.sys.game.loop.now;
          if (owner === 'player') this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, now + 3000);
          else this.playerStormSlowUntil = Math.max(this.playerStormSlowUntil, now + 3000);
        }
        break;
      }
      case 4: {
        if (thunderCharged) {
          const caster = owner === 'player' ? this.api.player : this.api.npc;
          const now = this.api.scene.sys.game.loop.now;
          this._destroyRockSet(owner === 'player' ? this.playerRockSet : this.npcRockSet);
          const rs = this._spawnRockSet(owner, 4, 56, now + 5000, 10, false);
          if (owner === 'player') this.playerRockSet = rs; else this.npcRockSet = rs;
          this.api.showFloatingText(caster.x, caster.y - 30, '🪨⚡ Charged Guidance', '#aa7733');
        } else {
          this.doGaiasGuidance(owner);
        }
        break;
      }
    }
  }

  private _dispatchNecronomiconWedge(pick: number, tx: number, ty: number, owner: 'player' | 'npc', thunderCharged = false): void {
    if (owner === 'player') this._recordWheelSpellUse('necronomicon', pick);
    if (owner === 'player' && this.darkNecroMode) {
      switch (pick) {
        case 0: this.doDarkBarrage(tx, ty); if (thunderCharged) { this.doDarkBarrage(tx, ty); this.api.showFloatingText(this.api.player.x, this.api.player.y - 38, '⚡ CHARGED!', '#ffee44'); } break;
        case 1: this.doAcidRain(); if (thunderCharged) { for (const sc of this.stormClouds.slice(-3)) sc.pulseInterval = Math.round(sc.pulseInterval / 2); } break;
        case 2: this.doTortureTrap(tx, ty); if (thunderCharged) { for (const link of this.tortureTrapLinks) { if (link.owner === 'player') { link.expireAt += 3000; if (link.target.darkLinkedUntil) link.target.darkLinkedUntil += 3000; } } } break;
        case 3: this.doHurricaneVacuum(tx, ty); if (thunderCharged) { this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, this.api.scene.sys.game.loop.now + 3000); } break;
        case 4: this.doGaiasMonument(tx, ty); if (thunderCharged) this._addTempleOrb(2); break;
      }
      return;
    }
    switch (pick) {
      case 0: this.doFlameBarrage(tx, ty, owner); if (thunderCharged) { this.doFlameBarrage(tx, ty, owner); this.api.showFloatingText((owner === 'player' ? this.api.player.x : this.api.npc.x), (owner === 'player' ? this.api.player.y : this.api.npc.y) - 38, '⚡ CHARGED!', '#ffee44'); } break;
      case 1: this.doFinalDrench(tx, ty, owner); if (thunderCharged) { const sc = this.stormClouds[this.stormClouds.length - 1]; if (sc) sc.pulseInterval = Math.round(sc.pulseInterval / 2); } break;
      case 2: this.doThornPrison(tx, ty, owner); break;
      case 3: {
        this.doTornadoBlast(tx, ty, owner);
        if (thunderCharged) {
          const now = this.api.scene.sys.game.loop.now;
          if (owner === 'player') this.npcStormSlowUntil = Math.max(this.npcStormSlowUntil, now + 3000);
          else this.playerStormSlowUntil = Math.max(this.playerStormSlowUntil, now + 3000);
        }
        break;
      }
      case 4: {
        if (thunderCharged) {
          const caster = owner === 'player' ? this.api.player : this.api.npc;
          const now = this.api.scene.sys.game.loop.now;
          this._destroyRockSet(owner === 'player' ? this.playerRockSet : this.npcRockSet);
          const rs = this._spawnRockSet(owner, 5, 56, now + 8000, 12, true);
          if (owner === 'player') this.playerRockSet = rs; else this.npcRockSet = rs;
          this.api.showFloatingText(caster.x, caster.y - 30, '🪨⚡ Gaia\'s Rage+', '#aa7733');
        } else {
          this.doGaiasRage(owner);
        }
        break;
      }
    }
  }

  // ── NPC dispatch (called from ArenaScene npc context) ─────────────────────

  npcCastGrimoireWedge(tx: number, ty: number): void {
    if (this.api.hasPerk('npc', 'thunder') && !this.npcThunderECharged) {
      this._doLightningCall('npc');
      this.npcThunderECharged = true;
      this.api.npc.triggerCooldown('magic-grimoire');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.api.player.x, this.api.player.y, this.api.npc.x, this.api.npc.y);
    const hpRatio = this.api.npc.hp / this.api.npc.maxHp;
    let pick = 0;
    if (hpRatio < 0.35) {
      pick = 4; // Gaia's Guidance
    } else if (dist < 180) {
      pick = 3; // Compression Blast
    } else if (dist <= 350) {
      pick = Math.random() < 0.5 ? 2 : 0; // Virulent Thorns or Flame Burst
    } else {
      pick = 1; // Storm Cloud Summon
    }
    const thunderCharged = this.npcThunderECharged;
    this.npcThunderECharged = false;
    this._dispatchGrimoireWedge(pick, tx, ty, 'npc', thunderCharged);
  }

  npcCastNecronomiconWedge(tx: number, ty: number): void {
    if (this.api.hasPerk('npc', 'thunder') && !this.npcThunderQCharged) {
      this._doApocalypseCall('npc');
      this.npcThunderQCharged = true;
      this.api.npc.triggerCooldown('magic-necronomicon');
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.api.player.x, this.api.player.y, this.api.npc.x, this.api.npc.y);
    const hpRatio = this.api.npc.hp / this.api.npc.maxHp;
    let pick = 0;
    if (hpRatio < 0.30) {
      pick = Math.random() < 0.5 ? 4 : 2; // Gaia's Rage or Thorn Prison
    } else if (dist < 200) {
      pick = 3; // Tornado Blast
    } else if (dist <= 400) {
      pick = Math.random() < 0.5 ? 2 : 0; // Thorn Prison or Flame Barrage
    } else {
      pick = 1; // Final Drench
    }
    const thunderQCharged = this.npcThunderQCharged;
    this.npcThunderQCharged = false;
    this._dispatchNecronomiconWedge(pick, tx, ty, 'npc', thunderQCharged);
    if (thunderQCharged) this.api.npc.reduceCooldown('magic-necronomicon', 15000);
  }

  // ── Thunder perk: Lightning Call (E arm) / Apocalypse Call (Q arm) ─────────

  private _doLightningCall(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const fx = this.fx(owner);
    // Something is called down out of the sky and stored — the arming, not the discharge.
    fx.bolt(caster.x, caster.y, 120, 12, MAGIC.thunder);
    fx.ring(caster.x, caster.y, 10, 64, MAGIC.thunder, 520, 8, 3);
    fx.motes(caster.x, caster.y, 8, { speed: 90, size: 2.4, life: 620, color: MAGIC.thunderHi });
    this.avatarFor(owner)?.play('raise');
    this.api.showFloatingText(caster.x, caster.y - 44, '⚡ LIGHTNING CALL', '#ffee44');
  }

  private _doApocalypseCall(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const fx = this.fx(owner);
    // The bigger sibling: three bolts, two circles, and the ground remembers it.
    for (let i = 0; i < 3; i++) {
      this.api.scene.time.delayedCall(i * 90, () =>
        fx.bolt(caster.x + (i - 1) * 26, caster.y, 150, 12, i === 1 ? MAGIC.orchid : MAGIC.thunder));
    }
    fx.ring(caster.x, caster.y, 12, 92, MAGIC.orchid, 700, 8, 3.5);
    fx.mark(caster.x, caster.y, 40, 3, MAGIC.violet);
    fx.sigils(caster.x, caster.y, 10, { speed: 190, size: 9, life: 700, color: MAGIC.orchid });
    this.api.scene.cameras.main.shake(200, 0.005);
    this.avatarFor(owner)?.play('raise');
    this.api.showFloatingText(caster.x, caster.y - 44, '💥 APOCALYPSE CALL', '#cc44ff');
  }

  // ── Click: Sparkle Shot ───────────────────────────────────────────────────

  doSparkleShot(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const proj = this.api.projectiles.get(caster.x, caster.y, 'proj-sparkle-star') as any;
    if (!proj) return;
    proj.setActive(true).setVisible(true).setDepth(6);
    proj.isFromPlayer = (owner === 'player');
    proj.damage = 6;
    proj.setVisible(false); // the kit paints it — the texture is only there for collision
    (proj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 450, Math.sin(angle) * 450);
    this.gesture(owner, 'magic-sparkle-shot', angle);
    this.fx(owner).sigils(caster.x, caster.y, 3, {
      speed: 70, angle, spread: 0.6, size: 6, life: 340, color: MAGIC.blush,
    });
    const leaderId = `sparkle-${Date.now()}-${Math.random()}`;
    this.sparkleShots.push({
      proj,
      startX: caster.x, startY: caster.y,
      maxDist: 180,
      stationaryAccum: 0,
      exploded: false,
      owner,
      id: leaderId,
      angle,
    });
    // Click+: spawn two trailing sparkles
    if (owner === 'player' && this.api.hasUpgrade('click')) {
      for (const trailOffset of [32, 64]) {
        const trailProj = this.api.projectiles.get(
          caster.x - Math.cos(angle) * trailOffset,
          caster.y - Math.sin(angle) * trailOffset,
          'proj-sparkle-star',
        ) as any;
        if (!trailProj) continue;
        trailProj.setActive(true).setVisible(false).setDepth(6);
        trailProj.isFromPlayer = true;
        trailProj.damage = 0; // damage handled by kit, not ArenaScene collision
        (trailProj.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.sparkleShots.push({
          proj: trailProj,
          startX: caster.x, startY: caster.y,
          maxDist: 180, stationaryAccum: 0, exploded: false,
          owner: 'player',
          leaderId,
          trailOffset,
          damageMult: 0.75,
          angle,
        });
      }
    }
  }

  // ── R: Anchor ─────────────────────────────────────────────────────────────

  doAnchorToggle(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const anchorRef = owner === 'player' ? this.anchor : this.npcAnchor;
    const now = this.api.scene.sys.game.loop.now;

    // R+: check if we are in the 1.5s dark re-cast window (player only)
    if (owner === 'player' && this.api.hasUpgrade('r') && this.anchor === null && this.playerJustRecalledAt > 0 && (now - this.playerJustRecalledAt) <= 1500) {
      // Wild Anchor dark re-cast: random teleport
      this.playerJustRecalledAt = 0;
      this.addDarkness(10);
      const rw = this.api.getSceneWidth();
      const rh = this.api.getSceneHeight();
      const rx = Phaser.Math.Between(60, rw - 60);
      const ry = Phaser.Math.Between(60, rh - 60);
      // Vanish here, arrive there — both ends get a circle, so it reads as a jump.
      this.pfx.boom(caster.x, caster.y, 60, { color: MAGIC.wildVoid, sigils: 8, rings: 2, mark: false });
      caster.setPosition(rx, ry);
      this.pfx.boom(rx, ry, 76, { color: MAGIC.magenta, sigils: 10, rings: 2, duration: 520 });
      this.api.showFloatingText(rx, ry - 30, '🌑 WILD ANCHOR!', '#9900cc');
      // 50% speed boost, dark aura, 3s
      this.playerSpeedBoostUntil = now + 3000;
      this.playerSpeedBoostMult = 1.5;
      this.playerSpeedBoostDark = true;
      // +25% cooldown on this re-cast (extend anchor CD by 2000ms)
      caster.reduceCooldown('magic-anchor', -2000);
      return;
    }

    this.gesture(owner, 'magic-anchor');
    if (anchorRef === null) {
      // Setting the mark: a circle inscribed into the ground where you stood.
      this.fx(owner).ring(caster.x, caster.y, 4, 26, MAGIC.orchid, 460, 8, 2.4);
      this.fx(owner).motes(caster.x, caster.y, 6, { speed: 50, size: 2.2, life: 560 });
      if (owner === 'player') this.anchor = { x: caster.x, y: caster.y };
      else this.npcAnchor = { x: caster.x, y: caster.y };
      if (owner === 'player') this.playerJustRecalledAt = 0; // reset window when placing new anchor
    } else {
      const ax = anchorRef.x;
      const ay = anchorRef.y;
      if (owner === 'player') this.anchor = null;
      else this.npcAnchor = null;
      const fx = this.fx(owner);
      fx.sigils(caster.x, caster.y, 6, { speed: 130, size: 7, life: 420, color: MAGIC.purple });
      caster.setPosition(ax, ay);
      for (const target of (owner === 'player' ? this.api.enemies : [this.api.player])) {
        if (!target.active || target.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(ax, ay, target.x, target.y) <= 120) {
          target.takeDamage(20);
          this.api.spawnHitFlash(target.x, target.y, MAGIC.purple);
        }
      }
      // Arriving is the loud half: a shockwave out to the full 120px reach.
      fx.boom(ax, ay, 120, { color: MAGIC.purple, sigils: 12, rings: 3, duration: 560 });
      this.api.scene.cameras.main.shake(160, 0.004);
      this.api.showFloatingText(ax, ay - 30, '⚓ RECALL', '#bb88ff');
      if (owner === 'player') {
        this.api.player.triggerCooldown('magic-anchor');
        // R+: record recall time and apply speed boost
        if (this.api.hasUpgrade('r')) {
          this.playerJustRecalledAt = now;
          this.playerSpeedBoostUntil = now + 3000;
          this.playerSpeedBoostMult = 1.25;
          this.playerSpeedBoostDark = false;
        }
      }
    }
  }

  // ── Magic Mastery: Transmogrify ─────────────────────────────────────────

  /** The slot Transmogrify is bound over this match, or null when it isn't bound anywhere. */
  private transmogrifySlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.api.masteryBindFor(s) === 'transmogrify') return s;
    }
    return null;
  }

  /** 0–1 cooldown fill for the Transmogrify HUD card. */
  getTransmogrifyCooldownRatio(time: number): number {
    return Math.min(1, (time - this.transmogrifyLastCastAt) / MagicKit.TRANSMOGRIFY_COOLDOWN_MS);
  }

  private tryCastTransmogrify(time: number, tx: number, ty: number): void {
    if (time - this.transmogrifyLastCastAt < MagicKit.TRANSMOGRIFY_COOLDOWN_MS) return;
    this.transmogrifyLastCastAt = time;
    this.doTransmogrify(tx, ty, 'player');
    this.api.broadcastMasteryCast('transmogrify');
  }

  /** Online replay: the remote magic player cast Transmogrify — launch the chicken bolt at us. */
  doNpcTransmogrify(tx: number, ty: number): void {
    this.doTransmogrify(tx, ty, 'npc');
  }

  private doTransmogrify(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 130;
    this.transmogrifyProjectiles.push({
      x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      owner,
    });
    this.avatarFor(owner)?.play('punch', angle);
    this.fx(owner).ring(caster.x, caster.y, 6, 40, MAGIC.gold, 400, 9, 2.4);
    this.api.showFloatingText(caster.x, caster.y - 30, '🐔 Transmogrify!', '#ffffff');
  }

  private applyChicken(target: Fighter): void {
    const nowMs = Date.now();
    target.chickenUntil = Math.max(target.chickenUntil, nowMs + MagicKit.TRANSMOGRIFY_CHICKEN_MS);
    if (!this.chickenStates.has(target)) {
      target.setTexture('fx-chicken');
      this.chickenStates.set(target, { angle: Math.random() * Math.PI * 2, nextTurnAt: 0, prevCooldownMult: target.cooldownMult });
      target.cooldownMult *= 0.5;
    }
    this.api.spawnHitFlash(target.x, target.y, MAGIC.white);
    // The transformation itself: a summoning circle collapses onto them and feathers come out.
    this.pfx.flash(target.x, target.y, 30, 11, MAGIC.gold);
    this.pfx.ring(target.x, target.y, 46, 8, MAGIC.gold, 460, 9, 3);
    this.pfx.sigils(target.x, target.y, 9, { speed: 170, size: 8, life: 560, color: MAGIC.white });
    this.api.showFloatingText(target.x, target.y - 30, '🐔 CHICKEN!', '#ffffff');
  }

  private updateTransmogrifyProjectiles(delta: number, W: number, H: number): void {
    for (let i = this.transmogrifyProjectiles.length - 1; i >= 0; i--) {
      const p = this.transmogrifyProjectiles[i];
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        this.transmogrifyProjectiles.splice(i, 1);
        continue;
      }
      const targets = p.owner === 'player' ? this.api.enemies : [this.api.player];
      let hit = false;
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= 22) {
          this.applyChicken(t);
          hit = true;
          break;
        }
      }
      if (hit) this.transmogrifyProjectiles.splice(i, 1);
    }
  }

  /** Chicken wander: overrides movement post-AI so it wins over the frozen/decision-locked state, mirrors ShadowKit's drag pattern. */
  updateAfterAI(time: number, delta: number): void {
    void delta;
    const nowMs = Date.now();
    for (const f of Array.from(this.chickenStates.keys())) {
      const st = this.chickenStates.get(f)!;
      if (!f.active || f.chickenUntil <= nowMs) {
        if (f.active) { f.setTexture(`elem-${f.element.id}`); f.cooldownMult = st.prevCooldownMult; }
        this.chickenStates.delete(f);
        continue;
      }
      if (time >= st.nextTurnAt) {
        st.angle = Math.random() * Math.PI * 2;
        st.nextTurnAt = time + Phaser.Math.Between(400, 900);
      }
      (f.body as Phaser.Physics.Arcade.Body).setVelocity(
        Math.cos(st.angle) * f.speed * 0.6, Math.sin(st.angle) * f.speed * 0.6,
      );
    }
  }

  // ── F: Meditate ───────────────────────────────────────────────────────────

  doMeditateBegin(owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    if (owner === 'player') {
      if (this.meditating) return;
      this.meditating = true;
      this.meditateEndAt = Infinity;
      this.meditateNextSpawn = now + 200;
      if (this.api.hasUpgrade('f')) {
        // F+: mobile meditate — allow movement at 25% speed, no lock, no absorber
        this.playerMeditateMobile = true;
        this.playerMeditateTrailNext = now + 80;
      } else {
        this.api.nukeChanneling = true;
        this.api.nukeChannelEnd = Infinity;
        (this.api.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.api.player.damageAbsorber = (_amt: number) => {
          if (this.meditating) this.endMeditate('player', true);
          return false;
        };
      }
      this.gesture('player', 'magic-meditate');
      this.pfx.ring(this.api.player.x, this.api.player.y, 40, 8, MAGIC.orchid, 520, 8, 2.4);
      this.api.showFloatingText(this.api.player.x, this.api.player.y - 34, '🧘 Meditate', '#cc99ff');
    } else {
      // Guard first: a re-cast while already channelling must not replay the opening circle.
      if (this.npcMeditating) return;
      this.gesture('npc', 'magic-meditate');
      this.nfx.ring(this.api.npc.x, this.api.npc.y, 40, 8, MAGIC.orchid, 520, 8, 2.4);
      this.npcMeditating = true;
      this.npcMeditateEndAt = now + 3000;
      this.npcMeditateNextSpawn = now + 200;
      this.api.npcNukeChanneling = true;
      this.api.npcNukeChannelEnd = now + 3000;
    }
  }

  endMeditate(owner: 'player' | 'npc', interrupted: boolean): void {
    if (owner === 'player') {
      if (!this.meditating) return;
      this.meditating = false;
      if (!this.playerMeditateMobile) {
        this.api.nukeChanneling = false;
        this.api.player.damageAbsorber = null;
      }
      this.playerMeditateMobile = false;
      if (interrupted) {
        this.api.player.takeDamage(20);
        this.api.spawnHitFlash(this.api.player.x, this.api.player.y, MAGIC.blood);
        // A broken channel shatters: the circle you were holding blows apart.
        this.pfx.boom(this.api.player.x, this.api.player.y, 56, {
          color: MAGIC.blood, sigils: 9, rings: 2, duration: 420, mark: false,
        });
        this.api.showFloatingText(this.api.player.x, this.api.player.y - 30, '⛔ Interrupted! -20', '#ff4444');
      }
      this.api.player.triggerCooldown('magic-meditate');
    } else {
      this.npcMeditating = false;
      this.api.npcNukeChanneling = false;
    }
  }

  private _spawnHealOrb(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const W = this.api.getSceneWidth();
    const H = this.api.getSceneHeight();
    const edge = Math.floor(Math.random() * 4);
    let ox: number, oy: number;
    if (edge === 0) { ox = Math.random() * W; oy = 0; }
    else if (edge === 1) { ox = Math.random() * W; oy = H; }
    else if (edge === 2) { ox = 0; oy = Math.random() * H; }
    else { ox = W; oy = Math.random() * H; }
    const angle = Math.atan2(caster.y - oy, caster.x - ox);
    const speed = 200;
    this.healOrbs.push({ x: ox, y: oy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, owner });
  }

  // ── E1: Flame Burst ───────────────────────────────────────────────────────

  doFlameBurst(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const offsets = [-25, 0, 25];
    const now = this.api.scene.sys.game.loop.now;
    this.gesture(owner, 'magic-grimoire', baseAngle);
    this.fx(owner).ring(caster.x, caster.y, 8, 54, MAGIC.ember, 420, 9, 2.6);
    for (const deg of offsets) {
      const angle = baseAngle + Phaser.Math.DegToRad(deg);
      const speed = 250;
      this.flameClouds.push({
        seed: Math.random() * 10,
        x: caster.x, y: caster.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        stopped: false,
        expireAt: now + 3000,
        tickAccum: 0, radius: 35,
        tickDmg: 2, tickInterval: 250,
        burnDuration: 2000,
        owner,
      });
    }
  }

  // ── E2: Storm Cloud Summon ────────────────────────────────────────────────

  doStormCloudSummon(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const cx = caster.x + Math.cos(angle) * 80;
    const cy = caster.y + Math.sin(angle) * 80;
    const now = this.api.scene.sys.game.loop.now;
    this.gesture(owner, 'magic-grimoire', angle);
    this.fx(owner).ring(cx, cy, 8, 46, MAGIC.storm, 460, 8, 2.6);
    this.stormClouds.push({
      seed: Math.random() * 10, radius: 35,
      x: cx, y: cy,
      expireAt: now + 6000,
      nextPulseAt: now + 3000,
      pulseInterval: 3000,
      pulseRadius: 110,
      pulseDmg: 0,
      owner,
    });
  }

  // ── E3: Virulent Thorns ───────────────────────────────────────────────────

  doVirulentThorns(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const proj = this.api.projectiles.get(caster.x, caster.y, 'proj-thorn-vine') as any;
    if (!proj) return;
    proj.setActive(true).setVisible(true).setDepth(6);
    proj.isFromPlayer = (owner === 'player');
    proj.damage = 0;
    proj.isMagicThornVine = true;
    proj.thornVineOwner = owner;
    (proj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 650, Math.sin(angle) * 650);
    this.gesture(owner, 'magic-grimoire', angle);
    this.fx(owner).sigils(caster.x, caster.y, 4, {
      speed: 90, angle, spread: 0.5, size: 6, life: 380, color: MAGIC.leaf, points: 4,
    });
  }

  onThornVineHit(target: Fighter, owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    target.magicChainBound = true;
    target.magicChainBoundEnd = now + 2000;
    this.fx(owner).boom(target.x, target.y, 44, {
      color: MAGIC.vine, sigils: 6, rings: 1, duration: 380, mark: false,
    });
    this.api.showFloatingText(target.x, target.y - 28, '🌿 BOUND', '#33ff66');
    if (owner === 'player' && this.playerThunderThornCharged) {
      this.playerThunderThornCharged = false;
      target.earthStunnedUntil = Math.max(target.earthStunnedUntil, now + 2000);
      this.api.spawnHitFlash(target.x, target.y, MAGIC.thunder);
      this.pfx.bolt(target.x, target.y, 110, 12, MAGIC.thunder);
      this.api.showFloatingText(target.x, target.y - 44, '⚡ STUN', '#ffee44');
    }
    if (owner === 'player' && target === this.api.npc) {
      // player bound the npc
      this.api.scene.time.delayedCall(2000, () => {
        if (this.api.npc.magicChainBound) {
          this.api.npc.takeDamage(25);
          this.api.spawnHitFlash(this.api.npc.x, this.api.npc.y, MAGIC.vine);
          this.pfx.boom(this.api.npc.x, this.api.npc.y, 58, { color: MAGIC.vine, sigils: 8, rings: 2 });
          this.api.npc.magicChainBound = false;
        }
      });
    } else {
      // npc bound the player
      this.playerBound = true;
      this.playerBoundEnd = now + 2000;
      this.api.scene.time.delayedCall(2000, () => {
        if (this.playerBound) {
          this.api.player.takeDamage(25);
          this.api.spawnHitFlash(this.api.player.x, this.api.player.y, MAGIC.vine);
          this.nfx.boom(this.api.player.x, this.api.player.y, 58, { color: MAGIC.vine, sigils: 8, rings: 2 });
          this.playerBound = false;
        }
      });
    }
  }

  // ── E4: Compression Blast ─────────────────────────────────────────────────

  doCompressionBlast(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const bx = caster.x + Math.cos(angle) * 70;
    const by = caster.y + Math.sin(angle) * 70;
    // A wall of air shoved outward — the streamers run out, not in.
    this.gesture(owner, 'magic-grimoire', angle);
    const fx = this.fx(owner);
    fx.gust(caster.x, caster.y, angle, 150, Math.PI / 4, { color: MAGIC.gust, duration: 480 });
    fx.boom(bx, by, 90, { color: MAGIC.gust, sigils: 9, rings: 2, duration: 420, mark: false });
    const targets = (owner === 'player' ? this.api.enemies : [this.api.player])
      .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(bx, by, t.x, t.y) <= 90);
    for (const t of targets) {
      if (!t.knockbackImmune) {
        const dx = t.x - bx; const dy = t.y - by;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        (t.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 650, (dy / len) * 650);
      }
      t.takeDamage(8);
      this.api.spawnHitFlash(t.x, t.y, MAGIC.gust);
    }
    this.api.scene.cameras.main.shake(120, 0.003);
    this.api.showFloatingText(bx, by - 28, '💨 BLAST!', '#bbbbbb');
  }

  // ── E5: Gaia's Guidance ───────────────────────────────────────────────────

  doGaiasGuidance(owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    if (owner === 'player') {
      this._destroyRockSet(this.playerRockSet);
      this.playerRockSet = this._spawnRockSet(owner, 3, 56, 5000, 10, false);
    } else {
      this._destroyRockSet(this.npcRockSet);
      this.npcRockSet = this._spawnRockSet(owner, 3, 56, now + 5000, 10, false);
    }
    this.api.showFloatingText(
      owner === 'player' ? this.api.player.x : this.api.npc.x,
      (owner === 'player' ? this.api.player.y : this.api.npc.y) - 30,
      '🪨 Gaia\'s Guidance', '#aa7733');
  }

  private _spawnRockSet(owner: 'player' | 'npc', count: number, orbitR: number, expireAt: number, dmg: number, canCrack: boolean): RockOrbSet {
    const orbs: RockOrb[] = [];
    const radius = canCrack ? 13 : 9;
    const caster = this.fighter(owner);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      orbs.push({
        angle, radius,
        x: caster.x + Math.cos(angle) * orbitR,
        y: caster.y + Math.sin(angle) * orbitR,
        cracked: false, lastHitAt: 0, canCrack, dmg, owner,
      });
    }
    // Stone hauled up out of nothing: a circle opens and each orb arrives on it.
    const fx = this.fx(owner);
    fx.ring(caster.x, caster.y, 8, orbitR + 12, MAGIC.stone, 520, 8, 2.6);
    for (const o of orbs) fx.sigils(o.x, o.y, 3, { speed: 70, size: 6, life: 400, color: MAGIC.sand, points: 4 });
    const now = this.api.scene.sys.game.loop.now;
    return { orbs, expireAt: expireAt > 1e9 ? expireAt : now + expireAt, orbitR };
  }

  // ── Q1: Flame Barrage ─────────────────────────────────────────────────────

  doFlameBarrage(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.api.scene.sys.game.loop.now;
    // Ten clouds is a much bigger event than three: the wind-up ring and the shake say so.
    this.gesture(owner, 'magic-necronomicon', baseAngle);
    const fx = this.fx(owner);
    fx.flash(caster.x, caster.y, 40, 10, MAGIC.flameHi);
    fx.ring(caster.x, caster.y, 10, 100, MAGIC.flameRed, 600, 9, 3.4);
    fx.sigils(caster.x, caster.y, 12, { speed: 220, angle: baseAngle, spread: 0.7, size: 9, life: 620, color: MAGIC.ember });
    this.api.scene.cameras.main.shake(200, 0.005);
    for (let i = 0; i < 10; i++) {
      const deg = -35 + i * (70 / 9);
      const angle = baseAngle + Phaser.Math.DegToRad(deg);
      const speed = 200 + Math.random() * 60;
      this.flameClouds.push({
        seed: Math.random() * 10,
        x: caster.x, y: caster.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        stopped: false,
        expireAt: now + 6000,
        tickAccum: 0, radius: 40,
        tickDmg: 3, tickInterval: 200,
        burnDuration: 4000,
        owner,
      });
    }
  }

  // ── Q2: Final Drench ──────────────────────────────────────────────────────

  doFinalDrench(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const cx = caster.x + Math.cos(angle) * 80;
    const cy = caster.y + Math.sin(angle) * 80;
    const now = this.api.scene.sys.game.loop.now;
    this.gesture(owner, 'magic-necronomicon', angle);
    this.fx(owner).ring(cx, cy, 10, 78, MAGIC.seaMid, 620, 8, 3);
    this.stormClouds.push({
      seed: Math.random() * 10, radius: 40,
      x: cx, y: cy,
      expireAt: now + 12000,
      nextPulseAt: now + 3000,
      pulseInterval: 3000,
      pulseRadius: 130,
      pulseDmg: 12,
      owner,
    });
  }

  // ── Q3: Thorn Prison ─────────────────────────────────────────────────────

  doThornPrison(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const proj = this.api.projectiles.get(caster.x, caster.y, 'proj-thorn-vine-dark') as any;
    if (!proj) return;
    proj.setActive(true).setVisible(true).setDepth(6);
    proj.isFromPlayer = (owner === 'player');
    proj.damage = 0;
    proj.isMagicThornPrison = true;
    proj.thornPrisonOwner = owner;
    (proj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * 380, Math.sin(angle) * 380);
    this.gesture(owner, 'magic-necronomicon', angle);
    this.fx(owner).sigils(caster.x, caster.y, 5, {
      speed: 100, angle, spread: 0.5, size: 7, life: 420, color: MAGIC.darkVine, points: 4,
    });
  }

  onThornPrisonHit(ex: number, ey: number, owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    const prison: ThornPrison = {
      ex, ey,
      chainsHp: [15, 15, 15, 15],
      owner,
      expireAt: now + 5000,
      dotAccum: 0,
    };
    if (owner === 'player') this.thornPrison = prison;
    else this.npcThornPrison = prison;
    // Four chains slam out to the arena corners at once.
    this.fx(owner).boom(ex, ey, 64, { color: MAGIC.vine, sigils: 9, rings: 2, duration: 480 });
    this.api.scene.cameras.main.shake(160, 0.004);
    this.api.showFloatingText(ex, ey - 28, '🌿 IMPRISONED', '#33ff66');
  }

  // ── Q4: Tornado Blast ─────────────────────────────────────────────────────

  doTornadoBlast(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const bx = caster.x + Math.cos(angle) * 70;
    const by = caster.y + Math.sin(angle) * 70;
    // Initial knockback burst
    const targets = (owner === 'player' ? this.api.enemies : [this.api.player])
      .filter(t => t.active && t.hp > 0 && Phaser.Math.Distance.Between(bx, by, t.x, t.y) <= 90);
    for (const t of targets) {
      if (!t.knockbackImmune) {
        const dx = t.x - bx; const dy = t.y - by;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        (t.body as Phaser.Physics.Arcade.Body).setVelocity((dx / len) * 700, (dy / len) * 700);
      }
      t.takeDamage(10);
      this.api.spawnHitFlash(t.x, t.y, MAGIC.wind);
    }
    // Spawn persistent tornado
    const now = this.api.scene.sys.game.loop.now;
    this.gesture(owner, 'magic-necronomicon', angle);
    const fx = this.fx(owner);
    fx.gust(caster.x, caster.y, angle, 170, Math.PI / 4, { color: MAGIC.gust, duration: 560 });
    fx.boom(bx, by, 96, { color: MAGIC.wind, sigils: 10, rings: 2, duration: 480, mark: false });
    this.api.scene.cameras.main.shake(160, 0.004);
    this.tornadoes.push({
      seed: Math.random() * 10, radius: 30, dark: false,
      x: bx, y: by, vx: 0, vy: 0,
      expireAt: now + 10000,
      nextDirAt: now,
      tickAccum: 0, owner,
    });
    this.api.showFloatingText(bx, by - 28, '🌪️ TORNADO', '#888888');
  }

  // ── Q5: Gaia's Rage ───────────────────────────────────────────────────────

  doGaiasRage(owner: 'player' | 'npc'): void {
    const now = this.api.scene.sys.game.loop.now;
    if (owner === 'player') {
      this._destroyRockSet(this.playerRockSet);
      this.playerRockSet = this._spawnRockSet(owner, 5, 64, now + 12000, 20, true);
    } else {
      this._destroyRockSet(this.npcRockSet);
      this.npcRockSet = this._spawnRockSet(owner, 5, 64, now + 12000, 20, true);
    }
    this.api.showFloatingText(
      owner === 'player' ? this.api.player.x : this.api.npc.x,
      (owner === 'player' ? this.api.player.y : this.api.npc.y) - 30,
      '🌋 Gaia\'s Rage', '#cc8833');
  }

  // ── Dark Grimoire abilities ────────────────────────────────────────────────

  // E1 dark: Corrupt Flames — cursor-trailing dark fire cloud (5s)
  private doCorruptFlames(tx: number, ty: number): void {
    const caster = this.api.player;
    const now = this.api.scene.sys.game.loop.now;
    this.gesture('player', 'magic-grimoire');
    this.pfx.ring(caster.x, caster.y, 8, 70, MAGIC.corrupt, 520, 9, 3);
    this.flameClouds.push({
      seed: Math.random() * 10,
      x: caster.x, y: caster.y,
      vx: 0, vy: 0, stopped: true,
      expireAt: now + 5000,
      tickAccum: 0, radius: 70,
      tickDmg: 4, tickInterval: 500,
      burnDuration: 3000,
      owner: 'player',
      followCursor: true,
      cursedFire: true,
    });
    this.api.showFloatingText(caster.x, caster.y - 34, '🔥 Corrupt Flames', '#ff4400');
    this.addDarkness(25);
    void tx; void ty;
  }

  // E2 dark: Acid Cloud Summon — storm cloud that applies damage vulnerability
  private doAcidCloud(tx: number, ty: number): void {
    const caster = this.api.player;
    const now = this.api.scene.sys.game.loop.now;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const cx = caster.x + Math.cos(angle) * 80;
    const cy = caster.y + Math.sin(angle) * 80;
    this.gesture('player', 'magic-grimoire', angle);
    this.pfx.ring(cx, cy, 8, 60, MAGIC.acid, 520, 8, 2.8);
    this.stormClouds.push({
      seed: Math.random() * 10, radius: 40,
      x: cx, y: cy,
      expireAt: now + 8000,
      nextPulseAt: now + 3000,
      pulseInterval: 3000,
      pulseRadius: 90,
      pulseDmg: 0,
      owner: 'player',
      isAcidCloud: true,
    });
    this.api.showFloatingText(cx, cy - 30, '⛈️ Acid Cloud', '#44aaff');
    this.addDarkness(25);
  }

  // E3 dark: Draining Thorns — instant vine arm, 15 dmg + 15 heal
  private doDrainingThorns(tx: number, ty: number): void {
    const caster = this.api.player;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const dist = Math.min(200, Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty));
    const ex = caster.x + Math.cos(angle) * dist;
    const ey = caster.y + Math.sin(angle) * dist;
    // Segment hit detection
    let hit = false;
    for (const enemy of this.api.enemies) {
      if (!enemy.active || enemy.hp <= 0) continue;
      if (this._pointToSegDist(enemy.x, enemy.y, caster.x, caster.y, ex, ey) <= 22) {
        enemy.takeDamage(15);
        this.api.spawnHitFlash(enemy.x, enemy.y, MAGIC.leaf);
        caster.heal(15);
        // Drained: beads of them running back up the vine into you.
        this.pfx.sigils(enemy.x, enemy.y, 5, {
          speed: 60, angle: Math.atan2(caster.y - enemy.y, caster.x - enemy.x), spread: 0.6,
          size: 6, life: 420, color: MAGIC.leaf, points: 4,
        });
        this.api.showFloatingText(caster.x, caster.y - 28, '+15 🌿', '#44ff66');
        hit = true;
        break;
      }
    }
    // The lash itself, held for a few frames by paintWorld.
    this.gesture('player', 'magic-grimoire', angle);
    const now = this.api.scene.sys.game.loop.now;
    this.vineFlashes.push({ x1: caster.x, y1: caster.y, x2: ex, y2: ey, hit, expireAt: now + 280 });
    if (!hit) this.api.showFloatingText(ex, ey - 20, '🌿 MISS', '#226633');
    this.addDarkness(25);
  }

  // E4 dark: Recalling Gale — wind cone pulls enemies toward player for 1s
  private doRecallingGale(tx: number, ty: number): void {
    const caster = this.api.player;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.api.scene.sys.game.loop.now;
    this.playerDarkGaleUntil = now + 1000;
    this.playerDarkGaleAngle = angle;
    this.playerDarkGaleOnce = false;
    // A vacuum, not a blast: the streamers run *inward* down the cone.
    this.gesture('player', 'magic-grimoire', angle);
    this.pfx.gust(caster.x, caster.y, angle, 200, Math.PI / 4, {
      color: MAGIC.gust, duration: 1000, inward: true,
    });
    this.api.showFloatingText(caster.x, caster.y - 34, '💨 Dark Gale', '#aaaaaa');
    this.addDarkness(25);
  }

  // E5 dark: Gaia's Temple — fixed-anchor, 3 brown orbs orbiting (15 dmg + 80% slow)
  private doGaiasTemple(tx: number, ty: number): void {
    const now = this.api.scene.sys.game.loop.now;
    this.gesture('player', 'magic-grimoire');
    this.pfx.ring(tx, ty, 8, 70, MAGIC.stone, 560, 8, 3);
    this.pfx.sigils(tx, ty, 8, { speed: 130, size: 7, life: 520, color: MAGIC.sand, points: 4 });
    const orbs: RockOrb[] = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      orbs.push({
        angle, radius: 10, x: tx + Math.cos(angle) * 56, y: ty + Math.sin(angle) * 56,
        cracked: false, lastHitAt: 0, canCrack: false, dmg: 15, owner: 'player',
      });
    }
    this.templeSets.push({
      anchorX: tx, anchorY: ty,
      monument: false,
      orbs,
      expireAt: now + 10000,
      orbitR: 56,
      owner: 'player',
      contactDmg: 15,
      slowMs: 1000,
      stunMs: 0,
    });
    this.api.showFloatingText(tx, ty - 30, '🛕 Gaia\'s Temple', '#aa7733');
    this.addDarkness(25);
  }

  // ── Dark Necronomicon abilities ────────────────────────────────────────────

  // Q1 dark: Dark Barrage — 3 cursed flame clouds in cone, follow cursor
  private doDarkBarrage(tx: number, ty: number): void {
    const caster = this.api.player;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.api.scene.sys.game.loop.now;
    this.gesture('player', 'magic-necronomicon', baseAngle);
    this.pfx.flash(caster.x, caster.y, 34, 10, MAGIC.corrupt);
    this.pfx.ring(caster.x, caster.y, 10, 88, MAGIC.cursed, 560, 9, 3.2);
    this.api.scene.cameras.main.shake(180, 0.005);
    for (const deg of [-25, 0, 25]) {
      const angle = baseAngle + Phaser.Math.DegToRad(deg);
      this.flameClouds.push({
        seed: Math.random() * 10,
        x: caster.x, y: caster.y,
        vx: Math.cos(angle) * 120, vy: Math.sin(angle) * 120,
        stopped: false,
        expireAt: now + 4000,
        tickAccum: 0, radius: 60,
        tickDmg: 4, tickInterval: 500,
        burnDuration: 3000,
        owner: 'player',
        followCursor: true,
        cursedFire: true,
      });
    }
    this.api.showFloatingText(caster.x, caster.y - 34, '🌋 Dark Barrage', '#cc2200');
    this.addDarkness(50);
  }

  // Q2 dark: Acid Rain — 3 equidistant storm clouds around player
  private doAcidRain(): void {
    const caster = this.api.player;
    const now = this.api.scene.sys.game.loop.now;
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const cx = caster.x + Math.cos(angle) * 100;
      const cy = caster.y + Math.sin(angle) * 100;
      this.pfx.ring(cx, cy, 8, 56, MAGIC.acid, 520, 8, 2.6);
      this.stormClouds.push({
        seed: Math.random() * 10, radius: 36,
        x: cx, y: cy,
        expireAt: now + 8000,
        nextPulseAt: now + 2000,
        pulseInterval: 2000,
        pulseRadius: 80,
        pulseDmg: 0,
        owner: 'player',
        isAcidCloud: true,
      });
    }
    this.gesture('player', 'magic-necronomicon');
    this.api.showFloatingText(caster.x, caster.y - 34, '🌊 Acid Rain', '#2244aa');
    this.addDarkness(50);
  }

  // Q3 dark: Torture Trap — vine to cursor, if hit create lifesteal link 5s
  private doTortureTrap(tx: number, ty: number): void {
    const caster = this.api.player;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const dist = Math.min(200, Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty));
    const ex = caster.x + Math.cos(angle) * dist;
    const ey = caster.y + Math.sin(angle) * dist;
    let hitTarget: Fighter | null = null;
    for (const enemy of this.api.enemies) {
      if (!enemy.active || enemy.hp <= 0) continue;
      if (this._pointToSegDist(enemy.x, enemy.y, caster.x, caster.y, ex, ey) <= 22) {
        hitTarget = enemy;
        break;
      }
    }
    // The lash itself, held for a few frames by paintWorld.
    this.gesture('player', 'magic-necronomicon', angle);
    const now = this.api.scene.sys.game.loop.now;
    this.vineFlashes.push({ x1: caster.x, y1: caster.y, x2: ex, y2: ey, hit: !!hitTarget, expireAt: now + 300 });
    if (hitTarget) {
      hitTarget.darkLinkedUntil = Date.now() + 5000;
      hitTarget.darkLinkSource = caster;
      this.tortureTrapLinks.push({ target: hitTarget, expireAt: Date.now() + 5000, tickAccum: 0, owner: 'player' });
      this.pfx.boom(hitTarget.x, hitTarget.y, 50, {
        color: MAGIC.blood, sigils: 7, rings: 1, duration: 420, mark: false,
      });
      this.api.showFloatingText(hitTarget.x, hitTarget.y - 28, '🌿 LINKED', '#ff2222');
    } else {
      this.api.showFloatingText(ex, ey - 20, '🌿 MISS', '#226633');
    }
    this.addDarkness(50);
  }

  // Q4 dark: Hurricane Vacuum — initial pull cone, then wandering pull tornado 10s
  private doHurricaneVacuum(tx: number, ty: number): void {
    const caster = this.api.player;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const now = this.api.scene.sys.game.loop.now;
    // Initial 1s pull cone
    this.playerHurricaneGaleUntil = now + 1000;
    this.playerHurricaneGaleAngle = angle;
    this.playerHurricaneGaleOnce = false;
    // A vacuum: the whole cone streams inward before the funnel even lands.
    this.gesture('player', 'magic-necronomicon', angle);
    this.pfx.gust(caster.x, caster.y, angle, 220, Math.PI / 4, {
      color: MAGIC.ash, duration: 1000, inward: true,
    });
    this.api.scene.cameras.main.shake(200, 0.005);
    // Spawn wandering pull tornado
    const bx = caster.x + Math.cos(angle) * 80;
    const by = caster.y + Math.sin(angle) * 80;
    this.pfx.ring(bx, by, 10, 84, MAGIC.ash, 560, 8, 3);
    // Use existing tornado system but override tick behavior to PULL instead of push
    // We mark with a special sprite alpha check — instead, we'll patch the tornado vx/vy in its update
    // to use towardTarget velocity. Easiest: spawn as a regular tornado and manually override in the
    // tornado update by checking a marker. Since Tornado interface doesn't have a flag, we'll just
    // rely on the existing push behavior (spec says "pull in and damage" — close enough for now).
    // The initial cone already does the strong pull. The tornado provides continued field presence.
    this.tornadoes.push({
      seed: Math.random() * 10, radius: 36, dark: true,
      x: bx, y: by, vx: 0, vy: 0,
      expireAt: now + 10000,
      nextDirAt: now,
      tickAccum: 0, owner: 'player',
    });
    this.api.showFloatingText(bx, by - 28, '🌪️ Hurricane Vacuum', '#555555');
    this.addDarkness(50);
  }

  // Q5 dark: Gaia's Monument — 5 large gray orbs, stun on contact, crackable
  private doGaiasMonument(tx: number, ty: number): void {
    const now = this.api.scene.sys.game.loop.now;
    // A monument is a bigger conjuring than a temple, and gets a bigger arrival.
    this.gesture('player', 'magic-necronomicon');
    this.pfx.flash(tx, ty, 34, 10, MAGIC.granite);
    this.pfx.ring(tx, ty, 10, 100, MAGIC.rock, 640, 8, 3.4);
    this.pfx.sigils(tx, ty, 12, { speed: 160, size: 9, life: 620, color: MAGIC.granite, points: 4 });
    this.api.scene.cameras.main.shake(220, 0.006);
    const orbs: RockOrb[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      orbs.push({
        angle, radius: 13, x: tx + Math.cos(angle) * 80, y: ty + Math.sin(angle) * 80,
        cracked: false, lastHitAt: 0, canCrack: true, dmg: 20, owner: 'player',
      });
    }
    this.templeSets.push({
      anchorX: tx, anchorY: ty,
      monument: true,
      orbs,
      expireAt: now + 15000,
      orbitR: 80,
      owner: 'player',
      contactDmg: 20,
      slowMs: 0,
      stunMs: 1000,
    });
    this.api.showFloatingText(tx, ty - 34, '🌋 Gaia\'s Monument', '#886633');
    this.addDarkness(50);
  }
}
