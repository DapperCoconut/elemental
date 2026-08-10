import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Husk, HuskWorld } from '../../invasion/Husk';
import { getHuskVariant } from '../../invasion/HuskVariants';
import { SecretMapDef, SecretMapId, getSecretMap } from '../../data/SecretMaps';

/**
 * The five World Shift arenas.
 *
 * One kit, five grounds, every scrap of their state and art owned here — the
 * same contract every element kit follows. ArenaScene constructs it once,
 * calls `reset(mapId)` each match and `update()` each frame, and *pulls* the
 * few things a map has to say about movement (`speedMultFor`) or about where a
 * bot should be walking (`seekPointFor`, `avoidBand`).
 *
 * **Nothing in here takes sides.** Every hazard resolves against a flat list of
 * fighters; the only place sides exist at all is the Graveyard's two energy
 * bars, and even there the rule is symmetrical.
 *
 * **Written for more than 1v1 on purpose.** The API below asks for `allies` and
 * `foes` rather than "player and npc", and everything internal keys off
 * `Fighter` identity rather than a slot, so dropping these maps into
 * multiplayer, co-op or invasion later is a matter of handing the kit a
 * different roster — no map logic has to change. Nothing wires that up today.
 */

export type MapSide = 'player' | 'foe';

export interface SecretMapArenaApi {
  get scene(): Phaser.Scene;
  get width(): number;
  get height(): number;
  /** Everyone fighting on the local player's side. One body today. */
  get allies(): Fighter[];
  /** Everyone hostile to them. One bot normally, two in Duo. */
  get foes(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** Register a map-spawned body with the arena's enemy list + physics group. */
  addEnemy(f: Fighter): void;
  removeEnemy(f: Fighter): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  /** Cursor position — Chaos Realm's bumpers throw you at it. */
  get aimX(): number;
  get aimY(): number;
  /** True while the local player is mid-dash — the bumpers only answer a dash. */
  get playerDashing(): boolean;
}

/** Below the HP bar and the ability tray. Matches GimmickKit's floor. */
const FIELD_TOP = 96;

// ── Graveyard ────────────────────────────────────────────────────────
const GRAVE_COUNT = 5;
const GY_WAVE_MS = 6500;
const GY_PER_WAVE = 3;
const GY_MAX_HUSKS = 14;
const GY_HUSK_HP = 46;
const GY_HUSK_SPEED = 88;
const GY_HUSK_BITE = 12;
// Ordered mild → mean, drawn from the elemental variant table (the old
// speedster/tank/spitter/rusher bodies are gone).
const GY_VARIANTS = ['basic', 'basic', 'elem-air-t1', 'elem-earth-t1', 'elem-electricity-t1', 'elem-hunt-t1'];
const GY_ENERGY_MAX = 100;
const GY_ENERGY_PER_KILL = 12;
const GY_TITAN_HP = 900;
const GY_TITAN_SPEED = 74;
const GY_TITAN_BITE = 34;

// ── Winter Wonderland ────────────────────────────────────────────────
const WW_PATCHES = 6;
const WW_SLIP = 165;
const WW_FIRES = 3;
const WW_FIRE_RADIUS = 96;
/** Chill points per second out in the open, and how fast a fire drives them back. */
const WW_CHILL_RATE = 13;
const WW_THAW_RATE = 42;
const WW_CHILL_MAX = 100;
const WW_FROZEN_DPS = 9;
/** Chill at which a bot gives up on the fight and goes looking for a fire. */
const WW_BOT_PANIC = 58;

// ── Magma Falls ──────────────────────────────────────────────────────
const MF_RIVER_HALF_W = 38;
const MF_RIVER_TOLL = 100;
const MF_RIVER_TOLL_CD = 5000;
const MF_ROCK_MS = 2400;
const MF_ROCK_TELEGRAPH_MS = 900;
const MF_ROCK_RADIUS = 50;
const MF_ROCK_DAMAGE = 26;
const MF_POOL_MS = 6000;
const MF_POOL_RADIUS = 44;
const MF_POOL_DPS = 8;
const MF_ERUPT_MIN_MS = 11000;
const MF_ERUPT_MAX_MS = 18000;
const MF_ERUPT_ROCKS = 9;
/** How far past the bot's attack range the player has to be before it will wade across. */
const MF_CROSS_DISTANCE = 260;

// ── Chaos Realm ──────────────────────────────────────────────────────
const CR_SWAP_MS = 10000;
const CR_BUMPERS_PER_WALL = 3;
const CR_BUMPER_R = 22;
const CR_LAUNCH_SPEED = 760;
const CR_LAUNCH_MS = 420;
const CR_LAUNCH_CD = 700;

// ── Alchemist's Study ────────────────────────────────────────────────
const AS_SPAWN_MS = 7000;
const AS_MAX_ON_FLOOR = 4;
const AS_PICKUP_R = 26;
const AS_BUFF_MS = 22000;

interface Grave { x: number; y: number }
interface IcePatch { x: number; y: number; r: number }
interface Campfire { x: number; y: number }
interface FallingRock { x: number; y: number; firesAt: number; fromEruption: boolean }
interface LavaPool { x: number; y: number; expiresAt: number }
interface Bumper { x: number; y: number; litUntil: number }

/** One of the study's five draughts. */
interface PotionKind {
  id: string;
  name: string;
  emoji: string;
  color: number;
  blurb: string;
}

const POTION_KINDS: PotionKind[] = [
  { id: 'might',  name: 'MIGHT',    emoji: '💪', color: 0xff4d4d, blurb: '+35% damage dealt' },
  { id: 'ward',   name: 'WARDING',  emoji: '🛡️', color: 0x5b9dff, blurb: '−25% damage taken' },
  { id: 'swift',  name: 'SWIFTNESS',emoji: '🏃', color: 0x6ff0a8, blurb: '+30% movement speed' },
  { id: 'mend',   name: 'MENDING',  emoji: '💚', color: 0x9ae64a, blurb: '+4 health per second' },
  { id: 'guile',  name: 'GUILE',    emoji: '🌀', color: 0xc46bff, blurb: '+20% chance to slip a hit' },
];

interface FloorPotion { x: number; y: number; kind: PotionKind; bornAt: number }

/** What a drink did to one body, so it can be taken away again cleanly. */
interface ActiveDraught { kind: PotionKind; expiresAt: number }

export class SecretMapKit {
  private map: SecretMapDef | null = null;
  private startedAt = 0;

  /** Ground art. Painted once on reset; hazards draw on the layers above. */
  private floorG: Phaser.GameObjects.Graphics | null = null;
  /** Everything that moves. Cleared and repainted every frame. */
  private g: Phaser.GameObjects.Graphics | null = null;
  /** Screen-space furniture (energy bars, chill meters). */
  private hudG: Phaser.GameObjects.Graphics | null = null;
  private hudTexts: Phaser.GameObjects.Text[] = [];

  // Graveyard
  private graves: Grave[] = [];
  private husks: Husk[] = [];
  private nextWaveAt = 0;
  private energy: Record<MapSide, number> = { player: 0, foe: 0 };
  private titans: Husk[] = [];

  // Winter
  private icePatches: IcePatch[] = [];
  private campfires: Campfire[] = [];
  private chill = new Map<Fighter, number>();
  private chillTick = new Map<Fighter, number>();

  // Magma
  private riverX = 0;
  private rocks: FallingRock[] = [];
  private pools: LavaPool[] = [];
  private nextRockAt = 0;
  private nextEruptionAt = 0;
  private riverSide = new Map<Fighter, number>();
  private riverTollAt = new Map<Fighter, number>();
  private poolTick = new Map<Fighter, number>();

  // Chaos
  private bumpers: Bumper[] = [];
  private nextSwapAt = 0;
  private launchVel = new Map<Fighter, { vx: number; vy: number; until: number }>();
  private launchReadyAt = new Map<Fighter, number>();

  // Study
  private potions: FloorPotion[] = [];
  private nextPotionAt = 0;
  private draughts = new Map<Fighter, ActiveDraught[]>();
  private mendTick = new Map<Fighter, number>();

  /**
   * Husk hooks. Kept deliberately thin — the Graveyard wants shamblers and
   * spitters, not the whole invasion director, so summons and group heals are
   * no-ops and the ranged shot is a hitscan with a tell.
   */
  private readonly huskWorld: HuskWorld = {
    fireShot: (from, tx, ty, damage) => {
      const scene = this.api.scene;
      const line = scene.add.graphics().setDepth(8);
      line.lineStyle(2.5, 0x9944cc, 0.9);
      line.lineBetween(from.x, from.y, tx, ty);
      scene.tweens.add({ targets: line, alpha: 0, duration: 260, onComplete: () => line.destroy() });
      // A husk shot lands on whoever is standing where it was aimed, either side.
      for (const f of this.everyone()) {
        if (!f.active || f.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(tx, ty, f.x, f.y) < 30) f.takeDamage(damage);
      }
    },
    summon: () => {},
    healNearbyHusks: () => {},
    telegraph: (x1, y1, x2, y2, color, durationMs) => {
      const g = this.api.scene.add.graphics().setDepth(3);
      g.lineStyle(3, color, 0.75);
      g.lineBetween(x1, y1, x2, y2);
      this.api.scene.tweens.add({ targets: g, alpha: 0, duration: durationMs, onComplete: () => g.destroy() });
    },
    findPossessTarget: () => null,
    possess: () => {},
  };

  constructor(private api: SecretMapArenaApi) {}

  /** The active map's display name, or null. Read by the HUD and the briefing. */
  get name(): string | null { return this.map?.name ?? null; }
  get mapId(): SecretMapId | null { return this.map?.id ?? null; }

  // ── Lifecycle ──────────────────────────────────────────────────────

  reset(mapId: string | null): void {
    this.clear();
    this.map = mapId ? getSecretMap(mapId) : null;
    if (!this.map) return;

    const scene = this.api.scene;
    const W = this.api.width;
    const H = this.api.height;
    this.startedAt = scene.time.now;

    this.floorG = scene.add.graphics().setDepth(1);
    this.g = scene.add.graphics().setDepth(2);
    this.hudG = scene.add.graphics().setDepth(21);

    // Placements are seeded off the map id, so a given arena's floor is *that*
    // arena's floor — learnable across attempts rather than re-rolled each run.
    const rnd = new Phaser.Math.RandomDataGenerator([`worldshift-${this.map.id}`]);
    const spot = (): { x: number; y: number } => ({
      x: rnd.integerInRange(120, W - 120),
      y: rnd.integerInRange(FIELD_TOP + 70, H - 96),
    });

    switch (this.map.id) {
      case 'graveyard': {
        this.graves = Array.from({ length: GRAVE_COUNT }, (_, i) => ({
          x: Math.round(((i + 1) / (GRAVE_COUNT + 1)) * W),
          y: FIELD_TOP + 24,
        }));
        this.nextWaveAt = this.startedAt + 2600;
        this.energy = { player: 0, foe: 0 };
        break;
      }
      case 'winter': {
        this.icePatches = Array.from({ length: WW_PATCHES }, () => ({
          ...spot(), r: rnd.integerInRange(52, 78),
        }));
        // Fires are placed by hand rather than rolled: one per corner-ish plus a
        // contested middle, so there is always a route but never a safe one.
        this.campfires = [
          { x: Math.round(W * 0.18), y: Math.round(H * 0.72) },
          { x: Math.round(W * 0.82), y: Math.round(H * 0.72) },
          { x: Math.round(W * 0.50), y: Math.round(FIELD_TOP + (H - FIELD_TOP) * 0.28) },
        ].slice(0, WW_FIRES);
        break;
      }
      case 'magma': {
        this.riverX = Math.round(W / 2);
        this.nextRockAt = this.startedAt + 2000;
        this.nextEruptionAt = this.startedAt + rnd.integerInRange(MF_ERUPT_MIN_MS, MF_ERUPT_MAX_MS);
        break;
      }
      case 'chaos': {
        this.nextSwapAt = this.startedAt + CR_SWAP_MS;
        this.bumpers = [];
        for (let i = 0; i < CR_BUMPERS_PER_WALL; i++) {
          const t = (i + 1) / (CR_BUMPERS_PER_WALL + 1);
          const fy = FIELD_TOP + (H - FIELD_TOP) * t;
          this.bumpers.push({ x: CR_BUMPER_R + 6, y: fy, litUntil: 0 });
          this.bumpers.push({ x: W - CR_BUMPER_R - 6, y: fy, litUntil: 0 });
          this.bumpers.push({ x: W * t, y: FIELD_TOP + CR_BUMPER_R + 4, litUntil: 0 });
          this.bumpers.push({ x: W * t, y: H - CR_BUMPER_R - 6, litUntil: 0 });
        }
        break;
      }
      case 'study': {
        this.nextPotionAt = this.startedAt + 2200;
        break;
      }
    }

    this.paintFloor();

    // Say what the house rules are, once, on the way in.
    scene.time.delayedCall(500, () => {
      if (!this.map) return;
      this.api.showFloatingText(W / 2, 148, `${this.map.emoji} ${this.map.name}`, '#ffe9c0');
    });
    scene.time.delayedCall(1300, () => {
      if (!this.map) return;
      this.api.showFloatingText(W / 2, 176, this.map.tagline.toUpperCase(), '#c8c0d8');
    });
  }

  private clear(): void {
    this.floorG?.destroy(); this.floorG = null;
    this.g?.destroy(); this.g = null;
    this.hudG?.destroy(); this.hudG = null;
    for (const t of this.hudTexts) t.destroy();
    this.hudTexts = [];

    for (const h of [...this.husks, ...this.titans]) {
      this.api.removeEnemy(h);
      if (h.scene) h.destroy();
    }
    this.husks = [];
    this.titans = [];
    this.graves = [];
    this.icePatches = [];
    this.campfires = [];
    this.chill.clear();
    this.chillTick.clear();
    this.rocks = [];
    this.pools = [];
    this.riverSide.clear();
    this.riverTollAt.clear();
    this.poolTick.clear();
    this.bumpers = [];
    this.launchVel.clear();
    this.launchReadyAt.clear();
    this.potions = [];
    // Anything still in someone's bloodstream is unwound rather than dropped —
    // the multipliers are shared, and a body that survives the bout (the player,
    // across a Tag Team restart) would otherwise keep the buff for free.
    for (const [f, held] of this.draughts) {
      for (const d of held) this.applyDraughtDelta(f, d.kind, false);
    }
    this.draughts.clear();
    this.mendTick.clear();
    this.map = null;
  }

  // ── Per-frame ──────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (!this.map || !this.g) return;
    this.g.clear();
    this.hudG?.clear();

    switch (this.map.id) {
      case 'graveyard': this.updateGraveyard(time, delta); break;
      case 'winter':    this.updateWinter(time, delta); break;
      case 'magma':     this.updateMagma(time, delta); break;
      case 'chaos':     this.updateChaos(time, delta); break;
      case 'study':     this.updateStudy(time, delta); break;
    }

    // Bumper and ice-slide displacements are applied last, as position writes.
    // ArenaScene rebuilds every fighter's velocity from scratch each frame, so a
    // velocity write here would be gone before it drew — see GimmickKit's note.
    this.applyLaunches(time, delta);
  }

  // ── Pull-side accessors (ArenaScene reads these) ────────────────────

  /**
   * Speed multiplier this map is imposing on `f` right now. Pulled rather than
   * pushed, because ArenaScene recomputes both fighters' speed from scratch
   * every frame and anything written into it would be overwritten.
   */
  speedMultFor(f: Fighter): number {
    if (!this.map) return 1;
    let mult = 1;
    if (this.map.id === 'winter') {
      // Frozen solid: still mobile, but wading.
      if ((this.chill.get(f) ?? 0) >= WW_CHILL_MAX) mult *= 0.55;
    }
    if (this.map.id === 'study') {
      for (const d of this.draughts.get(f) ?? []) {
        if (d.kind.id === 'swift') mult *= 1.3;
      }
    }
    return mult;
  }

  /**
   * Where the arena says this bot should be walking, overriding chase/strafe.
   * Copied into `NpcAiState.mapSeekPoint` by ArenaScene.
   */
  seekPointFor(f: Fighter): { x: number; y: number } | null {
    if (!this.map) return null;
    if (this.map.id === 'winter') {
      // Only once it is genuinely in trouble — a bot that beelines for a fire at
      // the first shiver never fights at all.
      if ((this.chill.get(f) ?? 0) < WW_BOT_PANIC) return null;
      return this.nearestCampfire(f.x, f.y);
    }
    if (this.map.id === 'study') {
      const p = this.nearestPotion(f.x, f.y);
      return p ? { x: p.x, y: p.y } : null;
    }
    return null;
  }

  /** True for a body this map spawned (Graveyard husks and titans). */
  ownsBody(f: Fighter): boolean {
    return this.husks.includes(f as Husk) || this.titans.includes(f as Husk);
  }

  /**
   * Somebody other than the player for a bot to point itself at.
   *
   * The Graveyard is a three-way fight, and a bot that ignores the husk chewing
   * on its leg both looks stupid and can never earn a rune. It switches targets
   * only when one is genuinely on top of it and nearer than the player, so the
   * duel is still the fight it is having.
   */
  aiTargetOverride(bot: Fighter, player: Fighter): Fighter | null {
    if (this.map?.id !== 'graveyard') return null;
    const toPlayer = Phaser.Math.Distance.Between(bot.x, bot.y, player.x, player.y);
    let best: Fighter | null = null;
    let bestD = Math.min(toPlayer, 220);
    for (const h of [...this.husks, ...this.titans]) {
      if (!h.active || h.hp <= 0) continue;
      // A titan raised by the bot's own side is not its problem.
      if (this.titans.includes(h) && (h.getData('preySide') as MapSide) === 'player') continue;
      const d = Phaser.Math.Distance.Between(bot.x, bot.y, h.x, h.y);
      if (d < bestD) { bestD = d; best = h; }
    }
    return best;
  }

  /** The lava river, for the bots that have to respect it. Null on every other map. */
  avoidBand(): { x: number; halfWidth: number } | null {
    if (this.map?.id !== 'magma') return null;
    return { x: this.riverX, halfWidth: MF_RIVER_HALF_W };
  }

  /**
   * True when `f` genuinely has to wade the river to reach `target` — the fight
   * has moved to the far bank and it is too far away to do anything about it
   * from here.
   */
  shouldCrossBand(f: Fighter, target: Fighter): boolean {
    if (this.map?.id !== 'magma') return false;
    const sameSide = (f.x < this.riverX) === (target.x < this.riverX);
    if (sameSide) return false;
    return Phaser.Math.Distance.Between(f.x, f.y, target.x, target.y) > MF_CROSS_DISTANCE;
  }

  /**
   * Chaos Realm: bounce everything in flight off the walls instead of letting
   * it leave. Called by ArenaScene immediately before its own out-of-bounds
   * cull, which is the thing this is overriding.
   */
  reflectProjectiles(): void {
    if (this.map?.id !== 'chaos') return;
    const wb = this.api.scene.physics.world.bounds;
    for (const go of this.api.projectiles.getChildren()) {
      const p = go as Phaser.Physics.Arcade.Image;
      if (!p.active || !p.body) continue;
      const body = p.body as Phaser.Physics.Arcade.Body;
      let bounced = false;
      if (p.x <= wb.left + 2 && body.velocity.x < 0) { body.velocity.x *= -1; p.x = wb.left + 3; bounced = true; }
      else if (p.x >= wb.right - 2 && body.velocity.x > 0) { body.velocity.x *= -1; p.x = wb.right - 3; bounced = true; }
      if (p.y <= wb.top + 2 && body.velocity.y < 0) { body.velocity.y *= -1; p.y = wb.top + 3; bounced = true; }
      else if (p.y >= wb.bottom - 2 && body.velocity.y > 0) { body.velocity.y *= -1; p.y = wb.bottom - 3; bounced = true; }
      if (bounced) {
        p.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
        const spark = this.api.scene.add.circle(p.x, p.y, 7, 0xffe066, 0.8).setDepth(9);
        this.api.scene.tweens.add({
          targets: spark, scale: 2.2, alpha: 0, duration: 220,
          onComplete: () => spark.destroy(),
        });
      }
    }
  }

  /** Every fighter the map can act on, both sides. */
  private everyone(): Fighter[] {
    return [...this.api.allies, ...this.api.foes];
  }

  private sideOf(f: Fighter): MapSide {
    return this.api.allies.includes(f) ? 'player' : 'foe';
  }

  // ══ GRAVEYARD ═══════════════════════════════════════════════════════

  private updateGraveyard(time: number, delta: number): void {
    const g = this.g!;
    const living = this.everyone().filter((f) => f.active && f.hp > 0);

    // ── Waves out of the graves ────────────────────────────────────
    if (time >= this.nextWaveAt) {
      this.nextWaveAt = time + GY_WAVE_MS;
      const elapsedS = (time - this.startedAt) / 1000;
      for (let i = 0; i < GY_PER_WAVE; i++) {
        if (this.husks.length >= GY_MAX_HUSKS) break;
        this.spawnGraveHusk(elapsedS);
      }
    }

    // Husks pick their own target out of everyone standing. Neither of you is
    // special to them; the nearest warm thing is the one that gets bitten.
    for (const h of [...this.husks]) {
      if (!h.active || h.hp <= 0) continue;
      h.update(living, time, delta);
    }
    // A titan only ever has one side on its list, which is what makes it the
    // summoner's weapon rather than a third party.
    for (const t of [...this.titans]) {
      if (!t.active || t.hp <= 0) continue;
      const prey = t.getData('preySide') as MapSide;
      t.update(living.filter((f) => this.sideOf(f) === prey), time, delta);
    }

    // ── Graves ─────────────────────────────────────────────────────
    for (const grave of this.graves) {
      const glow = 0.25 + Math.sin(time / 520 + grave.x) * 0.1;
      g.fillStyle(0x6fd18a, glow * 0.35);
      g.fillEllipse(grave.x, grave.y + 20, 46, 14);
    }

    // ── The two runic bars ─────────────────────────────────────────
    this.paintEnergyBars(time);
  }

  private spawnGraveHusk(elapsedS: number): void {
    const scene = this.api.scene;
    const grave = this.graves[Math.floor(Math.random() * this.graves.length)];
    // The mix hardens with the clock, the same way an invasion wave count does.
    const poolTop = Math.min(GY_VARIANTS.length, 2 + Math.floor(elapsedS / 22));
    const variant = getHuskVariant(GY_VARIANTS[Math.floor(Math.random() * poolTop)]);
    const x = grave.x + Phaser.Math.Between(-14, 14);
    const y = grave.y + 12;

    const husk = new Husk(
      scene, x, y,
      Math.round(GY_HUSK_HP * variant.hpMult),
      Math.round(GY_HUSK_SPEED * variant.speedMult),
      Math.round(GY_HUSK_BITE * variant.damageMult),
      950, variant,
    );
    husk.world = this.huskWorld;
    // Bites land on whoever it caught — the arena does not care which side.
    husk.onBite = (dmg, target) => { target.takeDamage(dmg); };
    this.api.addEnemy(husk);
    this.husks.push(husk);

    husk.once('defeated', () => {
      this.husks = this.husks.filter((h) => h !== husk);
      this.api.removeEnemy(husk);
      // Whoever put the last hit in gets the charge. `lastDamageOwner` is stamped
      // at ArenaScene's two damage chokepoints, so it covers shots and splashes alike.
      const credit: MapSide = husk.lastDamageOwner === 'npc' ? 'foe' : 'player';
      this.grantEnergy(credit, GY_ENERGY_PER_KILL, husk.x, husk.y);
      if (husk.scene) husk.destroy();
    });

    // Coming up out of the ground.
    const dirt = scene.add.ellipse(x, y, 40, 14, 0x3a2b1c, 0.85).setDepth(4);
    scene.tweens.add({
      targets: dirt, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 520,
      onComplete: () => dirt.destroy(),
    });
  }

  private grantEnergy(side: MapSide, amount: number, x: number, y: number): void {
    if (this.energy[side] >= GY_ENERGY_MAX) return;
    this.energy[side] = Math.min(GY_ENERGY_MAX, this.energy[side] + amount);
    this.api.showFloatingText(x, y - 16, `+${amount} ⚡`, side === 'player' ? '#6fd18a' : '#e0554f');
    if (this.energy[side] >= GY_ENERGY_MAX) this.raiseTitan(side);
  }

  /**
   * A bar filled. Something enormous comes out of the ground, and it has been
   * told about exactly one of you.
   */
  private raiseTitan(summoner: MapSide): void {
    this.energy[summoner] = 0;
    const scene = this.api.scene;
    const prey: MapSide = summoner === 'player' ? 'foe' : 'player';
    const grave = this.graves[Math.floor(this.graves.length / 2)];
    const variant = getHuskVariant('titan');

    const titan = new Husk(
      scene, grave.x, grave.y + 20,
      GY_TITAN_HP, GY_TITAN_SPEED, GY_TITAN_BITE, 1200, variant,
    );
    titan.world = this.huskWorld;
    titan.setData('preySide', prey);
    // Explicitly filtered rather than trusted to targeting: this thing must never
    // turn on the fighter who raised it, however the fight moves.
    titan.onBite = (dmg, target) => {
      if (this.sideOf(target) !== prey) return;
      target.takeDamage(dmg);
    };
    titan.sizeMult = 1.5;
    titan.applySizeMult();
    this.api.addEnemy(titan);
    this.titans.push(titan);

    titan.once('defeated', () => {
      this.titans = this.titans.filter((t) => t !== titan);
      this.api.removeEnemy(titan);
      if (titan.scene) titan.destroy();
    });

    scene.cameras.main.shake(420, 0.008);
    this.api.showFloatingText(this.api.width / 2, 150,
      summoner === 'player' ? '🪦 YOUR TITAN RISES' : '🪦 THEIR TITAN RISES',
      summoner === 'player' ? '#6fd18a' : '#e0554f');
  }

  private paintEnergyBars(time: number): void {
    const hud = this.hudG;
    if (!hud) return;
    const W = this.api.width;
    const H = this.api.height;
    const barW = Math.min(300, W / 2 - 40);
    const barH = 12;
    const y = H - 20;

    const rows: Array<{ side: MapSide; x: number; color: number; label: string }> = [
      { side: 'player', x: 24, color: 0x4fd47e, label: 'YOU' },
      { side: 'foe', x: W - 24 - barW, color: 0xe0554f, label: 'THEM' },
    ];

    for (const row of rows) {
      const frac = this.energy[row.side] / GY_ENERGY_MAX;
      // Runic housing: a dark trough with notched ends.
      hud.fillStyle(0x08060c, 0.85);
      hud.fillRect(row.x - 3, y - barH / 2 - 3, barW + 6, barH + 6);
      hud.lineStyle(1, Phaser.Display.Color.GetColor32(0, 0, 0, 0), 0);
      hud.fillStyle(0x1a1620, 1);
      hud.fillRect(row.x, y - barH / 2, barW, barH);
      hud.fillStyle(row.color, frac >= 1 ? 0.9 + Math.sin(time / 90) * 0.1 : 0.8);
      hud.fillRect(row.x, y - barH / 2, barW * frac, barH);
      // Rune ticks along the trough — five segments, lit as the bar passes them.
      for (let i = 1; i < 5; i++) {
        const tx = row.x + (barW * i) / 5;
        hud.fillStyle(frac >= i / 5 ? 0xffffff : 0x000000, frac >= i / 5 ? 0.55 : 0.5);
        hud.fillRect(tx - 1, y - barH / 2, 2, barH);
      }
      hud.lineStyle(1, row.color, 0.9);
      hud.strokeRect(row.x, y - barH / 2, barW, barH);
    }

    // Labels are Text, not Graphics, so they are made once and only retitled.
    if (this.hudTexts.length === 0) {
      const mk = (x: number, txt: string, color: string, originX: number) =>
        this.api.scene.add.text(x, H - 40, txt, {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color, letterSpacing: 2,
        }).setOrigin(originX, 0.5).setDepth(22);
      this.hudTexts.push(mk(24, 'YOUR RUNE', '#6fd18a', 0));
      this.hudTexts.push(mk(W - 24, 'THEIR RUNE', '#e0554f', 1));
    }
  }

  // ══ WINTER WONDERLAND ═══════════════════════════════════════════════

  private updateWinter(time: number, delta: number): void {
    const g = this.g!;
    const dt = delta / 1000;

    // ── Campfires ──────────────────────────────────────────────────
    for (const fire of this.campfires) {
      const flicker = 0.75 + Math.sin(time / 110 + fire.x) * 0.25;
      // Warmth ring — the honest edge of safety, so nobody has to guess.
      g.lineStyle(1.5, 0xffa040, 0.28);
      g.strokeCircle(fire.x, fire.y, WW_FIRE_RADIUS);
      g.fillStyle(0xff8a2a, 0.06);
      g.fillCircle(fire.x, fire.y, WW_FIRE_RADIUS);
      // Logs.
      g.fillStyle(0x4a3524, 1);
      g.fillRect(fire.x - 16, fire.y + 4, 32, 6);
      g.fillRect(fire.x - 6, fire.y - 2, 26, 5);
      // Flame — three stacked tongues, brightest in the middle.
      for (let i = 0; i < 3; i++) {
        const h = (16 - i * 4) * flicker;
        g.fillStyle([0xff5a1e, 0xffa03c, 0xffe08a][i], 0.85);
        g.beginPath();
        g.moveTo(fire.x - 8 + i * 3, fire.y + 4);
        g.lineTo(fire.x, fire.y + 4 - h);
        g.lineTo(fire.x + 8 - i * 3, fire.y + 4);
        g.closePath();
        g.fillPath();
      }
    }

    // ── Ice patches ────────────────────────────────────────────────
    for (const patch of this.icePatches) {
      g.fillStyle(0x9fd8ff, 0.14);
      g.fillCircle(patch.x, patch.y, patch.r);
      g.lineStyle(1, 0xd8f2ff, 0.28);
      g.strokeCircle(patch.x, patch.y, patch.r);
      // Cracks, so a patch reads as ice rather than as a puddle.
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + patch.x * 0.01;
        g.lineStyle(1, 0xffffff, 0.16);
        g.beginPath();
        g.moveTo(patch.x + Math.cos(a) * patch.r * 0.25, patch.y + Math.sin(a) * patch.r * 0.25);
        g.lineTo(patch.x + Math.cos(a + 0.5) * patch.r * 0.85, patch.y + Math.sin(a + 0.5) * patch.r * 0.85);
        g.strokePath();
      }
    }

    for (const f of this.everyone()) {
      if (!f.active || f.hp <= 0) continue;

      // ── The chill ────────────────────────────────────────────────
      const near = this.campfires.some(
        (c) => Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) < WW_FIRE_RADIUS,
      );
      const before = this.chill.get(f) ?? 0;
      const after = Phaser.Math.Clamp(
        before + (near ? -WW_THAW_RATE : WW_CHILL_RATE) * dt, 0, WW_CHILL_MAX,
      );
      this.chill.set(f, after);

      if (after >= WW_CHILL_MAX) {
        // Frozen: a tick of damage every second, for as long as they stay out.
        const acc = (this.chillTick.get(f) ?? 0) + delta;
        if (acc >= 1000) {
          this.chillTick.set(f, acc - 1000);
          f.takeDamage(WW_FROZEN_DPS);
          this.api.spawnHitFlash(f.x, f.y, 0x9fd8ff);
        } else {
          this.chillTick.set(f, acc);
        }
        // Rime creeping over the body.
        g.lineStyle(2, 0xd8f2ff, 0.55 + Math.sin(time / 200) * 0.2);
        g.strokeCircle(f.x, f.y, 26);
      } else {
        this.chillTick.set(f, 0);
        if (before < WW_CHILL_MAX && after >= WW_CHILL_MAX * 0.99) {
          this.api.showFloatingText(f.x, f.y - 40, '❄ FROZEN', '#9fd8ff');
        }
      }

      // ── Black ice ────────────────────────────────────────────────
      // A positional nudge along whatever heading the body already has, so the
      // patch steals grip rather than driving.
      const patch = this.icePatches.find(
        (p) => Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) < p.r,
      );
      if (patch) {
        const body = f.body as Phaser.Physics.Arcade.Body;
        const sp = Math.hypot(body.velocity.x, body.velocity.y);
        if (sp > 8) {
          f.x += (body.velocity.x / sp) * WW_SLIP * dt;
          f.y += (body.velocity.y / sp) * WW_SLIP * dt;
          this.clampToField(f);
        }
      }
    }

    this.paintChillMeters();
  }

  private nearestCampfire(x: number, y: number): { x: number; y: number } | null {
    let best: Campfire | null = null;
    let bestD = Infinity;
    for (const c of this.campfires) {
      const d = Phaser.Math.Distance.Between(c.x, c.y, x, y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  private paintChillMeters(): void {
    const hud = this.hudG;
    if (!hud) return;

    // The player's chill is a proper meter; everyone else gets a pip over their head.
    const player = this.api.allies[0];
    if (player?.active) {
      const frac = (this.chill.get(player) ?? 0) / WW_CHILL_MAX;
      const W = this.api.width;
      const H = this.api.height;
      const barW = 220;
      const x = W / 2 - barW / 2;
      const y = H - 22;
      hud.fillStyle(0x07101a, 0.85);
      hud.fillRect(x - 3, y - 9, barW + 6, 18);
      hud.fillStyle(0x16222e, 1);
      hud.fillRect(x, y - 6, barW, 12);
      hud.fillStyle(frac >= 1 ? 0xffffff : 0x8fd6ff, 0.9);
      hud.fillRect(x, y - 6, barW * frac, 12);
      hud.lineStyle(1, frac >= 1 ? 0xffffff : 0x8fd6ff, 0.9);
      hud.strokeRect(x, y - 6, barW, 12);
      if (this.hudTexts.length === 0) {
        this.hudTexts.push(this.api.scene.add.text(W / 2, H - 40, '❄  CHILL', {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: '#9fd8ff', letterSpacing: 2,
        }).setOrigin(0.5).setDepth(22));
      }
    }

    for (const f of this.api.foes) {
      if (!f.active || f.hp <= 0) continue;
      const frac = (this.chill.get(f) ?? 0) / WW_CHILL_MAX;
      if (frac <= 0.02) continue;
      hud.fillStyle(0x0a1420, 0.8);
      hud.fillRect(f.x - 21, f.y - 50, 42, 5);
      hud.fillStyle(frac >= 1 ? 0xffffff : 0x8fd6ff, 0.9);
      hud.fillRect(f.x - 20, f.y - 49, 40 * frac, 3);
    }
  }

  // ══ MAGMA FALLS ═════════════════════════════════════════════════════

  private updateMagma(time: number, delta: number): void {
    const g = this.g!;
    const H = this.api.height;
    const W = this.api.width;

    // ── The river ──────────────────────────────────────────────────
    const churn = Math.sin(time / 380);
    g.fillStyle(0x5a1200, 1);
    g.fillRect(this.riverX - MF_RIVER_HALF_W - 6, FIELD_TOP, MF_RIVER_HALF_W * 2 + 12, H - FIELD_TOP);
    g.fillStyle(0xd83a06, 0.95);
    g.fillRect(this.riverX - MF_RIVER_HALF_W, FIELD_TOP, MF_RIVER_HALF_W * 2, H - FIELD_TOP);
    // Molten veins drifting down the flow.
    for (let i = 0; i < 9; i++) {
      const vy = FIELD_TOP + (((time / 14 + i * 90) % (H - FIELD_TOP)));
      const wob = Math.sin(time / 220 + i) * (MF_RIVER_HALF_W * 0.45);
      g.fillStyle(0xffcc33, 0.5 + churn * 0.12);
      g.fillEllipse(this.riverX + wob, vy, 20, 7);
    }
    g.lineStyle(2, 0xff8a2a, 0.8);
    g.beginPath(); g.moveTo(this.riverX - MF_RIVER_HALF_W, FIELD_TOP); g.lineTo(this.riverX - MF_RIVER_HALF_W, H); g.strokePath();
    g.beginPath(); g.moveTo(this.riverX + MF_RIVER_HALF_W, FIELD_TOP); g.lineTo(this.riverX + MF_RIVER_HALF_W, H); g.strokePath();

    // ── Volcano ────────────────────────────────────────────────────
    const erupting = time > this.nextEruptionAt - 1400 && time < this.nextEruptionAt;
    g.fillStyle(0x2c1a12, 1);
    g.beginPath();
    g.moveTo(W / 2 - 150, FIELD_TOP + 4);
    g.lineTo(W / 2 - 44, FIELD_TOP - 44);
    g.lineTo(W / 2 + 44, FIELD_TOP - 44);
    g.lineTo(W / 2 + 150, FIELD_TOP + 4);
    g.closePath();
    g.fillPath();
    g.fillStyle(erupting ? 0xffdd55 : 0xff6a1e, erupting ? 0.9 + Math.sin(time / 60) * 0.1 : 0.7);
    g.fillEllipse(W / 2, FIELD_TOP - 44, 88, 16);

    if (time >= this.nextEruptionAt) {
      this.nextEruptionAt = time + Phaser.Math.Between(MF_ERUPT_MIN_MS, MF_ERUPT_MAX_MS);
      this.erupt(time);
    }

    // ── Ordinary rockfall ──────────────────────────────────────────
    if (time >= this.nextRockAt) {
      this.nextRockAt = time + MF_ROCK_MS;
      this.dropRock(time, false);
    }

    for (const rock of [...this.rocks]) {
      const left = rock.firesAt - time;
      if (left > 0) {
        // Telegraph: a shrinking ring plus the shadow of the thing above it.
        const t = 1 - left / MF_ROCK_TELEGRAPH_MS;
        g.lineStyle(2, 0xff8a2a, 0.35 + t * 0.5);
        g.strokeCircle(rock.x, rock.y, MF_ROCK_RADIUS * (1.6 - t * 0.6));
        g.fillStyle(0x000000, 0.28);
        g.fillEllipse(rock.x, rock.y, MF_ROCK_RADIUS * 1.1 * t, MF_ROCK_RADIUS * 0.4 * t);
        // The rock itself, falling in from above.
        const ry = FIELD_TOP - 60 + (rock.y - FIELD_TOP + 60) * t;
        g.fillStyle(0x3a2018, 1);
        g.fillCircle(rock.x, ry, 13);
        g.fillStyle(0xff5a1e, 0.85);
        g.fillCircle(rock.x - 3, ry - 3, 6);
        continue;
      }
      this.rocks = this.rocks.filter((r) => r !== rock);
      this.impactRock(rock, time);
    }

    // ── Lava pools left behind ─────────────────────────────────────
    for (const pool of [...this.pools]) {
      if (time >= pool.expiresAt) { this.pools = this.pools.filter((p) => p !== pool); continue; }
      const life = (pool.expiresAt - time) / MF_POOL_MS;
      g.fillStyle(0xb02c04, 0.35 * life + 0.2);
      g.fillCircle(pool.x, pool.y, MF_POOL_RADIUS);
      g.fillStyle(0xff7a2a, 0.3 * life);
      g.fillCircle(pool.x, pool.y, MF_POOL_RADIUS * 0.55);
    }

    // ── What all of that does to the people standing in it ─────────
    for (const f of this.everyone()) {
      if (!f.active || f.hp <= 0) continue;

      // Pools: a steady burn while you stand in one.
      const inPool = this.pools.some(
        (p) => Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) < MF_POOL_RADIUS,
      );
      const acc = (this.poolTick.get(f) ?? 0) + (inPool ? delta : 0);
      if (inPool && acc >= 500) {
        this.poolTick.set(f, acc - 500);
        f.takeDamage(Math.round(MF_POOL_DPS / 2));
        this.api.spawnHitFlash(f.x, f.y, 0xff7a2a);
      } else {
        this.poolTick.set(f, inPool ? acc : 0);
      }

      // The river toll: charged on entry, and then not again for five seconds
      // however long they wallow in it.
      const inRiver = Math.abs(f.x - this.riverX) < MF_RIVER_HALF_W;
      const wasIn = (this.riverSide.get(f) ?? 0) === 1;
      this.riverSide.set(f, inRiver ? 1 : 0);
      if (inRiver && !wasIn) {
        const last = this.riverTollAt.get(f) ?? -Infinity;
        if (time - last >= MF_RIVER_TOLL_CD) {
          this.riverTollAt.set(f, time);
          f.takeDamage(MF_RIVER_TOLL);
          this.api.spawnHitFlash(f.x, f.y, 0xff3a06);
          this.api.showFloatingText(f.x, f.y - 44, '🔥 THE RIVER TAKES ITS DUE', '#ff8a2a');
          this.api.scene.cameras.main.shake(160, 0.004);
        }
      }
    }
  }

  private dropRock(time: number, fromEruption: boolean): void {
    const W = this.api.width;
    const H = this.api.height;
    this.rocks.push({
      x: Phaser.Math.Between(70, W - 70),
      y: Phaser.Math.Between(FIELD_TOP + 60, H - 60),
      firesAt: time + MF_ROCK_TELEGRAPH_MS,
      fromEruption,
    });
  }

  private erupt(time: number): void {
    this.api.showFloatingText(this.api.width / 2, 140, '🌋 ERUPTION', '#ff8a2a');
    this.api.scene.cameras.main.shake(700, 0.010);
    for (let i = 0; i < MF_ERUPT_ROCKS; i++) {
      // Staggered so a plume arrives as a barrage rather than a single wall.
      this.api.scene.time.delayedCall(i * 140, () => {
        if (this.map?.id === 'magma') this.dropRock(this.api.scene.time.now, true);
      });
    }
    void time;
  }

  private impactRock(rock: FallingRock, time: number): void {
    const scene = this.api.scene;
    for (const f of this.everyone()) {
      if (!f.active || f.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(rock.x, rock.y, f.x, f.y) > MF_ROCK_RADIUS) continue;
      f.takeDamage(MF_ROCK_DAMAGE);
      this.api.spawnHitFlash(f.x, f.y, 0xff5a1e);
    }
    this.pools.push({ x: rock.x, y: rock.y, expiresAt: time + MF_POOL_MS });

    const burst = scene.add.circle(rock.x, rock.y, MF_ROCK_RADIUS * 0.6, 0xff7a2a, 0.7).setDepth(6);
    scene.tweens.add({
      targets: burst, scale: 2, alpha: 0, duration: 320,
      onComplete: () => burst.destroy(),
    });
    if (rock.fromEruption) scene.cameras.main.shake(120, 0.003);
  }

  // ══ CHAOS REALM ═════════════════════════════════════════════════════

  private updateChaos(time: number, _delta: number): void {
    const g = this.g!;

    // ── Bumpers ────────────────────────────────────────────────────
    for (const b of this.bumpers) {
      const lit = time < b.litUntil;
      const pulse = 0.5 + Math.sin(time / 180 + b.x * 0.05) * 0.25;
      g.fillStyle(lit ? 0xffe066 : 0xff5fc4, lit ? 0.95 : 0.35 + pulse * 0.2);
      g.fillCircle(b.x, b.y, CR_BUMPER_R);
      g.fillStyle(0x1a0824, 0.9);
      g.fillCircle(b.x, b.y, CR_BUMPER_R * 0.62);
      g.lineStyle(3, lit ? 0xffffff : 0xffd0f0, lit ? 1 : 0.6);
      g.strokeCircle(b.x, b.y, CR_BUMPER_R);
      // A carnival star in the middle.
      g.fillStyle(lit ? 0xffffff : 0xffe066, 0.85);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2 + time / 900;
        g.fillCircle(b.x + Math.cos(a) * 7, b.y + Math.sin(a) * 7, 2.6);
      }
    }

    // ── Dash into one and it throws you ────────────────────────────
    for (const f of this.everyone()) {
      if (!f.active || f.hp <= 0) continue;
      if (time < (this.launchReadyAt.get(f) ?? 0)) continue;
      // Only a dash arms it. Walking into a bumper is just walking into a bumper.
      const dashing = this.api.allies.includes(f) ? this.api.playerDashing : this.isFoeDashing(f);
      if (!dashing) continue;
      const hit = this.bumpers.find(
        (b) => Phaser.Math.Distance.Between(b.x, b.y, f.x, f.y) < CR_BUMPER_R + 22,
      );
      if (!hit) continue;

      // You go where you were looking. A bot gets thrown at the person it came for.
      let tx: number, ty: number;
      if (this.api.allies.includes(f)) {
        tx = this.api.aimX; ty = this.api.aimY;
      } else {
        const prey = this.api.allies[0];
        tx = prey?.x ?? this.api.width / 2;
        ty = prey?.y ?? this.api.height / 2;
      }
      const a = Math.atan2(ty - f.y, tx - f.x);
      this.launchVel.set(f, {
        vx: Math.cos(a) * CR_LAUNCH_SPEED,
        vy: Math.sin(a) * CR_LAUNCH_SPEED,
        until: time + CR_LAUNCH_MS,
      });
      this.launchReadyAt.set(f, time + CR_LAUNCH_CD);
      hit.litUntil = time + 320;
      this.api.showFloatingText(f.x, f.y - 40, '🎪 BOING', '#ffe066');
      this.api.scene.cameras.main.shake(120, 0.003);
    }

    // ── Swap places, ready or not ──────────────────────────────────
    if (time >= this.nextSwapAt) {
      this.nextSwapAt = time + CR_SWAP_MS;
      this.swapPlaces();
    }

    // A countdown, so the swap is chaotic rather than merely unfair.
    const left = Math.max(0, this.nextSwapAt - time);
    if (left < 2000) {
      const t = 1 - left / 2000;
      g.lineStyle(3, 0xff5fc4, 0.25 + t * 0.55);
      g.strokeCircle(this.api.width / 2, (FIELD_TOP + this.api.height) / 2, 40 + (1 - t) * 220);
    }
  }

  /**
   * Bots have no dash key, so "dashing" is "committed to a heading at full
   * tilt" — which covers a charge, a dodge and a straight-line chase. The
   * threshold is deliberately low; the launch cooldown, not the test, is what
   * stops a bot pinned against a wall from being juggled forever.
   */
  private isFoeDashing(f: Fighter): boolean {
    const body = f.body as Phaser.Physics.Arcade.Body;
    return Math.hypot(body.velocity.x, body.velocity.y) > f.speed * 1.02;
  }

  private swapPlaces(): void {
    const a = this.api.allies[0];
    const foes = this.api.foes.filter((f) => f.active && f.hp > 0);
    if (!a?.active || foes.length === 0) return;
    // With two foes the pair of them rotate through the player's spot as well,
    // so Duo is not quietly exempt from the map's headline rule.
    const chain = [a, ...foes];
    const spots = chain.map((f) => ({ x: f.x, y: f.y }));
    for (let i = 0; i < chain.length; i++) {
      const to = spots[(i + 1) % spots.length];
      const f = chain[i];
      const puff = this.api.scene.add.circle(f.x, f.y, 20, 0xff5fc4, 0.6).setDepth(9);
      this.api.scene.tweens.add({
        targets: puff, scale: 2.4, alpha: 0, duration: 300, onComplete: () => puff.destroy(),
      });
      (f.body as Phaser.Physics.Arcade.Body).reset(to.x, to.y);
      f.x = to.x; f.y = to.y;
    }
    this.api.showFloatingText(this.api.width / 2, 150, '🔀 SWAP', '#ff5fc4');
  }

  /** Bumper throws, applied as position writes so ArenaScene's velocity pass cannot eat them. */
  private applyLaunches(time: number, delta: number): void {
    if (this.launchVel.size === 0) return;
    const dt = delta / 1000;
    for (const [f, l] of [...this.launchVel]) {
      if (time >= l.until || !f.active || f.hp <= 0) { this.launchVel.delete(f); continue; }
      f.x += l.vx * dt;
      f.y += l.vy * dt;
      this.clampToField(f);
    }
  }

  // ══ ALCHEMIST'S STUDY ═══════════════════════════════════════════════

  private updateStudy(time: number, delta: number): void {
    const g = this.g!;

    if (time >= this.nextPotionAt) {
      this.nextPotionAt = time + AS_SPAWN_MS;
      if (this.potions.length < AS_MAX_ON_FLOOR) this.spawnPotion(time);
    }

    // ── Bottles on the floor ───────────────────────────────────────
    for (const p of [...this.potions]) {
      const bob = Math.sin((time - p.bornAt) / 320) * 3;
      const y = p.y + bob;
      // Halo, so a bottle reads across a dark library floor.
      g.fillStyle(p.kind.color, 0.12);
      g.fillCircle(p.x, y, 22);
      // Flask: round belly, short neck, cork.
      g.fillStyle(0x1a1a24, 0.85);
      g.fillCircle(p.x, y + 3, 9.5);
      g.fillStyle(p.kind.color, 0.9);
      g.fillCircle(p.x, y + 3, 8);
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(p.x - 2.6, y + 0.6, 2.4);
      g.fillStyle(0xd8d0e8, 0.9);
      g.fillRect(p.x - 2.5, y - 10, 5, 7);
      g.fillStyle(0x8a6a3a, 1);
      g.fillRect(p.x - 3.5, y - 14, 7, 4);

      // Drinking is walking over it.
      for (const f of this.everyone()) {
        if (!f.active || f.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) > AS_PICKUP_R) continue;
        this.potions = this.potions.filter((q) => q !== p);
        this.drink(f, p.kind, time);
        break;
      }
    }

    // ── What is currently in everyone ──────────────────────────────
    for (const f of this.everyone()) {
      const held = this.draughts.get(f);
      if (!held || held.length === 0) continue;

      const live: ActiveDraught[] = [];
      for (const d of held) {
        if (time < d.expiresAt) { live.push(d); continue; }
        // Wound back exactly the way it was applied, so a second owner of the
        // same field is left holding what it put there.
        this.applyDraughtDelta(f, d.kind, false);
      }
      if (live.length !== held.length) this.draughts.set(f, live);

      // Mending and Guile are refreshed every frame rather than applied once:
      // ArenaScene only ticks regeneration for the player (so a bot's draught
      // would do nothing), and `dodgeChance` is *spent* by the dodge it buys.
      let mend = 0, guile = 0;
      for (const d of live) {
        if (d.kind.id === 'mend') mend += 4;
        if (d.kind.id === 'guile') guile += 0.2;
      }
      if (mend > 0) {
        const acc = (this.mendTick.get(f) ?? 0) + delta;
        if (acc >= 1000) { this.mendTick.set(f, acc - 1000); f.heal(mend); }
        else this.mendTick.set(f, acc);
      }
      if (guile > 0) f.dodgeChance = Math.max(f.dodgeChance, Math.min(0.85, guile));

      // A ring of pips over the head — one per draught still working.
      live.forEach((d, i) => {
        const a = (i / Math.max(1, live.length)) * Math.PI * 2 + time / 700;
        g.fillStyle(d.kind.color, 0.9);
        g.fillCircle(f.x + Math.cos(a) * 30, f.y - 34 + Math.sin(a) * 8, 3.4);
      });
    }
  }

  private spawnPotion(time: number): void {
    const W = this.api.width;
    const H = this.api.height;
    const kind = POTION_KINDS[Math.floor(Math.random() * POTION_KINDS.length)];
    const p: FloorPotion = {
      x: Phaser.Math.Between(90, W - 90),
      y: Phaser.Math.Between(FIELD_TOP + 70, H - 80),
      kind, bornAt: time,
    };
    this.potions.push(p);
    const scene = this.api.scene;
    const flash = scene.add.circle(p.x, p.y, 8, kind.color, 0.8).setDepth(7);
    scene.tweens.add({ targets: flash, scale: 3.5, alpha: 0, duration: 480, onComplete: () => flash.destroy() });
  }

  private drink(f: Fighter, kind: PotionKind, time: number): void {
    const held = this.draughts.get(f) ?? [];
    // Stacking is the point: drinking the same thing twice refreshes *and* doubles.
    held.push({ kind, expiresAt: time + AS_BUFF_MS });
    this.draughts.set(f, held);
    this.applyDraughtDelta(f, kind, true);
    this.api.showFloatingText(f.x, f.y - 44, `${kind.emoji} ${kind.name}`, `#${kind.color.toString(16).padStart(6, '0')}`);
    this.api.spawnHitFlash(f.x, f.y, kind.color);
  }

  /**
   * Applies (or unwinds) one draught's share of a shared multiplier.
   *
   * Multiply on, divide off — the discipline every other temporary buff in the
   * game uses. A full recompute would be simpler but wrong: these fields have
   * other owners (items, Fire's Flame Body), and assigning the total would
   * silently discard whatever they had put there.
   *
   * The other three kinds are not here on purpose. Swiftness is pulled through
   * `speedMultFor`, and Mending and Guile are refreshed every frame in
   * `updateStudy` — see the note there for why.
   */
  private applyDraughtDelta(f: Fighter, kind: PotionKind, on: boolean): void {
    switch (kind.id) {
      case 'might': f.cardOutgoingDamageMult *= on ? 1.35 : 1 / 1.35; break;
      case 'ward':  f.mapArmorMult *= on ? 0.75 : 1 / 0.75; break;
      default: break;
    }
  }

  private nearestPotion(x: number, y: number): FloorPotion | null {
    let best: FloorPotion | null = null;
    let bestD = Infinity;
    for (const p of this.potions) {
      const d = Phaser.Math.Distance.Between(p.x, p.y, x, y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // ── Shared helpers ─────────────────────────────────────────────────

  private clampToField(f: Fighter): void {
    const wb = this.api.scene.physics.world.bounds;
    f.x = Phaser.Math.Clamp(f.x, wb.left + 12, wb.right - 12);
    f.y = Phaser.Math.Clamp(f.y, wb.top + 12, wb.bottom - 12);
  }

  // ── Ground art ─────────────────────────────────────────────────────

  /**
   * The floor, painted once. Everything that moves lives on `this.g` above it;
   * this layer is the room itself and never changes for the length of a bout.
   */
  private paintFloor(): void {
    const g = this.floorG;
    const map = this.map;
    if (!g || !map) return;
    const W = this.api.width;
    const H = this.api.height;

    g.fillStyle(map.floor, 1);
    g.fillRect(0, FIELD_TOP, W, H - FIELD_TOP);

    switch (map.id) {
      case 'graveyard': {
        // Ranks of headstones along the top wall, and a scatter of old ones behind.
        for (let i = 0; i < 14; i++) {
          const x = 40 + (i * (W - 80)) / 13;
          const y = FIELD_TOP + 16 + ((i % 3) * 6);
          g.fillStyle(0x2a2c36, 1);
          g.fillRect(x - 9, y - 16, 18, 22);
          g.fillCircle(x, y - 16, 9);
          g.fillStyle(0x1b1d25, 1);
          g.fillRect(x - 5, y - 14, 10, 3);
        }
        // Crosses further down, half-sunk.
        for (let i = 0; i < 9; i++) {
          const x = 70 + ((i * 97) % (W - 140));
          const y = FIELD_TOP + 90 + ((i * 61) % (H - FIELD_TOP - 180));
          g.fillStyle(0x232630, 0.75);
          g.fillRect(x - 2, y - 14, 4, 22);
          g.fillRect(x - 8, y - 8, 16, 4);
        }
        // Mist banks.
        for (let i = 0; i < 5; i++) {
          g.fillStyle(0x6fd18a, 0.035);
          g.fillEllipse((i * 233) % W, FIELD_TOP + 120 + ((i * 151) % (H - FIELD_TOP - 160)), 260, 60);
        }
        break;
      }
      case 'winter': {
        // Snowdrifts and a scatter of dark pines around the rim.
        for (let i = 0; i < 7; i++) {
          g.fillStyle(0xe8f4ff, 0.05);
          g.fillEllipse((i * 197) % W, FIELD_TOP + 60 + ((i * 173) % (H - FIELD_TOP - 90)), 220, 70);
        }
        for (let i = 0; i < 11; i++) {
          const x = 26 + ((i * 89) % (W - 52));
          const y = i % 2 === 0 ? FIELD_TOP + 22 : H - 26;
          g.fillStyle(0x14301f, 1);
          g.beginPath();
          g.moveTo(x, y - 26); g.lineTo(x - 12, y + 4); g.lineTo(x + 12, y + 4);
          g.closePath(); g.fillPath();
          g.fillStyle(0xe8f4ff, 0.5);
          g.beginPath();
          g.moveTo(x, y - 26); g.lineTo(x - 5, y - 12); g.lineTo(x + 5, y - 12);
          g.closePath(); g.fillPath();
        }
        break;
      }
      case 'magma': {
        // Cooled basalt with cracks bleeding light.
        for (let i = 0; i < 22; i++) {
          const x = (i * 137) % W;
          const y = FIELD_TOP + ((i * 211) % (H - FIELD_TOP));
          g.lineStyle(1.5, 0xff5a1e, 0.16);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + ((i % 5) - 2) * 26, y + 34);
          g.strokePath();
        }
        // Scorched crust patches.
        for (let i = 0; i < 8; i++) {
          g.fillStyle(0x140a06, 0.5);
          g.fillEllipse((i * 173) % W, FIELD_TOP + 40 + ((i * 131) % (H - FIELD_TOP - 60)), 130, 44);
        }
        break;
      }
      case 'chaos': {
        // Big top: radial stripes from the middle, then bunting on the top wall.
        const cxp = W / 2;
        const cyp = (FIELD_TOP + H) / 2;
        for (let i = 0; i < 16; i++) {
          if (i % 2 === 0) continue;
          const a0 = (i / 16) * Math.PI * 2;
          const a1 = ((i + 1) / 16) * Math.PI * 2;
          g.fillStyle(0x3a1a4e, 0.75);
          g.beginPath();
          g.moveTo(cxp, cyp);
          g.lineTo(cxp + Math.cos(a0) * 900, cyp + Math.sin(a0) * 900);
          g.lineTo(cxp + Math.cos(a1) * 900, cyp + Math.sin(a1) * 900);
          g.closePath(); g.fillPath();
        }
        for (let i = 0; i < 18; i++) {
          const x = (i * (W / 17));
          g.fillStyle([0xff5fc4, 0xffe066, 0x5fd8ff][i % 3], 0.8);
          g.beginPath();
          g.moveTo(x, FIELD_TOP + 2);
          g.lineTo(x + W / 34, FIELD_TOP + 18);
          g.lineTo(x + W / 17, FIELD_TOP + 2);
          g.closePath(); g.fillPath();
        }
        break;
      }
      case 'study': {
        // Shelves down both walls, a rug in the middle, dust in the light.
        for (const side of [0, 1]) {
          const x = side === 0 ? 8 : W - 44;
          for (let row = 0; row < 5; row++) {
            const y = FIELD_TOP + 24 + row * 90;
            g.fillStyle(0x3a2c18, 1);
            g.fillRect(x, y, 36, 78);
            for (let b = 0; b < 7; b++) {
              g.fillStyle([0x7a3b2a, 0x2a4a3a, 0x53406a, 0x6a5a2a][b % 4], 1);
              g.fillRect(x + 3 + b * 4.6, y + 6, 3.6, 62 - (b % 3) * 8);
            }
          }
        }
        g.fillStyle(0x4a2f28, 0.5);
        g.fillEllipse(W / 2, (FIELD_TOP + H) / 2 + 20, 420, 210);
        g.lineStyle(3, 0xc9a227, 0.28);
        g.strokeEllipse(W / 2, (FIELD_TOP + H) / 2 + 20, 420, 210);
        g.strokeEllipse(W / 2, (FIELD_TOP + H) / 2 + 20, 340, 160);
        for (let i = 0; i < 30; i++) {
          g.fillStyle(0xffe9b0, 0.07);
          g.fillCircle((i * 163) % W, FIELD_TOP + ((i * 97) % (H - FIELD_TOP)), 1.6);
        }
        break;
      }
    }
  }
}
