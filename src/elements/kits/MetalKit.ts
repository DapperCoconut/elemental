import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';

// ── Metal type definitions ─────────────────────────────────────────────────

export interface MetalBloodPuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
  drainAccum: number;
  draining: boolean;
  blood: number; // remaining blood held in this puddle
}

export interface MetalChainProjectile {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  active: boolean;
}

interface MetalShardProjectile {
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  active: boolean;
  dmg: number;          // damage on hit
  spawnsPuddle: boolean; // clot shards spawn a blood puddle on hit; flung maces do not
}

interface MetalFlail {
  headSprite: Phaser.GameObjects.Arc;
  chainGfx: Phaser.GameObjects.Graphics;
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
  headRadius: number;   // for drawing spikes on the heavy mace
  spikesGfx: Phaser.GameObjects.Graphics | null;
  firePuddleAccum: number;
}

interface MetalFirePuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
  expiresAt: number;
  tickAccum: number;
}

interface MetalGroundTether {
  x: number;
  y: number;
  owner: 'player' | 'npc';
  endTime: number;
  blastAccum: number;
  stake: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Arc;
}

interface BloodBlade {
  gfx: Phaser.GameObjects.Container | null; // the crash-down visual; destroyed once it lands
  owner: 'player' | 'npc';
  y: number;            // current vertical offset while descending
  descending: boolean;
  lastSwingAt: number;  // swing cadence (faster with more blood)
  prevBlood: number;
}

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
  hasUpgrade(slot: string): boolean;
  hasPerk(perkId: string): boolean;
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
  // ── Kept-as-is: blood puddles / chain tether / aggressive bleeding ────
  private metalBloodPuddles: MetalBloodPuddle[] = [];
  private metalChainTethered = false;
  private metalChainTetherEnd = 0;
  private metalChainGraphic: Phaser.GameObjects.Graphics | null = null;
  private metalChainProjectiles: MetalChainProjectile[] = [];
  private metalTetherNextPuddleAt = 0; // timestamp of the next drag puddle
  private metalTetherPuddlesLeft = 0;  // remaining puddles to drop this tether (max 3)
  private playerAggressiveBleeding = false;
  private playerAggressiveBleedUntil = 0;
  private playerAggressiveBleedAura: Phaser.GameObjects.Arc | null = null;
  private playerAggressiveBleedTickAccum = 0;
  private playerAggressiveBleedPuddleAccum = 0;

  private npcMetalChainTethered = false;
  private npcMetalChainTetherEnd = 0;
  private npcMetalChainGraphic: Phaser.GameObjects.Graphics | null = null;
  private npcMetalTetherNextPuddleAt = 0;
  private npcMetalTetherPuddlesLeft = 0;
  private npcAggressiveBleeding = false;
  private npcAggressiveBleedUntil = 0;
  private npcAggressiveBleedAura: Phaser.GameObjects.Arc | null = null;
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

  // ── Clot Armor (Q) ──────────────────────────────────────────────────────
  private clotArmorActive: Record<'player' | 'npc', boolean> = { player: false, npc: false };
  private clotArmorLostAccum: Record<'player' | 'npc', number> = { player: 0, npc: 0 };
  private clotArmorShardDecor: Record<'player' | 'npc', Phaser.GameObjects.Triangle[]> = { player: [], npc: [] };
  private metalShardProjectiles: MetalShardProjectile[] = [];

  // Player's current look direction (toward cursor), for orienting clot spikes.
  private playerAimAngle = 0;

  // ── Shared charge VFX (Click sabre / F anchor / Q blade) ──────────────────
  private charging = false;
  private chargeStart = 0;
  private chargeDuration = 0;
  private chargeAura: Phaser.GameObjects.Arc | null = null;
  private chargeOrbs: Phaser.GameObjects.Arc[] = [];
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
    barrier: Phaser.GameObjects.Rectangle;
  } | null> = { player: null, npc: null };
  private steelShieldLastCastAt = -STEEL_SHIELD_COOLDOWN_MS; // ready at match start; npc casts are event-driven online

  constructor(private arena: MetalArenaApi) {}

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
      fontSize: '10px', color: '#dd6677', fontFamily: 'Arial, sans-serif',
    }).setOrigin(0, 0.5).setDepth(24).setScrollFactor(0);
  }

  reset(): void {
    this.npcAggressiveBleeding = false; this.npcAggressiveBleedUntil = 0;
    if (this.npcAggressiveBleedAura) { this.npcAggressiveBleedAura.destroy(); this.npcAggressiveBleedAura = null; }
    this.npcAggressiveBleedTickAccum = 0; this.npcAggressiveBleedPuddleAccum = 0;
    this.playerAggressiveBleeding = false; this.playerAggressiveBleedUntil = 0;
    if (this.playerAggressiveBleedAura) { this.playerAggressiveBleedAura.destroy(); this.playerAggressiveBleedAura = null; }
    this.playerAggressiveBleedTickAccum = 0; this.playerAggressiveBleedPuddleAccum = 0;

    for (const p of this.metalBloodPuddles) p.sprite.destroy();
    this.metalBloodPuddles = [];

    this.metalChainTethered = false; this.metalChainTetherEnd = 0; this.metalTetherNextPuddleAt = 0; this.metalTetherPuddlesLeft = 0;
    if (this.metalChainGraphic) { this.metalChainGraphic.destroy(); this.metalChainGraphic = null; }
    this.npcMetalChainTethered = false; this.npcMetalChainTetherEnd = 0; this.npcMetalTetherNextPuddleAt = 0; this.npcMetalTetherPuddlesLeft = 0;
    if (this.npcMetalChainGraphic) { this.npcMetalChainGraphic.destroy(); this.npcMetalChainGraphic = null; }

    for (const p of this.metalChainProjectiles) p.sprite.destroy();
    this.metalChainProjectiles = [];

    // Shared charge VFX + Click+ Mighty Sabre
    this.clearChargeVfx();
    this.sabreCharging = false;

    // E+ fire puddles
    for (const p of this.metalFirePuddles) p.sprite.destroy();
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

    // Flails
    this.destroyFlail('player');
    this.destroyFlail('npc');

    // Transfusion
    this.transfusionActiveUntil = { player: 0, npc: 0 };
    this.transfusionDripAccum = { player: 0, npc: 0 };

    // Clot armor
    this.clotArmorActive = { player: false, npc: false };
    this.clotArmorLostAccum = { player: 0, npc: 0 };
    for (const spr of this.clotArmorShardDecor.player) spr.destroy();
    for (const spr of this.clotArmorShardDecor.npc) spr.destroy();
    this.clotArmorShardDecor = { player: [], npc: [] };
    this.arena.player.clearTint();
    this.arena.npc.clearTint();
    this.arena.player.damageAbsorber = null;
    this.arena.npc.damageAbsorber = null;

    for (const p of this.metalShardProjectiles) p.sprite.destroy();
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
    const aimAtFlail = (): boolean => {
      if (!this.playerFlail) return false;
      const head = this.playerFlail.headSprite;
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
        const interval = Phaser.Math.Clamp(700 - this.blood.player * 4, 200, 700);
        if (time - this.bloodBlade.lastSwingAt >= interval) {
          this.bloodBlade.lastSwingAt = time;
          this.bloodBladeSwing(mouseX, mouseY);
        }
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
    this.updateAggressiveBleeds(time, delta);
    this.updateTransfusion(time, delta);
    this.updateBloodPuddles(time, delta);
    this.updateChainTethers(time, delta);
    this.updateChainProjectiles(time, delta);
    this.updateFlails(time, delta);
    this.updateClotArmor(time, delta);
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
  }

  // ── Public do* methods — called from ArenaScene context builders ──────

  doMetalSlash(tx: number, ty: number, owner: 'player' | 'npc', dmgOverride?: number): void {
    const { player, npc, enemies, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const targets = owner === 'player' ? enemies : [player];

    const dx = tx - caster.x, dy = ty - caster.y;
    const ang = Math.atan2(dy, dx);

    // Draw a sword and sweep it across the aim direction.
    this.drawSwordSwing(caster.x, caster.y, ang, { handle: 0x6b4a2b, accent: 0xd9b25a, blade: 0xdfe8f2, edge: 0xffffff });

    for (const target of targets) {
      if (!target.active || target.hp <= 0) continue;
      const dist = Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y);
      if (dist <= 90) {
        const dmg = dmgOverride ?? 25;
        target.takeDamage(dmg);
        this.arena.spawnHitFlash(target.x, target.y, 0xaabbcc);
        this.arena.showFloatingText(caster.x, caster.y - 36, `🗡️ ${dmg}`, '#aabbcc');
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
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;

    const dx = tx - caster.x, dy = ty - caster.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const spr = sceneAdd.circle(caster.x, caster.y, 8, 0x889aaa, 0.9)
      .setStrokeStyle(2, 0xccddee).setDepth(8);
    this.metalChainProjectiles.push({
      sprite: spr, x: caster.x, y: caster.y,
      vx: (dx / len) * 520, vy: (dy / len) * 520,
      owner, active: true,
    });
    this.arena.showFloatingText(caster.x, caster.y - 30, '⛓️ CHAIN!', '#aabbcc');
  }

  /** E — Flail Craft: creates an idle flail head trailing the caster. */
  doMetalFlailCraft(owner: 'player' | 'npc'): void {
    const { player, npc, scene } = this.arena;
    const caster = owner === 'player' ? player : npc;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTime = (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time;

    this.destroyFlail(owner); // safety: replace any stale flail

    // E+: Heavy Metal Rock — black spiked mace, 15% longer chain.
    const heavy = owner === 'player' && this.arena.hasUpgrade('e');
    const headSize = heavy ? 14 : 9;
    const idleRadius = FLAIL_IDLE_RADIUS * (heavy ? HEAVY_RADIUS_MULT : 1);
    const startAngle = Math.PI / 2; // trails south of the caster
    const head = sceneAdd.circle(
      caster.x + Math.cos(startAngle) * idleRadius,
      caster.y + Math.sin(startAngle) * idleRadius,
      headSize, heavy ? 0x111111 : 0xaabbcc, 0.95,
    ).setStrokeStyle(heavy ? 3 : 2, heavy ? 0x444444 : 0x556677).setDepth(8);
    const chain = sceneAdd.graphics().setDepth(7);
    const spikesGfx = heavy ? sceneAdd.graphics().setDepth(7) : null;

    const flail: MetalFlail = {
      headSprite: head, chainGfx: chain,
      angle: startAngle, angularVel: 0, initialAngularVel: 0,
      radius: idleRadius, swinging: false,
      createdAt: sceneTime.now, swingStartAt: 0, lastHitAt: 0, owner,
      heavy, headRadius: headSize, spikesGfx, firePuddleAccum: 0,
    };
    if (owner === 'player') this.playerFlail = flail; else this.npcFlail = flail;

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
      this.arena.showFloatingText(caster.x, caster.y - 44, '⚡ FASTER!', '#ffcc44');
      return;
    }

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

      // Blood dripping particles beneath the character (~every 90ms). The
      // green heal numbers themselves are handled generically by ArenaScene.
      this.transfusionDripAccum[owner] += delta;
      if (this.transfusionDripAccum[owner] >= 90) {
        this.transfusionDripAccum[owner] -= 90;
        this.spawnBloodDrip(caster.x, caster.y);
      }
    }
  }

  private spawnBloodDrip(x: number, y: number): void {
    const sceneAdd = (this.arena.scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTweens = (this.arena.scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens;
    const ox = (Math.random() - 0.5) * 26;
    const drop = sceneAdd.circle(x + ox, y + 8, 2 + Math.random() * 1.5, 0x990011, 0.9).setDepth(3);
    sceneTweens.add({
      targets: drop,
      y: drop.y + 16 + Math.random() * 8,
      scaleX: 0.3, scaleY: 0.3,
      alpha: 0,
      duration: 360,
      ease: 'Quad.In',
      onComplete: () => drop.destroy(),
    });
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
    this.clotArmorLostAccum[owner] = 0;

    if (!this.clotArmorActive[owner]) {
      this.clotArmorActive[owner] = true;
      caster.setTint(0xff4466);
      this.spawnClotArmorDecor(owner);
      this.installClotArmorAbsorber(owner);
    }

    // Quad perk: Exsanguinate — Clot Armor also fires 8 shards instead of 5 per burst (handled in fireClotShardBurst)
    this.arena.showFloatingText(caster.x, caster.y - 44, `🛡️ CLOT ARMOR (${caster.shieldHp} HP)`, '#ff4466');

    const { scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTweens = (scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const dot = sceneAdd.circle(
        caster.x + Math.cos(ang) * 18, caster.y + Math.sin(ang) * 18,
        5, 0xcc0000, 0.9,
      ).setDepth(7);
      sceneTweens.add({ targets: dot, x: dot.x + Math.cos(ang) * 40, y: dot.y + Math.sin(ang) * 40, alpha: 0, duration: 600, onComplete: () => dot.destroy() });
    }
  }

  applyMetalAggressiveBleeding(appliedBy: 'player' | 'npc', duration: number): void {
    const { player, npc, scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTweens = (scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens;
    const sceneTime = (scene as Phaser.Scene & { time: Phaser.Time.Clock }).time;

    if (appliedBy === 'player') {
      // Player bleeds NPC
      this.npcAggressiveBleeding = true;
      this.npcAggressiveBleedUntil = Math.max(this.npcAggressiveBleedUntil, sceneTime.now + duration);
      if (!this.npcAggressiveBleedAura) {
        this.npcAggressiveBleedAura = sceneAdd.circle(npc.x, npc.y, 30, 0x660000, 0.4)
          .setStrokeStyle(2, 0xaa0000, 0.6).setDepth(3);
        sceneTweens.add({ targets: this.npcAggressiveBleedAura, alpha: 0.12, yoyo: true, repeat: -1, duration: 380 });
      }
      this.arena.showFloatingText(npc.x, npc.y - 36, '🩸 BLEEDING', '#cc0000');
      // Drip particles
      for (let i = 0; i < 4; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dot = sceneAdd.circle(
          npc.x + Math.cos(ang) * 18, npc.y + Math.sin(ang) * 18,
          3, 0x880000, 0.9,
        ).setDepth(6);
        sceneTweens.add({ targets: dot, y: dot.y + 22, alpha: 0, duration: 680, onComplete: () => dot.destroy() });
      }
    } else {
      // NPC bleeds player
      this.playerAggressiveBleeding = true;
      this.playerAggressiveBleedUntil = Math.max(this.playerAggressiveBleedUntil, sceneTime.now + duration);
      if (!this.playerAggressiveBleedAura) {
        this.playerAggressiveBleedAura = sceneAdd.circle(player.x, player.y, 30, 0x660000, 0.4)
          .setStrokeStyle(2, 0xaa0000, 0.6).setDepth(3);
        sceneTweens.add({ targets: this.playerAggressiveBleedAura, alpha: 0.12, yoyo: true, repeat: -1, duration: 380 });
      }
      this.arena.showFloatingText(player.x, player.y - 36, '🩸 BLEEDING', '#cc0000');
    }
  }

  spawnMetalBloodPuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    const sceneTweens = (scene as Phaser.Scene & { tweens: Phaser.Tweens.TweenManager }).tweens;

    const base = 30;
    // Quad perk Exsanguinate: blood puddles are 50% bigger.
    let mult = 1;
    if (owner === 'player' && this.arena.hasPerk('gunpowder')) mult *= 1.5;
    const r = Math.round(base * mult);
    const spr = sceneAdd.circle(x, y, r, 0x660000, 0.55)
      .setStrokeStyle(2, 0x990000, 0.5).setDepth(2);
    this.metalBloodPuddles.push({ sprite: spr, x, y, radius: r, owner, drainAccum: 0, draining: false, blood: PUDDLE_BLOOD_CAPACITY });
    // Small spawn VFX
    const burst = sceneAdd.circle(x, y, 6, 0xcc0000, 0.8).setDepth(5);
    sceneTweens.add({ targets: burst, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
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

  /** Draws a sword pointing outward from (cx,cy) and sweeps it 90° across `ang`, then fades. */
  private drawSwordSwing(
    cx: number, cy: number, ang: number,
    opts: { handle: number; accent: number; blade: number; edge: number; serrated?: boolean },
  ): void {
    const scene = this.arena.scene;
    const gfx = scene.add.graphics().setDepth(9);
    gfx.setPosition(cx, cy);
    gfx.fillStyle(opts.handle, 1); gfx.fillRect(0, -3, 16, 6);      // handle
    gfx.fillStyle(opts.accent, 1); gfx.fillCircle(0, 0, 5);          // pommel
    gfx.fillStyle(opts.accent, 1); gfx.fillRect(14, -12, 6, 24);     // crossguard
    // Blade (tapered to a point)
    gfx.fillStyle(opts.blade, 1);
    gfx.beginPath();
    gfx.moveTo(20, -6); gfx.lineTo(88, -2); gfx.lineTo(98, 0); gfx.lineTo(88, 2); gfx.lineTo(20, 6);
    gfx.closePath(); gfx.fillPath();
    if (opts.serrated) {
      gfx.fillStyle(opts.blade, 1);
      for (let x = 24; x < 88; x += 9) gfx.fillTriangle(x, -4, x + 5, -11, x + 9, -4);
    }
    gfx.lineStyle(2, opts.edge, 0.9);                                // edge highlight
    gfx.beginPath(); gfx.moveTo(20, -3); gfx.lineTo(96, 0); gfx.strokePath();

    const swing = Phaser.Math.DegToRad(90);
    gfx.setRotation(ang - swing / 2);
    scene.tweens.add({ targets: gfx, rotation: ang + swing / 2, duration: 130, ease: 'Quad.Out' });
    scene.tweens.add({ targets: gfx, alpha: 0, duration: 120, delay: 130, onComplete: () => gfx.destroy() });
  }

  private drawMetalChainLine(gfx: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
    const d = Phaser.Math.Distance.Between(x1, y1, x2, y2) || 1;
    const dx = x2 - x1, dy = y2 - y1;
    const segments = Math.max(4, Math.floor(d / 22));
    const perpX = -dy / d, perpY = dx / d;
    gfx.lineStyle(3, 0x889aaa, 0.75);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const px = x1 + dx * t, py = y1 + dy * t;
      const side = i % 2 === 0 ? 1 : -1;
      gfx.lineTo(px + perpX * side * 7, py + perpY * side * 7);
    }
    gfx.strokePath();
  }

  private destroyFlail(owner: 'player' | 'npc'): void {
    const flail = owner === 'player' ? this.playerFlail : this.npcFlail;
    if (!flail) return;
    flail.headSprite.destroy();
    flail.chainGfx.destroy();
    if (flail.spikesGfx) flail.spikesGfx.destroy();
    if (owner === 'player') this.playerFlail = null; else this.npcFlail = null;
  }

  private spawnClotArmorDecor(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    for (const spr of this.clotArmorShardDecor[owner]) spr.destroy();
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    // Three spike triangles (tip pointing +x locally); positioned and oriented
    // to face away from the caster's aim each frame in updateClotArmor.
    this.clotArmorShardDecor[owner] = [0, 1, 2].map(() =>
      sceneAdd.triangle(caster.x, caster.y, 0, -8, 28, 0, 0, 8, 0xcc0022, 0.95).setDepth(6),
    );
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
      this.clotArmorLostAccum[owner] += amount;
      while (this.clotArmorLostAccum[owner] >= CLOT_SHARD_THRESHOLD) {
        this.clotArmorLostAccum[owner] -= CLOT_SHARD_THRESHOLD;
        this.fireClotShardBurst(owner);
      }
      if (caster.shieldHp <= 0) {
        this.arena.showFloatingText(caster.x, caster.y - 36, '💔 ARMOR BROKEN', '#ff4466');
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
    for (const spr of this.clotArmorShardDecor[owner]) spr.destroy();
    this.clotArmorShardDecor[owner] = [];
  }

  private fireClotShardBurst(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const { scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    // Quad perk: Exsanguinate — fires 8 shards per burst instead of 5
    const shardCount = this.arena.hasPerk('gunpowder') ? 8 : CLOT_SHARD_COUNT;
    for (let i = 0; i < shardCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spr = sceneAdd.rectangle(caster.x, caster.y, 10, 4, 0xcc0022, 0.95)
        .setDepth(8).setRotation(ang);
      this.metalShardProjectiles.push({
        sprite: spr, x: caster.x, y: caster.y,
        vx: Math.cos(ang) * CLOT_SHARD_SPEED, vy: Math.sin(ang) * CLOT_SHARD_SPEED,
        owner, active: true, dmg: CLOT_SHARD_DAMAGE, spawnsPuddle: true,
      });
    }
    this.arena.showFloatingText(caster.x, caster.y - 30, '🩸 SHARD BURST', '#ff3355');
  }

  // ── Per-frame update helpers ──────────────────────────────────────────────

  private updateAggressiveBleeds(time: number, delta: number): void {
    const { player, npc } = this.arena;

    if (this.npcAggressiveBleeding) {
      if (time > this.npcAggressiveBleedUntil) {
        this.npcAggressiveBleeding = false;
        if (this.npcAggressiveBleedAura) { this.npcAggressiveBleedAura.destroy(); this.npcAggressiveBleedAura = null; }
      } else {
        if (this.npcAggressiveBleedAura) this.npcAggressiveBleedAura.setPosition(npc.x, npc.y);
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
        if (this.playerAggressiveBleedAura) { this.playerAggressiveBleedAura.destroy(); this.playerAggressiveBleedAura = null; }
      } else {
        if (this.playerAggressiveBleedAura) this.playerAggressiveBleedAura.setPosition(player.x, player.y);
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
        // Puddle shrinks consistently as its blood is drained.
        puddle.sprite.setScale(Math.max(0.05, puddle.blood / PUDDLE_BLOOD_CAPACITY));
        // Periodic drip readout (~once per second) so the number isn't spam.
        puddle.drainAccum += delta;
        if (puddle.drainAccum >= 1000) {
          puddle.drainAccum -= 1000;
          this.arena.showFloatingText(owner.x, owner.y - 22, '+10 🩸', '#ff3355');
        }
        if (puddle.blood <= 0) {
          puddle.sprite.destroy();
          this.metalBloodPuddles.splice(i, 1);
        }
      }
    }
  }

  private addBlood(owner: 'player' | 'npc', amount: number): void {
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
    const { player, npc, scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;

    if (this.metalChainTethered) {
      if (time > this.metalChainTetherEnd) {
        this.metalChainTethered = false;
        if (this.metalChainGraphic) { this.metalChainGraphic.clear(); this.metalChainGraphic.destroy(); this.metalChainGraphic = null; }
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
        if (!this.metalChainGraphic) this.metalChainGraphic = sceneAdd.graphics().setDepth(5);
        this.metalChainGraphic.clear();
        this.drawMetalChainLine(this.metalChainGraphic, player.x, player.y, npc.x, npc.y);
      }
    }

    if (this.npcMetalChainTethered) {
      if (time > this.npcMetalChainTetherEnd) {
        this.npcMetalChainTethered = false;
        if (this.npcMetalChainGraphic) { this.npcMetalChainGraphic.clear(); this.npcMetalChainGraphic.destroy(); this.npcMetalChainGraphic = null; }
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
        if (!this.npcMetalChainGraphic) this.npcMetalChainGraphic = sceneAdd.graphics().setDepth(5);
        this.npcMetalChainGraphic.clear();
        this.drawMetalChainLine(this.npcMetalChainGraphic, npc.x, npc.y, player.x, player.y);
      }
    }
  }

  private updateChainProjectiles(time: number, delta: number): void {
    const { player, enemies } = this.arena;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;

    for (let i = this.metalChainProjectiles.length - 1; i >= 0; i--) {
      const cp = this.metalChainProjectiles[i];
      if (!cp.active) { cp.sprite.destroy(); this.metalChainProjectiles.splice(i, 1); continue; }
      cp.x += cp.vx * (delta / 1000);
      cp.y += cp.vy * (delta / 1000);
      cp.sprite.setPosition(cp.x, cp.y);
      if (cp.x < 0 || cp.x > W || cp.y < 0 || cp.y > H) { cp.active = false; continue; }

      const hitTargets = cp.owner === 'player' ? enemies : [player];
      for (const hitTarget of hitTargets) {
        if (!hitTarget.active || hitTarget.hp <= 0) continue;
        const hitDist = Phaser.Math.Distance.Between(cp.x, cp.y, hitTarget.x, hitTarget.y);
        if (hitDist <= 28) {
          cp.active = false;
          this.arena.spawnHitFlash(hitTarget.x, hitTarget.y, 0x889aaa);
          this.arena.showFloatingText(hitTarget.x, hitTarget.y - 34, '⛓️ TETHERED!', '#aabbcc');
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
          flail.radius = FLAIL_IDLE_RADIUS * (flail.heavy ? HEAVY_RADIUS_MULT : 1);
          flail.headSprite.setFillStyle(flail.heavy ? 0x111111 : 0xaabbcc, 0.95);
          if (flail.spikesGfx) flail.spikesGfx.clear();
        } else {
          flail.angularVel = flail.initialAngularVel * decayRatio;
          flail.angle += flail.angularVel * dt;
        }
      }

      const headX = caster.x + Math.cos(flail.angle) * flail.radius;
      const headY = caster.y + Math.sin(flail.angle) * flail.radius;
      flail.headSprite.setPosition(headX, headY);
      flail.chainGfx.clear();
      this.drawMetalChainLine(flail.chainGfx, caster.x, caster.y, headX, headY);

      // E+ Heavy Metal Rock: spikes radiating from the head, spinning with it
      // and matching the head's current colour (dark → molten orange at speed).
      if (flail.spikesGfx) {
        const g = flail.spikesGfx;
        g.clear();
        g.fillStyle(flail.headSprite.fillColor, 0.95);
        const r = flail.headRadius;
        const spikeLen = 9;
        const count = 8;
        for (let s = 0; s < count; s++) {
          const a = flail.angle + (s / count) * Math.PI * 2;
          const bx = headX + Math.cos(a) * (r - 1);
          const by = headY + Math.sin(a) * (r - 1);
          const tx = headX + Math.cos(a) * (r + spikeLen);
          const ty = headY + Math.sin(a) * (r + spikeLen);
          const perpX = -Math.sin(a) * 4;
          const perpY = Math.cos(a) * 4;
          g.fillTriangle(bx + perpX, by + perpY, bx - perpX, by - perpY, tx, ty);
        }
      }

      if (flail.swinging) {
        const elapsed = time - flail.swingStartAt;
        const speedRatio = Math.max(0, 1 - elapsed / decayMs);
        const dmg = Math.round((10 + speedRatio * 30) / 3) * (flail.heavy ? 2 : 1);
        if (flail.heavy) {
          const molten = speedRatio > HEAVY_MOLTEN_RATIO;
          flail.headSprite.setFillStyle(molten ? 0xff6600 : 0x111111, 0.95);
          if (molten) {
            flail.firePuddleAccum += delta;
            if (flail.firePuddleAccum >= 150) {
              flail.firePuddleAccum -= 150;
              this.spawnMetalFirePuddle(headX, headY, owner);
            }
          }
        } else {
          const c1 = Phaser.Display.Color.ValueToColor(0xaabbcc);
          const c2 = Phaser.Display.Color.ValueToColor(0xff2244);
          const blended = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 100, Math.round(speedRatio * 100));
          flail.headSprite.setFillStyle(Phaser.Display.Color.GetColor(blended.r, blended.g, blended.b), 0.95);
        }

        if (time - flail.lastHitAt >= FLAIL_HIT_COOLDOWN_MS) {
          const targets = owner === 'player' ? this.arena.enemies : [this.arena.player];
          for (const t of targets) {
            if (!t.active || t.hp <= 0) continue;
            if (Phaser.Math.Distance.Between(headX, headY, t.x, t.y) <= FLAIL_CONTACT_RADIUS) {
              t.takeDamage(dmg);
              this.arena.spawnHitFlash(t.x, t.y, 0xff4466);
              this.arena.showFloatingText(t.x, t.y - 30, `⛓️ ${dmg}`, '#ff6688');
              if (owner === 'player') this.arena.recordMasteryStat('flailHits', 1);
              flail.lastHitAt = time;
              break;
            }
          }
        }
      }
    }
  }

  private updateShardProjectiles(_time: number, delta: number): void {
    const { player, enemies } = this.arena;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;

    for (let i = this.metalShardProjectiles.length - 1; i >= 0; i--) {
      const p = this.metalShardProjectiles[i];
      if (!p.active) { p.sprite.destroy(); this.metalShardProjectiles.splice(i, 1); continue; }
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      p.sprite.setPosition(p.x, p.y);
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) { p.active = false; continue; }

      const targets = p.owner === 'player' ? enemies : [player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= 24) {
          p.active = false;
          t.takeDamage(p.dmg);
          this.arena.spawnHitFlash(t.x, t.y, 0xcc0022);
          if (p.spawnsPuddle) this.spawnMetalBloodPuddle(t.x, t.y, p.owner);
          break;
        }
      }
    }
  }

  private updateClotArmor(_time: number, _delta: number): void {
    for (const owner of ['player', 'npc'] as const) {
      if (!this.clotArmorActive[owner]) continue;
      const caster = owner === 'player' ? this.arena.player : this.arena.npc;
      // Spikes face opposite the caster's look direction (player → cursor,
      // NPC → its target), spread across the character's back edge.
      const aimAng = owner === 'player'
        ? this.playerAimAngle
        : Math.atan2(this.arena.player.y - caster.y, this.arena.player.x - caster.x);
      const oppAng = aimAng + Math.PI;
      const edge = 17;
      // Fan the three spikes 30° apart around the back direction.
      const spreadAngs = [-Math.PI / 6, 0, Math.PI / 6];
      this.clotArmorShardDecor[owner].forEach((spr, i) => {
        const a = oppAng + (spreadAngs[i] ?? 0);
        spr.setPosition(caster.x + Math.cos(a) * edge, caster.y + Math.sin(a) * edge);
        spr.setRotation(a);
      });
    }
  }

  // ── Click+ Mighty Sabre ────────────────────────────────────────────────

  private startChargeVfx(startTime: number, durationMs: number): void {
    const { player, scene } = this.arena;
    this.clearChargeVfx();
    this.charging = true;
    this.chargeStart = startTime;
    this.chargeDuration = durationMs;
    this.chargeAura = scene.add.circle(player.x, player.y, 30, 0xffdd00, 0.16)
      .setStrokeStyle(2, 0xffee44, 0.6).setDepth(4);
    for (let i = 0; i < 5; i++) {
      this.chargeOrbs.push(scene.add.circle(player.x, player.y, 3, 0xffee44, 0.9).setDepth(6));
    }
  }

  private updateChargeVfx(time: number): void {
    const { player } = this.arena;
    if (!this.charging) return;
    const ratio = Phaser.Math.Clamp((time - this.chargeStart) / this.chargeDuration, 0, 1);
    player.chargeRatio = ratio;
    if (this.chargeAura) {
      this.chargeAura.setPosition(player.x, player.y)
        .setScale(1 - ratio * 0.4).setFillStyle(0xffdd00, 0.14 + ratio * 0.26);
    }
    this.chargeOrbs.forEach((orb, i) => {
      const ang = (i / this.chargeOrbs.length) * Math.PI * 2 + time / 200;
      const dist = 34 * (1 - ratio);
      orb.setPosition(player.x + Math.cos(ang) * dist, player.y + Math.sin(ang) * dist);
    });
    if (ratio >= 1 && !this.chargeFullTinted && !this.clotArmorActive.player) {
      this.chargeFullTinted = true;
      player.setTint(0xffee00);
    }
  }

  private clearChargeVfx(): void {
    if (this.chargeAura) { this.chargeAura.destroy(); this.chargeAura = null; }
    for (const o of this.chargeOrbs) o.destroy();
    this.chargeOrbs = [];
    this.charging = false;
    this.arena.player.chargeRatio = 0;
    if (this.chargeFullTinted) {
      this.chargeFullTinted = false;
      if (!this.clotArmorActive.player) this.arena.player.clearTint();
    }
  }

  /** Max-charge release: fling the flail at the cursor and parry enemy shots. */
  private doMaxCharge(mouseX: number, mouseY: number, ctx: CastContext): void {
    const { player, scene } = this.arena;
    this.arena.showFloatingText(player.x, player.y - 52, '⚔️ MAX CHARGE!', '#ffee00');
    if (this.playerFlail) {
      const dx = mouseX - player.x, dy = mouseY - player.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const heavy = this.playerFlail.heavy;
      const spr = scene.add.circle(player.x, player.y, heavy ? 12 : 9, heavy ? 0x111111 : 0xaabbcc, 0.95)
        .setStrokeStyle(2, 0x556677).setDepth(8);
      this.metalShardProjectiles.push({
        sprite: spr, x: player.x, y: player.y,
        vx: (dx / len) * 700, vy: (dy / len) * 700,
        owner: 'player', active: true, dmg: heavy ? 60 : 40, spawnsPuddle: false,
      });
      this.destroyFlail('player');
    }
    this.parryProjectiles(ctx);
  }

  private parryProjectiles(ctx: CastContext): void {
    const group = ctx.projectiles;
    if (!group) return;
    const { player, npc, scene } = this.arena;
    let reflected = 0;
    // Snapshot: p.destroy() mutates the group's child list mid-iteration.
    [...group.getChildren()].forEach((obj) => {
      const p = obj as Projectile;
      if (!p.active || p.isFromPlayer) return;
      if (Phaser.Math.Distance.Between(player.x, player.y, p.x, p.y) > SABRE_PARRY_RADIUS) return;
      if (npc.active && npc.hp > 0) {
        const ang = Math.atan2(npc.y - p.y, npc.x - p.x);
        const line = scene.add.rectangle(p.x, p.y, Phaser.Math.Distance.Between(p.x, p.y, npc.x, npc.y), 3, 0xffee44, 0.9)
          .setOrigin(0, 0.5).setRotation(ang).setDepth(9);
        scene.tweens.add({ targets: line, alpha: 0, duration: 220, onComplete: () => line.destroy() });
        npc.takeDamage(Math.round(p.damage * 1.5));
        this.arena.spawnHitFlash(npc.x, npc.y, 0xffee44);
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
    const scene = this.arena.scene;
    const spr = scene.add.circle(x, y, 18, 0xff5500, 0.5).setStrokeStyle(2, 0xffaa00, 0.6).setDepth(2);
    scene.tweens.add({ targets: spr, alpha: 0.28, yoyo: true, repeat: -1, duration: 300 });
    this.metalFirePuddles.push({ sprite: spr, x, y, radius: 18, owner, expiresAt: scene.time.now + 3000, tickAccum: 0 });
  }

  private updateMetalFirePuddles(time: number, delta: number): void {
    for (let i = this.metalFirePuddles.length - 1; i >= 0; i--) {
      const fp = this.metalFirePuddles[i];
      if (time >= fp.expiresAt) { fp.sprite.destroy(); this.metalFirePuddles.splice(i, 1); continue; }
      fp.tickAccum += delta;
      if (fp.tickAccum < 500) continue;
      fp.tickAccum -= 500;
      const targets = fp.owner === 'player' ? this.arena.enemies : [this.arena.player];
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(fp.x, fp.y, t.x, t.y) <= fp.radius + 16) {
          t.takeDamage(4);
          this.arena.spawnHitFlash(t.x, t.y, 0xff6600);
        }
      }
    }
  }

  // ── F+ Ground Anchor ───────────────────────────────────────────────────

  private spawnGroundTether(x: number, y: number, owner: 'player' | 'npc'): void {
    this.destroyGroundTether();
    const scene = this.arena.scene;
    const stake = scene.add.circle(x, y, 10, 0x889aaa, 0.9).setStrokeStyle(3, 0xccddee).setDepth(4);
    const ring = scene.add.circle(x, y, GROUND_TETHER_BLAST_RADIUS, 0xffffff, 0)
      .setStrokeStyle(2, 0xffffff, 0.22).setDepth(3);
    this.metalGroundTether = { x, y, owner, endTime: scene.time.now + GROUND_TETHER_MS, blastAccum: 0, stake, ring };
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
    const scene = this.arena.scene;
    const blast = scene.add.circle(gt.x, gt.y, 20, 0xffffff, 0.5).setDepth(6);
    scene.tweens.add({
      targets: blast, scaleX: GROUND_TETHER_BLAST_RADIUS / 20, scaleY: GROUND_TETHER_BLAST_RADIUS / 20,
      alpha: 0, duration: 500, onComplete: () => blast.destroy(),
    });
    // Pull blood from every puddle in range at once — up to 15 from each.
    let drained = 0;
    for (let i = this.metalBloodPuddles.length - 1; i >= 0; i--) {
      const puddle = this.metalBloodPuddles[i];
      if (puddle.owner !== gt.owner) continue;
      if (Phaser.Math.Distance.Between(gt.x, gt.y, puddle.x, puddle.y) > GROUND_TETHER_BLAST_RADIUS) continue;
      const take = Math.min(GROUND_TETHER_BLAST_DRAIN, puddle.blood);
      puddle.blood -= take; drained += take;
      puddle.sprite.setScale(Math.max(0.05, puddle.blood / PUDDLE_BLOOD_CAPACITY));
      if (puddle.blood <= 0) { puddle.sprite.destroy(); this.metalBloodPuddles.splice(i, 1); }
    }
    if (drained > 0) {
      this.addBlood(gt.owner, drained);
      this.arena.showFloatingText(gt.x, gt.y - 20, `+${Math.round(drained)} 🩸`, '#ff3355');
    }
  }

  private destroyGroundTether(): void {
    if (!this.metalGroundTether) return;
    this.metalGroundTether.stake.destroy();
    this.metalGroundTether.ring.destroy();
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
    const container = scene.add.container(caster.x, caster.y - scene.scale.height).setDepth(9);
    const g = scene.add.graphics();
    g.fillStyle(0x4a0008, 1); g.fillRect(-3, -40, 6, 16);      // handle
    g.fillStyle(0x8a1020, 1); g.fillRect(-12, -26, 24, 5);     // crossguard
    g.fillStyle(0xaa0018, 1);
    g.beginPath();
    g.moveTo(-6, -22); g.lineTo(6, -22); g.lineTo(3, 44); g.lineTo(-3, 44); g.closePath(); g.fillPath();
    g.fillStyle(0x770010, 1);
    for (let i = -18; i < 40; i += 8) g.fillTriangle(6, i, 12, i + 3, 6, i + 6); // serrations
    container.add(g);

    this.bloodBlade = { gfx: container, owner, y: caster.y - scene.scale.height, descending: true, lastSwingAt: 0, prevBlood: 0 };
    this.arena.player.incomingDamageMultiplier = 1.5;
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
    if (blade.descending && blade.gfx) {
      blade.y += (delta / 1000) * 1100;
      blade.gfx.setPosition(caster.x, blade.y);
      if (blade.y >= caster.y) {
        blade.descending = false;
        const g = blade.gfx;
        blade.gfx = null;
        this.arena.spawnHitFlash(caster.x, caster.y, 0xcc0022);
        this.arena.scene.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
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

    // Same sword-sweep as the base slash, dark-red and serrated.
    this.drawSwordSwing(caster.x, caster.y, ang, { handle: 0x4a0008, accent: 0x8a1020, blade: 0xaa0018, edge: 0xff4466, serrated: true });

    // Hit every enemy in a frontal arc within melee range. Damage feeds blood
    // (not puddles) via onDamageDealt while the blade is out.
    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, t.x, t.y) > BLOOD_BLADE_RANGE) continue;
      const toAng = Math.atan2(t.y - caster.y, t.x - caster.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toAng - ang)) > Math.PI / 2) continue;
      const dmg = dmgOverride ?? BLOOD_BLADE_SWING_DMG;
      t.takeDamage(dmg);
      this.arena.spawnHitFlash(t.x, t.y, 0xcc0022);
      this.arena.showFloatingText(t.x, t.y - 30, `🗡️ ${dmg}`, '#ff3355');
      if (t.hp <= 0) this.arena.recordMasteryStat('bloodBladeKills', 1);
    }
  }

  private dismissBloodBlade(): void {
    if (!this.bloodBlade) return;
    const owner = this.bloodBlade.owner;
    if (this.bloodBlade.gfx) this.bloodBlade.gfx.destroy();
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
    const barrier = this.arena.scene.add.rectangle(bx, by, 12, 62, red ? 0xcc0022 : 0x99aabb, 0.85)
      .setStrokeStyle(2, red ? 0xff5577 : 0xccddee).setRotation(ang + Math.PI / 2).setDepth(7);
    this.steelShields[owner] = { endTime: this.arena.scene.time.now + STEEL_SHIELD_DURATION_MS, red, barrier };
    caster.steelShieldMult = STEEL_SHIELD_DMG_MULT;
    this.arena.showFloatingText(caster.x, caster.y - 44, red ? '🛡️ RED STEEL SHIELD' : '🛡️ STEEL SHIELD', red ? '#ff5577' : '#aabbcc');
  }

  private destroySteelShield(owner: 'player' | 'npc'): void {
    const s = this.steelShields[owner];
    if (!s) return;
    s.barrier.destroy();
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
      s.barrier.setPosition(bx, by).setRotation(ang + Math.PI / 2);

      // Block incoming projectiles: player shield eats enemy shots, npc shield eats player shots.
      const group = this.arena.projectiles;
      if (!group) continue;
      for (const obj of [...group.getChildren()]) {
        const p = obj as Projectile;
        if (!p.active) continue;
        const incoming = owner === 'player' ? !p.isFromPlayer : p.isFromPlayer;
        if (!incoming) continue;
        if (Phaser.Math.Distance.Between(bx, by, p.x, p.y) > STEEL_SHIELD_BLOCK_RADIUS) continue;
        p.destroy();
        this.arena.spawnHitFlash(bx, by, s.red ? 0xff5577 : 0xccddee);
        // Red shield (cast during Clot Armor) sprays a shard burst per blocked shot.
        if (s.red) this.fireSteelShieldShards(owner, bx, by);
      }
    }
  }

  private fireSteelShieldShards(owner: 'player' | 'npc', x: number, y: number): void {
    const { scene } = this.arena;
    const sceneAdd = (scene as Phaser.Scene & { add: Phaser.GameObjects.GameObjectFactory }).add;
    // Same count Clot Armor emits per burst (Exsanguinate perk bumps it to 8).
    const shardCount = owner === 'player' && this.arena.hasPerk('gunpowder') ? 8 : CLOT_SHARD_COUNT;
    for (let i = 0; i < shardCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spr = sceneAdd.rectangle(x, y, 10, 4, 0xcc0022, 0.95).setDepth(8).setRotation(ang);
      this.metalShardProjectiles.push({
        sprite: spr, x, y,
        vx: Math.cos(ang) * CLOT_SHARD_SPEED, vy: Math.sin(ang) * CLOT_SHARD_SPEED,
        owner, active: true, dmg: CLOT_SHARD_DAMAGE, spawnsPuddle: true,
      });
    }
  }

  private updateBloodHud(): void {
    if (!this.bloodBarBg || this.arena.elementId !== 'metal') return;
    const ratio = this.blood.player / BLOOD_MAX;
    this.bloodBarFill!.width = 148 * ratio;
  }
}
