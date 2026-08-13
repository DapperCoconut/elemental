import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import {
  ArmGesture, METAL, MetalAura, MetalAuraStyle, MetalAvatar, MetalColorFn, MetalFx,
  bladeShardLayered, chainRun, flailHead, sword,
} from './MetalVisuals';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { meterGain } from '../../combat/Meters';

// ── Metal type definitions ─────────────────────────────────────────────────
//
// Every world object here is plain data painted into the kit's own Graphics layers — nothing
// owns a sprite, so a puddle can congeal, a mace can go molten and a shard can spin.

export interface MetalBloodPuddle {
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
  drainAccum: number;
  draining: boolean;
  blood: number; // remaining blood held in this puddle
  /** Fixed splat seed, so a puddle keeps its shape instead of boiling frame to frame. */
  seed: number;
}

export interface MetalChainProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  active: boolean;
}

interface MetalShardProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  active: boolean;
  dmg: number;          // damage on hit
  spawnsPuddle: boolean; // clot shards spawn a blood puddle on hit; flung maces do not
  /** Flung flail heads are drawn as a mace, not as a sliver. */
  isMace: boolean;
  heavy: boolean;
}

interface MetalFlail {
  x: number;
  y: number;
  angle: number;
  angularVel: number;
  initialAngularVel: number;
  radius: number;
  swinging: boolean;
  createdAt: number;
  swingStartAt: number;
  lastHitAt: number;
  owner: 'player' | 'npc';
  heavy: boolean;       // E+ Heavy Metal Rock
  headRadius: number;
  /** 0 = cold iron, 1 = molten. Drives the head's colour and its fire drip. */
  heat: number;
  firePuddleAccum: number;
}

interface MetalFirePuddle {
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
  expiresAt: number;
  spawnedAt: number;
  tickAccum: number;
}

interface MetalGroundTether {
  x: number;
  y: number;
  owner: 'player' | 'npc';
  endTime: number;
  blastAccum: number;
}

interface BloodBlade {
  owner: 'player' | 'npc';
  y: number;            // current vertical offset while descending
  descending: boolean;
  lastSwingAt: number;  // swing cadence (faster with more blood)
  prevBlood: number;
}

/** A mace head at rest or in flight — the shared look for a flail, and for one flung as a shard. */
function flailHeadAt(
  g: Phaser.GameObjects.Graphics, tint: MetalColorFn,
  x: number, y: number, spin: number, radius: number, heavy: boolean, heat = 0,
): void {
  flailHead(g, tint, x, y, spin, radius,
    heavy ? METAL.char : METAL.iron, heavy ? METAL.iron : METAL.steel, heat, 1, heavy ? 10 : 8);
}

/** The live flail: colour and heat both come off how hard it is currently spinning. */
function flailHeadFor(
  g: Phaser.GameObjects.Graphics, tint: MetalColorFn, f: MetalFlail, t: number,
): void {
  flailHeadAt(g, tint, f.x, f.y, f.angle * (f.heavy ? 1 : 1.6) + t * 0.4, f.headRadius, f.heavy, f.heat);
}

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'metal-slash': 'punch',
  'metal-flail-craft': 'sweep',
  'metal-blood-transfusion': 'flex',
  'metal-chain-tether': 'punch',
  'metal-clot-armor': 'raise',
};

// ── MetalArenaApi ──────────────────────────────────────────────────────────

export interface MetalArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly npcCastId: string | null;
  /** `(owner, base) => displayed` — the owner's skin, or the identity. */
  metalColor(owner: 'player' | 'npc', base: number): number;
  /** Equipped skin id for that side, or null — decides which character rig gets built. */
  skinId(owner: 'player' | 'npc'): string | null;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  /** True only when the player is metal AND Metal Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the online opponent is metal AND has Metal Mastery on. Drives the npc-side passive/shield. */
  get npcMasteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot this match, or null. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── MetalKit ───────────────────────────────────────────────────────────────

const BLOOD_MAX = 100;
const FLAIL_LIFETIME_MS = 10000;
const FLAIL_SWING_DECAY_MS = FLAIL_LIFETIME_MS / 3; // spin slows 3x faster than the idle lifetime
const FLAIL_BASE_ANGULAR_VEL = 9; // rad/s
const FLAIL_MAX_ANGULAR_VEL = 24; // cap when repeatedly whipped
const FLAIL_HIT_ACCEL = 5.4;      // speed added each time the swinging flail is struck
const FLAIL_IDLE_RADIUS = 70;
const FLAIL_SWING_RADIUS = 95;
const FLAIL_CONTACT_RADIUS = 30;
const FLAIL_HIT_COOLDOWN_MS = 250;
const CLOT_SHARD_THRESHOLD = 25;
const CLOT_SHARD_COUNT = 5;
const CLOT_SHARD_DAMAGE = 10;
const CLOT_SHARD_SPEED = 420;
const TRANSFUSION_TICK_MS = 200;
const TRANSFUSION_PER_TICK = 3; // 15 blood/heal per second
const PUDDLE_BLOOD_CAPACITY = 25; // each blood puddle holds 25 blood
const BLOOD_DRAIN_PER_SEC = 10;   // drains 10 blood/sec into the blood bar while stood on
const CHAIN_TETHER_LEASH = 80;    // how close the chain reels the tethered target in
const CHAIN_TETHER_MS = 5000;           // how long a landed tether holds the target
const CHAIN_TETHER_PUDDLE_COUNT = 3;    // total puddles dropped over a single tether
const CHAIN_TETHER_PUDDLE_INTERVAL = CHAIN_TETHER_MS / CHAIN_TETHER_PUDDLE_COUNT; // spread evenly over the duration

// ── Click+ Mighty Sabre ────────────────────────────────────────────────────
// ── Conduit (divine perk) ────────────────────────────────────────────────────
/** Live steel hits harder. Applied to the slash, the sabre and the flail head alike. */
const CONDUIT_DAMAGE_MULT = 1.3;
/** Earthed back into whoever's shot struck the plate. */
const CONDUIT_EARTH_DAMAGE = 5;
/** Empty max HP eaten per second while transfusing — the price of running live. */
const CONDUIT_MAXHP_DRAIN_PER_SEC = 6;

// ── Gold (divine perk) ───────────────────────────────────────────────────────
/** A dagger stab: shorter reach than the sabre's sweep, more damage per hit. */
const GOLD_STAB_DAMAGE = 34;
const GOLD_STAB_RANGE = 62;
/** Click+ releases a flurry rather than winding up one big swing. */
const GOLD_BARRAGE_STABS = 5;
const GOLD_BARRAGE_DAMAGE = 16;
const GOLD_BARRAGE_GAP_MS = 90;
/** Blood Blade under Gold: fixed cadence, damage scaling off the blood bar instead. */
const GOLD_BLADE_INTERVAL_MS = 450;
const GOLD_BLADE_DMG_PER_BLOOD = 0.5;

const SABRE_CHARGE_MS = 3000;
const SABRE_MIN_DMG = 25;
const SABRE_MAX_DMG = 75;
const SABRE_PARRY_RADIUS = 130;
// ── E+ Heavy Metal Rock ─────────────────────────────────────────────────────
const HEAVY_RADIUS_MULT = 0.75; // E+ mace chain is 25% shorter than normal
const HEAVY_MOLTEN_RATIO = 0.6;   // speedRatio above which the mace goes molten + drips fire
// ── F+ Ground Anchor ────────────────────────────────────────────────────────
const GROUND_TETHER_MS = 12000;
const GROUND_TETHER_BLAST_MS = 1500;
const GROUND_TETHER_BLAST_RADIUS = 150;
const GROUND_TETHER_BLAST_DRAIN = 15; // blood pulled from EACH puddle in range per blast
const F_CHARGE_MS = 3000;
// ── Q+ Blood Blade ──────────────────────────────────────────────────────────
const BLOOD_BLADE_COST = 100;
const BLOOD_BLADE_SWING_DMG = 25;
const BLOOD_BLADE_RANGE = 150;
const Q_HOLD_THRESHOLD_MS = 500;
// ── Mastery: Natural Clot passive + Steel Shield bindable ─────────────────────
const NATURAL_CLOT_REDUCTION = 3;
const STEEL_SHIELD_BLOOD_COST = 25;     // 25% of the 100-max blood bar
const STEEL_SHIELD_DURATION_MS = 5000;
const STEEL_SHIELD_COOLDOWN_MS = 8000;
const STEEL_SHIELD_DMG_MULT = 0.75;     // take 25% less damage while it stands
const STEEL_SHIELD_DIST = 46;           // how far in front of the caster it plants
const STEEL_SHIELD_BLOCK_RADIUS = 38;   // a shot within this of the barrier centre is blocked

export class MetalKit {
  // ── Visuals ────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: MetalColorFn;
  private readonly ncol: MetalColorFn;
  private readonly pfx: MetalFx;
  private readonly nfx: MetalFx;
  /**
   * The character rig for each metal-element fighter — the butcher by default, or whatever
   * that side's equipped skin installs instead. Typed as the base rig because the kit only
   * ever drives it through poses and gestures, which every rig has.
   */
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;
  /** Stance tells, per side where both can run one. */
  private auras: Partial<Record<`${'player' | 'npc'}:${MetalAuraStyle}`, MetalAura>> = {};
  /**
   * Two layers, because these objects are not all in the same place. Puddles, fire pools, splats
   * and the anchor stake lie on the floor and must pass *under* the fighters; flails, chains,
   * shards and barriers are swung out in front of them and must pass over.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;
  /** Last cursor position, cached in handleInput — `update` has no pointer. */
  private lastAimX = 0;
  private lastAimY = 0;

  // ── Kept-as-is: blood puddles / chain tether / aggressive bleeding ────
  private metalBloodPuddles: MetalBloodPuddle[] = [];
  private metalChainTethered = false;
  private metalChainTetherEnd = 0;
  private metalChainProjectiles: MetalChainProjectile[] = [];
  private metalTetherNextPuddleAt = 0; // timestamp of the next drag puddle
  private metalTetherPuddlesLeft = 0;  // remaining puddles to drop this tether (max 3)
  private playerAggressiveBleeding = false;
  private playerAggressiveBleedUntil = 0;
  private playerAggressiveBleedTickAccum = 0;
  private playerAggressiveBleedPuddleAccum = 0;

  private npcMetalChainTethered = false;
  private npcMetalChainTetherEnd = 0;
  private npcMetalTetherNextPuddleAt = 0;
  private npcMetalTetherPuddlesLeft = 0;
  private npcAggressiveBleeding = false;
  private npcAggressiveBleedUntil = 0;
  private npcAggressiveBleedTickAccum = 0;
  private npcAggressiveBleedPuddleAccum = 0;

  // ── Passive: damage-dealt → blood puddle every 50 dmg ─────────────────
  private playerDamageDealtAccum = 0;
  private npcDamageDealtAccum = 0;

  // ── Blood bar resource ─────────────────────────────────────────────────
  private blood: Record<'player' | 'npc', number> = { player: 0, npc: 0 };
  private bloodBarBg: Phaser.GameObjects.Rectangle | null = null;
  private bloodBarFill: Phaser.GameObjects.Rectangle | null = null;
  private bloodBarLabel: Phaser.GameObjects.Text | null = null;

  // ── Flail Craft (E / Click-when-idle) ──────────────────────────────────
  private playerFlail: MetalFlail | null = null;
  private npcFlail: MetalFlail | null = null;

  // ── Blood Transfusion (R, hold) — smooth per-frame drain → heal ────────
  private transfusionActiveUntil: Record<'player' | 'npc', number> = { player: 0, npc: 0 };
  private transfusionDripAccum: Record<'player' | 'npc', number> = { player: 0, npc: 0 };
  /** Conduit: fractional max HP burned away by transfusing, batched so the pop-up shows whole numbers. */
  private transfusionBurnAccum: Record<'player' | 'npc', number> = { player: 0, npc: 0 };

  // ── Clot Armor (Q) ──────────────────────────────────────────────────────
  private clotArmorActive: Record<'player' | 'npc', boolean> = { player: false, npc: false };
  private clotArmorLostAccum: Record<'player' | 'npc', number> = { player: 0, npc: 0 };
  /** Shield HP the armour was raised with, so the aura can show how much plate is left. */
  private clotArmorMaxHp: Record<'player' | 'npc', number> = { player: 1, npc: 1 };
  private metalShardProjectiles: MetalShardProjectile[] = [];

  // Player's current look direction (toward cursor), for orienting clot spikes.
  private playerAimAngle = 0;

  // ── Shared charge VFX (Click sabre / F anchor / Q blade) ──────────────────
  private charging = false;
  private chargeStart = 0;
  private chargeDuration = 0;
  private chargeRatio = 0;
  private chargeFullTinted = false;

  // ── Click+ Mighty Sabre charge state (player only) ────────────────────────
  private sabreCharging = false;
  private sabreChargeStart = 0;

  // ── E+ Heavy Metal Rock fire puddles ──────────────────────────────────────
  private metalFirePuddles: MetalFirePuddle[] = [];

  // ── F+ Ground Anchor state (player only) ──────────────────────────────────
  private fCharging = false;
  private fChargeStart = 0;
  private fFired = false;
  private metalGroundTether: MetalGroundTether | null = null;

  // ── Q+ Blood Blade state (player only) ────────────────────────────────────
  private qHolding = false;
  private qHoldStart = 0;
  private qHoldFired = false;
  private bloodBlade: BloodBlade | null = null;

  // ── Mastery: Steel Shield state (player + npc mirrors) ────────────────────
  private steelShields: Record<'player' | 'npc', {
    endTime: number;
    red: boolean;
    x: number;
    y: number;
    angle: number;
  } | null> = { player: null, npc: null };
  private steelShieldLastCastAt = -STEEL_SHIELD_COOLDOWN_MS; // ready at match start; npc casts are event-driven online

  constructor(private arena: MetalArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.metalColor('player', base);
    this.ncol = (base) => arena.metalColor('npc', base);
    this.pfx = new MetalFx(arena.scene, this.pcol);
    this.nfx = new MetalFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ─────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): MetalFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): MetalColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Metal. */
  private avatar(owner: 'player' | 'npc'): BaseAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  /**
   * That side's rig: the skin's if one is equipped, metal's butcher otherwise. Built lazily in
   * `updateAvatars` and torn down in `reset`, so changing skin between matches swaps the
   * character.
   */
  private makeAvatar(owner: 'player' | 'npc'): BaseAvatar {
    const { scene } = this.arena;
    return makeSkinAvatar(this.arena.skinId(owner), scene)
      ?? new MetalAvatar(scene, this.col(owner), owner);
  }
  private fighter(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /** The floor layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.arena.scene.add.graphics().setDepth(2);
    }
    return this.groundGfx;
  }

  /** The swung-out-in-front layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.arena.scene.add.graphics().setDepth(10);
    }
    return this.airGfx;
  }

  /** Build/tear down one stance aura from a single "is it up?" flag. */
  private syncAura(
    owner: 'player' | 'npc', style: MetalAuraStyle, on: boolean,
    delta: number, intensity: number, angle: number, radius = 28,
  ): void {
    const key = `${owner}:${style}` as const;
    let aura = this.auras[key];
    const f = this.fighter(owner);
    if (!on || !f.active) {
      if (aura) { aura.destroy(); delete this.auras[key]; }
      return;
    }
    if (!aura) {
      aura = new MetalAura(this.arena.scene, this.col(owner), style, radius, style === 'clot' ? 3 : 4);
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

  // ── Public accessors ──────────────────────────────────────────────────

  getNpcMetalChainTetherEnd(): number { return this.npcMetalChainTetherEnd; }
  setNpcMetalChainTetherEnd(v: number): void { this.npcMetalChainTetherEnd = v; }
  getNpcAggressiveBleedUntil(): number { return this.npcAggressiveBleedUntil; }
  setNpcAggressiveBleedUntil(v: number): void { this.npcAggressiveBleedUntil = v; }

  getBlood(owner: 'player' | 'npc'): number { return this.blood[owner]; }
  hasFlail(owner: 'player' | 'npc'): boolean { return (owner === 'player' ? this.playerFlail : this.npcFlail) !== null; }
  isFlailSwinging(owner: 'player' | 'npc'): boolean {
    const flail = owner === 'player' ? this.playerFlail : this.npcFlail;
    return !!flail && flail.swinging;
  }
  isClotArmorActive(owner: 'player' | 'npc'): boolean { return this.clotArmorActive[owner]; }

  initHud(): void {
    const { scene } = this.arena;
    if (this.bloodBarBg) { this.bloodBarBg.destroy(); this.bloodBarBg = null; }
    if (this.bloodBarFill) { this.bloodBarFill.destroy(); this.bloodBarFill = null; }
    if (this.bloodBarLabel) { this.bloodBarLabel.destroy(); this.bloodBarLabel = null; }

    const x = 26;
    const y = 66;
    this.bloodBarBg = scene.add.rectangle(x, y, 150, 12, 0x1a0a0a, 0.9)
      .setOrigin(0, 0.5).setStrokeStyle(1, 0x772233).setDepth(23).setScrollFactor(0);
    this.bloodBarFill = scene.add.rectangle(x + 1, y, 0, 10, 0xcc0022, 0.95)
      .setOrigin(0, 0.5).setDepth(24).setScrollFactor(0);
    this.bloodBarLabel = scene.add.text(x, y - 14, 'BLOOD', {
      fontSize: '10px', color: '#dd6677', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    }).setOrigin(0, 0.5).setDepth(24).setScrollFactor(0);
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.destroyAuras();
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    this.vizT = 0;

    this.npcAggressiveBleeding = false; this.npcAggressiveBleedUntil = 0;
    this.npcAggressiveBleedTickAccum = 0; this.npcAggressiveBleedPuddleAccum = 0;
    this.playerAggressiveBleeding = false; this.playerAggressiveBleedUntil = 0;
    this.playerAggressiveBleedTickAccum = 0; this.playerAggressiveBleedPuddleAccum = 0;

    this.metalBloodPuddles = [];

    this.metalChainTethered = false; this.metalChainTetherEnd = 0; this.metalTetherNextPuddleAt = 0; this.metalTetherPuddlesLeft = 0;
    this.npcMetalChainTethered = false; this.npcMetalChainTetherEnd = 0; this.npcMetalTetherNextPuddleAt = 0; this.npcMetalTetherPuddlesLeft = 0;

    this.metalChainProjectiles = [];

    // Shared charge VFX + Click+ Mighty Sabre
    this.clearChargeVfx();
    this.sabreCharging = false;

    // E+ fire puddles
    this.metalFirePuddles = [];

    // F+ Ground Anchor
    this.fCharging = false; this.fFired = false;
    this.destroyGroundTether();

    // Q+ Blood Blade
    this.qHolding = false; this.qHoldFired = false;
    this.dismissBloodBlade();

    // R+ clotted HP
    this.arena.player.clottedHp = 0;
    this.arena.npc.clottedHp = 0;

    // Passive damage tracking
    this.playerDamageDealtAccum = 0;
    this.npcDamageDealtAccum = 0;

    // Blood bar
    this.blood = { player: 0, npc: 0 };
    if (this.bloodBarBg) { this.bloodBarBg.destroy(); this.bloodBarBg = null; }
    if (this.bloodBarFill) { this.bloodBarFill.destroy(); this.bloodBarFill = null; }
    if (this.bloodBarLabel) { this.bloodBarLabel.destroy(); this.bloodBarLabel = null; }

    // Flails — nulled outright rather than via destroyFlail(), which throws sparks off the
    // dying mace and would fire them at last match's coordinates on the first frame.
    this.playerFlail = null;
    this.npcFlail = null;

    // Transfusion
    this.transfusionActiveUntil = { player: 0, npc: 0 };
    this.transfusionDripAccum = { player: 0, npc: 0 };
    this.transfusionBurnAccum = { player: 0, npc: 0 };

    // Clot armor
    this.clotArmorActive = { player: false, npc: false };
    this.clotArmorLostAccum = { player: 0, npc: 0 };
    this.clotArmorMaxHp = { player: 1, npc: 1 };
    this.arena.player.clearTint();
    this.arena.npc.clearTint();
    this.arena.player.damageAbsorber = null;
    this.arena.npc.damageAbsorber = null;

    this.metalShardProjectiles = [];

    // Mastery — Steel Shield + Natural Clot passive
    this.destroySteelShield('player');
    this.destroySteelShield('npc');
    this.steelShieldLastCastAt = -STEEL_SHIELD_COOLDOWN_MS;
    this.arena.player.flatDamageReduction = 0;
    this.arena.npc.flatDamageReduction = 0;
    this.arena.player.steelShieldMult = 1;
    this.arena.npc.steelShieldMult = 1;
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const { player, eKey, fKey, rKey, qKey, pointerWasDown } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    this.playerAimAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
    this.lastAimX = mouseX;
    this.lastAimY = mouseY;
    const aimAtFlail = (): boolean => {
      if (!this.playerFlail) return false;
      const head = this.playerFlail;
      const aimAng = Math.atan2(mouseY - player.y, mouseX - player.x);
      const maceAng = Math.atan2(head.y - player.y, head.x - player.x);
      return Math.abs(Phaser.Math.Angle.Wrap(aimAng - maceAng)) <= Phaser.Math.DegToRad(30);
    };

    // ── Mastery — Steel Shield takes over whichever slot it's bound to ──────
    const steelSlot = this.arena.masteryActive ? this.steelShieldSlot() : null;
    if (steelSlot) {
      const ssKey = steelSlot === 'e' ? eKey : steelSlot === 'r' ? rKey : steelSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(ssKey)) this.tryCastSteelShield(time, mouseX, mouseY);
    }

    // ── Click: Blood Blade (Q+, while equipped) / Slash / Mighty Sabre ────
    if (this.bloodBlade) {
      // The blood blade replaces your sword. With Mighty Sabre (Click+) it
      // charges-and-releases exactly like the normal blade — a quick tap swings
      // for 25, holding scales up to 75 and a full charge triggers Max Charge.
      // Without the upgrade it swings on press, faster the more blood you hold.
      // (Both paths are ignored during its descent from the sky.)
      if (this.arena.hasUpgrade('click')) {
        if (pointer.isDown && !pointerWasDown) {
          if (!this.bloodBlade.descending && player.getCooldownRatio('metal-slash') >= 1) {
            this.sabreCharging = true;
            this.sabreChargeStart = time;
            this.startChargeVfx(time, SABRE_CHARGE_MS);
          }
          if (aimAtFlail()) this.triggerFlailSwing('player'); // still whips the mace
        } else if (this.sabreCharging && !pointer.isDown && pointerWasDown) {
          const held = time - this.sabreChargeStart;
          const ratio = Math.min(1, held / SABRE_CHARGE_MS);
          const dmg = Math.round(SABRE_MIN_DMG + (SABRE_MAX_DMG - SABRE_MIN_DMG) * ratio);
          this.bloodBladeSwing(mouseX, mouseY, dmg);
          player.startCooldown('metal-slash');
          if (ratio >= 1) this.doMaxCharge(mouseX, mouseY, playerCtx);
          this.sabreCharging = false;
          this.clearChargeVfx();
        }
      } else if (!this.bloodBlade.descending && pointer.isDown && !pointerWasDown) {
        if (aimAtFlail()) this.triggerFlailSwing('player'); // still whips the mace
        // Gold: the blood dagger swings at a fixed cadence and puts the blood into the wound
        // instead of into the swing speed.
        const goldDagger = this.gold('player');
        const interval = goldDagger
          ? GOLD_BLADE_INTERVAL_MS
          : Phaser.Math.Clamp(700 - this.blood.player * 4, 200, 700);
        if (time - this.bloodBlade.lastSwingAt >= interval) {
          this.bloodBlade.lastSwingAt = time;
          this.bloodBladeSwing(mouseX, mouseY, goldDagger
            ? BLOOD_BLADE_SWING_DMG + Math.round(this.blood.player * GOLD_BLADE_DMG_PER_BLOOD)
            : undefined);
        }
      }
    } else if (this.arena.hasUpgrade('click') && this.gold('player')) {
      // Gold + Click+: a dagger has nothing to wind up. Holding queues a flurry that goes off
      // on release, so the upgrade still rewards the hold — just with volume, not one big hit.
      if (pointer.isDown && !pointerWasDown) {
        if (player.getCooldownRatio('metal-slash') >= 1) {
          this.sabreCharging = true;
          this.sabreChargeStart = time;
        }
        if (aimAtFlail()) this.triggerFlailSwing('player');
      } else if (this.sabreCharging && !pointer.isDown && pointerWasDown) {
        this.goldBarrage(mouseX, mouseY, 'player');
        player.startCooldown('metal-slash');
        this.sabreCharging = false;
      }
    } else if (this.arena.hasUpgrade('click')) {
      // Charge-and-release. A quick tap ≈ 25 dmg; holding scales up to 75.
      if (pointer.isDown && !pointerWasDown) {
        if (player.getCooldownRatio('metal-slash') >= 1) {
          this.sabreCharging = true;
          this.sabreChargeStart = time;
          this.startChargeVfx(time, SABRE_CHARGE_MS);
        }
        // Whip the flail on press if you're aiming at it (kept from base).
        if (aimAtFlail()) this.triggerFlailSwing('player');
      } else if (this.sabreCharging && !pointer.isDown && pointerWasDown) {
        const held = time - this.sabreChargeStart;
        const ratio = Math.min(1, held / SABRE_CHARGE_MS);
        const dmg = Math.round(SABRE_MIN_DMG + (SABRE_MAX_DMG - SABRE_MIN_DMG) * ratio);
        this.doMetalSlash(mouseX, mouseY, 'player', dmg);
        player.startCooldown('metal-slash');
        if (ratio >= 1) this.doMaxCharge(mouseX, mouseY, playerCtx);
        this.sabreCharging = false;
        this.clearChargeVfx();
      }
    } else {
      // Base: instant slash on press, whip the flail if aimed at it.
      if (pointer.isDown && !pointerWasDown) {
        player.castAbility('metal-slash', playerCtx);
        if (aimAtFlail()) this.triggerFlailSwing('player');
      }
    }

    // ── E: Flail Craft ─────────────────────────────────────────────────────
    if (steelSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) {
      player.castAbility('metal-flail-craft', playerCtx);
    }

    // ── R: Blood Transfusion (hold) — drain runs per-frame in updateTransfusion ──
    if (steelSlot !== 'r' && rKey.isDown && this.blood.player > 0) {
      this.transfusionActiveUntil.player = time + 120;
    }

    // ── F: Chain Tether / Ground Anchor (F+) ──────────────────────────────
    if (steelSlot !== 'f') {
    if (this.arena.hasUpgrade('f')) {
      if (fKey.isDown) {
        if (!this.fCharging) {
          if (player.getCooldownRatio('metal-chain-tether') >= 1) {
            this.fCharging = true; this.fChargeStart = time; this.fFired = false;
            this.startChargeVfx(time, F_CHARGE_MS);
          }
        } else if (!this.fFired && time - this.fChargeStart >= F_CHARGE_MS) {
          this.fFired = true;
          this.spawnGroundTether(mouseX, mouseY, 'player');
          player.startCooldown('metal-chain-tether');
          this.clearChargeVfx();
        }
      } else if (this.fCharging) {
        // Released early → normal chain tether toward the cursor.
        if (!this.fFired && time - this.fChargeStart < F_CHARGE_MS) {
          player.castAbility('metal-chain-tether', playerCtx);
        }
        this.fCharging = false; this.fFired = false;
        this.clearChargeVfx();
      }
    } else {
      if (Phaser.Input.Keyboard.JustDown(fKey)) {
        player.castAbility('metal-chain-tether', playerCtx);
      }
    }
    }

    // ── Q: Clot Armor (tap) / Blood Blade (hold, Q+) ──────────────────────
    if (steelSlot !== 'q') {
    if (this.arena.hasUpgrade('q')) {
      if (qKey.isDown) {
        if (!this.qHolding) {
          this.qHolding = true; this.qHoldStart = time; this.qHoldFired = false;
          this.startChargeVfx(time, Q_HOLD_THRESHOLD_MS);
        } else if (!this.qHoldFired && time - this.qHoldStart >= Q_HOLD_THRESHOLD_MS) {
          this.qHoldFired = true;
          this.summonBloodBlade('player'); // clears the charge VFX on summon
        }
      } else if (this.qHolding) {
        if (!this.qHoldFired && time - this.qHoldStart < Q_HOLD_THRESHOLD_MS) {
          player.castAbility('metal-clot-armor', playerCtx); // tap → Clot Armor
        }
        this.qHolding = false; this.qHoldFired = false;
        this.clearChargeVfx();
      }
    } else {
      if (Phaser.Input.Keyboard.JustDown(qKey)) {
        player.castAbility('metal-clot-armor', playerCtx);
      }
    }
    }
  }

  update(time: number, delta: number): void {
    this.vizT += delta / 1000;
    this.mirrorNpcCast();
    this.updateAggressiveBleeds(time, delta);
    this.updateTransfusion(time, delta);
    this.updateBloodPuddles(time, delta);
    this.updateChainTethers(time, delta);
    this.updateChainProjectiles(time, delta);
    this.updateFlails(time, delta);
    this.updateShardProjectiles(time, delta);
    this.updateChargeVfx(time);
    this.updateMetalFirePuddles(time, delta);
    this.updateGroundTether(time, delta);
    this.updateBloodBlade(time, delta);
    // Mastery — Natural Clot passive (flat -3) applied to whichever side owns Metal Mastery.
    this.arena.player.flatDamageReduction = this.arena.masteryActive ? NATURAL_CLOT_REDUCTION : 0;
    this.arena.npc.flatDamageReduction = this.arena.npcMasteryActive ? NATURAL_CLOT_REDUCTION : 0;
    this.updateSteelShields(time);
    this.updateBloodHud();
    this.paintWorld(time);
    this.updateAvatars(time, delta);
  }

  /** Mirror the player's gestures on the NPC rig, so a metal opponent visibly casts. */
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
   * so a puddle congeals, a mace glows and a barrier drips rather than sitting there as a sprite.
   */
  private paintWorld(time: number): void {
    const t = this.vizT;
    const { player, npc } = this.arena;

    // ── Floor ──
    const hasGround = this.metalBloodPuddles.length > 0 || this.metalFirePuddles.length > 0
      || this.metalGroundTether !== null;
    if (hasGround || this.groundGfx) {
      const g = this.ground();
      g.clear();
      for (const p of this.metalBloodPuddles) {
        MetalFx.drawPuddle(g, this.col(p.owner), p.x, p.y, p.radius,
          p.blood / PUDDLE_BLOOD_CAPACITY, p.seed, p.draining, t);
      }
      for (const fp of this.metalFirePuddles) {
        const life = Phaser.Math.Clamp((fp.expiresAt - time) / 3000, 0, 1);
        MetalFx.drawFirePuddle(g, this.col(fp.owner), fp.x, fp.y, fp.radius, life, t);
      }
      const gt = this.metalGroundTether;
      if (gt) MetalFx.drawStake(g, this.col(gt.owner), gt.x, gt.y, GROUND_TETHER_BLAST_RADIUS, t);
    }

    // ── Swung out in front ──
    const hasAir = this.playerFlail !== null || this.npcFlail !== null
      || this.metalChainProjectiles.length > 0 || this.metalShardProjectiles.length > 0
      || this.metalChainTethered || this.npcMetalChainTethered
      || this.steelShields.player !== null || this.steelShields.npc !== null
      || (this.bloodBlade?.descending ?? false);
    if (hasAir || this.airGfx) {
      const g = this.air();
      g.clear();

      // Live tethers: a chain from the caster to whoever is on the end of it.
      if (this.metalChainTethered) {
        chainRun(g, this.pcol, player.x, player.y, npc.x, npc.y, 22 + Math.sin(t * 3) * 8, METAL.steel, 0.95);
      }
      if (this.npcMetalChainTethered) {
        chainRun(g, this.ncol, npc.x, npc.y, player.x, player.y, 22 + Math.sin(t * 3 + 1) * 8, METAL.steel, 0.95);
      }

      // Flails: the chain from the caster's fist out to a spinning, heating mace head.
      for (const owner of ['player', 'npc'] as const) {
        const flail = owner === 'player' ? this.playerFlail : this.npcFlail;
        if (!flail) continue;
        const caster = this.fighter(owner);
        const tint = this.col(owner);
        chainRun(g, tint, caster.x, caster.y, flail.x, flail.y,
          flail.swinging ? 6 : 20 + Math.sin(t * 2) * 5, METAL.iron, 0.95, flail.heavy ? 1.15 : 0.9);
        flailHeadFor(g, tint, flail, t);
      }

      // Chain hooks in flight, trailing their own line back to the thrower.
      for (const cp of this.metalChainProjectiles) {
        const caster = this.fighter(cp.owner);
        const tint = this.col(cp.owner);
        const ang = Math.atan2(cp.vy, cp.vx);
        chainRun(g, tint, caster.x, caster.y, cp.x, cp.y, 14, METAL.iron, 0.8, 0.8);
        bladeShardLayered(g, tint, cp.x, cp.y, ang, 20, 5, METAL.chrome, 1, 0.5, false);
      }

      // Shards and flung maces.
      for (const p of this.metalShardProjectiles) {
        const ang = Math.atan2(p.vy, p.vx);
        if (p.isMace) {
          flailHeadAt(g, this.col(p.owner), p.x, p.y, t * 14, p.heavy ? 14 : 9, p.heavy);
        } else {
          MetalFx.drawShardBolt(g, this.col(p.owner), p.x, p.y, ang, 17, METAL.crimson, t);
        }
      }

      // Steel Shield barriers.
      for (const owner of ['player', 'npc'] as const) {
        const s = this.steelShields[owner];
        if (!s) continue;
        MetalFx.drawBarrier(g, this.col(owner), s.x, s.y, s.angle, s.red, t);
      }

      // The Blood Blade falling out of the sky.
      const blade = this.bloodBlade;
      if (blade?.descending) {
        sword(g, this.pcol, player.x, blade.y, Math.PI / 2, 78, METAL.crimson, 1, true, true);
        // Wind screaming past it.
        for (let i = 0; i < 3; i++) {
          const d = 30 + i * 26;
          g.lineStyle(2 - i * 0.5, this.pcol(METAL.rose), 0.5 - i * 0.13);
          g.lineBetween(player.x - 8 + i * 3, blade.y - d, player.x - 8 + i * 3, blade.y - d - 24);
          g.lineBetween(player.x + 8 - i * 3, blade.y - d, player.x + 8 - i * 3, blade.y - d - 24);
        }
      }
    }
  }

  /**
   * The character rigs and every stance aura, for whichever sides are playing Metal. Built
   * lazily so a scene restart (which destroys them all) simply rebuilds on the next frame, and
   * torn down the moment a side stops being Metal.
   */
  private updateAvatars(time: number, delta: number): void {
    const { player, npc } = this.arena;
    const isPlayerMetal = this.arena.elementId === 'metal';
    const isNpcMetal = this.arena.npcElementId === 'metal';

    if (isPlayerMetal && player.active) {
      if (!this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
      const aim = Math.atan2(this.lastAimY - player.y, this.lastAimX - player.x);
      const transfusing = time < this.transfusionActiveUntil.player;
      this.playerAvatar.setFacing(aim);
      this.playerAvatar.setIntensity(this.clotArmorActive.player ? 1.3 : this.bloodBlade ? 1.2 : 1);
      // A skin can replace the rig entirely, so the perk finish only applies to metal's own.
      if (this.playerAvatar instanceof MetalAvatar) {
        this.playerAvatar.setFinish(this.metalFinish('player'));
      }
      this.playerAvatar.setMastered(this.arena.masteryActive);
      // Single owner of setHold: a wind-up braces, a transfusion cups both hands low.
      this.playerAvatar.setHold(this.charging ? 'brace' : transfusing ? 'sow' : null, aim);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);

      this.syncAura('player', 'bleed', this.playerAggressiveBleeding, delta, 1, aim, 26);
      this.syncAura('player', 'clot', this.clotArmorActive.player, delta,
        player.shieldHp / Math.max(1, this.clotArmorMaxHp.player), aim, 30);
      this.syncAura('player', 'charge', this.charging, delta, this.chargeRatio, aim, 26);
      this.syncAura('player', 'transfuse', transfusing, delta, 1, aim, 26);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
      for (const style of ['bleed', 'clot', 'charge', 'transfuse'] as const) {
        this.auras[`player:${style}`]?.destroy();
        delete this.auras[`player:${style}`];
      }
    }

    if (isNpcMetal && npc.active) {
      if (!this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
      const aim = Math.atan2(player.y - npc.y, player.x - npc.x);
      this.npcAvatar.setFacing(aim);
      this.npcAvatar.setIntensity(this.clotArmorActive.npc ? 1.3 : 1);
      if (this.npcAvatar instanceof MetalAvatar) {
        this.npcAvatar.setFinish(this.metalFinish('npc'));
      }
      this.npcAvatar.setMastered(this.arena.npcMasteryActive);
      this.npcAvatar.setHold(time < this.transfusionActiveUntil.npc ? 'sow' : null, aim);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);

      this.syncAura('npc', 'bleed', this.npcAggressiveBleeding, delta, 1, aim, 26);
      this.syncAura('npc', 'clot', this.clotArmorActive.npc, delta,
        npc.shieldHp / Math.max(1, this.clotArmorMaxHp.npc), aim, 30);
      this.syncAura('npc', 'transfuse', time < this.transfusionActiveUntil.npc, delta, 1, aim, 26);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
      for (const style of ['bleed', 'clot', 'charge', 'transfuse'] as const) {
        this.auras[`npc:${style}`]?.destroy();
        delete this.auras[`npc:${style}`];
      }
    }
  }

  // ── Public do* methods — called from ArenaScene context builders ──────

  // ── Conduit / Gold (divine perks) ─────────────────────────────────────

  /** Conduit: this side's steel is running live. */
  private conduit(owner: 'player' | 'npc'): boolean {
    return this.arena.hasPerk(owner, 'conduit');
  }

  /** Gold: this side carries a golden dagger instead of the sabre. */
  private gold(owner: 'player' | 'npc'): boolean {
    return this.arena.hasPerk(owner, 'gold');
  }

  /** What that side's rig should be wearing. Only one perk is ever equipped, so this is exclusive. */
  private metalFinish(owner: 'player' | 'npc'): 'none' | 'gold' | 'live' {
    if (this.gold(owner)) return 'gold';
    if (this.conduit(owner)) return 'live';
    return 'none';
  }

  /**
   * Conduit earths a shot that struck the plate straight back down the line it came from.
   * `owner` is the shield's owner, so the charge always goes the other way.
   */
  private earthShotBack(owner: 'player' | 'npc', x: number, y: number): void {
    if (!this.conduit(owner)) return;
    const victim = owner === 'player' ? this.arena.npc : this.arena.player;
    if (!victim?.active || victim.hp <= 0) return;
    const fx = this.fx(owner);
    victim.takeDamage(CONDUIT_EARTH_DAMAGE);
    this.arena.spawnHitFlash(victim.x, victim.y, this.col(owner)(METAL.live));
    // The charge visibly runs back up the line the shot came in on.
    fx.sparks(x, y, 5, Math.atan2(victim.y - y, victim.x - x), 9, METAL.liveHi);
    fx.ring(x, y, 4, 22, METAL.live, 220, 3, 7);
  }

  /**
   * Gold's click: a stab rather than a sweep. Short reach, one target, more damage — and it is
   * the same call the Click+ barrage fires repeatedly.
   */
  private goldStab(tx: number, ty: number, owner: 'player' | 'npc', damage: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    if (!caster?.active) return;
    const targets = owner === 'player' ? this.arena.enemies : [this.arena.player];
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const fx = this.fx(owner);
    const col = this.col(owner);

    // A thrust, not an arc: a thin lance of gold punched out along the aim.
    const tipX = caster.x + Math.cos(ang) * GOLD_STAB_RANGE;
    const tipY = caster.y + Math.sin(ang) * GOLD_STAB_RANGE;
    fx.slash(caster.x, caster.y, ang, GOLD_STAB_RANGE, {
      color: METAL.gold, arc: Phaser.Math.DegToRad(24), duration: 160,
    });
    fx.sparks(tipX, tipY, 3, ang, 8, METAL.goldHi);
    this.avatar(owner)?.play('punch', ang);

    for (const target of targets) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y) > GOLD_STAB_RANGE + 20) continue;
      const toAng = Math.atan2(target.y - caster.y, target.x - caster.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toAng - ang)) > Math.PI / 3) continue;
      const dmg = this.conduit(owner) ? Math.round(damage * CONDUIT_DAMAGE_MULT) : damage;
      const hx = target.x, hy = target.y;
      target.takeDamage(dmg);
      this.arena.spawnHitFlash(target.x, target.y, col(METAL.gold));
      this.arena.showFloatingText(caster.x, caster.y - 36, `🗡️ ${dmg}`, '#ffdd44');
      fx.spray(hx, hy, 4, { speed: 180, angle: ang, spread: 0.5, size: 3 });
      fx.splat(hx, hy, 10 + dmg * 0.2, 2);
      break;   // a thrust goes into one body, not through a crowd
    }
  }

  /** Click+ under Gold: a flurry of stabs on release, staggered so each one reads. */
  private goldBarrage(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    for (let i = 0; i < GOLD_BARRAGE_STABS; i++) {
      scene.time.delayedCall(i * GOLD_BARRAGE_GAP_MS, () => {
        // Re-aim each stab at the cursor's original line; the caster may have moved, and the
        // stab is relative to wherever they are now, which is what a flurry should do.
        this.goldStab(tx, ty, owner, GOLD_BARRAGE_DAMAGE);
      });
    }
    this.arena.showFloatingText(
      (owner === 'player' ? this.arena.player : this.arena.npc).x,
      (owner === 'player' ? this.arena.player : this.arena.npc).y - 52,
      '🗡️ BARRAGE', '#ffdd44');
  }

  doMetalSlash(tx: number, ty: number, owner: 'player' | 'npc', dmgOverride?: number): void {
    const { player, npc, enemies, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const targets = owner === 'player' ? enemies : [player];

    // Gold replaces the sword outright: every sweep becomes a thrust.
    if (this.gold(owner)) {
      this.goldStab(tx, ty, owner, dmgOverride ?? GOLD_STAB_DAMAGE);
      return;
    }

    const dx = tx - caster.x, dy = ty - caster.y;
    const ang = Math.atan2(dy, dx);
    const fx = this.fx(owner);

    // The blade sweeps the aim, with a crescent of torn air chasing the tip. A heavier swing
    // (Mighty Sabre at full charge) reaches further and hangs on screen longer.
    const heavy = (dmgOverride ?? 25) > 40;
    const live = this.conduit(owner);
    fx.slash(caster.x, caster.y, ang, heavy ? 104 : 90, {
      color: live ? METAL.live : heavy ? METAL.goldHi : METAL.chrome,
      arc: heavy ? Phaser.Math.DegToRad(130) : undefined,
      duration: heavy ? 320 : 260,
    });
    // Conduit: the charge crawling off the edge of the blade as it comes round.
    if (live) fx.sparks(caster.x + Math.cos(ang) * 60, caster.y + Math.sin(ang) * 60, 5, ang, 9, METAL.liveHi);
    this.avatar(owner)?.play('sweep', ang);

    for (const target of targets) {
      if (!target.active || target.hp <= 0) continue;
      const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
      if (dist <= 90) {
        const dmg = live
          ? Math.round((dmgOverride ?? 25) * CONDUIT_DAMAGE_MULT)
          : dmgOverride ?? 25;
        const hx = target.x, hy = target.y;
        target.takeDamage(dmg);
        this.arena.spawnHitFlash(target.x, target.y, this.col(owner)(METAL.steel));
        this.arena.showFloatingText(caster.x, caster.y - 36, `🗡️ ${dmg}`, '#aabbcc');
        // Opened up: blood thrown along the swing, sparks where steel bit, a splat under them.
        fx.spray(hx, hy, 5 + Math.round(dmg / 8), { speed: 200 + dmg * 2, angle: ang, spread: 0.9, size: 3.6 });
        fx.sparks(hx, hy, 4, ang, 10);
        fx.splat(hx, hy, 12 + dmg * 0.2, 2);
        if (!target.knockbackImmune) {
          const kbDx = target.x - caster.x, kbDy = target.y - caster.y;
          const kbLen = Math.sqrt(kbDx * kbDx + kbDy * kbDy) || 1;
          (target.body as Phaser.Physics.Arcade.Body).setVelocity((kbDx / kbLen) * 350, (kbDy / kbLen) * 350);
          (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time.delayedCall(200, () => {
            if (target.active) (target.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          });
        }
      }
    }
  }

  doMetalChainTether(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { player, npc } = this.arena;
    const caster = owner === 'player' ? player : npc;

    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ang = Math.atan2(dy, dx);

    this.metalChainProjectiles.push({
      x: caster.x, y: caster.y,
      vx: (dx / len) * 520, vy: (dy / len) * 520,
      owner, active: true,
    });
    // The throw itself: an overhand hurl and a shower of sparks off the chain paying out.
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).sparks(caster.x + Math.cos(ang) * 22, caster.y + Math.sin(ang) * 22, 6, ang, 9, METAL.chrome);
    this.arena.showFloatingText(caster.x, caster.y - 30, '⛓️ CHAIN!', '#aabbcc');
  }

  /** E — Flail Craft: creates an idle flail head trailing the caster. */
  doMetalFlailCraft(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const sceneTime = (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time;

    this.destroyFlail(owner); // safety: replace any stale flail

    // E+: Heavy Metal Rock — black spiked mace on a shorter chain.
    const heavy = owner === 'player' && this.arena.hasUpgrade('e');
    const headSize = heavy ? 14 : 9;
    const idleRadius = FLAIL_IDLE_RADIUS * (heavy ? HEAVY_RADIUS_MULT : 1);
    const startAngle = Math.PI / 2; // trails south of the caster

    const flail: MetalFlail = {
      x: caster.x + Math.cos(startAngle) * idleRadius,
      y: caster.y + Math.sin(startAngle) * idleRadius,
      angle: startAngle, angularVel: 0, initialAngularVel: 0,
      radius: idleRadius, swinging: false,
      createdAt: sceneTime.now, swingStartAt: 0, lastHitAt: 0, owner,
      heavy, headRadius: headSize, heat: 0, firePuddleAccum: 0,
    };
    if (owner === 'player') this.playerFlail = flail; else this.npcFlail = flail;

    // Forged on the spot: sparks off the anvil and a shower of offcut shards.
    const fx = this.fx(owner);
    this.avatar(owner)?.play('slam', startAngle);
    fx.flash(flail.x, flail.y, heavy ? 26 : 18, 9, heavy ? METAL.ember : METAL.chrome);
    fx.sparks(flail.x, flail.y, heavy ? 14 : 9, -Math.PI / 2, 10, heavy ? METAL.flame : METAL.goldHi);
    fx.shards(flail.x, flail.y, heavy ? 8 : 5, {
      speed: 180, size: heavy ? 16 : 12, color: heavy ? METAL.char : METAL.steel, depth: 9,
    });
    this.arena.showFloatingText(caster.x, caster.y - 44, heavy ? '🤘 HEAVY METAL!' : '⛓️ FLAIL CRAFTED', heavy ? '#ff6600' : '#aabbcc');
  }

  /** Click while an idle flail exists — sets it swinging. */
  triggerFlailSwing(owner: 'player' | 'npc'): void {
    const flail = owner === 'player' ? this.playerFlail : this.npcFlail;
    if (!flail) return;
    const { scene } = this.arena;
    const sceneTime = (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;

    // E+ Heavy Metal Rock accelerates 50% slower per whip.
    const hitAccel = FLAIL_HIT_ACCEL * (flail.heavy ? 0.5 : 1);
    if (flail.swinging) {
      // Already whipping — a fresh hit accelerates it further (keeps its spin
      // direction) and refreshes the decay so the new speed sticks.
      const dir = Math.sign(flail.initialAngularVel) || 1;
      const boosted = Math.min(Math.abs(flail.initialAngularVel) + hitAccel, FLAIL_MAX_ANGULAR_VEL);
      flail.initialAngularVel = dir * boosted;
      flail.angularVel = flail.initialAngularVel;
      flail.swingStartAt = sceneTime.now;
      this.fx(owner).sparks(flail.x, flail.y, 8, flail.angle + Math.PI / 2 * dir, 10, METAL.goldHi);
      this.avatar(owner)?.play('sweep', flail.angle);
      this.arena.showFloatingText(caster.x, caster.y - 44, '⚡ FASTER!', '#ffcc44');
      return;
    }

    this.fx(owner).ring(flail.x, flail.y, 8, 40, METAL.chrome, 300, 7, 3);
    this.avatar(owner)?.play('sweep', flail.angle);
    flail.swinging = true;
    flail.swingStartAt = sceneTime.now;
    flail.radius = FLAIL_SWING_RADIUS * (flail.heavy ? HEAVY_RADIUS_MULT : 1);
    flail.initialAngularVel = FLAIL_BASE_ANGULAR_VEL * (Math.random() < 0.5 ? 1 : -1);
    flail.angularVel = flail.initialAngularVel;

    this.arena.showFloatingText(caster.x, caster.y - 44, '💫 FLAIL SWING!', '#ff4466');
  }

  /** R (hold) — Blood Transfusion tick: converts stored blood into HP at a fixed rate. */
  doMetalBloodTransfusionTick(owner: 'player' | 'npc'): void {
    // Actual drain/heal now happens smoothly per-frame in updateTransfusion.
    // This tick (driven by the NPC AI casting the ability on its cooldown)
    // just keeps the channel active until the next tick lands.
    if (this.blood[owner] <= 0) return;
    const now = (this.arena.scene as Phaser.Scene & { time: Phaser.Time.Clock }).time.now;
    this.transfusionActiveUntil[owner] = now + 260;
  }

  private updateTransfusion(time: number, delta: number): void {
    const dt = delta / 1000;
    const bloodPerSec = 2 * TRANSFUSION_PER_TICK / (TRANSFUSION_TICK_MS / 1000); // 30 blood/s
    for (const owner of ['player', 'npc'] as const) {
      if (time >= this.transfusionActiveUntil[owner] || this.blood[owner] <= 0) continue;
      const caster = owner === 'player' ? this.arena.player : this.arena.npc;

      // Smoothly drain blood and heal fractional HP this frame.
      const drain = Math.min(bloodPerSec * dt, this.blood[owner]);
      this.blood[owner] -= drain;
      caster.heal(drain);
      if (owner === 'player') this.arena.recordMasteryStat('transfusionHealed', drain);

      // Conduit: running live burns the body out. Transfusion eats away max HP as it heals —
      // but only the *empty* part of the bar, so it can never undo the healing it just did or
      // kill you outright. A conduit at full HP pays nothing; a wounded one pays as it fills.
      if (this.conduit(owner)) {
        const empty = Math.max(0, caster.maxHp - caster.hp - caster.clottedHp);
        const shave = Math.min(empty, CONDUIT_MAXHP_DRAIN_PER_SEC * dt);
        if (shave > 0) {
          caster.reduceMaxHp(shave);
          this.transfusionBurnAccum[owner] += shave;
          if (this.transfusionBurnAccum[owner] >= 5) {
            const lost = Math.round(this.transfusionBurnAccum[owner]);
            this.transfusionBurnAccum[owner] -= lost;
            this.arena.showFloatingText(caster.x, caster.y - 52, `⚡ −${lost} MAX HP`, '#66ccff');
          }
        }
      }

      // Blood dripping particles beneath the character (~every 90ms). The
      // green heal numbers themselves are handled generically by ArenaScene.
      this.transfusionDripAccum[owner] += delta;
      if (this.transfusionDripAccum[owner] >= 90) {
        this.transfusionDripAccum[owner] -= 90;
        this.fx(owner).drip(caster.x, caster.y);
      }
    }
  }

  /** Q — Clot Armor: consumes the entire blood bar into shieldHp; bursts shards every 25 shieldHp lost. */
  doMetalClotArmor(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const bloodAmount = this.blood[owner];
    if (bloodAmount <= 0) {
      this.arena.showFloatingText(caster.x, caster.y - 44, 'NO BLOOD', '#886666');
      return;
    }
    this.blood[owner] = 0;

    // Recast: fully replace — discard remaining shieldHp, don't add to it.
    caster.shieldHp = Math.round(bloodAmount * 1.25);
    this.clotArmorMaxHp[owner] = Math.max(1, caster.shieldHp);
    this.clotArmorLostAccum[owner] = 0;

    if (!this.clotArmorActive[owner]) {
      this.clotArmorActive[owner] = true;
      caster.setTint(this.col(owner)(METAL.rose));
      this.installClotArmorAbsorber(owner);
    }

    // Quad perk: Exsanguinate — Clot Armor also fires 8 shards instead of 5 per burst (handled in fireClotShardBurst)
    this.arena.showFloatingText(caster.x, caster.y - 44, `🛡️ CLOT ARMOR (${caster.shieldHp} HP)`, '#ff4466');

    // The blood bar slamming shut into plate: it scales with how much blood went into it.
    const fx = this.fx(owner);
    const size = 26 + bloodAmount * 0.3;
    this.avatar(owner)?.play('raise', -Math.PI / 2, 700);
    fx.flash(caster.x, caster.y, size * 0.6, 9, METAL.crimson);
    fx.ring(caster.x, caster.y, 10, size * 1.8, METAL.rose, 420, 7, 5);
    fx.spray(caster.x, caster.y, 8 + Math.round(bloodAmount / 8), {
      speed: 210, size: 4, life: 620, depth: 7,
    });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      fx.shards(caster.x + Math.cos(ang) * 16, caster.y + Math.sin(ang) * 16, 1, {
        speed: 130, angle: ang, spread: 0.2, size: 16, color: METAL.crimson, depth: 7, fall: 0,
      });
    }
  }

  applyMetalAggressiveBleeding(appliedBy: 'player' | 'npc', duration: number): void {
    const { player, npc, scene } = this.arena;
    const sceneTime = (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time;
    const victim = appliedBy === 'player' ? npc : player;

    if (appliedBy === 'player') {
      this.npcAggressiveBleeding = true;
      this.npcAggressiveBleedUntil = Math.max(this.npcAggressiveBleedUntil, sceneTime.now + duration);
    } else {
      this.playerAggressiveBleeding = true;
      this.playerAggressiveBleedUntil = Math.max(this.playerAggressiveBleedUntil, sceneTime.now + duration);
    }
    // The wound opening — a snap of spray on application. The continuous tell is the bleed aura,
    // so the status stays readable on the victim between ticks.
    this.fx(appliedBy).spray(victim.x, victim.y, 8, { speed: 170, size: 3.4, life: 620, depth: 6 });
    this.arena.showFloatingText(victim.x, victim.y - 36, '🩸 BLEEDING', '#cc0000');
  }

  spawnMetalBloodPuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const base = 30;
    // Quad perk Exsanguinate: blood puddles are 50% bigger.
    let mult = 1;
    if (owner === 'player' && this.arena.hasPerk('player', 'gunpowder')) mult *= 1.5;
    const r = Math.round(base * mult);
    this.metalBloodPuddles.push({
      x, y, radius: r, owner, drainAccum: 0, draining: false,
      blood: PUDDLE_BLOOD_CAPACITY, seed: Math.random() * 10,
    });
    // It lands rather than appearing: a short spray outward and a spatter ring.
    this.fx(owner).spray(x, y, 7, { speed: 130, size: 3, life: 500, depth: 3 });
  }

  /** Passive: called from ArenaScene's 'damaged' listeners whenever `owner` deals damage to their opponent. */
  onDamageDealt(owner: 'player' | 'npc', amount: number): void {
    if (amount <= 0) return;
    const { player, npc } = this.arena;
    const victim = owner === 'player' ? npc : player;

    if (owner === 'player') {
      this.playerDamageDealtAccum += amount;
      // Q+ Blood Blade: damage feeds blood straight into the bar instead of puddles.
      const bladeActive = !!this.bloodBlade;
      while (this.playerDamageDealtAccum >= 50) {
        this.playerDamageDealtAccum -= 50;
        if (bladeActive) this.addBlood('player', 25);
        else this.spawnMetalBloodPuddle(victim.x, victim.y, 'player');
      }
    } else {
      this.npcDamageDealtAccum += amount;
      while (this.npcDamageDealtAccum >= 50) {
        this.npcDamageDealtAccum -= 50;
        this.spawnMetalBloodPuddle(victim.x, victim.y, 'npc');
      }
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private destroyFlail(owner: 'player' | 'npc'): void {
    const flail = owner === 'player' ? this.playerFlail : this.npcFlail;
    if (!flail) return;
    // Pure data — it just stops being painted. The chain gives out with a last spray of sparks.
    this.fx(owner).sparks(flail.x, flail.y, 6, Math.random() * Math.PI * 2, 9, METAL.iron);
    if (owner === 'player') this.playerFlail = null; else this.npcFlail = null;
  }

  private installClotArmorAbsorber(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;

    caster.damageAbsorber = (amount: number) => {
      if (!this.clotArmorActive[owner] || caster.shieldHp <= 0) {
        this.deactivateClotArmor(owner);
        return false;
      }
      caster.shieldHp = Math.max(0, caster.shieldHp - amount);
      this.arena.spawnDamageNumber(caster.x, caster.y - 20, amount);
      // A plate cracking: shards knocked loose and blood forced out of the seams.
      this.fx(owner).shards(caster.x, caster.y, 2, {
        speed: 150, size: 11, color: METAL.clot, depth: 7,
      });
      // Conduit: the armour is live plate — anything that strikes it is earthed back at the
      // other side. Every hit counts here, not only shots: the absorber has no shooter to ask.
      this.earthShotBack(owner, caster.x, caster.y);
      this.clotArmorLostAccum[owner] += amount;
      while (this.clotArmorLostAccum[owner] >= CLOT_SHARD_THRESHOLD) {
        this.clotArmorLostAccum[owner] -= CLOT_SHARD_THRESHOLD;
        this.fireClotShardBurst(owner);
      }
      if (caster.shieldHp <= 0) {
        this.arena.showFloatingText(caster.x, caster.y - 36, '💔 ARMOR BROKEN', '#ff4466');
        // The whole shell coming apart at once.
        this.fx(owner).boom(caster.x, caster.y, 70, { color: METAL.crimson, shards: 12, mark: true });
        this.deactivateClotArmor(owner);
      }
      return true;
    };
  }

  private deactivateClotArmor(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.clotArmorActive[owner] = false;
    caster.damageAbsorber = null;
    caster.clearTint();
  }

  private fireClotShardBurst(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    // Quad perk: Exsanguinate — fires 8 shards per burst instead of 5
    const shardCount = this.arena.hasPerk(owner, 'gunpowder') ? 8 : CLOT_SHARD_COUNT;
    for (let i = 0; i < shardCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      this.metalShardProjectiles.push({
        x: caster.x, y: caster.y,
        vx: Math.cos(ang) * CLOT_SHARD_SPEED, vy: Math.sin(ang) * CLOT_SHARD_SPEED,
        owner, active: true, dmg: CLOT_SHARD_DAMAGE, spawnsPuddle: true, isMace: false, heavy: false,
      });
    }
    // The seams letting go: a ring pushed out with the shards riding it.
    this.fx(owner).ring(caster.x, caster.y, 12, 46, METAL.rose, 300, 7, 3);
    this.arena.showFloatingText(caster.x, caster.y - 30, '🩸 SHARD BURST', '#ff3355');
  }

  // ── Per-frame update helpers ──────────────────────────────────────────────

  private updateAggressiveBleeds(time: number, delta: number): void {
    const { player, npc } = this.arena;

    if (this.npcAggressiveBleeding) {
      if (time > this.npcAggressiveBleedUntil) {
        this.npcAggressiveBleeding = false;
      } else {
        this.npcAggressiveBleedTickAccum += delta;
        if (this.npcAggressiveBleedTickAccum >= 1000) {
          this.npcAggressiveBleedTickAccum -= 1000;
          npc.takeDamage(2);
        }
        this.npcAggressiveBleedPuddleAccum += delta;
        if (this.npcAggressiveBleedPuddleAccum >= 3000) {
          this.npcAggressiveBleedPuddleAccum -= 3000;
          this.spawnMetalBloodPuddle(npc.x, npc.y, 'player');
        }
      }
    }

    if (this.playerAggressiveBleeding) {
      if (time > this.playerAggressiveBleedUntil) {
        this.playerAggressiveBleeding = false;
      } else {
        this.playerAggressiveBleedTickAccum += delta;
        if (this.playerAggressiveBleedTickAccum >= 1000) {
          this.playerAggressiveBleedTickAccum -= 1000;
          player.takeDamage(2);
        }
        this.playerAggressiveBleedPuddleAccum += delta;
        if (this.playerAggressiveBleedPuddleAccum >= 3000) {
          this.playerAggressiveBleedPuddleAccum -= 3000;
          this.spawnMetalBloodPuddle(player.x, player.y, 'npc');
        }
      }
    }
  }

  private updateBloodPuddles(_time: number, delta: number): void {
    const { player, npc } = this.arena;

    for (let i = this.metalBloodPuddles.length - 1; i >= 0; i--) {
      const puddle = this.metalBloodPuddles[i];
      const owner = puddle.owner === 'player' ? player : npc;
      const d = Phaser.Math.Distance.Between(owner.x, owner.y, puddle.x, puddle.y);

      puddle.draining = d <= puddle.radius + 18;

      if (puddle.draining && puddle.blood > 0) {
        // Drain a steady 5 blood/sec into the blood bar.
        const drain = Math.min(BLOOD_DRAIN_PER_SEC * (delta / 1000), puddle.blood);
        puddle.blood -= drain;
        this.addBlood(puddle.owner, drain);
        // Periodic drip readout (~once per second) so the number isn't spam.
        puddle.drainAccum += delta;
        if (puddle.drainAccum >= 1000) {
          puddle.drainAccum -= 1000;
          this.arena.showFloatingText(owner.x, owner.y - 22, '+10 🩸', '#ff3355');
        }
        if (puddle.blood <= 0) this.metalBloodPuddles.splice(i, 1);
      }
    }
  }

  private addBlood(owner: 'player' | 'npc', amount: number): void {
    // Ruin's Combo Breaker halves every meter in the game — the blood bar included. Wrapped at
    // the top so the Blood Clottage overflow is taxed the same as the bar itself.
    amount = meterGain(owner === 'player' ? this.arena.player : this.arena.npc, amount);
    // R+ Blood Clottage: blood gained past a full bar converts normal HP into
    // clotted HP (no extra health — the same health simply takes 50% less damage).
    if (owner === 'player' && this.arena.hasUpgrade('r')) {
      const room = BLOOD_MAX - this.blood.player;
      const toBar = Math.min(room, amount);
      this.blood.player += toBar;
      const overflow = amount - toBar;
      if (overflow > 0) {
        const player = this.arena.player;
        const convert = Math.min(overflow, player.hp);
        player.hp -= convert;
        player.clottedHp = Math.min(player.maxHp, player.clottedHp + convert);
      }
      return;
    }
    this.blood[owner] = Math.min(BLOOD_MAX, this.blood[owner] + amount);
  }

  private updateChainTethers(time: number, _delta: number): void {
    const { player, npc } = this.arena;

    if (this.metalChainTethered) {
      if (time > this.metalChainTetherEnd) {
        this.metalChainTethered = false;
      } else {
        const td = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
        if (td > CHAIN_TETHER_LEASH) {
          const ang = Math.atan2(npc.y - player.y, npc.x - player.x);
          npc.setPosition(player.x + Math.cos(ang) * CHAIN_TETHER_LEASH, player.y + Math.sin(ang) * CHAIN_TETHER_LEASH);
        }
        // Drip 3 blood puddles spread evenly across the tether's duration.
        if (this.metalTetherPuddlesLeft > 0 && time >= this.metalTetherNextPuddleAt) {
          this.metalTetherPuddlesLeft--;
          this.metalTetherNextPuddleAt = time + CHAIN_TETHER_PUDDLE_INTERVAL;
          this.spawnMetalBloodPuddle(npc.x, npc.y, 'player');
        }
      }
    }

    if (this.npcMetalChainTethered) {
      if (time > this.npcMetalChainTetherEnd) {
        this.npcMetalChainTethered = false;
      } else {
        const td = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
        if (td > CHAIN_TETHER_LEASH) {
          const ang = Math.atan2(player.y - npc.y, player.x - npc.x);
          player.setPosition(npc.x + Math.cos(ang) * CHAIN_TETHER_LEASH, npc.y + Math.sin(ang) * CHAIN_TETHER_LEASH);
        }
        if (this.npcMetalTetherPuddlesLeft > 0 && time >= this.npcMetalTetherNextPuddleAt) {
          this.npcMetalTetherPuddlesLeft--;
          this.npcMetalTetherNextPuddleAt = time + CHAIN_TETHER_PUDDLE_INTERVAL;
          this.spawnMetalBloodPuddle(player.x, player.y, 'npc');
        }
      }
    }
  }

  private updateChainProjectiles(time: number, delta: number): void {
    const { player, enemies } = this.arena;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;

    for (let i = this.metalChainProjectiles.length - 1; i >= 0; i--) {
      const cp = this.metalChainProjectiles[i];
      if (!cp.active) { this.metalChainProjectiles.splice(i, 1); continue; }
      cp.x += cp.vx * (delta / 1000);
      cp.y += cp.vy * (delta / 1000);
      if (cp.x < 0 || cp.x > W || cp.y < 0 || cp.y > H) { cp.active = false; continue; }

      const hitTargets = cp.owner === 'player' ? enemies : [player];
      for (const hitTarget of hitTargets) {
        if (!hitTarget.active || hitTarget.hp <= 0) continue;
        const hitDist = Phaser.Math.Distance.Between(cp.x, cp.y, hitTarget.x, hitTarget.y);
        if (hitDist <= 28) {
          cp.active = false;
          this.arena.spawnHitFlash(hitTarget.x, hitTarget.y, this.col(cp.owner)(METAL.steel));
          this.arena.showFloatingText(hitTarget.x, hitTarget.y - 34, '⛓️ TETHERED!', '#aabbcc');
          // The hook biting: the chain snaps taut back to whoever threw it.
          const thrower = this.fighter(cp.owner);
          this.fx(cp.owner).chainSnap(thrower.x, thrower.y, hitTarget.x, hitTarget.y, 8);
          if (cp.owner === 'player') {
            this.metalChainTethered = true;
            this.metalChainTetherEnd = time + CHAIN_TETHER_MS;
            this.metalTetherNextPuddleAt = time + CHAIN_TETHER_PUDDLE_INTERVAL;
            this.metalTetherPuddlesLeft = CHAIN_TETHER_PUDDLE_COUNT;
            this.applyMetalAggressiveBleeding('player', 3000);
          } else {
            this.npcMetalChainTethered = true;
            this.npcMetalChainTetherEnd = time + CHAIN_TETHER_MS;
            this.npcMetalTetherNextPuddleAt = time + CHAIN_TETHER_PUDDLE_INTERVAL;
            this.npcMetalTetherPuddlesLeft = CHAIN_TETHER_PUDDLE_COUNT;
            this.applyMetalAggressiveBleeding('npc', 3000);
          }
          break;
        }
      }
    }
  }

  private updateFlails(time: number, delta: number): void {
    const dt = delta / 1000;
    for (const owner of ['player', 'npc'] as const) {
      const flail = owner === 'player' ? this.playerFlail : this.npcFlail;
      if (!flail) continue;
      const caster = owner === 'player' ? this.arena.player : this.arena.npc;

      // E+ Heavy Metal Rock loses its spin twice as fast.
      const decayMs = FLAIL_SWING_DECAY_MS / (flail.heavy ? 2 : 1);

      // Hard lifetime cap — the mace lives 10s from creation, swinging or not.
      if (time - flail.createdAt > FLAIL_LIFETIME_MS) { this.destroyFlail(owner); continue; }

      if (flail.swinging) {
        const elapsed = time - flail.swingStartAt;
        const decayRatio = Math.max(0, 1 - elapsed / decayMs);
        if (decayRatio <= 0) {
          // Spin ran out — settle back into an idle mace hanging on the chain.
          // It stays until the 10s lifetime cap above, rather than vanishing the
          // moment it stops moving.
          flail.swinging = false;
          flail.angularVel = 0;
          flail.initialAngularVel = 0;
          flail.heat = 0;
          flail.radius = FLAIL_IDLE_RADIUS * (flail.heavy ? HEAVY_RADIUS_MULT : 1);
        } else {
          flail.angularVel = flail.initialAngularVel * decayRatio;
          flail.angle += flail.angularVel * dt;
        }
      }

      flail.x = caster.x + Math.cos(flail.angle) * flail.radius;
      flail.y = caster.y + Math.sin(flail.angle) * flail.radius;

      if (flail.swinging) {
        const elapsed = time - flail.swingStartAt;
        const speedRatio = Math.max(0, 1 - elapsed / decayMs);
        let dmg = Math.round((10 + speedRatio * 30) / 3) * (flail.heavy ? 2 : 1);
        // Conduit: the mace is live too, so the whole weapon set hits harder.
        if (this.conduit(owner)) dmg = Math.round(dmg * CONDUIT_DAMAGE_MULT);
        // The head glows with how fast it's going — molten for the heavy mace, blood-hot for
        // the plain one. `heat` is what the painter reads, so the colour follows the sim.
        if (flail.heavy) {
          const molten = speedRatio > HEAVY_MOLTEN_RATIO;
          flail.heat = molten ? Phaser.Math.Clamp((speedRatio - HEAVY_MOLTEN_RATIO) / (1 - HEAVY_MOLTEN_RATIO), 0, 1) : 0;
          if (molten) {
            flail.firePuddleAccum += delta;
            if (flail.firePuddleAccum >= 150) {
              flail.firePuddleAccum -= 150;
              this.spawnMetalFirePuddle(flail.x, flail.y, owner);
            }
          }
        } else {
          flail.heat = speedRatio * 0.8;
        }

        if (time - flail.lastHitAt >= FLAIL_HIT_COOLDOWN_MS) {
          const targets = owner === 'player' ? this.arena.enemies : [this.arena.player];
          for (const t of targets) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(flail.x, flail.y, t.x, t.y) <= FLAIL_CONTACT_RADIUS) {
              const hx = t.x, hy = t.y;
              t.takeDamage(dmg);
              this.arena.spawnHitFlash(t.x, t.y, this.col(owner)(METAL.rose));
              this.arena.showFloatingText(t.x, t.y - 30, `⛓️ ${dmg}`, '#ff6688');
              // A mace connecting: it hits harder the faster it was going.
              const fx = this.fx(owner);
              const swingAng = flail.angle + (flail.initialAngularVel > 0 ? Math.PI / 2 : -Math.PI / 2);
              fx.sparks(hx, hy, 4 + Math.round(speedRatio * 8), swingAng, 10,
                flail.heavy ? METAL.flame : METAL.goldHi);
              fx.spray(hx, hy, 4 + Math.round(speedRatio * 6), {
                speed: 160 + speedRatio * 220, angle: swingAng, spread: 1, size: 3.4,
              });
              fx.ring(hx, hy, 6, 24 + speedRatio * 26, flail.heavy ? METAL.ember : METAL.rose, 260, 8, 3);
              if (owner === 'player') this.arena.recordMasteryStat('flailHits', 1);
              flail.lastHitAt = time;
              break;
            }
          }
        }
      } else {
        flail.heat = 0;
      }
    }
  }

  private updateShardProjectiles(_time: number, delta: number): void {
    const { player, enemies } = this.arena;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;

    for (let i = this.metalShardProjectiles.length - 1; i >= 0; i--) {
      const p = this.metalShardProjectiles[i];
      if (!p.active) { this.metalShardProjectiles.splice(i, 1); continue; }
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) { p.active = false; continue; }

      const targets = p.owner === 'player' ? enemies : [player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= 24) {
          p.active = false;
          const hx = t.x, hy = t.y;
          const ang = Math.atan2(p.vy, p.vx);
          t.takeDamage(p.dmg);
          this.arena.spawnHitFlash(t.x, t.y, this.col(p.owner)(METAL.crimson));
          // A flung mace lands like an ordnance strike; a shard just buries itself.
          const fx = this.fx(p.owner);
          if (p.isMace) {
            fx.boom(hx, hy, p.heavy ? 84 : 62, { color: METAL.crimson, shards: p.heavy ? 12 : 8 });
            this.arena.scene.cameras.main.shake(p.heavy ? 180 : 120, p.heavy ? 0.006 : 0.004);
          } else {
            fx.spray(hx, hy, 5, { speed: 180, angle: ang, spread: 0.9, size: 3.2 });
            fx.sparks(hx, hy, 3, ang + Math.PI, 10);
          }
          if (p.spawnsPuddle) this.spawnMetalBloodPuddle(t.x, t.y, p.owner);
          break;
        }
      }
    }
  }

  // Clot Armor's plating is drawn entirely by its aura, which already tracks the caster and
  // shows how much shield is left — nothing per-frame is left for the sim to move about.

  // ── Click+ Mighty Sabre ────────────────────────────────────────────────

  private startChargeVfx(startTime: number, durationMs: number): void {
    this.clearChargeVfx();
    this.charging = true;
    this.chargeStart = startTime;
    this.chargeDuration = durationMs;
    this.chargeRatio = 0;
  }

  private updateChargeVfx(time: number): void {
    const { player } = this.arena;
    if (!this.charging) return;
    const ratio = Phaser.Math.Clamp((time - this.chargeStart) / this.chargeDuration, 0, 1);
    player.chargeRatio = ratio;
    this.chargeRatio = ratio;
    if (ratio >= 1 && !this.chargeFullTinted && !this.clotArmorActive.player) {
      this.chargeFullTinted = true;
      player.setTint(this.pcol(METAL.gold));
      // Topped out: one hard ring so a full charge is unmissable even mid-fight.
      this.pfx.ring(player.x, player.y, 16, 52, METAL.goldHi, 300, 7, 4);
      this.pfx.sparks(player.x, player.y, 10, this.playerAimAngle, 9, METAL.goldHi);
    }
  }

  private clearChargeVfx(): void {
    this.charging = false;
    this.chargeRatio = 0;
    this.arena.player.chargeRatio = 0;
    if (this.chargeFullTinted) {
      this.chargeFullTinted = false;
      if (!this.clotArmorActive.player) this.arena.player.clearTint();
    }
  }

  /** Max-charge release: fling the flail at the cursor and parry enemy shots. */
  private doMaxCharge(mouseX: number, mouseY: number, ctx: CastContext): void {
    const { player } = this.arena;
    this.arena.showFloatingText(player.x, player.y - 52, '⚔️ MAX CHARGE!', '#ffee00');
    if (this.playerFlail) {
      const dx = mouseX - player.x, dy = mouseY - player.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const heavy = this.playerFlail.heavy;
      const ang = Math.atan2(dy, dx);
      this.metalShardProjectiles.push({
        x: player.x, y: player.y,
        vx: (dx / len) * 700, vy: (dy / len) * 700,
        owner: 'player', active: true, dmg: heavy ? 60 : 40, spawnsPuddle: false,
        isMace: true, heavy,
      });
      // The chain letting go: sparks off the swivel and a hard forward ring.
      this.pfx.sparks(player.x, player.y, 12, ang, 10, METAL.goldHi);
      this.pfx.ring(player.x, player.y, 12, 56, METAL.goldHi, 320, 7, 4);
      this.avatar('player')?.play('slam', ang);
      this.destroyFlail('player');
    }
    this.parryProjectiles(ctx);
  }

  private parryProjectiles(ctx: CastContext): void {
    const group = ctx.projectiles;
    if (!group) return;
    const { player, npc } = this.arena;
    let reflected = 0;
    // Snapshot: p.destroy() mutates the group's child list mid-iteration.
    [...group.getChildren()].forEach((obj) => {
      const p = obj as Projectile;
      if (!p.active || p.isFromPlayer) return;
      if (Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y) > SABRE_PARRY_RADIUS) return;
      if (npc.active && npc.hp > 0) {
        // Batted back: sparks where the blade met it, then a chain of steel snapping across.
        this.pfx.sparks(p.x, p.y, 6, Math.atan2(npc.y - p.y, npc.x - p.x), 10, METAL.goldHi);
        this.pfx.slash(p.x, p.y, Math.atan2(npc.y - p.y, npc.x - p.x), 40, {
          color: METAL.goldHi, duration: 200, arc: Phaser.Math.DegToRad(70), bleed: false,
        });
        npc.takeDamage(Math.round(p.damage * 1.5));
        this.arena.spawnHitFlash(npc.x, npc.y, this.pcol(METAL.gold));
      }
      p.destroy();
      reflected++;
    });
    if (reflected > 0) {
      this.arena.showFloatingText(player.x, player.y - 34, '✨ PARRY!', '#ffee44');
      this.arena.recordMasteryStat('parries', reflected);
    }
  }

  // ── E+ Heavy Metal Rock fire puddles ───────────────────────────────────

  private spawnMetalFirePuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const now = this.arena.scene.time.now;
    this.metalFirePuddles.push({ x, y, radius: 18, owner, expiresAt: now + 3000, spawnedAt: now, tickAccum: 0 });
  }

  private updateMetalFirePuddles(time: number, delta: number): void {
    for (let i = this.metalFirePuddles.length - 1; i >= 0; i--) {
      const fp = this.metalFirePuddles[i];
      if (time >= fp.expiresAt) { this.metalFirePuddles.splice(i, 1); continue; }
      fp.tickAccum += delta;
      if (fp.tickAccum < 500) continue;
      fp.tickAccum -= 500;
      const targets = fp.owner === 'player' ? this.arena.enemies : [this.arena.player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(fp.x, fp.y, t.x, t.y) <= fp.radius + 16) {
          t.takeDamage(4);
          this.arena.spawnHitFlash(t.x, t.y, this.col(fp.owner)(METAL.ember));
        }
      }
    }
  }

  // ── F+ Ground Anchor ───────────────────────────────────────────────────

  private spawnGroundTether(x: number, y: number, owner: 'player' | 'npc'): void {
    this.destroyGroundTether();
    const scene = this.arena.scene;
    this.metalGroundTether = { x, y, owner, endTime: scene.time.now + GROUND_TETHER_MS, blastAccum: 0 };
    // Driven in: the impact of a spike hitting the floor hard enough to shake it.
    const fx = this.fx(owner);
    fx.flash(x, y, 26, 9, METAL.chrome);
    fx.ring(x, y, 10, 70, METAL.chrome, 380, 7, 4);
    fx.shards(x, y, 8, { speed: 210, size: 14, color: METAL.iron, depth: 8 });
    fx.sparks(x, y, 10, -Math.PI / 2, 10);
    scene.cameras.main.shake(130, 0.004);
    this.avatar(owner)?.play('slam', Math.PI / 2);
    this.arena.showFloatingText(x, y - 24, '⛓️ GROUND ANCHOR', '#ccddee');
  }

  private updateGroundTether(time: number, delta: number): void {
    const gt = this.metalGroundTether;
    if (!gt) return;
    if (time >= gt.endTime) { this.destroyGroundTether(); return; }
    gt.blastAccum += delta;
    if (gt.blastAccum >= GROUND_TETHER_BLAST_MS) {
      gt.blastAccum -= GROUND_TETHER_BLAST_MS;
      this.groundTetherBlast(gt);
    }
  }

  private groundTetherBlast(gt: MetalGroundTether): void {
    const fx = this.fx(gt.owner);
    fx.ring(gt.x, gt.y, 20, GROUND_TETHER_BLAST_RADIUS, METAL.chrome, 500, 6, 3);
    // Pull blood from every puddle in range at once — up to 15 from each.
    let drained = 0;
    for (let i = this.metalBloodPuddles.length - 1; i >= 0; i--) {
      const puddle = this.metalBloodPuddles[i];
      if (puddle.owner !== gt.owner) continue;
      if (Phaser.Math.Distance.Between(gt.x, gt.y, puddle.x, puddle.y) > GROUND_TETHER_BLAST_RADIUS) continue;
      const take = Math.min(GROUND_TETHER_BLAST_DRAIN, puddle.blood);
      puddle.blood -= take; drained += take;
      // Each puddle visibly gives up its blood along the line to the stake.
      fx.spray(puddle.x, puddle.y, 4, {
        speed: 200, angle: Math.atan2(gt.y - puddle.y, gt.x - puddle.x), spread: 0.4, size: 3, depth: 6,
      });
      if (puddle.blood <= 0) this.metalBloodPuddles.splice(i, 1);
    }
    if (drained > 0) {
      this.addBlood(gt.owner, drained);
      this.arena.showFloatingText(gt.x, gt.y - 20, `+${Math.round(drained)} 🩸`, '#ff3355');
    }
  }

  private destroyGroundTether(): void {
    this.metalGroundTether = null;
  }

  // ── Q+ Blood Blade ─────────────────────────────────────────────────────

  private summonBloodBlade(owner: 'player' | 'npc'): void {
    if (this.bloodBlade) return;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    if (this.arena.player.getCooldownRatio('metal-clot-armor') < 1) return;
    if (this.blood[owner] < BLOOD_BLADE_COST) {
      this.arena.showFloatingText(caster.x, caster.y - 44, `NEED ${BLOOD_BLADE_COST} BLOOD`, '#886666');
      return;
    }
    this.blood[owner] = 0;
    this.arena.player.startCooldown('metal-clot-armor');
    // Summoning takes over the weapon slot — drop any in-progress charge.
    this.sabreCharging = false;
    this.clearChargeVfx();

    const scene = this.arena.scene;
    this.bloodBlade = { owner, y: caster.y - scene.scale.height, descending: true, lastSwingAt: 0, prevBlood: 0 };
    this.arena.player.incomingDamageMultiplier = 1.5;
    this.avatar(owner)?.play('raise', -Math.PI / 2, 900);
    this.arena.showFloatingText(caster.x, caster.y - 52, '🗡️ BLOOD BLADE', '#cc0022');
  }

  private updateBloodBlade(_time: number, delta: number): void {
    const blade = this.bloodBlade;
    if (!blade) return;
    const owner = blade.owner;
    const caster = this.arena.player; // Blood Blade is player-only

    // Crash straight down from the sky, then the blade "becomes" your sword:
    // the descent visual fades out and swings are drawn per-Click like the
    // normal slash (see bloodBladeSwing).
    if (blade.descending) {
      blade.y += (delta / 1000) * 1100;
      if (blade.y >= caster.y) {
        blade.descending = false;
        this.arena.spawnHitFlash(caster.x, caster.y, this.col(owner)(METAL.crimson));
        // It lands point-first hard enough to split the floor.
        this.pfx.flash(caster.x, caster.y, 34, 10, METAL.crimson);
        this.pfx.ring(caster.x, caster.y, 12, 90, METAL.rose, 460, 7, 5);
        this.pfx.spray(caster.x, caster.y, 16, { speed: 260, size: 4.4, life: 700, depth: 7 });
        this.pfx.splat(caster.x, caster.y, 34, 2);
        this.arena.scene.cameras.main.shake(220, 0.007);
      }
    }

    // Vanishes the instant blood drops from any source.
    if (this.blood[owner] < blade.prevBlood - 0.01) { this.dismissBloodBlade(); return; }
    blade.prevBlood = this.blood[owner];
  }

  /** Click-driven swing toward the cursor — the normal slash visual in blood colours. */
  private bloodBladeSwing(mouseX: number, mouseY: number, dmgOverride?: number): void {
    const caster = this.arena.player;
    const ang = Math.atan2(mouseY - caster.y, mouseX - caster.x);

    // The same sweep as the base slash, but serrated and dark-red, and it reaches further.
    this.pfx.slash(caster.x, caster.y, ang, BLOOD_BLADE_RANGE * 0.72, {
      color: METAL.crimson, serrated: true, arc: Phaser.Math.DegToRad(150), duration: 300,
    });
    this.avatar('player')?.play('sweep', ang);

    // Hit every enemy in a frontal arc within melee range. Damage feeds blood
    // (not puddles) via onDamageDealt while the blade is out.
    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, t.x, t.y) > BLOOD_BLADE_RANGE) continue;
      const toAng = Math.atan2(t.y - caster.y, t.x - caster.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toAng - ang)) > Math.PI / 2) continue;
      const dmg = dmgOverride ?? BLOOD_BLADE_SWING_DMG;
      const hx = t.x, hy = t.y;
      t.takeDamage(dmg);
      this.arena.spawnHitFlash(t.x, t.y, this.pcol(METAL.crimson));
      this.arena.showFloatingText(t.x, t.y - 30, `🗡️ ${dmg}`, '#ff3355');
      this.pfx.spray(hx, hy, 7 + Math.round(dmg / 8), { speed: 240, angle: ang, spread: 0.9, size: 4 });
      this.pfx.splat(hx, hy, 16 + dmg * 0.25, 2);
      if (t.hp <= 0) this.arena.recordMasteryStat('bloodBladeKills', 1);
    }
  }

  private dismissBloodBlade(): void {
    if (!this.bloodBlade) return;
    const owner = this.bloodBlade.owner;
    this.bloodBlade = null;
    // Drop any in-progress Click+ charge so it can't leak into the normal sabre.
    if (this.sabreCharging) { this.sabreCharging = false; this.clearChargeVfx(); }
    (owner === 'player' ? this.arena.player : this.arena.npc).incomingDamageMultiplier = 1;
  }

  // ── Mastery — Steel Shield ─────────────────────────────────────────────

  /** The slot Steel Shield is bound over this match, or null when it isn't bound anywhere. */
  private steelShieldSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'steel-shield') return s;
    }
    return null;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar for the bound slot. */
  getSteelShieldCooldownRatio(time: number): number {
    return Math.min(1, (time - this.steelShieldLastCastAt) / STEEL_SHIELD_COOLDOWN_MS);
  }

  private tryCastSteelShield(time: number, mouseX: number, mouseY: number): void {
    if (time - this.steelShieldLastCastAt < STEEL_SHIELD_COOLDOWN_MS) return;
    const { player } = this.arena;
    if (this.blood.player < STEEL_SHIELD_BLOOD_COST) {
      this.arena.showFloatingText(player.x, player.y - 44, 'NEED 25% BLOOD', '#886666');
      return;
    }
    this.blood.player -= STEEL_SHIELD_BLOOD_COST;
    this.steelShieldLastCastAt = time;
    // triggerCooldown fires onCastStamp, which broadcasts {t:'cast', id:'steel-shield'} online;
    // the peer routes the unknown id to ArenaScene.replayNpcMastery → doNpcSteelShield.
    player.triggerCooldown('steel-shield');
    this.spawnSteelShield('player', mouseX, mouseY);
  }

  /** Online replay: the remote metal player raised a Steel Shield — plant one owned by the npc. */
  doNpcSteelShield(_tx: number, _ty: number): void {
    // The npc shield always faces the local player, so the exact cast aim isn't needed.
    this.spawnSteelShield('npc', this.arena.player.x, this.arena.player.y);
  }

  private spawnSteelShield(owner: 'player' | 'npc', aimX: number, aimY: number): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.destroySteelShield(owner);
    const red = this.clotArmorActive[owner];
    const ang = Math.atan2(aimY - caster.y, aimX - caster.x);
    const bx = caster.x + Math.cos(ang) * STEEL_SHIELD_DIST;
    const by = caster.y + Math.sin(ang) * STEEL_SHIELD_DIST;
    this.steelShields[owner] = {
      endTime: this.arena.scene.time.now + STEEL_SHIELD_DURATION_MS, red, x: bx, y: by, angle: ang,
    };
    caster.steelShieldMult = STEEL_SHIELD_DMG_MULT;
    // Slammed into place: the plate lands with a ring and a shower off its rim.
    const fx = this.fx(owner);
    fx.flash(bx, by, 22, 9, red ? METAL.rose : METAL.chrome);
    fx.ring(bx, by, 8, 46, red ? METAL.rose : METAL.chrome, 320, 7, 3);
    fx.sparks(bx, by, 8, ang, 10, red ? METAL.rose : METAL.chrome);
    this.avatar(owner)?.play('clap', ang);
    this.arena.showFloatingText(caster.x, caster.y - 44, red ? '🛡️ RED STEEL SHIELD' : '🛡️ STEEL SHIELD', red ? '#ff5577' : '#aabbcc');
  }

  private destroySteelShield(owner: 'player' | 'npc'): void {
    const s = this.steelShields[owner];
    if (!s) return;
    this.steelShields[owner] = null;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    caster.steelShieldMult = 1;
  }

  private updateSteelShields(time: number): void {
    for (const owner of ['player', 'npc'] as const) {
      const s = this.steelShields[owner];
      if (!s) continue;
      const caster = owner === 'player' ? this.arena.player : this.arena.npc;
      if (time >= s.endTime || !caster.active || caster.hp <= 0) { this.destroySteelShield(owner); continue; }

      // Player barrier tracks the cursor; npc barrier faces the local player.
      const ang = owner === 'player'
        ? this.playerAimAngle
        : Math.atan2(this.arena.player.y - caster.y, this.arena.player.x - caster.x);
      const bx = caster.x + Math.cos(ang) * STEEL_SHIELD_DIST;
      const by = caster.y + Math.sin(ang) * STEEL_SHIELD_DIST;
      s.x = bx; s.y = by; s.angle = ang;

      // Block incoming projectiles: player shield eats enemy shots, npc shield eats player shots.
      const group = this.arena.projectiles;
      if (!group) continue;
      for (const obj of [...group.getChildren()]) {
        const p = obj as Projectile;
        if (!p.active) continue;
        const incoming = owner === 'player' ? !p.isFromPlayer : p.isFromPlayer;
        if (!incoming) continue;
        if (Phaser.Math.Distance.Between(bx, by, p.x, p.y) > STEEL_SHIELD_BLOCK_RADIUS) continue;
        const px = p.x, py = p.y;
        p.destroy();
        this.arena.spawnHitFlash(bx, by, this.col(owner)(s.red ? METAL.rose : METAL.chrome));
        // Stopped dead on the plate: sparks off the face, thrown back along the way it came.
        this.fx(owner).sparks(px, py, 6, Math.atan2(py - by, px - bx), 10,
          s.red ? METAL.rose : METAL.chrome);
        // Red shield (cast during Clot Armor) sprays a shard burst per blocked shot.
        if (s.red) this.fireSteelShieldShards(owner, bx, by);
        // Conduit: the plate is earthed, so the shot goes back where it came from.
        this.earthShotBack(owner, px, py);
      }
    }
  }

  private fireSteelShieldShards(owner: 'player' | 'npc', x: number, y: number): void {
    // Same count Clot Armor emits per burst (Exsanguinate perk bumps it to 8).
    const shardCount = this.arena.hasPerk(owner, 'gunpowder') ? 8 : CLOT_SHARD_COUNT;
    for (let i = 0; i < shardCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      this.metalShardProjectiles.push({
        x, y,
        vx: Math.cos(ang) * CLOT_SHARD_SPEED, vy: Math.sin(ang) * CLOT_SHARD_SPEED,
        owner, active: true, dmg: CLOT_SHARD_DAMAGE, spawnsPuddle: true, isMace: false, heavy: false,
      });
    }
  }

  private updateBloodHud(): void {
    if (!this.bloodBarBg || this.arena.elementId !== 'metal') return;
    const ratio = this.blood.player / BLOOD_MAX;
    this.bloodBarFill!.width = 148 * ratio;
  }
}
