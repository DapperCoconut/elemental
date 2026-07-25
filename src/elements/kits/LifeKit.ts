import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { Element } from '../Element';
import { CastContext } from '../Ability';
import {
  ArmGesture, LifeAura, LifeAvatar, LifeColorFn, LifeFx, PlantArtType, LIFE, SEED_COLOR, sprig,
} from './LifeVisuals';

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
  { id: 'sunflower',  name: 'Sunflower',  baseHp: 25, color: SEED_COLOR['sunflower'],  blurb: '10 dmg bullet / 1s' },
  { id: 'rose',       name: 'Rose',       baseHp: 75, color: SEED_COLOR['rose'],       blurb: 'Thorns + reflect' },
  { id: 'nurse-lily', name: 'Nurse Lily', baseHp: 25, color: SEED_COLOR['nurse-lily'], blurb: 'Heals you 3 / 2s' },
  { id: 'nightcap',   name: 'Nightcap',   baseHp: 25, color: SEED_COLOR['nightcap'],   blurb: 'Poison puddles' },
  { id: 'pitcher',    name: 'Pitcher',    baseHp: 50, color: SEED_COLOR['pitcher'],    blurb: 'Traps enemies 3s' },
  { id: 'cotton',     name: 'Cotton',     baseHp: 25, color: SEED_COLOR['cotton'],     blurb: '+50% speed 1s' },
];

const SEED_BY_ID = new Map<SeedType, SeedDef>(SEEDS.map((s) => [s.id, s]));

/** Max simultaneous plants per owner. */
const MAX_PLANTS = 5;
/** Radius within which mushrooms count as "near each other" for the Mycology HP bonus. */
const MUSHROOM_CLUSTER_RADIUS = 170;

// ── Life Mastery constants ────────────────────────────────────────────────────

/** Thorn Thrash: per-plant cooldown between thorn barrages. */
const THORN_THRASH_CD_MS = 3000;
const THORN_THRASH_COUNT = 5;
const THORN_DAMAGE = 5;
const THORN_SPEED = 420;
const REAP_COOLDOWN_MS = 15000;
const REAP_BUFF_MS = 20000;
/** Sunflower reap buff: extra damage on every click petal. */
const REAP_PETAL_BONUS = 2;

/** Petal Burst (click upgrade): 5 petals at 5 dmg, wider cone than the base 3×8. */
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
  tickAccum: number;
  owner: 'player' | 'npc';
  /** Per-pool phase offset so a cluster of them doesn't ripple in lockstep. */
  seed: number;
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
  /** Nurse Lily's tether to its owner — its own Graphics so it can sit under everything. */
  link: Phaser.GameObjects.Graphics | null;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  stars: Phaser.GameObjects.Text;
  /** Base HP before E+/mushroom-cluster/permanent-fertilizer scaling. */
  baseHp: number;
  /** Primary effect timer (shots, heals, puddles). */
  accum: number;
  /** Secondary timer (rose contact ticks, living-root lashes). */
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

  // Rose
  reflectAccum: number;

  // Pitcher plant
  trapped: Fighter | null;
  trappedUntil: number;

  // E+ dragging
  targetX: number;
  targetY: number;

  // Thorn Thrash (mastery passive): earliest time this plant may thrash again.
  thrashAt: number;
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
  /** Cosmetics: maps a life visual color through the owner's color cosmetic. */
  lifeColor(owner: 'player' | 'npc', base: number): number;
  buildPlayerContext(x: number, y: number): CastContext;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
}

// ── LifeKit ───────────────────────────────────────────────────────────────────

export class LifeKit {
  private readonly api: LifeArenaApi;

  // ── Visuals ─────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a future cosmetic recolours one side. */
  private readonly pcol: LifeColorFn;
  private readonly ncol: LifeColorFn;
  private readonly pfx: LifeFx;
  private readonly nfx: LifeFx;
  /** The life character rig (budding hands, eyes, sprouting crown) for each life fighter. */
  private playerAvatar: LifeAvatar | null = null;
  private npcAvatar: LifeAvatar | null = null;
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
    bg: Phaser.GameObjects.Rectangle;
    /** The seed's own plant art, drawn small — the bar shows what you are about to grow. */
    art: Phaser.GameObjects.Graphics;
    name: Phaser.GameObjects.Text;
    x: number;
    y: number;
  }[] = [];

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

  // Cotton speed boost
  private speedBoostUntil = 0;

  // ── Life Mastery state ──
  private reapLastCastAt = -Infinity;
  /** Seed type -> expiry timestamp for buffs stolen via Reap. */
  private reapBuffs = new Map<SeedType, number>();
  /** Rose reap buff: damage taken banked toward 5-damage paybacks. */
  private roseLedger = 0;
  private lastPlayerHp = -1;
  /** Nightcap reap buff: ms accumulated toward the next poison puddle. */
  private nightcapAccum = 0;

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
    this.speedBoostUntil = 0;
    this.reapLastCastAt = -Infinity;
    this.reapBuffs.clear();
    this.roseLedger = 0;
    this.lastPlayerHp = -1;
    this.nightcapAccum = 0;
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
    this.barBounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
  }

  private buildBar(): void {
    const scene = this.api.scene;
    const slotW = 74;
    const gap = 8;
    const total = SEEDS.length * slotW + (SEEDS.length - 1) * gap;
    const startX = scene.scale.width / 2 - total / 2 + slotW / 2;
    const y = 46;
    this.barBounds = {
      x1: startX - slotW / 2, y1: y - 28,
      x2: startX - slotW / 2 + total, y2: y + 28,
    };

    for (let i = 0; i < SEEDS.length; i++) {
      const def = SEEDS[i];
      const x = startX + i * (slotW + gap);
      const bg = scene.add.rectangle(x, y, slotW, 56, 0x102010, 0.82)
        .setStrokeStyle(2, def.color, 0.8)
        .setDepth(200)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      // The icon is the plant itself, shrunk — you pick a seed by looking at what it grows.
      const art = scene.add.graphics().setDepth(201).setScrollFactor(0);
      const name = scene.add.text(x, y + 18, def.name, { fontSize: '9px', color: '#bbddbb' })
        .setOrigin(0.5).setDepth(201).setScrollFactor(0);

      bg.on('pointerdown', () => {
        this.selected = def.id;
        this.refreshBar();
      });
      // Hovering the bar must never leak a click through to the attack handler.
      bg.on('pointerover', () => bg.setFillStyle(0x1c3a1c, 0.9));
      bg.on('pointerout', () => this.refreshBar());

      this.barSlots.push({ def, bg, art, name, x, y });
    }
    this.refreshBar();
  }

  private refreshBar(): void {
    for (const s of this.barSlots) {
      const isSel = s.def.id === this.selected;
      s.bg.setFillStyle(isSel ? 0x2a5a2a : 0x102010, isSel ? 0.95 : 0.82);
      s.bg.setStrokeStyle(isSel ? 3 : 2, s.def.color, isSel ? 1 : 0.6);
      s.name.setColor(isSel ? '#ffffff' : '#88aa88');
    }
  }

  /** Repaint the six seed icons so they sway in the bar exactly as they will in the field. */
  private paintBar(): void {
    if (this.barSlots.length === 0) return;
    const myco = this.api.hasPerk('player', 'mycology');
    for (const s of this.barSlots) {
      const isSel = s.def.id === this.selected;
      s.art.clear();
      LifeFx.drawPlant(s.art, this.pcol, s.def.id, s.x, s.y - 4, this.worldT + s.x * 0.02, {
        scale: 0.5, alpha: isSel ? 1 : 0.7, mushroom: myco,
      });
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
    hp *= 1 + 0.1 * p.permStacks;
    return Math.max(1, Math.round(hp));
  }

  /** How much faster/stronger a plant's effects are right now (fertilizer + permanent stacks). */
  private boost(p: Plant): number {
    const fert = this.api.scene.time.now < p.fertUntil ? 0.6 : 0;
    return 1 + fert + 0.08 * p.permStacks;
  }

  private isFertilized(p: Plant): boolean {
    return this.api.scene.time.now < p.fertUntil;
  }

  createPlant(x: number, y: number, owner: 'player' | 'npc'): void {
    const scene = this.api.scene;
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    const type: SeedType = owner === 'player' ? this.selected : 'sunflower';
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
    const hpBg = scene.add.rectangle(x, y - 34, 40, 5, 0x000000, 0.6).setDepth(4);
    const hpBar = scene.add.rectangle(x - 20, y - 34, 40, 5, 0x44dd44, 1).setOrigin(0, 0.5).setDepth(5);
    const stars = scene.add.text(x, y - 46, '', { fontSize: '11px', color: '#66ccff' })
      .setOrigin(0.5).setDepth(5);

    const plant: Plant = {
      type, owner, x, y, hitbox, art, link: null, hpBg, hpBar, stars,
      baseHp: def.baseHp,
      accum: 0, accum2: 0, age: 0, aim: -Math.PI / 2,
      fertUntil: 0, permStacks: 0,
      shieldUntil: 0, shieldLiving: false,
      reflectAccum: 0,
      trapped: null, trappedUntil: 0,
      targetX: x, targetY: y,
      thrashAt: 0,
    };
    list.push(plant);

    // Every damage path — husk bites, projectiles, Thrive! shares — lands on the
    // hitbox, so the Root Shield and the Rose's reflect ledger live in one place.
    hitbox.damageAbsorber = (amount: number) => {
      if (scene.time.now < plant.shieldUntil) {
        this.api.showFloatingText(plant.x, plant.y - 34, '🛡️', '#aaeeff');
        this.fxFor(owner).ring(plant.x, plant.y, 24, 38, LIFE.pale, 260, 3, 5);
        return true; // fully blocked
      }
      if (plant.type === 'rose') this.rosePayback(plant, amount);
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
    if (p.trapped) this.releaseTrapped(p);
    p.art.destroy();
    p.link?.destroy();
    p.hpBg.destroy();
    p.hpBar.destroy();
    p.stars.destroy();
    p.hitbox.destroy();
  }

  private releaseTrapped(p: Plant): void {
    if (!p.trapped) return;
    p.trapped.earthStunnedUntil = 0;
    p.trapped.setAlpha(1);
    p.trapped = null;
    p.trappedUntil = 0;
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

  getPlayerSpeedMult(): number {
    let mult = this.api.scene.time.now < this.speedBoostUntil ? 1.5 : 1;
    if (this.hasReapBuff('cotton')) mult *= 1.25;
    return mult;
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
    if (!this.npcAvatar) return;
    const gesture = GESTURES[id];
    if (!gesture) return;
    const { npc, player } = this.api;
    this.npcAvatar.play(
      gesture,
      Math.atan2(player.y - npc.y, player.x - npc.x),
      id === 'thorn-drag' ? 1000 : undefined,
    );
  }

  // ── Input ───────────────────────────────────────────────────────────────────

  handleInput(pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (!this.api.isPlayerLife()) return;
    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;
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
   * upgraded. Both branches live here so ArenaScene never has to know which one is live.
   */
  doPetalShotgun(mouseX: number, mouseY: number): void {
    const player = this.api.player;
    const aim = Math.atan2(mouseY - player.y, mouseX - player.x);

    if (!this.api.hasUpgrade('click')) {
      if (player.castAbility('petal-shotgun', this.api.buildPlayerContext(mouseX, mouseY))) {
        this.playerAvatar?.play('punch', aim);
        this.onPetalShotgunFired();
      }
      return;
    }

    if (player.getCooldownRatio('petal-shotgun') < 1) return;
    player.triggerCooldown('petal-shotgun');
    const speed = 480;
    const spawnDist = 32;
    for (const deg of SAKURA_ANGLES) {
      const angle = aim + deg * (Math.PI / 180);
      const sx = player.x + Math.cos(angle) * spawnDist;
      const sy = player.y + Math.sin(angle) * spawnDist;
      const proj = new Projectile(this.api.scene, sx, sy, 'proj-sakura', 5, true);
      proj.setTint(this.pcol(LIFE.blossom));
      (proj as any).isSakura = true;
      this.api.projectiles.add(proj);
      proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.pfx.petalMuzzle(sx, sy, angle, 0.75, 6, LIFE.rose);
    }
    // A fuller cone deserves a fuller throw: blossom litter thrown wide behind the petals.
    this.pfx.petalShards(player.x, player.y, 5, 120, 400, 5, LIFE.rose);
    this.playerAvatar?.play('sweep', aim, 300);
    this.onPetalShotgunFired();
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
    this.tickReapBuffs(time, delta);
    this.updatePlantList(this.playerPlants, 'player', time, delta);
    this.updatePlantList(this.npcPlants, 'npc', time, delta);
    this.updatePuddles(time, delta);
  }

  private casterFor(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.api.player : this.api.npc;
  }

  private avatarFor(owner: 'player' | 'npc'): LifeAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private updateAvatars(delta: number): void {
    const { player, npc, scene } = this.api;

    if (this.api.isPlayerLife() && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new LifeAvatar(scene, this.pcol);
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
      if (!this.npcAvatar) this.npcAvatar = new LifeAvatar(scene, this.ncol);
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

      // Whichever hostile is closest is what the plant looks at.
      const watched = this.nearestHostile(p.x, p.y, hostiles, 700);
      if (watched) p.aim = Math.atan2(watched.y - p.y, watched.x - p.x);

      this.paintPlant(p, owner, friendly, time);

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

  /** Rose banks every point of damage it eats and pays it back in 10-damage lumps. */
  private rosePayback(p: Plant, amount: number): void {
    if (amount <= 0) return;
    p.reflectAccum += amount;
    const reflectPer = this.isFertilized(p) ? 10 : 5;
    const hostiles = this.hostilesFor(p.owner).filter((h) => h.active && h.hp > 0);
    const f = this.fxFor(p.owner);
    while (p.reflectAccum >= 10) {
      p.reflectAccum -= 10;
      const victim = this.nearestHostile(p.x, p.y, hostiles, 260);
      if (!victim) break;
      victim.takeDamage(reflectPer, { source: p, sourceX: p.x, sourceY: p.y });
      if (p.owner === 'player') this.api.recordMasteryStat('plantDamage', reflectPer);
      // The thorns visibly travel from the rose to whoever touched it.
      f.vineLash(p.x, p.y, victim.x, victim.y, LIFE.rose, 6);
      f.thornSpray(victim.x, victim.y, 5, 6);
      this.api.spawnHitFlash(victim.x, victim.y, this.colFor(p.owner)(LIFE.rose));
      this.api.showFloatingText(victim.x, victim.y - 26, `🌹 -${reflectPer}`, '#ff6699');
    }
  }

  /**
   * Repaint one plant from scratch: the plant itself, its shield dome, its HP bar and any
   * tether it owns. Drawing rather than tweening means a fertilised plant can visibly stand
   * taller and a dying one can visibly droop, on the same frame the number changes.
   */
  private paintPlant(p: Plant, owner: 'player' | 'npc', friendly: Fighter, time: number): void {
    p.hitbox.setPosition(p.x, p.y);
    const ratio = Phaser.Math.Clamp(p.hitbox.hp / p.hitbox.maxHp, 0, 1);
    const tint = this.colFor(owner);

    p.art.clear();
    LifeFx.drawPlant(p.art, tint, p.type, p.x, p.y, p.age, {
      hp: ratio,
      fert: this.isFertilized(p),
      aim: p.aim,
      mushroom: this.api.hasPerk(owner, 'mycology'),
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
      // Ribs of the cage, each swaying on its own.
      g.fillStyle(tint(living ? LIFE.rose : LIFE.leaf), 0.75);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + p.age * 0.7;
        sprig(g, tint, p.x + Math.cos(a) * r * 0.5, p.y + Math.sin(a) * r * 0.5, a, r * 0.55, 2.4, 1.4, 0.8, 1);
      }
    }

    // Pitcher plant digesting: bars across the mouth so a captive reads as held.
    if (p.trapped) {
      p.art.lineStyle(2, tint(LIFE.pitcher), 0.8);
      for (let i = -2; i <= 2; i++) {
        p.art.beginPath();
        p.art.moveTo(p.x + i * 5, p.y - 16);
        p.art.lineTo(p.x + i * 5, p.y + 12);
        p.art.strokePath();
      }
    }

    // Nurse Lily's tether, drawn as a living vine that sags between the two ends.
    if (p.type === 'nurse-lily') {
      if (!p.link) p.link = this.api.scene.add.graphics().setDepth(1);
      const g = p.link;
      g.clear();
      const segs = 12;
      const sag = 14;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        pts.push({
          x: p.x + (friendly.x - p.x) * t,
          y: p.y + (friendly.y - p.y) * t + Math.sin(t * Math.PI) * (sag + Math.sin(p.age * 2) * 3),
        });
      }
      for (const layer of [
        { c: LIFE.deep, w: 4, a: 0.45 },
        { c: LIFE.lily, w: 2, a: 0.7 },
      ]) {
        g.lineStyle(layer.w, tint(layer.c), layer.a);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (const q of pts) g.lineTo(q.x, q.y);
        g.strokePath();
      }
      // A pulse of sap travelling up the vine toward whoever is being healed.
      const flow = (p.age * 0.55) % 1;
      const idx = Math.min(segs, Math.floor(flow * segs));
      g.fillStyle(tint(LIFE.glow), 0.85);
      g.fillCircle(pts[idx].x, pts[idx].y, 3);
    } else if (p.link) {
      p.link.destroy();
      p.link = null;
    }

    p.hpBg.setPosition(p.x, p.y - 34);
    p.hpBar.setPosition(p.x - 20, p.y - 34);
    p.hpBar.width = 40 * ratio;
    p.hpBar.setFillStyle(ratio > 0.5 ? 0x44dd44 : ratio > 0.25 ? 0xdddd44 : 0xdd4444);
    p.stars.setPosition(p.x, p.y - 46);
    p.stars.setText('★'.repeat(p.permStacks));
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
    const scene = this.api.scene;
    const boost = this.boost(p);
    const f = this.fxFor(owner);

    switch (p.type) {
      // ── Sunflower: yellow bullet at the nearest enemy every second ──────────
      case 'sunflower': {
        p.accum += delta * boost;
        if (p.accum >= 1000) {
          p.accum -= 1000;
          const victim = this.nearestHostile(p.x, p.y, hostiles, 620);
          if (victim) {
            const dx = victim.x - p.x;
            const dy = victim.y - p.y;
            const d = Math.hypot(dx, dy) || 1;
            const angle = Math.atan2(dy, dx);
            const proj = new Projectile(scene, p.x, p.y, 'proj-life', 10, owner === 'player');
            proj.setTint(this.colFor(owner)(LIFE.sun));
            (proj as any).isPlantShot = true;
            this.api.projectiles.add(proj);
            proj.launch((dx / d) * 520, (dy / d) * 520);
            // The head spits a seed: a muzzle flare in its own gold, not the element green.
            f.petalMuzzle(p.x, p.y, angle, 0.6, 6, LIFE.sun);
          }
        }
        break;
      }

      // ── Rose: contact damage; reflect is handled in rosePayback ─────────────
      case 'rose': {
        p.accum += delta;
        if (p.accum >= 500) {
          p.accum -= 500;
          for (const h of hostiles) {
            if (Phaser.Math.Distance.Between(p.x, p.y, h.x, h.y) > 46) continue;
            h.takeDamage(8);
            if (owner === 'player') this.api.recordMasteryStat('plantDamage', 8);
            f.thornSpray(h.x, h.y, 4, 6);
            this.api.spawnHitFlash(h.x, h.y, this.colFor(owner)(LIFE.rose));
            this.api.showFloatingText(h.x, h.y - 24, '🌹 -8', '#ff6699');
          }
        }
        break;
      }

      // ── Nurse Lily: healing link to its owner ──────────────────────────────
      case 'nurse-lily': {
        p.accum += delta * boost;
        if (p.accum >= 2000) {
          p.accum -= 2000;
          friendly.heal(3);
          f.healBloom(friendly.x, friendly.y, 22, 5);
          this.api.showFloatingText(friendly.x, friendly.y - 28, '🪷 +3', '#88ffcc');
        }
        break;
      }

      // ── Nightcap: drops a short-lived poison puddle beside itself ───────────
      case 'nightcap': {
        p.accum += delta * boost;
        if (p.accum >= 1000) {
          p.accum -= 1000;
          const angle = Math.random() * Math.PI * 2;
          this.spawnSporePool(p.x + Math.cos(angle) * 38, p.y + Math.sin(angle) * 38, owner, time);
        }
        break;
      }

      // ── Pitcher Plant: swallows anything that wanders close ────────────────
      case 'pitcher': {
        if (p.trapped) {
          const captive = p.trapped;
          if (!captive.active || captive.hp <= 0 || time >= p.trappedUntil) {
            this.releaseTrapped(p);
          } else {
            // Hold the captive inside the plant and keep it hard-CCed.
            (captive.body as Phaser.Physics.Arcade.Body).reset(p.x, p.y);
            captive.earthStunnedUntil = Math.max(captive.earthStunnedUntil, time + 120);
            captive.setAlpha(0.35);
          }
        } else {
          for (const h of hostiles) {
            if (Phaser.Math.Distance.Between(p.x, p.y, h.x, h.y) > 62) continue;
            const dur = 3000 * (this.isFertilized(p) ? 1.5 : 1) * (1 + 0.1 * p.permStacks);
            p.trapped = h;
            p.trappedUntil = time + dur;
            h.earthStunnedUntil = Math.max(h.earthStunnedUntil, time + dur);
            // The jug snaps shut: vines whip out, the lid slams, fluid slops over the rim.
            f.vineLash(p.x, p.y, h.x, h.y, LIFE.pitcher, 6);
            f.bloomBurst(p.x, p.y, 36, 8, 3);
            f.spores(p.x, p.y, 2, 22, 5, LIFE.pitcher);
            this.api.showFloatingText(p.x, p.y - 44, '🪴 Trapped!', '#88dd66');
            break;
          }
        }
        break;
      }

      // ── Cotton: a speed pad for its owner ──────────────────────────────────
      case 'cotton': {
        if (owner === 'player'
          && Phaser.Math.Distance.Between(p.x, p.y, this.api.player.x, this.api.player.y) <= 34) {
          const dur = 1000 * (this.isFertilized(p) ? 1.5 : 1) * (1 + 0.1 * p.permStacks);
          if (this.speedBoostUntil < time + dur * 0.5) {
            this.speedBoostUntil = time + dur;
            // A cloud of fluff kicked up as you run through the boll.
            f.spores(p.x, p.y, 3, 26, 5, LIFE.cotton);
            f.pollen(p.x, p.y, 7, { speed: 70, size: 3, life: 520, rise: 22, depth: 5, color: LIFE.cotton });
            this.api.showFloatingText(this.api.player.x, this.api.player.y - 30, '☁️ +50% Speed', '#eeeeff');
          }
        }
        break;
      }
    }
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

    this.reapLastCastAt = time;
    this.reapBuffs.set(target.type, time + REAP_BUFF_MS);

    const def = SEED_BY_ID.get(target.type)!;
    // The plant is torn up and its essence hauled back down a vine into you.
    this.pfx.wilt(target.x, target.y, 26);
    this.pfx.petalShards(target.x, target.y, 10, 210, 520, 6, def.color);
    this.pfx.vineLash(target.x, target.y, player.x, player.y, def.color, 7);
    this.pfx.ring(target.x, target.y, 8, 62, def.color, 460, 5, 5);
    this.pfx.pollen(player.x, player.y, 12, { speed: 60, size: 3, life: 700, rise: 34, depth: 6, color: def.color });
    this.playerAvatar?.play('sweep', Math.atan2(target.y - player.y, target.x - player.x));

    const labels: Record<SeedType, string> = {
      'sunflower': '🌻 Sharpened Petals!',
      'rose': '🌹 Vengeful Thorns!',
      'nurse-lily': '🪷 Lifesteal!',
      'nightcap': '🍄 Toxic Bloom!',
      'pitcher': '🪴 Sticky Petals!',
      'cotton': '☁️ +25% Speed!',
    };
    this.api.showFloatingText(target.x, target.y - 44, `💀 Reaped! ${labels[target.type]}`, '#ffdd66');

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
   * Tag this frame's freshly fired click petals so Thorn Thrash and the petal
   * reap buffs can recognise them (+2 damage while Sunflower essence is held).
   */
  onPetalShotgunFired(): void {
    if (!this.api.masteryActive) return;
    const player = this.api.player;
    const sharpened = this.hasReapBuff('sunflower');
    for (const go of this.api.projectiles.getChildren() as Projectile[]) {
      if (!go.active || !go.isFromPlayer) continue;
      const rec = go as any;
      if (rec.isPetal || rec.isPlantShot) continue;
      if (go.texture.key !== 'proj-life' && go.texture.key !== 'proj-sakura') continue;
      // Petals spawn 32px out and haven't moved yet this frame; plant shots are
      // excluded above, so anything this close is a just-fired petal.
      if (Phaser.Math.Distance.Between(go.x, go.y, player.x, player.y) > 50) continue;
      rec.isPetal = true;
      if (sharpened) go.damage += REAP_PETAL_BONUS;
    }
  }

  /** Called from ArenaScene's on-hit pipeline for every player projectile that lands. */
  onPlayerProjectileHit(proj: Projectile, target: Fighter, damageDealt: number): void {
    if ((proj as any).isPlantShot) this.api.recordMasteryStat('plantDamage', damageDealt);
    // Every petal that lands bursts apart, whatever else it does.
    this.pfx.petalShards(proj.x, proj.y, 5, 150, 380, 7,
      (proj as any).isSakura ? LIFE.rose : LIFE.leaf);
    if (!this.api.masteryActive) return;
    // Nurse Lily reap buff: lifesteal on the damage you deal.
    if (this.hasReapBuff('nurse-lily')) {
      const healed = Math.ceil(damageDealt * 0.1);
      if (healed > 0) {
        this.api.player.heal(healed);
        this.pfx.vineLash(target.x, target.y, this.api.player.x, this.api.player.y, LIFE.lily, 7);
      }
    }
    // Pitcher reap buff: petals gum enemies up.
    if ((proj as any).isPetal && this.hasReapBuff('pitcher')) {
      target.walkSpeedMult = Math.min(target.walkSpeedMult, 0.85);
      this.scheduleSlowClear(target, 2000);
      this.pfx.spores(target.x, target.y, 2, 20, 6, LIFE.pitcher);
      this.api.showFloatingText(target.x, target.y - 26, '🪴 Slowed', '#88dd66');
    }
  }

  /** Per-frame upkeep for the Rose and Nightcap reap buffs. */
  private tickReapBuffs(time: number, delta: number): void {
    const player = this.api.player;
    if (!player) return;

    // Rose: bank damage taken, pay it back in 5-damage lumps.
    const hp = player.hp;
    if (this.lastPlayerHp >= 0 && hp < this.lastPlayerHp && this.hasReapBuff('rose')) {
      this.roseLedger += this.lastPlayerHp - hp;
      const hostiles = this.hostilesFor('player').filter((h) => h.active && h.hp > 0);
      while (this.roseLedger >= 20) {
        this.roseLedger -= 20;
        const victim = this.nearestHostile(player.x, player.y, hostiles, Infinity);
        if (!victim) break;
        victim.takeDamage(5);
        this.pfx.vineLash(player.x, player.y, victim.x, victim.y, LIFE.rose, 6);
        this.pfx.thornSpray(victim.x, victim.y, 4, 6);
        this.api.spawnHitFlash(victim.x, victim.y, this.pcol(LIFE.rose));
        this.api.showFloatingText(victim.x, victim.y - 26, '🌹 -5', '#ff6699');
      }
    }
    this.lastPlayerHp = hp;

    // Nightcap: poison puddles bloom around the player every second.
    if (this.hasReapBuff('nightcap')) {
      this.nightcapAccum += delta;
      if (this.nightcapAccum >= 1000) {
        this.nightcapAccum -= 1000;
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 40;
        this.spawnSporePool(player.x + Math.cos(angle) * dist, player.y + Math.sin(angle) * dist, 'player', time);
      }
    } else {
      this.nightcapAccum = 0;
    }
  }

  // ── Spore pools (Nightcap) ──────────────────────────────────────────────────

  private spawnSporePool(x: number, y: number, owner: 'player' | 'npc', time: number): void {
    this.puddles.push({
      x, y, radius: 34, expiresAt: time + 2000, tickAccum: 0, owner,
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
      const life = (pd.expiresAt - time) / 2000;
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
}
