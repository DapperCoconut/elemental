import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Husk, HuskWorld } from '../../invasion/Husk';
import { BASIC_HUSK, HUSK_VARIANTS, HuskVariantDef, huskTextureKey } from '../../invasion/HuskVariants';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';

type Owner = 'player' | 'npc';

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
  readonly isInvasion: boolean;
  readonly width: number;
  readonly height: number;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: Owner, perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  dealAoeDamageFromOwner(x: number, y: number, radius: number, damage: number, owner: Owner): void;
  buildPlayerContext(x: number, y: number): CastContext;
  buildNpcContext(x: number, y: number): CastContext;
}

// ── World-object types ───────────────────────────────────────────────────────

interface SoulPuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  owner: Owner;
  expiresAt: number;
  tickAccum: number;
}

interface Grave {
  sprite: Phaser.GameObjects.Image;
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
  stitches: Phaser.GameObjects.Graphics;
  /** Angered red aura + eyes, or Inflamed scar marks. */
  auraGfx: Phaser.GameObjects.Graphics | null;
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
}

interface Ember {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: Owner;
  expiresAt: number;
  big: boolean;
}

/** A recruited variant's ranged attack (Spitter). Mirrors InvasionKit's HuskShot. */
interface SoulShot {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  owner: Owner;
  /** True for a hostile grave zombie's shot (hits the caster); false for a friendly amalgam's (hits foes). */
  hitsCaster: boolean;
  expiresAt: number;
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
const ANGERED_AURA_COLOR = 0xff2222;

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
const AMALGAM_TINT = 0x9966cc;
const AMALGAM_BURN_TINT = 0xff4411;
const AMALGAM_DASH_TINT = 0xdd3355;
const VARIANT_AMALGAM_TINT = 0xbb99ff;

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
const INFLAMED_TINT = 0x882222;

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
  private puddles: SoulPuddle[] = [];
  private graves: Grave[] = [];
  private graveZombies: GraveZombie[] = [];
  private amalgams: Amalgam[] = [];
  private embers: Ember[] = [];
  private soulShots: SoulShot[] = [];
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

  constructor(private readonly arena: SoulArenaApi) {}

  // ── Lifecycle ────────────────────────────────────────────────────────

  reset(): void {
    for (const p of this.puddles) p.sprite.destroy();
    this.puddles = [];
    for (const g of this.graves) g.sprite.destroy();
    this.graves = [];
    for (const gz of this.graveZombies) {
      gz.auraGfx?.destroy();
      if (gz.husk.scene) gz.husk.destroy();
    }
    this.graveZombies = [];
    for (const rec of this.amalgams) {
      rec.stitches.destroy();
      rec.auraGfx?.destroy();
      if (rec.husk.scene) rec.husk.destroy();
    }
    this.amalgams = [];
    for (const e of this.embers) e.sprite.destroy();
    this.embers = [];
    for (const s of this.soulShots) s.gfx.destroy();
    this.soulShots = [];
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
    if (!player.active || player.hp <= 0) return;
    const ctx = () => this.arena.buildPlayerContext(mouseX, mouseY);

    // Click: Lantern Light — held down, rate-limited by the ability's own short cooldown.
    if (pointer.isDown) player.castAbility('soul-lantern-light', ctx());

    if (Phaser.Input.Keyboard.JustDown(eKey)) player.castAbility('soul-arise', ctx());
    if (Phaser.Input.Keyboard.JustDown(rKey)) player.castAbility('soul-grave', ctx());
    if (Phaser.Input.Keyboard.JustDown(fKey)) player.castAbility('soul-death-whistle', ctx());
    if (Phaser.Input.Keyboard.JustDown(qKey)) player.castAbility('soul-hells-torment', ctx());
  }

  // ── Per-frame update ────────────────────────────────────────────────

  update(time: number, delta: number): void {
    this.updatePuddles(time, delta);
    this.updateGraves(time);
    this.updateGraveZombies(time, delta);
    this.updateAmalgams(time, delta);
    this.updateEmbers(time, delta);
    this.updateSoulShots(time, delta);
    this.updateWardPerk();
    this.updateHud();
  }

  // ── Cast entry points (from CastContext) ────────────────────────────

  doLanternTick(tx: number, ty: number, owner: Owner): void {
    const caster = this.fighterOf(owner);
    const scene = this.arena.scene;
    this.spawnLanternTrail(caster.x, caster.y, tx, ty);

    const spr = scene.add.circle(tx, ty, LANTERN_PUDDLE_RADIUS, 0x9955ee, 0.55)
      .setStrokeStyle(2, 0xccaaff, 0.6).setDepth(2);
    this.puddles.push({ sprite: spr, x: tx, y: ty, radius: LANTERN_PUDDLE_RADIUS, owner, expiresAt: scene.time.now + LANTERN_PUDDLE_LIFETIME_MS, tickAccum: 0 });
  }

  doArise(owner: Owner): void {
    if (owner === 'player' && this.arena.hasUpgrade('e')) {
      const caster = this.fighterOf(owner);
      const grave = this.graves.find((g) => g.owner === owner && !g.enhanced
        && Phaser.Math.Distance.Between(caster.x, caster.y, g.x, g.y) <= CRUEL_OFFERING_RADIUS);
      if (grave) {
        grave.enhanced = true;
        grave.sprite.setTint(0xff4444);
        this.arena.showFloatingText(grave.x, grave.y - 30, '🩸 GRAVE ENHANCED', '#ff3333');
        return;
      }
    }
    const queue = this.corpseQueue[owner];
    if (queue.length === 0) return;
    const corpse = queue.shift()!;
    this.spawnAmalgam(owner, corpse);
  }

  doGrave(tx: number, ty: number, owner: Owner): void {
    const scene = this.arena.scene;
    const x = Phaser.Math.Clamp(tx, 20, this.arena.width - 20);
    const y = Phaser.Math.Clamp(ty, 20, this.arena.height - 20);
    const sprite = scene.add.image(x, y, 'soul-grave').setDepth(3);
    this.graves.push({ sprite, x, y, owner, nextSpawnAt: scene.time.now + GRAVE_SPAWN_INTERVAL_MS, enhanced: false });
    this.arena.showFloatingText(x, y - 26, '🪦 GRAVE PLACED', '#ccaaff');
  }

  doDeathWhistle(tx: number, ty: number, owner: Owner): void {
    const scene = this.arena.scene;
    const shriek = scene.add.circle(tx, ty, 10, 0xccaaff, 0.5).setDepth(8);
    scene.tweens.add({ targets: shriek, scaleX: 6, scaleY: 6, alpha: 0, duration: 500, onComplete: () => shriek.destroy() });

    let count = 0;
    for (const rec of this.amalgams) {
      if (rec.owner === owner && rec.husk.active && rec.husk.hp > 0) {
        rec.waypoint = { x: tx, y: ty };
        count++;
      }
    }
    if (count > 0) {
      const caster = this.fighterOf(owner);
      this.arena.showFloatingText(caster.x, caster.y - 40, `📯 ${count} RECALLED`, '#ccaaff');
    }
  }

  doHellsTorment(owner: Owner): void {
    const caster = this.fighterOf(owner);
    let count = 0;
    const now = this.arena.scene.time.now;
    for (const rec of this.amalgams) {
      if (rec.owner === owner && rec.husk.active && rec.husk.hp > 0) {
        rec.burning = true;
        rec.nextEmberAt = now;
        rec.husk.setTint(this.baseTint(rec));
        count++;
      }
    }
    if (count > 0) this.arena.showFloatingText(caster.x, caster.y - 44, "🔥 HELL'S TORMENT", '#ff4411');
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

  private baseTint(rec: Amalgam): number {
    if (rec.inflamed) return INFLAMED_TINT;
    if (rec.burning) return AMALGAM_BURN_TINT;
    return rec.variant.id !== 'basic' ? VARIANT_AMALGAM_TINT : AMALGAM_TINT;
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
    husk.onBite = (dmg, target) => target.takeDamage(dmg);

    const stitches = scene.add.graphics().setDepth(6);
    const auraGfx = angered || inflamed ? scene.add.graphics().setDepth(6) : null;
    const now = scene.time.now;
    const rec: Amalgam = {
      husk, owner, waypoint: null, burning: false,
      baseBiteDamage: biteDmg,
      dashBiteDamage: dashDmg,
      nextDashAt: now + AMALGAM_DASH_INTERVAL_MIN_MS + Math.random() * (AMALGAM_DASH_INTERVAL_MAX_MS - AMALGAM_DASH_INTERVAL_MIN_MS),
      dashUntil: 0,
      nextEmberAt: 0,
      stitches,
      auraGfx,
      burnTickAccum: 0,
      meleeTickAccum: 0,
      carrionUntil: 0,
      nextTrailAt: 0,
      variant,
      angered,
      inflamed,
      damageAccum: 0,
    };
    husk.setTint(this.baseTint(rec));
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
    return opposing.active && opposing.hp > 0 ? [opposing] : [];
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
        rec.stitches.destroy();
        rec.auraGfx?.destroy();
        this.amalgams.splice(i, 1);
        continue;
      }

      // Stitch marks follow the amalgam every frame.
      rec.stitches.clear();
      rec.stitches.lineStyle(1, 0xffffff, 0.85);
      rec.stitches.lineBetween(husk.x - 10, husk.y - 4, husk.x + 4, husk.y + 6);
      rec.stitches.lineBetween(husk.x - 4, husk.y + 8, husk.x + 10, husk.y - 2);

      if (rec.auraGfx) {
        rec.auraGfx.clear();
        if (rec.angered) {
          rec.auraGfx.lineStyle(2, ANGERED_AURA_COLOR, 0.7);
          rec.auraGfx.strokeCircle(husk.x, husk.y, 18 * husk.sizeMult);
          rec.auraGfx.fillStyle(0xff3333, 0.95);
          rec.auraGfx.fillCircle(husk.x - 6, husk.y - 5, 2.2);
          rec.auraGfx.fillCircle(husk.x + 6, husk.y - 5, 2.2);
        } else if (rec.inflamed) {
          rec.auraGfx.lineStyle(2, 0x441111, 0.9);
          rec.auraGfx.lineBetween(husk.x - 9, husk.y - 8, husk.x + 5, husk.y + 6);
          rec.auraGfx.lineBetween(husk.x + 9, husk.y - 8, husk.x - 5, husk.y + 6);
        }
      }

      const body = husk.body as Phaser.Physics.Arcade.Body;

      if (rec.waypoint) {
        const dx = rec.waypoint.x - husk.x, dy = rec.waypoint.y - husk.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist <= WHISTLE_ARRIVE_RADIUS) {
          body.setVelocity(0, 0);
          husk.heal(Math.round(husk.maxHp * WHISTLE_HEAL_FRAC));
          this.arena.showFloatingText(husk.x, husk.y - 30, '💜 HEALED', '#cc99ff');
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
              husk.setTint(AMALGAM_DASH_TINT);
            }
          }
          if (rec.dashUntil > 0 && time >= rec.dashUntil) {
            rec.dashUntil = 0;
            husk.biteDamage = this.effectiveDamage(rec, rec.baseBiteDamage, time);
            husk.setTint(this.baseTint(rec));
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
      // Carrion Call red trail.
      if (rec.carrionUntil > time && time >= rec.nextTrailAt) {
        rec.nextTrailAt = time + CARRION_TRAIL_INTERVAL_MS;
        const trail = scene.add.circle(husk.x, husk.y, 7, 0xff2222, 0.55).setDepth(4);
        scene.tweens.add({ targets: trail, alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: 300, onComplete: () => trail.destroy() });
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
    rec.stitches.destroy();
    rec.auraGfx?.destroy();

    const husk = rec.husk;

    if (rec.burning) {
      const radius = rec.inflamed ? INFLAMED_DEATH_AOE_RADIUS : TORMENT_DEATH_AOE_RADIUS;
      const dmg = rec.inflamed ? INFLAMED_DEATH_AOE_DMG : TORMENT_DEATH_AOE_DMG;
      const emberCount = rec.inflamed ? INFLAMED_DEATH_EMBER_COUNT : TORMENT_DEATH_EMBER_COUNT;
      this.emitEmbers(rec.owner, husk.x, husk.y, emberCount, true);
      this.arena.dealAoeDamageFromOwner(husk.x, husk.y, radius, dmg, rec.owner);
      this.applyDotToFoesInRadius(rec.owner, husk.x, husk.y, radius);
      this.arena.showFloatingText(husk.x, husk.y - 30, '💥 IMMOLATED', '#ff6622');

      if (!rec.inflamed && rec.owner === 'player' && this.arena.hasUpgrade('q')) {
        this.pushCorpse(rec.owner, { maxHp: INFLAMED_HP, inflamed: true });
        this.arena.showFloatingText(husk.x, husk.y - 50, '😈 INFLAMED', '#ff3333');
      }
    } else if (rec.inflamed) {
      // The Inflamed always detonate on death, torment or not.
      this.emitEmbers(rec.owner, husk.x, husk.y, INFLAMED_DEATH_EMBER_COUNT, true);
      this.arena.dealAoeDamageFromOwner(husk.x, husk.y, INFLAMED_DEATH_AOE_RADIUS, INFLAMED_DEATH_AOE_DMG, rec.owner);
      this.applyDotToFoesInRadius(rec.owner, husk.x, husk.y, INFLAMED_DEATH_AOE_RADIUS);
      this.arena.showFloatingText(husk.x, husk.y - 30, '💥 IMMOLATED', '#ff6622');
    }

    if (rec.variant.explodes) this.emitBlast(husk.x, husk.y, Math.round(husk.biteDamage * 2), this.foesOf(rec.owner));

    husk.hideHealthBar();
    this.arena.scene.tweens.add({
      targets: husk, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 350,
      onComplete: () => { if (husk.scene) husk.destroy(); },
    });
  }

  private emitTormentTick(rec: Amalgam): void {
    const husk = rec.husk;
    this.emitEmbers(rec.owner, husk.x, husk.y, TORMENT_EMBER_COUNT, false);
    this.arena.dealAoeDamageFromOwner(husk.x, husk.y, TORMENT_AOE_RADIUS, TORMENT_AOE_DMG, rec.owner);
    this.applyDotToFoesInRadius(rec.owner, husk.x, husk.y, TORMENT_AOE_RADIUS);
  }

  /** Blaster variant: friendly amalgams hit foes, hostile grave zombies hit the given targets directly. */
  private emitBlast(x: number, y: number, dmg: number, targets: Fighter[]): void {
    const scene = this.arena.scene;
    const ring = scene.add.circle(x, y, BLASTER_BOOM_RADIUS, 0xff5522, 0.45).setDepth(6).setScale(0.25);
    scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
    for (const t of targets) {
      if (t.active && t.hp > 0 && Phaser.Math.Distance.Between(x, y, t.x, t.y) <= BLASTER_BOOM_RADIUS) t.takeDamage(dmg);
    }
  }

  // ── Graves ───────────────────────────────────────────────────────────

  private updateGraves(time: number): void {
    for (const g of this.graves) {
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
    const rec: GraveZombie = { husk, owner: grave.owner, variant, angered, auraGfx };
    husk.once('defeated', () => this.onGraveZombieDefeated(rec));
    this.graveZombies.push(rec);
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
      if (rec.auraGfx) {
        rec.auraGfx.clear();
        rec.auraGfx.lineStyle(2, ANGERED_AURA_COLOR, 0.7);
        rec.auraGfx.strokeCircle(husk.x, husk.y, 16 * husk.sizeMult);
        rec.auraGfx.fillStyle(0xff3333, 0.95);
        rec.auraGfx.fillCircle(husk.x - 5, husk.y - 4, 2);
        rec.auraGfx.fillCircle(husk.x + 5, husk.y - 4, 2);
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

    if (rec.variant.explodes) this.emitBlast(husk.x, husk.y, Math.round(husk.biteDamage * 2), [this.fighterOf(rec.owner)]);

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
    const gfx = scene.add.circle(from.x, from.y, SOUL_SHOT_RADIUS, from.variant.color, 1)
      .setDepth(7).setStrokeStyle(2, 0x220022, 0.8);
    this.soulShots.push({
      gfx, x: from.x, y: from.y, vx, vy, damage, owner,
      hitsCaster: !!zRec,
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
      s.gfx.setPosition(s.x, s.y);
      if (s.x < 0 || s.x > W || s.y < 0 || s.y > H) { s.gfx.destroy(); this.soulShots.splice(i, 1); continue; }

      const targets = s.hitsCaster ? [this.fighterOf(s.owner)] : this.foesOf(s.owner);
      let hit = false;
      for (const t of targets) {
        if (t.active && t.hp > 0 && Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= SOUL_SHOT_RADIUS + 16) {
          t.takeDamage(s.damage);
          this.arena.spawnHitFlash(t.x, t.y, 0x9944cc);
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

    const scene = this.arena.scene;
    const ring = scene.add.circle(source.x, source.y, radius, 0x66ff88, 0.18).setDepth(3).setScale(0.4);
    scene.tweens.add({ targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: 500, onComplete: () => ring.destroy() });

    const pool = zRec ? this.graveZombies : this.amalgams;
    for (const rec of pool) {
      if (rec.husk === source || rec.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(source.x, source.y, rec.husk.x, rec.husk.y) <= radius) {
        rec.husk.heal(Math.round(rec.husk.maxHp * frac));
      }
    }
  }

  private doTelegraph(x1: number, y1: number, x2: number, y2: number, color: number, durationMs: number): void {
    const scene = this.arena.scene;
    const gfx = scene.add.graphics().setDepth(6);
    gfx.lineStyle(3, color, 0.7);
    gfx.lineBetween(x1, y1, x2, y2);
    scene.tweens.add({ targets: gfx, alpha: 0, duration: durationMs, onComplete: () => gfx.destroy() });
  }

  // ── Lantern puddles ──────────────────────────────────────────────────

  private spawnLanternTrail(sx: number, sy: number, tx: number, ty: number): void {
    const scene = this.arena.scene;
    const gfx = scene.add.graphics().setDepth(6);
    gfx.lineStyle(2, 0x9966ff, 0.5);
    gfx.beginPath();
    gfx.moveTo(sx, sy);
    gfx.lineTo(tx, ty);
    gfx.strokePath();
    const spark = scene.add.circle(tx, ty, 4, 0xccaaff, 0.9).setDepth(7);
    scene.tweens.add({ targets: [gfx, spark], alpha: 0, duration: 180, onComplete: () => { gfx.destroy(); spark.destroy(); } });
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
      const spr = scene.add.circle(x, y, big ? 6 : 4, 0xff6622, 0.9)
        .setStrokeStyle(1, 0xffaa44, 0.8).setDepth(7);
      this.embers.push({
        sprite: spr, x, y,
        vx: Math.cos(ang) * EMBER_SPEED, vy: Math.sin(ang) * EMBER_SPEED,
        owner, expiresAt: scene.time.now + EMBER_LIFETIME_MS, big,
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
      e.sprite.setPosition(e.x, e.y);
      if (e.x < 0 || e.x > W || e.y < 0 || e.y > H) { e.sprite.destroy(); this.embers.splice(i, 1); continue; }

      let hit = false;
      for (const f of this.foesOf(e.owner)) {
        if (Phaser.Math.Distance.Between(e.x, e.y, f.x, f.y) <= EMBER_HIT_RADIUS) {
          f.takeDamage(TORMENT_EMBER_DMG);
          f.burningUntil = Math.max(f.burningUntil, time + FIRE_DOT_MS);
          this.arena.spawnHitFlash(f.x, f.y, 0xff6622);
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
      if (corpse.inflamed) icon.setTint(INFLAMED_TINT);
      else if (corpse.angered) icon.setTint(0xff4444);
      else icon.clearTint();
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private fighterOf(owner: Owner): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /** Real opposing targets: the 1v1 opponent, or live invasion husks. */
  private foesOf(owner: Owner): Fighter[] {
    if (this.arena.isInvasion) return this.arena.enemies.filter((e) => e.active && e.hp > 0);
    const opposing = owner === 'player' ? this.arena.npc : this.arena.player;
    return opposing.active && opposing.hp > 0 ? [opposing] : [];
  }
}
