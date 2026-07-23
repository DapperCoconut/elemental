import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { HealthBar } from '../../combat/HealthBar';
import {
  GROWTH_EVOLVE_NODES,
  GROWTH_EVOLVE_PATHS,
  GROWTH_EVOLVE_MAX_LEVEL,
  GROWTH_EVOLVE_ULTIMATE_MAX_LEVEL,
  GROWTH_EVOLVE_ULTIMATE_COST,
  GROWTH_EVOLVE_ULTIMATE_PREREQ,
  GROWTH_EVOLVE_ULTIMATE_IDS,
  GrowthEvolveNodeDef,
  growthEvolveNodeCost,
} from '../../data/GrowthEvolve';

type Owner = 'player' | 'npc';
type CloneVariant = 'yellow' | 'blue' | 'red';

// ── Mastery: Secret Upgrades passive + Emisis bindable ────────────────────────
const SECRET_UPGRADE_IDS = ['cancer-carapace', 'fungal-infection', 'regenerative', 'spines', 'titanic', 'micro'] as const;
type SecretUpgradeId = typeof SECRET_UPGRADE_IDS[number];
const SECRET_UPGRADE_NAMES: Record<SecretUpgradeId, string> = {
  'cancer-carapace': 'Cancer Carapace',
  'fungal-infection': 'Fungal Infection',
  'regenerative': 'Regenerative',
  'spines': 'Spines',
  'titanic': 'Titanic',
  'micro': 'Micro',
};
const SECRET_UPGRADE_COST = 5;
const CARAPACE_INTERVAL_MS = 5000;
const FUNGAL_INTERVAL_MS = 3000;
const REGEN_PER_SEC = 3;
const SPINES_RADIUS = 48;
const SPINES_DAMAGE = 15;
const SPINES_CD_MS = 500;
const TITANIC_SIZE_MULT = 1.2;
const TITANIC_MAXHP_BONUS = 25;
const MICRO_SIZE_MULT = 0.75;
const MICRO_MAXHP_LOSS = 15;
const EMISIS_CLOUD_COUNT = 10;
const EMISIS_CONE_DEG = 55;
const EMISIS_RANGE = 155;
const EMISIS_SPEED = 300;
const EMISIS_DNA_COST = 2;
const EMISIS_COOLDOWN_MS = 8000;
const EMISIS_CLOUD_RADIUS = 17;
const EMISIS_BASE_DAMAGE = 3;
const EMISIS_MAX_DAMAGE = 10;
const EMISIS_MAX_SPORES = 40;      // don't let cloud-splitting run the spore list away

interface EmisisCloud {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: Owner;
  dmg: number;
  expiresAt: number;
  hit: Set<Fighter>;
  splitsLeft: number;
}

const DNA_CAP = 10;
const DNA_CAP_MAXIMIZED = 20;
const DNA_PICKUP_RADIUS = 26;
const DNA_PICKUP_LIFESPAN = 8000;

const LEECH_ATTACH_RADIUS = 20;
const LEECH_FLIGHT_SPEED = 500;
const LEECH_FLIGHT_TIMEOUT = 2000;
const LEECH_LOCATOR_RADIUS = 70;
const LEECH_LOCATOR_TURN_RATE = 6; // steering strength, per second

const WORM_BASE_HP = 20;
const WORM_HP_PER_LIFESPAN_TIER = 10; // Un-leeched: Healthy Leeches grants bonus HP instead of lifespan
const WORM_SPEED = 110;
const WORM_MELEE_RANGE = 26;
const WORM_DAMAGE_MULT = 2;
const WORM_LIFESPAN_MS = 6000;

const PENICILLIN_CHANCE = 0.33;
const PENICILLIN_LIFESPAN = 15000;
const PENICILLIN_HEAL = 25;
const PENICILLIN_RADIUS = 8;
const PENICILLIN_PICKUP_RADIUS = 24;

const VARIANT_COLORS: Record<CloneVariant, number> = { yellow: 0xffee44, blue: 0x4488ff, red: 0xff4444 };
const VARIANT_SPEED_MULT = 1.25;   // yellow: clone/player move speed
const VARIANT_DR_MULT = 0.75;      // blue: incoming damage multiplier
const VARIANT_DMG_MULT = 1.25;     // red: outgoing leech/spore damage multiplier

const SPORE_SCATTER = 40;
const SPORE_GROW_MS = 5000;
const SPORE_MIN_RADIUS = 6;
const SPORE_MAX_RADIUS = 26;
const SPORE_MIN_DMG = 3;
const SPORE_MAX_DMG = 15;
const SPORE_TICK_MS = 400;
const SECONDARY_SPORE_RADIUS = 8;
const SECONDARY_SPORE_DMG = 8;
const SECONDARY_SPORE_LIFESPAN = 2500;

const CANCER_DURATION = 8000;
const CANCER_ATTACH_RADIUS = 22; // matches Fighter's base hit-circle radius, so orbs sit half-embedded in the sprite
const CANCER_ORB_RADIUS = 14;
const CANCER_MAX_ORBS = 20;

const NEST_MAX_HP = 100;
const NEST_HEAL_PER_SEC = 5;
const CLONE_MAX_HP = 200;
const CLONE_SPEED = 140;
const CLONE_HIT_RADIUS = 18;
// Clone mirrors the player's own kit rather than a generic melee/ranged attack — it casts
// Cancer/Spore Spread/Leech Brood on the same cooldowns those abilities use for a real caster.
const CLONE_ENGAGE_RANGE = 400;
const CLONE_SPORE_CAST_RANGE = 450;
const CLONE_LEECH_COOLDOWN = 750;
const CLONE_SPORE_COOLDOWN = 6000;
const CLONE_CANCER_COOLDOWN = 20000;
// Once engaged, a clone doesn't freeze in place — it backs off if the target crowds it and
// otherwise circles around at range, like the NPC AI's strafing, instead of standing still.
const CLONE_RETREAT_RANGE = 130;
const CLONE_STRAFE_SPEED_MULT = 0.55;

const EVOLVE_INVINCIBLE_DURATION = 5000;
const EVOLVE_INVINCIBLE_COOLDOWN = 20000;
const EVOLVE_INVINCIBLE_TINT = 0x888888;

// ── Types ────────────────────────────────────────────────────────────────

interface Leech {
  container: Phaser.GameObjects.Container;
  owner: Owner;
  stuck: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  target: Fighter | null;
  offsetAngle: number;
  expiresAt: number;
  tickAccum: number;
  spawnedAt: number;
  /** Un-leeched: a ground-based worm with its own HP instead of a flying/attaching projectile. */
  isWorm?: boolean;
  hp?: number;
  /** Outgoing damage multiplier — carries the Mutation upgrade's red bonus from clone or player casts. */
  dmgMult?: number;
}

interface Spore {
  gfx: Phaser.GameObjects.Arc;
  owner: Owner;
  x: number;
  y: number;
  radius: number;
  isSecondary: boolean;
  burstAt: number;
  expiresAt: number;
  tickAccum: number;
  dmgMult?: number;
}

interface Penicillin {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  expiresAt: number;
}

interface CancerOrb {
  gfx: Phaser.GameObjects.Arc;
  angle: number;
}

interface CancerState {
  orbs: CancerOrb[];
  expireAt: number;
  dupAccum: number;
}

interface DnaPickup {
  gfx: Phaser.GameObjects.Text;
  x: number;
  y: number;
  owner: Owner;
  expiresAt: number;
}

interface Nest {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  hp: number;
  owner: Owner;
}

interface Clone {
  sprite: Phaser.GameObjects.Sprite;
  healthBar: HealthBar;
  hp: number;
  owner: Owner;
  cancer: CancerState | null;
  lastLeechAt: number;
  lastSporeAt: number;
  lastCancerAt: number;
  /** Mutation upgrade: random stat-boosting variant granted to a fresh clone. */
  variant: CloneVariant | null;
  strafeDir: number;
  nextStrafeDirChangeAt: number;
}

// ── Arena API ────────────────────────────────────────────────────────────

export interface GrowthArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly enemies: Fighter[];
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly elementId: string;
  readonly npcElementId: string;
  readonly width: number;
  readonly hpBarY: number;
  readonly hpBarW: number;
  readonly hpBarH: number;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly nukeChanneling: boolean;
  hasUpgrade(slot: string): boolean;
  getNearestEnemy(x: number, y: number): Fighter;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
  /** True only when the player is growth AND Growth Mastery is switched on. */
  get masteryActive(): boolean;
  /** True only when the online opponent is growth AND has Growth Mastery on. */
  get npcMasteryActive(): boolean;
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  recordMasteryBest(key: string, value: number): void;
  getMasteryStat(key: string): number;
}

// ── GrowthKit ────────────────────────────────────────────────────────────

export class GrowthKit {
  private leeches: Leech[] = [];
  private spores: Spore[] = [];
  private playerCancer: CancerState | null = null;
  private npcCancer: CancerState | null = null;
  private dnaPickups: DnaPickup[] = [];
  private nests: Nest[] = [];
  private clones: Clone[] = [];
  private penicillins: Penicillin[] = [];

  private playerDna = 0;
  private npcDna = 0;
  private playerDmgAccum: Map<Fighter, number> = new Map();
  private npcDmgAccum: Map<Fighter, number> = new Map();

  /** Mutation upgrade: variant inherited by the player after inhabiting a variant clone. */
  private playerVariantBuff: CloneVariant | null = null;

  // Evolve tree (player-only meta progression for the current match)
  private evolveLevels: Record<string, number> = {};
  private evolveOpen = false;
  private evolveGfx: Phaser.GameObjects.Graphics | null = null;
  private evolveLabels: Phaser.GameObjects.Text[] = [];
  private evolveHexAreas: Array<{ id: string; x: number; y: number; r: number }> = [];
  private evolveDnaText: Phaser.GameObjects.Text | null = null;
  private evolveRightWasDown = false;

  // Evolve invincibility: opening the tree grants a brief damage-immune window on a cooldown.
  private evolveInvincibleActive = false;
  private evolveInvincibleEndsAt = 0;
  private evolveInvincibleCooldownUntil = 0;

  private npcDnaBarGfx: Phaser.GameObjects.Graphics | null = null;

  private dnaHudBarBg: Phaser.GameObjects.Rectangle | null = null;
  private dnaHudBarFill: Phaser.GameObjects.Rectangle | null = null;
  private dnaHudBarText: Phaser.GameObjects.Text | null = null;

  // ── Mastery: Secret Upgrades passive + Emisis bindable ────────────────
  private secretOffered: SecretUpgradeId[] = [];
  private secretOfferedPicked = false;
  private secretBought: Set<SecretUpgradeId> = new Set();
  private carapaceAccum = 0;
  private fungalAccum = 0;
  private regenAccum = 0;
  private spineNextHit: Map<Fighter, number> = new Map();
  private emisisClouds: EmisisCloud[] = [];
  private emisisLastCastAt = -EMISIS_COOLDOWN_MS;

  constructor(private arena: GrowthArenaApi) {}

  // ── Reset ─────────────────────────────────────────────────────────────

  reset(): void {
    for (const l of this.leeches) l.container.destroy();
    this.leeches = [];

    for (const s of this.spores) s.gfx.destroy();
    this.spores = [];

    if (this.playerCancer) { for (const o of this.playerCancer.orbs) o.gfx.destroy(); this.playerCancer = null; }
    if (this.npcCancer) { for (const o of this.npcCancer.orbs) o.gfx.destroy(); this.npcCancer = null; }

    for (const p of this.dnaPickups) p.gfx.destroy();
    this.dnaPickups = [];

    for (const n of this.nests) n.gfx.destroy();
    this.nests = [];

    for (const c of this.clones) {
      if (c.cancer) for (const o of c.cancer.orbs) o.gfx.destroy();
      c.sprite.destroy();
      c.healthBar.destroy();
    }
    this.clones = [];

    for (const p of this.penicillins) p.gfx.destroy();
    this.penicillins = [];

    this.playerDna = 0;
    this.npcDna = 0;
    this.playerDmgAccum = new Map();
    this.npcDmgAccum = new Map();
    this.playerVariantBuff = null;
    this.evolveLevels = {};
    this.closeEvolve();
    this.evolveRightWasDown = false;
    this.evolveInvincibleCooldownUntil = 0;

    if (this.npcDnaBarGfx) { this.npcDnaBarGfx.destroy(); this.npcDnaBarGfx = null; }

    if (this.dnaHudBarBg) { this.dnaHudBarBg.destroy(); this.dnaHudBarBg = null; }
    if (this.dnaHudBarFill) { this.dnaHudBarFill.destroy(); this.dnaHudBarFill = null; }
    if (this.dnaHudBarText) { this.dnaHudBarText.destroy(); this.dnaHudBarText = null; }

    // Mastery — Secret Upgrades + Emisis
    this.secretOffered = [];
    this.secretOfferedPicked = false;
    this.secretBought = new Set();
    this.carapaceAccum = 0;
    this.fungalAccum = 0;
    this.regenAccum = 0;
    this.spineNextHit = new Map();
    for (const c of this.emisisClouds) c.gfx.destroy();
    this.emisisClouds = [];
    this.emisisLastCastAt = -EMISIS_COOLDOWN_MS;
  }

  // ── Input ─────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.arena.nukeChanneling) return;
    const { player, eKey, rKey, fKey, qKey, pointerWasDown } = this.arena;

    if (this.evolveOpen) {
      if (pointer.leftButtonDown() && !pointerWasDown) {
        this.handleEvolveClick(pointer.x, pointer.y, false);
      } else if (pointer.rightButtonDown() && !this.evolveRightWasDown) {
        this.handleEvolveClick(pointer.x, pointer.y, true);
      }
      this.evolveRightWasDown = pointer.rightButtonDown();
      if (Phaser.Input.Keyboard.JustDown(eKey)) this.closeEvolve();
      return;
    }

    // ── Mastery — Emisis takes over whichever slot it's bound to ──────────
    const emisisSlot = this.arena.masteryActive ? this.emisisSlot() : null;
    if (emisisSlot) {
      const ek = emisisSlot === 'e' ? eKey : emisisSlot === 'r' ? rKey : emisisSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(ek)) this.tryCastEmisis(time, mouseX, mouseY);
    }

    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);
    if (pointer.isDown) player.castAbility('growth-click', ctx());
    if (emisisSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('growth-evolve', ctx());
    if (emisisSlot !== 'r' && Phaser.Input.Keyboard.JustDown(rKey)) player.castAbility('spore-spread', ctx());
    if (emisisSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) player.castAbility('growth-cancer', ctx());
    if (emisisSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      if (this.playerDna < this.auxCost('player')) {
        this.arena.showFloatingText(player.x, player.y - 30, 'Not enough DNA', '#ff6666');
      } else {
        player.castAbility('auxiliary-growth', ctx());
      }
    }
  }

  // ── Per-frame update ─────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.updateLeeches(time, delta);
    this.updateSpores(time, delta);
    this.updateCancer(time, delta, 'player');
    this.updateCancer(time, delta, 'npc');
    this.updateDnaPickups(time);
    this.updatePenicillins(time);
    this.updateNests(time, delta);
    this.updateClones(time, delta);
    this.updateSecretPassives(time, delta);
    this.updateEmisisClouds(time, delta);
    if (this.evolveInvincibleActive && time >= this.evolveInvincibleEndsAt) this.endEvolveInvincibility();
    this.drawDnaBar();
    this.drawDnaHudBar();
  }

  // ── Public do* methods (wired from CastContext) ─────────────────────

  doLeechBrood(tx: number, ty: number, owner: Owner): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.launchLeech(caster.x, caster.y, tx, ty, owner);
  }

  private launchLeech(ox: number, oy: number, tx: number, ty: number, owner: Owner, dmgMultOverride?: number): void {
    const dmgMult = dmgMultOverride ?? (owner === 'player' ? this.playerRedDamageMult() : 1);

    if (owner === 'player' && this.levelOf('un-leeched') > 0) {
      this.spawnWormLeech(ox, oy, owner, dmgMult);
      return;
    }

    const dx = tx - ox, dy = ty - oy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;
    const { scene } = this.arena;

    const vile = owner === 'player' && this.levelOf('vile-leeches') > 0;
    const color = vile ? 0xdd3333 : 0x339933;
    const scale = vile ? 1.4 : 1;
    const container = scene.add.container(ox, oy).setDepth(6);
    const seg3 = scene.add.circle(-15 * scale, 3 * scale, 3 * scale, color, 0.75) as Phaser.GameObjects.Arc;
    const seg2 = scene.add.circle(-8 * scale, 1.5 * scale, 4.5 * scale, color, 0.85) as Phaser.GameObjects.Arc;
    const seg1 = scene.add.circle(0, 0, 6 * scale, color, 0.95) as Phaser.GameObjects.Arc;
    container.add([seg3, seg2, seg1]);
    container.setRotation(Math.atan2(ny, nx));

    this.leeches.push({
      container, owner, stuck: false,
      x: ox, y: oy, vx: nx * LEECH_FLIGHT_SPEED, vy: ny * LEECH_FLIGHT_SPEED,
      target: null, offsetAngle: Math.random() * Math.PI * 2,
      expiresAt: 0, tickAccum: 0, spawnedAt: scene.time.now, dmgMult,
    });
  }

  /** Un-leeched: spawns a ground-based worm instead of a flying leech projectile. */
  private spawnWormLeech(ox: number, oy: number, owner: Owner, dmgMult: number): void {
    const { scene } = this.arena;
    const container = scene.add.container(ox, oy).setDepth(6);
    const seg3 = scene.add.circle(-12, 2, 5, 0x774411, 0.9) as Phaser.GameObjects.Arc;
    const seg2 = scene.add.circle(-6, 1, 6, 0x885518, 0.95) as Phaser.GameObjects.Arc;
    const seg1 = scene.add.circle(0, 0, 7, 0x996622, 1) as Phaser.GameObjects.Arc;
    container.add([seg3, seg2, seg1]);

    const hp = WORM_BASE_HP + this.levelOf('healthy-leeches') * WORM_HP_PER_LIFESPAN_TIER;
    this.leeches.push({
      container, owner, stuck: false, x: ox, y: oy, vx: 0, vy: 0,
      target: null, offsetAngle: 0, expiresAt: scene.time.now + WORM_LIFESPAN_MS,
      tickAccum: 0, spawnedAt: scene.time.now, isWorm: true, hp, dmgMult,
    });
  }

  doToggleEvolve(owner: Owner): void {
    if (owner !== 'player') return;
    if (this.evolveOpen) {
      this.closeEvolve();
    } else {
      this.evolveOpen = true;
      this.renderEvolve();
      this.tryActivateEvolveInvincibility();
    }
  }

  private tryActivateEvolveInvincibility(): void {
    const { player, scene } = this.arena;
    const now = scene.time.now;
    if (now < this.evolveInvincibleCooldownUntil) return;
    this.evolveInvincibleActive = true;
    this.evolveInvincibleEndsAt = now + EVOLVE_INVINCIBLE_DURATION;
    this.evolveInvincibleCooldownUntil = now + EVOLVE_INVINCIBLE_COOLDOWN;
    player.isInvincible = true;
    player.setTint(EVOLVE_INVINCIBLE_TINT);
    this.arena.showFloatingText(player.x, player.y - 40, '🛡 Invincible', '#cccccc');
  }

  private endEvolveInvincibility(): void {
    if (!this.evolveInvincibleActive) return;
    this.evolveInvincibleActive = false;
    this.arena.player.isInvincible = false;
    this.arena.player.clearTint();
  }

  doSporeSpread(tx: number, ty: number, owner: Owner, dmgMultOverride?: number): void {
    const dmgMult = dmgMultOverride ?? (owner === 'player' ? this.playerRedDamageMult() : 1);
    const { scene } = this.arena;
    const count = this.sporeCount(owner);
    const color = owner === 'player' ? 0x66cc44 : 0xcc6644;
    for (let i = 0; i < count; i++) {
      const ox = tx + (Math.random() * SPORE_SCATTER * 2 - SPORE_SCATTER);
      const oy = ty + (Math.random() * SPORE_SCATTER * 2 - SPORE_SCATTER);
      const gfx = scene.add.circle(ox, oy, SPORE_MIN_RADIUS, color, 0.75).setDepth(6) as Phaser.GameObjects.Arc;
      this.spores.push({
        gfx, owner, x: ox, y: oy, radius: SPORE_MIN_RADIUS, isSecondary: false,
        burstAt: scene.time.now + SPORE_GROW_MS, expiresAt: 0, tickAccum: 0, dmgMult,
      });
      this.maybeSpawnPenicillin(ox, oy, owner);
    }
  }

  doCancer(owner: Owner): void {
    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    const state = this.buildCancerState(fighter.x, fighter.y, owner);
    if (owner === 'player') this.playerCancer = state; else this.npcCancer = state;
    this.arena.showFloatingText(fighter.x, fighter.y - 40, '🟣 CANCER', '#9933cc');
  }

  private buildCancerState(x: number, y: number, owner: Owner): CancerState {
    const count = this.cancerOrbCount(owner);
    const { scene } = this.arena;
    const orbs: CancerOrb[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const ox = x + Math.cos(angle) * CANCER_ATTACH_RADIUS;
      const oy = y + Math.sin(angle) * CANCER_ATTACH_RADIUS;
      const gfx = scene.add.circle(ox, oy, CANCER_ORB_RADIUS, 0x9933cc, 0.85).setDepth(6) as Phaser.GameObjects.Arc;
      orbs.push({ gfx, angle });
    }
    return { orbs, expireAt: scene.time.now + CANCER_DURATION, dupAccum: 0 };
  }

  doAuxiliaryGrowth(owner: Owner): void {
    const cost = this.auxCost(owner);
    const dna = owner === 'player' ? this.playerDna : this.npcDna;
    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    if (dna < cost) {
      this.arena.showFloatingText(fighter.x, fighter.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    if (owner === 'player') this.playerDna -= cost; else this.npcDna -= cost;

    const { scene } = this.arena;
    const angle = Math.random() * Math.PI * 2;
    const nx = Phaser.Math.Clamp(fighter.x + Math.cos(angle) * 60, 40, scene.scale.width - 40);
    const ny = Phaser.Math.Clamp(fighter.y + Math.sin(angle) * 60, 40, scene.scale.height - 40);
    const gfx = scene.add.circle(nx, ny, 12, 0x557733, 0.9).setDepth(5) as Phaser.GameObjects.Arc;
    this.nests.push({ gfx, x: nx, y: ny, hp: 10, owner });
    this.arena.showFloatingText(fighter.x, fighter.y - 40, '🥚 Nest planted', '#88bb22');
    if (owner === 'player') this.arena.recordMasteryStat('auxClones', 1);
  }

  // ── Second life: intercept a lethal hit if a clone is alive ─────────

  onPlayerDamaged(): void {
    this.tryInhabitClone('player');
  }

  onNpcDamaged(): void {
    this.tryInhabitClone('npc');
  }

  private tryInhabitClone(owner: Owner): void {
    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    if (fighter.hp > 0) return;
    const idx = this.clones.findIndex((c) => c.owner === owner);
    if (idx === -1) return;
    const clone = this.clones[idx];
    this.clones.splice(idx, 1);
    fighter.hp = Math.max(1, Math.min(fighter.maxHp, clone.hp));
    const cx = clone.sprite.x, cy = clone.sprite.y;
    clone.sprite.destroy();
    clone.healthBar.destroy();
    (fighter.body as Phaser.Physics.Arcade.Body).reset(cx, cy);
    if (owner === 'player' && clone.variant) this.applyPlayerVariantBuff(clone.variant);
    this.arena.showFloatingText(fighter.x, fighter.y - 40, '🧟 INHABITED CLONE!', '#88ff44');
    const flash = this.arena.scene.add.circle(fighter.x, fighter.y, 14, 0x88bb22, 0.8).setDepth(10);
    this.arena.scene.tweens.add({ targets: flash, scaleX: 5, scaleY: 5, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
  }

  // ── AI query helpers ──────────────────────────────────────────────────

  getDna(owner: Owner): number { return owner === 'player' ? this.playerDna : this.npcDna; }
  getAuxCost(owner: Owner): number { return this.auxCost(owner); }
  hasClone(owner: Owner): boolean { return this.clones.some((c) => c.owner === owner); }
  hasNest(owner: Owner): boolean { return this.nests.some((n) => n.owner === owner); }
  isCancerActive(owner: Owner): boolean { return owner === 'player' ? this.playerCancer !== null : this.npcCancer !== null; }

  /**
   * Called synchronously from ArenaScene's projectile-vs-fighter overlap, before any damage
   * is applied. Arcade physics resolves that overlap before this kit's per-frame update runs,
   * so relying on the frame-by-frame sweep alone lets a hit land the same frame it first
   * touches both the orb and the fighter's body. Checking here — right at the moment of
   * impact — closes that race and keeps every orb honoring its "only if it hits me" contract.
   */
  tryBlockCancer(defender: Owner, proj: Projectile): boolean {
    const state = defender === 'player' ? this.playerCancer : this.npcCancer;
    if (!state) return false;
    return this.blockWithOrb(state, proj, defender);
  }

  private blockWithOrb(state: CancerState, proj: Projectile, owner: Owner): boolean {
    // Derived from the projectile's real touch radius, not a flat guess — a fixed radius here
    // used to sit just inside the fighter's own hit-circle (once the projectile's body size is
    // folded in), so the orb never got a chance to intercept before the fighter simply got hit.
    const body = proj.body as Phaser.Physics.Arcade.Body;
    const projRadius = body.isCircle ? body.radius : Math.max(body.halfWidth, body.halfHeight);
    const blockRadius = CANCER_ORB_RADIUS + projRadius;
    for (let i = state.orbs.length - 1; i >= 0; i--) {
      const orb = state.orbs[i];
      if (Phaser.Math.Distance.Between(proj.x, proj.y, orb.gfx.x, orb.gfx.y) <= blockRadius) {
        proj.setActive(false).setVisible(false);
        body.stop();
        this.arena.spawnHitFlash(orb.gfx.x, orb.gfx.y, 0x9933cc);
        orb.gfx.destroy();
        state.orbs.splice(i, 1);
        if (owner === 'player') {
          this.arena.recordMasteryStat('cancerBlocks', 1);
          if (this.arena.hasUpgrade('f')) {
            this.arena.player.increaseMaxHp(10);
            this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, '+10 Max HP', '#88ffaa');
          }
          if (this.levelOf('cancer-synthesis') > 0) {
            this.arena.player.heal(10);
            this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 50, '+10 HP', '#66dd66');
          }
        }
        return true;
      }
    }
    return false;
  }

  // ── Evolve tree effective stats ───────────────────────────────────────

  private levelOf(id: string): number { return this.evolveLevels[id] ?? 0; }

  private leechDamage(owner: Owner): number {
    if (owner === 'npc') return 3;
    return 3 + this.levelOf('deadly-leeches') + this.levelOf('vile-leeches') * 2;
  }
  private leechMaxPerTarget(owner: Owner): number {
    if (owner === 'npc') return 5;
    return 5 + this.levelOf('swarming-leeches');
  }
  private leechTickMs(owner: Owner): number {
    if (owner === 'npc') return 500;
    return Math.max(200, 500 - this.levelOf('quick-leeches') * 100);
  }
  private leechLifespanMs(owner: Owner): number {
    if (owner === 'npc') return 3000;
    return 3000 + this.levelOf('healthy-leeches') * 1000;
  }
  private leechHealOnExpire(owner: Owner): number {
    if (owner === 'npc') return 0;
    return this.levelOf('leech-life') * 2;
  }
  private dnaThreshold(owner: Owner): number {
    if (owner === 'npc') return 25;
    return Math.max(15, 25 - this.levelOf('rna-fabrication') * 2.5);
  }
  private sporeCount(owner: Owner): number {
    if (owner === 'npc') return 3;
    return 3 + this.levelOf('spore-blast');
  }
  private cancerOrbCount(owner: Owner): number {
    if (owner === 'npc') return 3;
    return 3 + this.levelOf('vigorous-cancer');
  }
  private cancerDupChance(owner: Owner): number {
    if (owner === 'npc') return 0;
    return this.levelOf('malignant-cancer') * 0.15;
  }
  private auxCost(owner: Owner): number {
    if (owner === 'npc') return 8;
    return Math.max(4, 8 - this.levelOf('broodmother'));
  }
  private dnaCap(owner: Owner): number {
    return owner === 'player' && this.levelOf('dna-maximization') > 0 ? DNA_CAP_MAXIMIZED : DNA_CAP;
  }
  /** Mutation upgrade (red): bonus applied to the player's own leech/spore damage after inhabiting a red clone. */
  private playerRedDamageMult(): number {
    return this.playerVariantBuff === 'red' ? VARIANT_DMG_MULT : 1;
  }
  private cloneDamageMult(c: Clone): number {
    return c.variant === 'red' ? VARIANT_DMG_MULT : 1;
  }
  private applyPlayerVariantBuff(variant: CloneVariant): void {
    this.clearPlayerVariantBuff();
    const p = this.arena.player;
    if (variant === 'yellow') p.speed *= VARIANT_SPEED_MULT;
    if (variant === 'blue') p.incomingDamageMultiplier *= VARIANT_DR_MULT;
    this.playerVariantBuff = variant;
  }
  private clearPlayerVariantBuff(): void {
    if (!this.playerVariantBuff) return;
    const p = this.arena.player;
    if (this.playerVariantBuff === 'yellow') p.speed /= VARIANT_SPEED_MULT;
    if (this.playerVariantBuff === 'blue') p.incomingDamageMultiplier /= VARIANT_DR_MULT;
    this.playerVariantBuff = null;
  }

  // ── DNA accumulation + pickups ─────────────────────────────────────

  private registerDamage(owner: Owner, target: Fighter, amount: number): void {
    if (amount <= 0) return;
    const map = owner === 'player' ? this.playerDmgAccum : this.npcDmgAccum;
    let total = (map.get(target) ?? 0) + amount;
    const threshold = this.dnaThreshold(owner);
    while (total >= threshold) {
      total -= threshold;
      this.spawnDnaPickup(target.x, target.y, owner);
    }
    map.set(target, total);
  }

  private spawnDnaPickup(x: number, y: number, owner: Owner): void {
    const { scene } = this.arena;
    const jx = x + (Math.random() * 30 - 15);
    const jy = y + (Math.random() * 30 - 15);
    const gfx = scene.add.text(jx, jy, '🧬', { fontSize: '16px' }).setOrigin(0.5).setDepth(9);
    scene.tweens.add({ targets: gfx, y: jy - 6, yoyo: true, repeat: -1, duration: 500 });
    this.dnaPickups.push({ gfx, x: jx, y: jy, owner, expiresAt: scene.time.now + DNA_PICKUP_LIFESPAN });
  }

  private updateDnaPickups(time: number): void {
    for (let i = this.dnaPickups.length - 1; i >= 0; i--) {
      const p = this.dnaPickups[i];
      if (time >= p.expiresAt) { p.gfx.destroy(); this.dnaPickups.splice(i, 1); continue; }
      const collector = p.owner === 'player' ? this.arena.player : this.arena.npc;
      if (!collector.active) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, collector.x, collector.y);
      if (d <= DNA_PICKUP_RADIUS) {
        p.gfx.destroy();
        this.dnaPickups.splice(i, 1);
        const gain = p.owner === 'player' && this.levelOf('dna-maximization') > 0 ? 2 : 1;
        this.addDna(p.owner, gain);
      }
    }
  }

  private addDna(owner: Owner, amount: number): void {
    const cap = this.dnaCap(owner);
    if (owner === 'player') {
      this.playerDna = Math.min(cap, this.playerDna + amount);
    } else {
      this.npcDna = Math.min(cap, this.npcDna + amount);
    }
  }

  /** Floating DNA bar above the NPC's head — the player's own DNA is shown on the HUD bar instead. */
  private drawDnaBar(): void {
    if (this.arena.npcElementId !== 'growth') {
      if (this.npcDnaBarGfx) this.npcDnaBarGfx.clear();
      return;
    }
    const fighter = this.arena.npc;
    let g = this.npcDnaBarGfx;
    if (!g) {
      g = this.arena.scene.add.graphics().setDepth(10);
      this.npcDnaBarGfx = g;
    }
    g.clear();
    const w = 44, h = 5;
    const bx = fighter.x - w / 2;
    const by = fighter.y - 29;
    g.fillStyle(0x111111, 0.85);
    g.fillRect(bx - 1, by - 1, w + 2, h + 2);
    g.fillStyle(0x44ddaa, 1);
    g.fillRect(bx, by, w * (this.npcDna / DNA_CAP), h);
  }

  /** DNA bar pinned to the HUD, just below the top-of-screen HP bar (player only — that bar has no NPC counterpart). */
  private drawDnaHudBar(): void {
    if (this.arena.elementId !== 'growth') {
      if (this.dnaHudBarBg) { this.dnaHudBarBg.destroy(); this.dnaHudBarBg = null; }
      if (this.dnaHudBarFill) { this.dnaHudBarFill.destroy(); this.dnaHudBarFill = null; }
      if (this.dnaHudBarText) { this.dnaHudBarText.destroy(); this.dnaHudBarText = null; }
      return;
    }
    const { scene, width } = this.arena;
    const barY = this.arena.hpBarY + this.arena.hpBarH / 2 + 8;
    const barH = 10;
    const left = width / 2 - this.arena.hpBarW / 2;
    if (!this.dnaHudBarBg) {
      this.dnaHudBarBg = scene.add.rectangle(width / 2, barY, this.arena.hpBarW + 4, barH + 4, 0x0a0a18, 0.9)
        .setStrokeStyle(2, 0x445577).setDepth(20);
      this.dnaHudBarFill = scene.add.rectangle(left, barY, 0, barH, 0x44ddaa, 1)
        .setOrigin(0, 0.5).setDepth(21);
      this.dnaHudBarText = scene.add
        .text(width / 2, barY, '', {
          fontSize: '11px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(22);
    }
    if (this.dnaHudBarFill) {
      const ratio = Math.min(1, this.playerDna / this.dnaCap('player'));
      this.dnaHudBarFill.setSize(this.arena.hpBarW * ratio, barH);
    }
    if (this.dnaHudBarText) {
      this.dnaHudBarText.setText(`\u{1F9EC} ${this.playerDna} / ${this.dnaCap('player')}`);
    }
  }

  // ── Leeches ────────────────────────────────────────────────────────

  private updateLeeches(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.leeches.length - 1; i >= 0; i--) {
      const l = this.leeches[i];
      if (l.isWorm) {
        if (this.updateWormLeech(l, time, delta)) this.leeches.splice(i, 1);
        continue;
      }
      if (!l.stuck) {
        if (l.owner === 'player' && this.arena.hasUpgrade('click')) {
          const targets = this.arena.enemies;
          let nearest: Fighter | null = null, nearestD = LEECH_LOCATOR_RADIUS;
          for (const t of targets) {
            if (!t.active || t.hp <= 0) continue;
            const d = Phaser.Math.Distance.Between(l.x, l.y, t.x, t.y);
            if (d < nearestD) { nearestD = d; nearest = t; }
          }
          if (nearest) {
            const dx = nearest.x - l.x, dy = nearest.y - l.y;
            const dlen = Math.sqrt(dx * dx + dy * dy) || 1;
            const desiredVx = (dx / dlen) * LEECH_FLIGHT_SPEED, desiredVy = (dy / dlen) * LEECH_FLIGHT_SPEED;
            const turn = Math.min(1, LEECH_LOCATOR_TURN_RATE * dt);
            l.vx += (desiredVx - l.vx) * turn;
            l.vy += (desiredVy - l.vy) * turn;
          }
        }
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.container.setPosition(l.x, l.y);

        const W = this.arena.scene.scale.width, H = this.arena.scene.scale.height;
        if (l.x < -20 || l.x > W + 20 || l.y < -20 || l.y > H + 20 || time - l.spawnedAt > LEECH_FLIGHT_TIMEOUT) {
          l.container.destroy();
          this.leeches.splice(i, 1);
          continue;
        }

        const targets = l.owner === 'player' ? this.arena.enemies : [this.arena.player];
        let attached = false;
        for (const t of targets) {
          if (!t.active || t.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(l.x, l.y, t.x, t.y);
          if (d <= LEECH_ATTACH_RADIUS) {
            if (this.countLeechesOn(t) >= this.leechMaxPerTarget(l.owner)) {
              l.container.destroy();
              this.leeches.splice(i, 1);
              attached = true;
              break;
            }
            l.stuck = true;
            l.target = t;
            l.expiresAt = time + this.leechLifespanMs(l.owner);
            l.tickAccum = 0;
            attached = true;
            break;
          }
        }
        if (attached) continue;
      } else {
        const t = l.target;
        if (!t) { l.container.destroy(); this.leeches.splice(i, 1); continue; }
        const naturalExpiry = t.active && t.hp > 0 && time >= l.expiresAt;
        const targetGone = !t.active || t.hp <= 0;
        if (naturalExpiry || targetGone) {
          if (naturalExpiry) {
            const heal = this.leechHealOnExpire(l.owner);
            if (heal > 0) {
              const caster = l.owner === 'player' ? this.arena.player : this.arena.npc;
              caster.heal(heal);
              this.arena.showFloatingText(caster.x, caster.y - 30, `+${heal} HP`, '#66dd66');
            }
          }
          l.container.destroy();
          this.leeches.splice(i, 1);
          continue;
        }

        l.container.setPosition(t.x + Math.cos(l.offsetAngle) * 14, t.y + Math.sin(l.offsetAngle) * 14);
        l.tickAccum += delta;
        const tickMs = this.leechTickMs(l.owner);
        if (l.tickAccum >= tickMs) {
          l.tickAccum -= tickMs;
          const dmg = Math.round(this.leechDamage(l.owner) * (l.dmgMult ?? 1));
          t.takeDamage(dmg);
          this.arena.spawnHitFlash(t.x, t.y, 0x339933);
          this.registerDamage(l.owner, t, dmg);
        }
      }
    }
  }

  /** Un-leeched: ground-based worm — homes toward its nearest target and melees for double damage. Returns true once it should be removed. */
  private updateWormLeech(l: Leech, time: number, delta: number): boolean {
    const dt = delta / 1000;
    for (const child of this.arena.projectiles.getChildren()) {
      const p = child as Projectile;
      if (!p.active) continue;
      const isEnemyProjectile = l.owner === 'player' ? !p.isFromPlayer : p.isFromPlayer;
      if (!isEnemyProjectile) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, l.x, l.y) <= 14) {
        l.hp = (l.hp ?? WORM_BASE_HP) - p.damage;
        p.setActive(false).setVisible(false);
        (p.body as Phaser.Physics.Arcade.Body).stop();
        this.arena.spawnHitFlash(l.x, l.y, 0x996622);
        break;
      }
    }
    if ((l.hp ?? 0) <= 0) {
      l.container.destroy();
      return true;
    }
    if (time >= l.expiresAt) {
      const heal = this.leechHealOnExpire(l.owner);
      if (heal > 0) {
        const caster = l.owner === 'player' ? this.arena.player : this.arena.npc;
        caster.heal(heal);
        this.arena.showFloatingText(caster.x, caster.y - 30, `+${heal} HP`, '#66dd66');
      }
      l.container.destroy();
      return true;
    }

    const targets = l.owner === 'player' ? this.arena.enemies : [this.arena.player];
    const target = this.nearestOf(l.x, l.y, targets);
    if (target) {
      const d = Phaser.Math.Distance.Between(l.x, l.y, target.x, target.y);
      if (d > WORM_MELEE_RANGE) {
        const nx = (target.x - l.x) / d, ny = (target.y - l.y) / d;
        l.x += nx * WORM_SPEED * dt;
        l.y += ny * WORM_SPEED * dt;
        l.container.setPosition(l.x, l.y);
        l.container.setRotation(Math.atan2(ny, nx));
      } else {
        l.tickAccum += delta;
        const tickMs = this.leechTickMs(l.owner);
        if (l.tickAccum >= tickMs) {
          l.tickAccum -= tickMs;
          const dmg = Math.round(this.leechDamage(l.owner) * WORM_DAMAGE_MULT * (l.dmgMult ?? 1));
          target.takeDamage(dmg);
          this.arena.spawnHitFlash(target.x, target.y, 0x996622);
          this.registerDamage(l.owner, target, dmg);
        }
      }
    }
    return false;
  }

  private countLeechesOn(target: Fighter): number {
    let n = 0;
    for (const l of this.leeches) if (l.stuck && l.target === target) n++;
    return n;
  }

  // ── Spores ─────────────────────────────────────────────────────────

  private updateSpores(time: number, delta: number): void {
    for (let i = this.spores.length - 1; i >= 0; i--) {
      const s = this.spores[i];
      if (!s.isSecondary) {
        const progress = Phaser.Math.Clamp(1 - (s.burstAt - time) / SPORE_GROW_MS, 0, 1);
        s.radius = SPORE_MIN_RADIUS + (SPORE_MAX_RADIUS - SPORE_MIN_RADIUS) * progress;
        s.gfx.setRadius(s.radius);
        if (time >= s.burstAt) {
          this.burstSpore(s);
          s.gfx.destroy();
          this.spores.splice(i, 1);
          continue;
        }
      } else if (time >= s.expiresAt) {
        s.gfx.destroy();
        this.spores.splice(i, 1);
        continue;
      }

      s.tickAccum += delta;
      if (s.tickAccum >= SPORE_TICK_MS) {
        s.tickAccum -= SPORE_TICK_MS;
        const targets = s.owner === 'player' ? this.arena.enemies : [this.arena.player];
        const baseDmg = s.isSecondary
          ? SECONDARY_SPORE_DMG
          : Math.round(SPORE_MIN_DMG + (SPORE_MAX_DMG - SPORE_MIN_DMG) * ((s.radius - SPORE_MIN_RADIUS) / (SPORE_MAX_RADIUS - SPORE_MIN_RADIUS)));
        const dmg = Math.round(baseDmg * (s.dmgMult ?? 1));
        let hit = false;
        for (const t of targets) {
          if (!t.active || t.hp <= 0) continue;
          const d = Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y);
          if (d <= s.radius + 16) {
            t.takeDamage(dmg, { source: s, sourceX: s.x, sourceY: s.y });
            this.arena.spawnHitFlash(t.x, t.y, 0x66cc44);
            this.registerDamage(s.owner, t, dmg);
            hit = true;
          }
        }
        if (hit) {
          s.gfx.destroy();
          this.spores.splice(i, 1);
          continue;
        }
      }
    }
  }

  private burstSpore(s: Spore): void {
    const { scene } = this.arena;
    const color = s.owner === 'player' ? 0x66cc44 : 0xcc6644;
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 12 + Math.random() * 10;
      const sx = s.x + Math.cos(angle) * dist;
      const sy = s.y + Math.sin(angle) * dist;
      const gfx = scene.add.circle(sx, sy, SECONDARY_SPORE_RADIUS, color, 0.7).setDepth(6) as Phaser.GameObjects.Arc;
      this.spores.push({
        gfx, owner: s.owner, x: sx, y: sy, radius: SECONDARY_SPORE_RADIUS, isSecondary: true,
        burstAt: 0, expiresAt: scene.time.now + SECONDARY_SPORE_LIFESPAN, tickAccum: 0, dmgMult: s.dmgMult,
      });
      this.maybeSpawnPenicillin(sx, sy, s.owner);
    }
  }

  // ── Penicillin (R+ upgrade) ─────────────────────────────────────────

  private maybeSpawnPenicillin(x: number, y: number, owner: Owner): void {
    if (owner !== 'player' || !this.arena.hasUpgrade('r')) return;
    if (Math.random() >= PENICILLIN_CHANCE) return;
    const { scene } = this.arena;
    const gfx = scene.add.circle(x, y, PENICILLIN_RADIUS, 0x3388ff, 0.85).setDepth(6) as Phaser.GameObjects.Arc;
    this.penicillins.push({ gfx, x, y, expiresAt: scene.time.now + PENICILLIN_LIFESPAN });
  }

  private updatePenicillins(time: number): void {
    for (let i = this.penicillins.length - 1; i >= 0; i--) {
      const p = this.penicillins[i];
      if (time >= p.expiresAt) { p.gfx.destroy(); this.penicillins.splice(i, 1); continue; }
      for (const f of [this.arena.player, this.arena.npc]) {
        if (!f.active || f.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) <= PENICILLIN_PICKUP_RADIUS) {
          f.heal(PENICILLIN_HEAL);
          this.arena.showFloatingText(f.x, f.y - 30, `+${PENICILLIN_HEAL} HP`, '#3388ff');
          p.gfx.destroy();
          this.penicillins.splice(i, 1);
          break;
        }
      }
    }
  }

  // ── Cancer ─────────────────────────────────────────────────────────

  private updateCancer(time: number, delta: number, owner: Owner): void {
    const state = owner === 'player' ? this.playerCancer : this.npcCancer;
    if (!state) return;
    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;

    // Proactively sweep every frame — catches a projectile as soon as it enters an orb's
    // radius, before it ever reaches the fighter's own hit-circle (which overlaps the orb).
    for (const child of this.arena.projectiles.getChildren()) {
      const p = child as Projectile;
      if (!p.active) continue;
      const isEnemyProjectile = owner === 'player' ? !p.isFromPlayer : p.isFromPlayer;
      if (!isEnemyProjectile) continue;
      this.blockWithOrb(state, p, owner);
    }

    const alive = this.tickCancerState(time, delta, state, owner, fighter.x, fighter.y);
    if (!alive) {
      if (owner === 'player') this.playerCancer = null; else this.npcCancer = null;
    }
  }

  /** Advances duplication + orb positioning for a cancer shield anchored at (x, y). Returns false once it should be torn down. */
  private tickCancerState(time: number, delta: number, state: CancerState, owner: Owner, x: number, y: number): boolean {
    if (owner === 'player' && state.orbs.length > 0 && this.levelOf('cancer-synthesis') > 0) {
      this.arena.player.heal((state.orbs.length * 3 * delta) / 1000);
    }

    const dupChance = this.cancerDupChance(owner);
    if (dupChance > 0 && state.orbs.length > 0 && state.orbs.length < CANCER_MAX_ORBS) {
      state.dupAccum += delta;
      if (state.dupAccum >= 1000) {
        state.dupAccum -= 1000;
        if (Math.random() < dupChance) {
          const angle = Math.random() * Math.PI * 2;
          const ox = x + Math.cos(angle) * CANCER_ATTACH_RADIUS;
          const oy = y + Math.sin(angle) * CANCER_ATTACH_RADIUS;
          const gfx = this.arena.scene.add.circle(ox, oy, CANCER_ORB_RADIUS, 0x9933cc, 0.85).setDepth(6) as Phaser.GameObjects.Arc;
          state.orbs.push({ gfx, angle });
        }
      }
    }

    if (time >= state.expireAt || state.orbs.length === 0) {
      for (const orb of state.orbs) orb.gfx.destroy();
      return false;
    }

    for (const orb of state.orbs) {
      orb.gfx.setPosition(x + Math.cos(orb.angle) * CANCER_ATTACH_RADIUS, y + Math.sin(orb.angle) * CANCER_ATTACH_RADIUS);
    }
    return true;
  }

  // ── Nest / Clone ───────────────────────────────────────────────────

  private updateNests(time: number, delta: number): void {
    void time;
    for (let i = this.nests.length - 1; i >= 0; i--) {
      const n = this.nests[i];
      n.hp = Math.min(NEST_MAX_HP, n.hp + (NEST_HEAL_PER_SEC * delta) / 1000);
      const ratio = n.hp / NEST_MAX_HP;
      n.gfx.setRadius(12 + ratio * 14);
      if (n.hp >= NEST_MAX_HP) {
        n.gfx.destroy();
        this.nests.splice(i, 1);
        this.spawnClone(n.x, n.y, n.owner);
      }
    }
  }

  private spawnClone(x: number, y: number, owner: Owner): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const sprite = scene.add.sprite(x, y, 'elem-growth').setScale(caster.scale).setDepth(5);
    let variant: CloneVariant | null = null;
    if (owner === 'player' && this.arena.hasUpgrade('q')) {
      const variants: CloneVariant[] = ['yellow', 'blue', 'red'];
      variant = variants[Math.floor(Math.random() * variants.length)];
      sprite.setTint(VARIANT_COLORS[variant]);
    }
    const healthBar = new HealthBar(scene, CLONE_MAX_HP);
    healthBar.update(x, y, CLONE_MAX_HP);
    this.clones.push({
      sprite, healthBar, hp: CLONE_MAX_HP, owner, cancer: null, lastLeechAt: 0, lastSporeAt: 0, lastCancerAt: 0, variant,
      strafeDir: Math.random() < 0.5 ? 1 : -1, nextStrafeDirChangeAt: 0,
    });
    this.arena.showFloatingText(caster.x, caster.y - 40, '🧬 Clone hatched!', '#88bb22');
  }

  private updateClones(time: number, delta: number): void {
    for (let i = this.clones.length - 1; i >= 0; i--) {
      const c = this.clones[i];
      if (c.hp <= 0) {
        if (c.cancer) for (const o of c.cancer.orbs) o.gfx.destroy();
        this.arena.spawnHitFlash(c.sprite.x, c.sprite.y, 0x88bb22);
        c.sprite.destroy();
        c.healthBar.destroy();
        this.clones.splice(i, 1);
        continue;
      }

      const targets = c.owner === 'player' ? this.arena.enemies : [this.arena.player];
      const target = this.nearestOf(c.sprite.x, c.sprite.y, targets);
      if (target) {
        const d = Phaser.Math.Distance.Between(c.sprite.x, c.sprite.y, target.x, target.y);
        const speed = c.variant === 'yellow' ? CLONE_SPEED * VARIANT_SPEED_MULT : CLONE_SPEED;
        const nx = (target.x - c.sprite.x) / (d || 1), ny = (target.y - c.sprite.y) / (d || 1);

        if (time > c.nextStrafeDirChangeAt) {
          c.strafeDir *= -1;
          c.nextStrafeDirChangeAt = time + Phaser.Math.Between(1200, 2800);
        }

        let mx: number, my: number, moveSpeed: number;
        if (d > CLONE_ENGAGE_RANGE) {
          mx = nx; my = ny; moveSpeed = speed; // chase down a distant target
        } else if (d < CLONE_RETREAT_RANGE) {
          mx = -nx; my = -ny; moveSpeed = speed; // back off if crowded
        } else {
          mx = -ny * c.strafeDir; my = nx * c.strafeDir; moveSpeed = speed * CLONE_STRAFE_SPEED_MULT; // circle at range
        }
        c.sprite.x += mx * moveSpeed * delta / 1000;
        c.sprite.y += my * moveSpeed * delta / 1000;

        // Same ability priority as the NPC AI: defensive shield first, then spores in range, leeches by default.
        if (!c.cancer && time - c.lastCancerAt >= CLONE_CANCER_COOLDOWN) {
          c.lastCancerAt = time;
          c.cancer = this.buildCancerState(c.sprite.x, c.sprite.y, c.owner);
        } else if (d <= CLONE_SPORE_CAST_RANGE && time - c.lastSporeAt >= CLONE_SPORE_COOLDOWN) {
          c.lastSporeAt = time;
          this.doSporeSpread(target.x, target.y, c.owner, this.cloneDamageMult(c));
        } else if (time - c.lastLeechAt >= CLONE_LEECH_COOLDOWN) {
          c.lastLeechAt = time;
          this.launchLeech(c.sprite.x, c.sprite.y, target.x, target.y, c.owner, this.cloneDamageMult(c));
        }
      }

      if (c.cancer) {
        const alive = this.tickCancerState(time, delta, c.cancer, c.owner, c.sprite.x, c.sprite.y);
        if (!alive) c.cancer = null;
      }

      for (const child of this.arena.projectiles.getChildren()) {
        const p = child as Projectile;
        if (!p.active) continue;
        const isEnemyProjectile = c.owner === 'player' ? !p.isFromPlayer : p.isFromPlayer;
        if (!isEnemyProjectile) continue;
        if (c.cancer && this.blockWithOrb(c.cancer, p, c.owner)) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, c.sprite.x, c.sprite.y) <= CLONE_HIT_RADIUS) {
          c.hp -= c.variant === 'blue' ? p.damage * VARIANT_DR_MULT : p.damage;
          p.setActive(false).setVisible(false);
          (p.body as Phaser.Physics.Arcade.Body).stop();
          this.arena.spawnHitFlash(c.sprite.x, c.sprite.y, 0xff4444);
          break;
        }
      }

      c.healthBar.update(c.sprite.x, c.sprite.y, Math.max(0, c.hp));
    }
  }

  private nearestOf(x: number, y: number, targets: Fighter[]): Fighter | null {
    let best: Fighter | null = null, bestD = Infinity;
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  // ── Evolve tree UI ─────────────────────────────────────────────────

  private closeEvolve(): void {
    this.evolveOpen = false;
    this.endEvolveInvincibility();
    if (this.evolveGfx) { this.evolveGfx.destroy(); this.evolveGfx = null; }
    for (const l of this.evolveLabels) l.destroy();
    this.evolveLabels = [];
    this.evolveHexAreas = [];
    if (this.evolveDnaText) { this.evolveDnaText.destroy(); this.evolveDnaText = null; }
  }

  private renderEvolve(): void {
    this.ensureSecretsPicked();
    if (this.evolveGfx) this.evolveGfx.destroy();
    for (const l of this.evolveLabels) l.destroy();
    this.evolveLabels = [];
    this.evolveHexAreas = [];
    if (this.evolveDnaText) this.evolveDnaText.destroy();

    const { scene } = this.arena;
    const W = scene.scale.width, H = scene.scale.height;
    const gfx = scene.add.graphics().setDepth(40);
    this.evolveGfx = gfx;

    gfx.fillStyle(0x000000, 0.75);
    gfx.fillRect(0, 0, W, H);

    const panelW = Math.min(560, W - 40);
    const panelX = W / 2 - panelW / 2;
    const panelY = 70;
    const colW = panelW / 3;
    const hexR = 30;
    const rowGap = 78;
    const hasUltimateUpgrade = this.arena.hasUpgrade('e');

    GROWTH_EVOLVE_PATHS.forEach((path, colIdx) => {
      const cx = panelX + colW * colIdx + colW / 2;
      const pathLabel = scene.add.text(cx, panelY, path.name, {
        fontSize: '16px', fontFamily: '"Arial Black", sans-serif', color: '#aaffcc',
      }).setOrigin(0.5).setDepth(41);
      this.evolveLabels.push(pathLabel);

      const prereqId = GROWTH_EVOLVE_ULTIMATE_PREREQ[path.id];
      const prereqMaxed = this.levelOf(prereqId) >= GROWTH_EVOLVE_MAX_LEVEL;
      const nodes = GROWTH_EVOLVE_NODES
        .filter((n) => n.path === path.id && (!n.isUltimate || hasUltimateUpgrade))
        .sort((a, b) => a.row - b.row);
      nodes.forEach((node, rowIdx) => {
        const ny = panelY + 45 + rowIdx * rowGap;
        const level = this.levelOf(node.id);
        const maxLevel = node.isUltimate ? GROWTH_EVOLVE_ULTIMATE_MAX_LEVEL : GROWTH_EVOLVE_MAX_LEVEL;
        const cost = node.isUltimate ? GROWTH_EVOLVE_ULTIMATE_COST : growthEvolveNodeCost(level);
        const maxed = level >= maxLevel;
        const prereqLocked = !!node.isUltimate && !maxed && !prereqMaxed;
        const otherChosenLocked = !!node.isUltimate && !maxed && prereqMaxed
          && GROWTH_EVOLVE_ULTIMATE_IDS.some((oid) => oid !== node.id && this.levelOf(oid) > 0);
        const lockedOut = prereqLocked || otherChosenLocked;
        const affordable = !maxed && !lockedOut && this.playerDna >= cost;

        const fill = maxed ? 0x44cc88 : lockedOut ? 0x442222 : level > 0 ? 0x2a8855 : 0x224433;
        this.drawHex(gfx, cx, ny, hexR, fill, affordable ? 0x88ffaa : 0x336644);

        const nameLabel = scene.add.text(cx, ny - 6, node.name, {
          fontSize: '10px', fontFamily: 'Arial', color: '#eeffee', align: 'center',
          wordWrap: { width: hexR * 1.7 },
        }).setOrigin(0.5).setDepth(41);
        const tierText = maxed
          ? 'MAX'
          : prereqLocked ? 'Max Tier 4 first'
          : otherChosenLocked ? 'LOCKED'
          : node.isUltimate ? `★ ${cost}\u{1F9EC}`
          : `${level}/3  ${cost}\u{1F9EC}`;
        const tierLabel = scene.add.text(cx, ny + 16, tierText, {
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: maxed ? '#88ffaa' : lockedOut ? '#dd8888' : '#ffee88',
          align: 'center', wordWrap: { width: hexR * 1.9 },
        }).setOrigin(0.5).setDepth(41);
        this.evolveLabels.push(nameLabel, tierLabel);
        this.evolveHexAreas.push({ id: node.id, x: cx, y: ny, r: hexR });
      });
    });

    this.evolveDnaText = scene.add.text(W / 2, panelY - 32, `\u{1F9EC} DNA: ${this.playerDna}/${this.dnaCap('player')}`, {
      fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#44ddaa',
    }).setOrigin(0.5).setDepth(41);

    const hintRows = hasUltimateUpgrade ? 4 : 3;
    const hint = scene.add.text(W / 2, panelY + 45 + hintRows * rowGap + 30, 'Click: buy tier   Right-click: sell (needs DNA Salvage)   [E] Close', {
      fontSize: '12px', fontFamily: 'Arial', color: '#cccccc',
    }).setOrigin(0.5).setDepth(41);
    this.evolveLabels.push(hint);

    // ── Mastery — Secret Upgrades (2 random per match, 5 DNA each, once) ──
    if (this.arena.masteryActive && this.secretOffered.length > 0) {
      const sy = panelY + 45 + hintRows * rowGap + 90;
      const secHeader = scene.add.text(W / 2, sy - 36, '✨ SECRET UPGRADES ✨', {
        fontSize: '13px', fontFamily: '"Arial Black", sans-serif', color: '#ffcc66',
      }).setOrigin(0.5).setDepth(41);
      this.evolveLabels.push(secHeader);
      this.secretOffered.forEach((sid, i) => {
        const sx = W / 2 + (i - (this.secretOffered.length - 1) / 2) * 150;
        const bought = this.secretBought.has(sid);
        const affordable = !bought && this.playerDna >= SECRET_UPGRADE_COST;
        this.drawHex(gfx, sx, sy, hexR, bought ? 0x996633 : affordable ? 0x775522 : 0x443322, affordable ? 0xffcc66 : 0x775533);
        const nameLabel = scene.add.text(sx, sy - 6, SECRET_UPGRADE_NAMES[sid], {
          fontSize: '10px', fontFamily: 'Arial', color: '#ffeecc', align: 'center', wordWrap: { width: hexR * 1.9 },
        }).setOrigin(0.5).setDepth(41);
        const costLabel = scene.add.text(sx, sy + 16, bought ? 'OWNED' : `${SECRET_UPGRADE_COST}\u{1F9EC}`, {
          fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: bought ? '#ffcc88' : '#ffee88',
        }).setOrigin(0.5).setDepth(41);
        this.evolveLabels.push(nameLabel, costLabel);
        this.evolveHexAreas.push({ id: `secret:${sid}`, x: sx, y: sy, r: hexR });
      });
    }
  }

  private drawHex(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, fill: number, stroke: number): void {
    const pts: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    gfx.fillStyle(fill, 0.9);
    gfx.beginPath();
    gfx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) gfx.lineTo(pts[i], pts[i + 1]);
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(2, stroke, 1);
    gfx.strokePath();
  }

  private handleEvolveClick(px: number, py: number, isSell: boolean): void {
    for (const area of this.evolveHexAreas) {
      const d = Phaser.Math.Distance.Between(px, py, area.x, area.y);
      if (d <= area.r) {
        if (area.id.startsWith('secret:')) {
          if (!isSell) this.buySecretUpgrade(area.id.slice(7) as SecretUpgradeId);
        } else if (isSell) {
          this.sellEvolveNode(area.id);
        } else {
          this.buyEvolveNode(area.id);
        }
        this.renderEvolve();
        return;
      }
    }
  }

  private buyEvolveNode(id: string): void {
    const def = GROWTH_EVOLVE_NODES.find((n) => n.id === id);
    if (def?.isUltimate) { this.buyUltimateNode(def); return; }

    const level = this.levelOf(id);
    if (level >= GROWTH_EVOLVE_MAX_LEVEL) return;
    const cost = growthEvolveNodeCost(level);
    if (this.playerDna < cost) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= cost;
    this.evolveLevels[id] = level + 1;
    this.arena.recordMasteryStat('upgrades', 1);
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `${def?.name ?? id} ${level + 1}/3`, '#88ffaa');
  }

  /** Ultimate evolutions: single tier, flat DNA cost, and only one of the three can ever be bought per match. */
  private buyUltimateNode(def: GrowthEvolveNodeDef): void {
    if (this.levelOf(def.id) > 0) return;
    if (this.levelOf(GROWTH_EVOLVE_ULTIMATE_PREREQ[def.path]) < GROWTH_EVOLVE_MAX_LEVEL) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'Max Tier 4 first', '#ff6666');
      return;
    }
    if (GROWTH_EVOLVE_ULTIMATE_IDS.some((oid) => oid !== def.id && this.levelOf(oid) > 0)) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'Already chose an Ultimate', '#ff6666');
      return;
    }
    if (this.playerDna < GROWTH_EVOLVE_ULTIMATE_COST) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= GROWTH_EVOLVE_ULTIMATE_COST;
    this.evolveLevels[def.id] = 1;
    this.arena.recordMasteryStat('upgrades', 1);
    // Mastery — "upgrade every final upgrade": flag this ultimate and tally distinct ones bought.
    this.arena.recordMasteryBest(`finalUL_${def.id}`, 1);
    const distinctUltimates = GROWTH_EVOLVE_ULTIMATE_IDS.reduce((n, uid) => n + (this.arena.getMasteryStat(`finalUL_${uid}`) > 0 ? 1 : 0), 0);
    this.arena.recordMasteryBest('finalUpgrades', distinctUltimates);
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `${def.name} unlocked!`, '#ffdd44');
  }

  private sellEvolveNode(id: string): void {
    const def = GROWTH_EVOLVE_NODES.find((n) => n.id === id);
    if (def?.isUltimate) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'Ultimates are permanent', '#ff6666');
      return;
    }
    const salvageTier = this.levelOf('dna-salvage');
    if (salvageTier <= 0) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'Need DNA Salvage', '#ff6666');
      return;
    }
    const level = this.levelOf(id);
    if (level <= 0) return;
    const cost = growthEvolveNodeCost(level - 1);
    const refundFraction = Math.min(salvageTier, 3) / 3;
    const refund = Math.floor(cost * refundFraction);
    this.evolveLevels[id] = level - 1;
    this.playerDna = Math.min(this.dnaCap('player'), this.playerDna + refund);
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, `Sold, +${refund} \u{1F9EC}`, '#ffdd66');
  }

  // ── Mastery — Secret Upgrades passive ─────────────────────────────────

  private ensureSecretsPicked(): void {
    if (this.secretOfferedPicked || !this.arena.masteryActive) return;
    this.secretOfferedPicked = true;
    const pool: SecretUpgradeId[] = [...SECRET_UPGRADE_IDS];
    for (let n = 0; n < 2 && pool.length > 0; n++) {
      const idx = Math.floor(Math.random() * pool.length);
      this.secretOffered.push(pool.splice(idx, 1)[0]);
    }
  }

  private buySecretUpgrade(id: SecretUpgradeId): void {
    if (!this.secretOffered.includes(id) || this.secretBought.has(id)) return;
    if (this.playerDna < SECRET_UPGRADE_COST) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= SECRET_UPGRADE_COST;
    this.secretBought.add(id);
    this.arena.recordMasteryStat('upgrades', 1);
    this.applySecretUpgrade(id);
  }

  private applySecretUpgrade(id: SecretUpgradeId): void {
    const p = this.arena.player;
    switch (id) {
      case 'titanic':
        p.sizeMult *= TITANIC_SIZE_MULT; p.applySizeMult(); p.increaseMaxHp(TITANIC_MAXHP_BONUS);
        this.arena.showFloatingText(p.x, p.y - 40, '🦣 TITANIC', '#88ffaa');
        break;
      case 'micro':
        p.sizeMult *= MICRO_SIZE_MULT; p.applySizeMult(); p.reduceMaxHp(MICRO_MAXHP_LOSS);
        this.arena.showFloatingText(p.x, p.y - 40, '🐁 MICRO', '#88ffaa');
        break;
      default:
        this.arena.showFloatingText(p.x, p.y - 40, `✨ ${SECRET_UPGRADE_NAMES[id]}`, '#ffcc66');
        break;
    }
  }

  private updateSecretPassives(_time: number, delta: number): void {
    if (!this.arena.masteryActive) return;
    this.ensureSecretsPicked();
    const p = this.arena.player;

    if (this.secretBought.has('regenerative')) {
      this.regenAccum += delta;
      while (this.regenAccum >= 1000) { this.regenAccum -= 1000; p.heal(REGEN_PER_SEC); }
    }
    if (this.secretBought.has('cancer-carapace')) {
      this.carapaceAccum += delta;
      if (this.carapaceAccum >= CARAPACE_INTERVAL_MS) {
        this.carapaceAccum -= CARAPACE_INTERVAL_MS;
        this.doCancer('player'); // grow a fresh set of cancer dots on the character
      }
    }
    if (this.secretBought.has('fungal-infection')) {
      this.fungalAccum += delta;
      if (this.fungalAccum >= FUNGAL_INTERVAL_MS) {
        this.fungalAccum -= FUNGAL_INTERVAL_MS;
        const ptr = this.arena.scene.input.activePointer;
        this.doSporeSpread(ptr.worldX, ptr.worldY, 'player');
      }
    }
    if (this.secretBought.has('spines')) {
      for (const t of this.arena.enemies) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) > SPINES_RADIUS) continue;
        if (_time < (this.spineNextHit.get(t) ?? 0)) continue;
        this.spineNextHit.set(t, _time + SPINES_CD_MS);
        t.takeDamage(SPINES_DAMAGE);
        this.arena.spawnHitFlash(t.x, t.y, 0x88bb22);
        this.arena.showFloatingText(t.x, t.y - 24, `🌵 ${SPINES_DAMAGE}`, '#aaff66');
      }
    }
  }

  // ── Mastery — Emisis ──────────────────────────────────────────────────

  private emisisSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'emisis') return s;
    }
    return null;
  }

  getEmisisCooldownRatio(time: number): number {
    return Math.min(1, (time - this.emisisLastCastAt) / EMISIS_COOLDOWN_MS);
  }

  private tryCastEmisis(time: number, mouseX: number, mouseY: number): void {
    if (time - this.emisisLastCastAt < EMISIS_COOLDOWN_MS) return;
    if (this.playerDna < EMISIS_DNA_COST) {
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 30, 'Not enough DNA', '#ff6666');
      return;
    }
    this.playerDna -= EMISIS_DNA_COST;
    this.emisisLastCastAt = time;
    // triggerCooldown broadcasts the cast online; the peer replays via doNpcEmisis.
    this.arena.player.triggerCooldown('emisis');
    this.castEmisis('player', mouseX, mouseY);
  }

  /** Online replay: the remote growth player cast Emisis — spray clouds at the local player. */
  doNpcEmisis(tx: number, ty: number): void {
    this.castEmisis('npc', tx, ty);
  }

  private emisisDamage(owner: Owner): number {
    if (owner === 'npc') return EMISIS_BASE_DAMAGE;
    const totalUpgrades = Object.values(this.evolveLevels).reduce((a, b) => a + b, 0) + this.secretBought.size;
    return Math.min(EMISIS_MAX_DAMAGE, EMISIS_BASE_DAMAGE + Math.floor(totalUpgrades / 2));
  }

  private castEmisis(owner: Owner, aimX: number, aimY: number): void {
    const origin = owner === 'player' ? this.arena.player : this.arena.npc;
    const dmg = this.emisisDamage(owner);
    const baseAng = Math.atan2(aimY - origin.y, aimX - origin.x);
    const halfCone = Phaser.Math.DegToRad(EMISIS_CONE_DEG) / 2;
    const lifeMs = (EMISIS_RANGE / EMISIS_SPEED) * 1000;
    for (let i = 0; i < EMISIS_CLOUD_COUNT; i++) {
      const t = i / (EMISIS_CLOUD_COUNT - 1);
      const ang = baseAng - halfCone + t * halfCone * 2 + Phaser.Math.FloatBetween(-0.06, 0.06);
      const speed = EMISIS_SPEED * Phaser.Math.FloatBetween(0.8, 1.05);
      const gfx = this.arena.scene.add.circle(
        origin.x + Math.cos(ang) * 18, origin.y + Math.sin(ang) * 18,
        EMISIS_CLOUD_RADIUS, 0x66bb33, 0.55,
      ).setStrokeStyle(2, 0x99ee55, 0.7).setDepth(6) as Phaser.GameObjects.Arc;
      this.emisisClouds.push({
        gfx, x: gfx.x, y: gfx.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        owner, dmg, expiresAt: this.arena.scene.time.now + lifeMs, hit: new Set(), splitsLeft: 2,
      });
    }
    this.arena.showFloatingText(origin.x, origin.y - 40, '🤢 EMISIS', '#88dd44');
  }

  private updateEmisisClouds(time: number, delta: number): void {
    if (this.emisisClouds.length === 0) return;
    const dt = delta / 1000;
    for (let i = this.emisisClouds.length - 1; i >= 0; i--) {
      const c = this.emisisClouds[i];
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.gfx.setPosition(c.x, c.y);
      if (time >= c.expiresAt) { c.gfx.destroy(); this.emisisClouds.splice(i, 1); continue; }

      const targets = c.owner === 'player' ? this.arena.enemies : [this.arena.player];
      for (const tgt of targets) {
        if (!tgt.active || tgt.hp <= 0 || c.hit.has(tgt)) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, tgt.x, tgt.y) > EMISIS_CLOUD_RADIUS + 14) continue;
        c.hit.add(tgt);
        tgt.takeDamage(c.dmg);
        this.arena.spawnHitFlash(tgt.x, tgt.y, 0x88ee44);
        this.arena.showFloatingText(tgt.x, tgt.y - 22, `🤢 ${c.dmg}`, '#aaff66');
      }

      // A cloud that touches a spore bursts it into two (which grow and split again).
      if (c.splitsLeft > 0 && this.spores.length < EMISIS_MAX_SPORES) {
        for (let si = this.spores.length - 1; si >= 0; si--) {
          const sp = this.spores[si];
          if (Phaser.Math.Distance.Between(c.x, c.y, sp.x, sp.y) > EMISIS_CLOUD_RADIUS + sp.radius) continue;
          c.splitsLeft--;
          this.splitSpore(sp, si);
          break;
        }
      }
    }
  }

  private splitSpore(sp: Spore, index: number): void {
    const { scene } = this.arena;
    const owner = sp.owner;
    const color = owner === 'player' ? 0x66cc44 : 0xcc6644;
    sp.gfx.destroy();
    this.spores.splice(index, 1);
    for (let k = 0; k < 2; k++) {
      const ox = sp.x + Phaser.Math.Between(-14, 14);
      const oy = sp.y + Phaser.Math.Between(-14, 14);
      const gfx = scene.add.circle(ox, oy, SPORE_MIN_RADIUS, color, 0.75).setDepth(6) as Phaser.GameObjects.Arc;
      this.spores.push({
        gfx, owner, x: ox, y: oy, radius: SPORE_MIN_RADIUS, isSecondary: false,
        burstAt: scene.time.now + SPORE_GROW_MS, expiresAt: 0, tickAccum: 0, dmgMult: sp.dmgMult,
      });
    }
  }
}
