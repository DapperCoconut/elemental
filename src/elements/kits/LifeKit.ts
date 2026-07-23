import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { Element } from '../Element';

// ── Seed catalogue ────────────────────────────────────────────────────────────

export type SeedType = 'sunflower' | 'rose' | 'nurse-lily' | 'nightcap' | 'pitcher' | 'cotton';

interface SeedDef {
  id: SeedType;
  name: string;
  emoji: string;
  mushroomEmoji: string;
  baseHp: number;
  color: number;
  blurb: string;
}

const SEEDS: SeedDef[] = [
  { id: 'sunflower',  name: 'Sunflower',  emoji: '🌻', mushroomEmoji: '🍄', baseHp: 25, color: 0xffcc22, blurb: '10 dmg bullet / 1s' },
  { id: 'rose',       name: 'Rose',       emoji: '🌹', mushroomEmoji: '🍄', baseHp: 75, color: 0xdd3366, blurb: 'Thorns + reflect' },
  { id: 'nurse-lily', name: 'Nurse Lily', emoji: '🪷', mushroomEmoji: '🍄', baseHp: 25, color: 0x88ffcc, blurb: 'Heals you 3 / 2s' },
  { id: 'nightcap',   name: 'Nightcap',   emoji: '🍄', mushroomEmoji: '🍄', baseHp: 25, color: 0x8844cc, blurb: 'Poison puddles' },
  { id: 'pitcher',    name: 'Pitcher',    emoji: '🪴', mushroomEmoji: '🍄', baseHp: 50, color: 0x55aa44, blurb: 'Traps enemies 3s' },
  { id: 'cotton',     name: 'Cotton',     emoji: '☁️', mushroomEmoji: '🍄', baseHp: 25, color: 0xeeeeff, blurb: '+50% speed 1s' },
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

// Invisible-hitbox element — plants are inert Fighters used purely as chase/bite targets.
const PLANT_ELEMENT: Element = {
  id: 'plant',
  name: 'Plant',
  color: 0x44cc44,
  emoji: '🌿',
  abilities: [],
};

interface PoisonPuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  expiresAt: number;
  tickAccum: number;
  owner: 'player' | 'npc';
}

interface Plant {
  type: SeedType;
  owner: 'player' | 'npc';
  x: number;
  y: number;
  /** Invisible Fighter that owns this plant's HP and acts as an enemy chase/bite target. */
  hitbox: Fighter;
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  stars: Phaser.GameObjects.Text;
  /** Base HP before E+/mushroom-cluster/permanent-fertilizer scaling. */
  baseHp: number;
  /** Primary effect timer (shots, heals, puddles). */
  accum: number;
  /** Secondary timer (rose contact ticks, living-root lashes). */
  accum2: number;

  // Fertilize (R)
  fertUntil: number;
  permStacks: number;
  sparkle: Phaser.GameObjects.Arc | null;

  // Root shield (F)
  shieldUntil: number;
  shieldRing: Phaser.GameObjects.Arc | null;
  shieldLiving: boolean;

  // Rose
  reflectAccum: number;

  // Pitcher plant
  trapped: Fighter | null;
  trappedUntil: number;

  // Nurse lily
  link: Phaser.GameObjects.Line | null;

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
  /** True only when the player is life AND Life Mastery is switched on. */
  readonly masteryActive: boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
}

// ── LifeKit ───────────────────────────────────────────────────────────────────

export class LifeKit {
  private readonly api: LifeArenaApi;

  private playerPlants: Plant[] = [];
  private npcPlants: Plant[] = [];
  private puddles: PoisonPuddle[] = [];

  /** Currently selected seed for the player. */
  private selected: SeedType = 'sunflower';

  // Seed selection bar
  private barSlots: {
    def: SeedDef;
    bg: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Text;
    name: Phaser.GameObjects.Text;
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
  private thriveAura: Phaser.GameObjects.Arc | null = null;
  private prevAbsorber: ((amount: number) => boolean) | null = null;

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
    this.reset();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  reset(): void {
    for (const p of [...this.playerPlants, ...this.npcPlants]) this.destroyPlant(p);
    this.playerPlants = [];
    this.npcPlants = [];
    for (const pd of this.puddles) pd.sprite.destroy();
    this.puddles = [];

    this.selected = 'sunflower';
    this.dragging = null;
    this.pointerWasDown = false;
    this.lastPointerX = -1;
    this.lastPointerY = -1;
    this.thriveUntil = 0;
    this.speedBoostUntil = 0;
    this.reapLastCastAt = -Infinity;
    this.reapBuffs.clear();
    this.roseLedger = 0;
    this.lastPlayerHp = -1;
    this.nightcapAccum = 0;
    if (this.thriveAura) { this.thriveAura.destroy(); this.thriveAura = null; }
    // reset() runs from the constructor and from create(), both of which happen
    // before ArenaScene assigns this match's player — so guard the access.
    this.prevAbsorber = null;
    if (this.api.player) this.api.player.damageAbsorber = null;

    this.teardownBar();
    if (this.api.isPlayerLife()) this.buildBar();
  }

  // ── Seed selection bar ──────────────────────────────────────────────────────

  private teardownBar(): void {
    for (const s of this.barSlots) { s.bg.destroy(); s.icon.destroy(); s.name.destroy(); }
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
      const icon = scene.add.text(x, y - 10, def.emoji, { fontSize: '22px' })
        .setOrigin(0.5).setDepth(201).setScrollFactor(0);
      const name = scene.add.text(x, y + 16, def.name, { fontSize: '9px', color: '#bbddbb' })
        .setOrigin(0.5).setDepth(201).setScrollFactor(0);

      bg.on('pointerdown', () => {
        this.selected = def.id;
        this.refreshBar();
      });
      // Hovering the bar must never leak a click through to the attack handler.
      bg.on('pointerover', () => bg.setFillStyle(0x1c3a1c, 0.9));
      bg.on('pointerout', () => this.refreshBar());

      this.barSlots.push({ def, bg, icon, name });
    }
    this.refreshBar();
  }

  private refreshBar(): void {
    const myco = this.api.hasPerk('player', 'mycology');
    for (const s of this.barSlots) {
      const isSel = s.def.id === this.selected;
      s.bg.setFillStyle(isSel ? 0x2a5a2a : 0x102010, isSel ? 0.95 : 0.82);
      s.bg.setStrokeStyle(isSel ? 3 : 2, s.def.color, isSel ? 1 : 0.6);
      s.icon.setText(myco ? s.def.mushroomEmoji : s.def.emoji);
      s.icon.setAlpha(isSel ? 1 : 0.75);
      s.name.setColor(isSel ? '#ffffff' : '#88aa88');
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
    const myco = this.api.hasPerk(owner, 'mycology');

    // Oldest plant makes way once the cap is reached.
    if (list.length >= MAX_PLANTS) {
      const oldest = list.shift();
      if (oldest) this.destroyPlant(oldest);
    }

    const hitbox = new Fighter(scene, x, y, 'husk', PLANT_ELEMENT, def.baseHp, 0);
    hitbox.setAlpha(0);
    hitbox.forceInvisible = true;
    hitbox.hideHealthBar();
    const hb = hitbox.body as Phaser.Physics.Arcade.Body;
    hb.setImmovable(true);
    hb.moves = false;

    const sprite = scene.add.circle(x, y, myco ? 22 : 24, def.color, 0.55).setDepth(2);
    const label = scene.add.text(x, y, myco ? def.mushroomEmoji : def.emoji, { fontSize: '20px' })
      .setOrigin(0.5).setDepth(3);
    const hpBg = scene.add.rectangle(x, y - 30, 40, 5, 0x000000, 0.6).setDepth(4);
    const hpBar = scene.add.rectangle(x - 20, y - 30, 40, 5, 0x44dd44, 1).setOrigin(0, 0.5).setDepth(5);
    const stars = scene.add.text(x, y - 42, '', { fontSize: '11px', color: '#66ccff' })
      .setOrigin(0.5).setDepth(5);

    scene.tweens.add({
      targets: sprite,
      scaleX: 1.08, scaleY: 1.08, alpha: 0.35,
      yoyo: true, repeat: -1, duration: 1200,
    });

    const plant: Plant = {
      type, owner, x, y, hitbox, sprite, label, hpBg, hpBar, stars,
      baseHp: def.baseHp,
      accum: 0, accum2: 0,
      fertUntil: 0, permStacks: 0, sparkle: null,
      shieldUntil: 0, shieldRing: null, shieldLiving: false,
      reflectAccum: 0,
      trapped: null, trappedUntil: 0,
      link: null,
      targetX: x, targetY: y,
      thrashAt: 0,
    };
    list.push(plant);

    // Every damage path — husk bites, projectiles, Thrive! shares — lands on the
    // hitbox, so the Root Shield and the Rose's reflect ledger live in one place.
    hitbox.damageAbsorber = (amount: number) => {
      if (scene.time.now < plant.shieldUntil) {
        this.api.showFloatingText(plant.x, plant.y - 34, '🛡️', '#aaeeff');
        return true; // fully blocked
      }
      if (plant.type === 'rose') this.rosePayback(plant, amount);
      return false; // let the normal HP subtraction happen
    };

    // Cluster bonuses shift for every mushroom whenever one is added.
    this.rescaleAll(list);

    if (owner === 'player') {
      this.api.showFloatingText(x, y - 46, `${myco ? def.mushroomEmoji : def.emoji} ${def.name}`, '#88ff88');
      // Mycology trades the E cooldown for a blood price on every planting.
      if (myco) {
        this.api.player.applySelfDamage(15);
        this.api.spawnHitFlash(this.api.player.x, this.api.player.y, 0xaa66dd);
        this.api.showFloatingText(this.api.player.x, this.api.player.y - 30, '🍄 -15', '#cc88ff');
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
    p.sprite.destroy();
    p.label.destroy();
    p.hpBg.destroy();
    p.hpBar.destroy();
    p.stars.destroy();
    p.sparkle?.destroy();
    p.shieldRing?.destroy();
    p.link?.destroy();
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
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    const list = owner === 'player' ? this.playerPlants : this.npcPlants;
    const radius = 200;
    const perma = owner === 'player' && this.api.hasUpgrade('r');

    const ring = scene.add.circle(caster.x, caster.y, radius, 0xffdd44, 0.28).setDepth(3);
    scene.tweens.add({ targets: ring, scaleX: 1.15, scaleY: 1.15, alpha: 0, duration: 480, onComplete: () => ring.destroy() });

    let hit = 0;
    for (const p of list) {
      if (Phaser.Math.Distance.Between(caster.x, caster.y, p.x, p.y) > radius) continue;
      hit++;
      const healed = Math.min(Math.round(p.hitbox.maxHp * 0.5), p.hitbox.maxHp - p.hitbox.hp);
      if (healed > 0) {
        p.hitbox.hp += healed;
        this.api.showFloatingText(p.x, p.y - 34, `+${healed}`, '#ffdd44');
      }
      p.fertUntil = scene.time.now + 5000;
      if (perma && p.permStacks < 3) {
        p.permStacks++;
        this.api.showFloatingText(p.x, p.y - 48, '⭐ Perma-Fertilized!', '#66ccff');
      }
      if (!p.sparkle) {
        p.sparkle = scene.add.circle(p.x, p.y, 30, 0xffee66, 0.35).setDepth(1);
        scene.tweens.add({ targets: p.sparkle, scaleX: 1.25, scaleY: 1.25, alpha: 0.15, yoyo: true, repeat: -1, duration: 380 });
      }
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
    const caster = owner === 'player' ? this.api.player : this.api.npc;
    if (list.length === 0) {
      if (owner === 'player') this.api.showFloatingText(caster.x, caster.y - 40, '🌱 No plants!', '#aaaa88');
      return;
    }

    // Prefer whatever the cursor is over; otherwise fall back to the nearest plant.
    let target: Plant | null = null;
    for (const p of list) {
      if (Phaser.Math.Distance.Between(targetX, targetY, p.x, p.y) <= 34) { target = p; break; }
    }
    if (!target) {
      let best = Infinity;
      for (const p of list) {
        const d = Phaser.Math.Distance.Between(targetX, targetY, p.x, p.y);
        if (d < best) { best = d; target = p; }
      }
    }
    if (!target) return;

    const living = owner === 'player' && this.api.hasUpgrade('f');
    target.shieldUntil = scene.time.now + 3000;
    target.shieldLiving = living;
    target.accum2 = 0;
    target.shieldRing?.destroy();
    target.shieldRing = scene.add.circle(target.x, target.y, 34, living ? 0xff4444 : 0x88ddff, 0.3)
      .setStrokeStyle(3, living ? 0xff6666 : 0xaaeeff, 0.9).setDepth(4);
    scene.tweens.add({ targets: target.shieldRing, scaleX: 1.12, scaleY: 1.12, yoyo: true, repeat: -1, duration: 500 });
    this.api.showFloatingText(target.x, target.y - 40, living ? '🩸 Living Roots!' : '🛡️ Root Shield!', living ? '#ff6666' : '#aaeeff');
  }

  /** Q — Thrive!: for 5s the player's incoming damage is split across their plants instead. */
  doThrive(): void {
    const scene = this.api.scene;
    this.thriveUntil = scene.time.now + 5000;
    this.prevAbsorber = this.api.player.damageAbsorber;
    this.api.player.damageAbsorber = (amount: number) => this.absorbIntoPlants(amount);
    this.thriveAura?.destroy();
    this.thriveAura = scene.add.circle(this.api.player.x, this.api.player.y, 32, 0x44ff88, 0.28)
      .setStrokeStyle(2, 0x88ffaa, 0.8).setDepth(3);
    scene.tweens.add({ targets: this.thriveAura, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: -1, duration: 420 });
    this.api.showFloatingText(this.api.player.x, this.api.player.y - 44, '🌿 THRIVE!', '#44ff88');
  }

  /** Splits incoming player damage evenly across live plants. Returns true when fully absorbed. */
  private absorbIntoPlants(amount: number): boolean {
    const live = this.playerPlants;
    if (live.length === 0) return false;
    this.api.recordMasteryStat('thriveRedirect', Math.round(amount));
    const share = amount / live.length;
    for (const p of live) {
      p.hitbox.takeDamage(share);
      this.api.spawnHitFlash(p.x, p.y, 0x44ff88);
    }
    this.api.showFloatingText(this.api.player.x, this.api.player.y - 30,
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

  // ── Input ───────────────────────────────────────────────────────────────────

  handleInput(pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (!this.api.isPlayerLife()) return;
    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;

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

  // ── Per-frame update ────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (this.thriveUntil > 0 && time >= this.thriveUntil) {
      this.thriveUntil = 0;
      this.endThrive();
    }
    if (this.thriveAura) this.thriveAura.setPosition(this.api.player.x, this.api.player.y);

    this.tickReapBuffs(time, delta);
    this.updatePlantList(this.playerPlants, 'player', time, delta);
    this.updatePlantList(this.npcPlants, 'npc', time, delta);
    this.updatePuddles(time, delta);
  }

  private hostilesFor(owner: 'player' | 'npc'): Fighter[] {
    return owner === 'player' ? this.api.enemies : [this.api.player];
  }

  private updatePlantList(list: Plant[], owner: 'player' | 'npc', time: number, delta: number): void {
    const scene = this.api.scene;
    const friendly = owner === 'player' ? this.api.player : this.api.npc;
    const hostiles = this.hostilesFor(owner).filter((e) => e.active && e.hp > 0);
    const activeProj = this.api.projectiles.getChildren() as Projectile[];

    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const shielded = time < p.shieldUntil;

      // Hostile projectiles chip away at plants (healing shots pass through).
      for (const go of activeProj) {
        const proj = go as Projectile;
        if (!proj.active || proj.isHeal) continue;
        const hostileProj = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
        if (!hostileProj) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, p.x, p.y) <= 30) {
          p.hitbox.takeDamage(proj.damage);
          (proj.body as Phaser.Physics.Arcade.Body).stop();
          proj.setActive(false).setVisible(false);
        }
      }

      // Root shield ends with a full heal.
      if (p.shieldUntil > 0 && time >= p.shieldUntil) {
        p.shieldUntil = 0;
        p.shieldLiving = false;
        p.shieldRing?.destroy();
        p.shieldRing = null;
        const healed = p.hitbox.maxHp - p.hitbox.hp;
        p.hitbox.hp = p.hitbox.maxHp;
        if (healed > 0) this.api.showFloatingText(p.x, p.y - 36, `+${Math.round(healed)} 🛡️`, '#aaeeff');
      }

      // Death.
      if (p.hitbox.hp <= 0) {
        if (owner === 'player' && time < this.thriveUntil && this.api.hasUpgrade('q')) {
          // Cycle of Life: a plant that dies while linked pays back 20 HP.
          this.api.player.heal(20);
          this.api.showFloatingText(this.api.player.x, this.api.player.y - 34, '♻️ +20', '#88ffaa');
        }
        const puff = scene.add.circle(p.x, p.y, 18, 0x66aa44, 0.6).setDepth(4);
        scene.tweens.add({ targets: puff, scaleX: 2, scaleY: 2, alpha: 0, duration: 340, onComplete: () => puff.destroy() });
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

      this.syncPlantVisuals(p, time);

      // Fertilizer sparkle expiry.
      if (p.sparkle && !this.isFertilized(p)) { p.sparkle.destroy(); p.sparkle = null; }

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
            const vine = scene.add.line(0, 0, p.x, p.y, victim.x, victim.y, 0xff3333, 0.9)
              .setOrigin(0, 0).setLineWidth(3).setDepth(6);
            scene.tweens.add({ targets: vine, alpha: 0, duration: 260, onComplete: () => vine.destroy() });
            this.api.spawnHitFlash(victim.x, victim.y, 0xff3333);
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
    while (p.reflectAccum >= 10) {
      p.reflectAccum -= 10;
      const victim = this.nearestHostile(p.x, p.y, hostiles, 260);
      if (!victim) break;
      victim.takeDamage(reflectPer, { source: p, sourceX: p.x, sourceY: p.y });
      if (p.owner === 'player') this.api.recordMasteryStat('plantDamage', reflectPer);
      this.api.spawnHitFlash(victim.x, victim.y, 0xdd3366);
      this.api.showFloatingText(victim.x, victim.y - 26, `🌹 -${reflectPer}`, '#ff6699');
    }
  }

  private syncPlantVisuals(p: Plant, time: number): void {
    p.hitbox.setPosition(p.x, p.y);
    p.sprite.setPosition(p.x, p.y);
    p.label.setPosition(p.x, p.y);
    p.hpBg.setPosition(p.x, p.y - 30);
    p.hpBar.setPosition(p.x - 20, p.y - 30);
    p.sparkle?.setPosition(p.x, p.y);
    p.shieldRing?.setPosition(p.x, p.y);

    const ratio = Phaser.Math.Clamp(p.hitbox.hp / p.hitbox.maxHp, 0, 1);
    p.hpBar.width = 40 * ratio;
    p.hpBar.setFillStyle(ratio > 0.5 ? 0x44dd44 : ratio > 0.25 ? 0xdddd44 : 0xdd4444);

    p.stars.setPosition(p.x, p.y - 42);
    p.stars.setText('★'.repeat(p.permStacks));

    const fert = time < p.fertUntil;
    p.label.setScale(fert ? 1.15 : 1);
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
            const proj = new Projectile(scene, p.x, p.y, 'proj-life', 10, owner === 'player');
            proj.setTint(0xffdd33);
            (proj as any).isPlantShot = true;
            this.api.projectiles.add(proj);
            proj.launch((dx / d) * 520, (dy / d) * 520);
          }
        }
        break;
      }

      // ── Rose: contact damage; reflect is handled in damagePlant ─────────────
      case 'rose': {
        p.accum += delta;
        if (p.accum >= 500) {
          p.accum -= 500;
          for (const h of hostiles) {
            if (Phaser.Math.Distance.Between(p.x, p.y, h.x, h.y) > 46) continue;
            h.takeDamage(8);
            if (owner === 'player') this.api.recordMasteryStat('plantDamage', 8);
            this.api.spawnHitFlash(h.x, h.y, 0xdd3366);
            this.api.showFloatingText(h.x, h.y - 24, '🌹 -8', '#ff6699');
          }
        }
        break;
      }

      // ── Nurse Lily: healing link to its owner ──────────────────────────────
      case 'nurse-lily': {
        if (!p.link) {
          p.link = scene.add.line(0, 0, p.x, p.y, friendly.x, friendly.y, 0x88ffcc, 0.5)
            .setOrigin(0, 0).setLineWidth(2).setDepth(1);
        }
        p.link.setTo(p.x, p.y, friendly.x, friendly.y);
        p.accum += delta * boost;
        if (p.accum >= 2000) {
          p.accum -= 2000;
          friendly.heal(3);
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
          const px = p.x + Math.cos(angle) * 38;
          const py = p.y + Math.sin(angle) * 38;
          const spr = scene.add.circle(px, py, 34, 0x8844cc, 0.42).setDepth(1);
          this.puddles.push({
            sprite: spr, x: px, y: py, radius: 34,
            expiresAt: time + 2000, tickAccum: 0, owner,
          });
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
            this.api.showFloatingText(p.x, p.y - 40, '🪴 Trapped!', '#88dd66');
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

    // Cursor-over first, else nearest to the cursor — same pick as Root Shield.
    let target: Plant | null = null;
    for (const p of list) {
      if (Phaser.Math.Distance.Between(mouseX, mouseY, p.x, p.y) <= 34) { target = p; break; }
    }
    if (!target) {
      let best = Infinity;
      for (const p of list) {
        const d = Phaser.Math.Distance.Between(mouseX, mouseY, p.x, p.y);
        if (d < best) { best = d; target = p; }
      }
    }
    if (!target) return;

    this.reapLastCastAt = time;
    this.reapBuffs.set(target.type, time + REAP_BUFF_MS);

    const def = SEED_BY_ID.get(target.type)!;
    const burst = this.api.scene.add.circle(target.x, target.y, 26, def.color, 0.6).setDepth(5);
    this.api.scene.tweens.add({ targets: burst, scaleX: 2.4, scaleY: 2.4, alpha: 0, duration: 420, onComplete: () => burst.destroy() });

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
      proj.setTint(0x7a9c3e);
      (proj as any).isPlantShot = true;
      this.api.projectiles.add(proj);
      proj.launch(Math.cos(angle) * THORN_SPEED, Math.sin(angle) * THORN_SPEED);
    }
    this.api.spawnHitFlash(p.x, p.y, 0x7a9c3e);
    this.api.showFloatingText(p.x, p.y - 40, '🌵 Thorn Thrash!', '#aacc66');
  }

  /**
   * Tag this frame's freshly fired click petals so Thorn Thrash and the petal
   * reap buffs can recognise them (+2 damage while Sunflower essence is held).
   * Called from ArenaScene right after a petal shotgun / sakura cast.
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
    if (!this.api.masteryActive) return;
    // Nurse Lily reap buff: lifesteal on the damage you deal.
    if (this.hasReapBuff('nurse-lily')) {
      const healed = Math.ceil(damageDealt * 0.1);
      if (healed > 0) this.api.player.heal(healed);
    }
    // Pitcher reap buff: petals gum enemies up.
    if ((proj as any).isPetal && this.hasReapBuff('pitcher')) {
      target.walkSpeedMult = Math.min(target.walkSpeedMult, 0.85);
      this.scheduleSlowClear(target, 2000);
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
        this.api.spawnHitFlash(victim.x, victim.y, 0xdd3366);
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
        const px = player.x + Math.cos(angle) * dist;
        const py = player.y + Math.sin(angle) * dist;
        const spr = this.api.scene.add.circle(px, py, 34, 0x8844cc, 0.42).setDepth(1);
        this.puddles.push({
          sprite: spr, x: px, y: py, radius: 34,
          expiresAt: time + 2000, tickAccum: 0, owner: 'player',
        });
      }
    } else {
      this.nightcapAccum = 0;
    }
  }

  // ── Poison puddles (Nightcap) ───────────────────────────────────────────────

  private updatePuddles(time: number, delta: number): void {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const pd = this.puddles[i];
      if (time >= pd.expiresAt) {
        pd.sprite.destroy();
        this.puddles.splice(i, 1);
        continue;
      }
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
      }
    }
  }
}
