import Phaser from 'phaser';
import { Fighter, DamageOpts } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { stealBuffs } from '../../combat/StatusEffects';
import { Sfx } from '../../audio';
import {
  GluttonyAvatar, HAR, HarvestColorFn, HarvestFx, MoldCell, corruptHeart, corruptionVeil, crowShape,
  fleshChunk, moldLayer, seedShape, sickleShape, sickleTrail,
} from './GluttonyVisuals';

type Owner = 'player' | 'npc';

const BOTH: Owner[] = ['player', 'npc'];
const ARENA_PAD = 28;

// ── Click: Sickle ────────────────────────────────────────────────────────────
const SICKLE_DAMAGE = 12;
/** Loop diameter is the cursor distance, clamped to this. */
const LOOP_MIN = 140;
const LOOP_MAX = 380;
/** Loop time: a base plus this many ms per pixel of diameter. */
const LOOP_BASE_MS = 620;
const LOOP_MS_PER_PX = 1.5;
const SICKLE_HIT_R = 15;
const SICKLE_SIZE = 11;
const HEART_HIT_R = 18;

// ── E: Sow Corruption ────────────────────────────────────────────────────────
const SEEDS_PER_CAST = 7;
const SEED_DIST_MIN = 45;
const SEED_DIST_MAX = 120;
const SEED_FLIGHT_MS = 420;
/** A colony's reach starts here and creeps out to `SEED_R_MAX` over `SEED_GROW_MS`. */
const SEED_R_MIN = 30;
const SEED_R_MAX = 110;
const SEED_GROW_MS = 25_000;
/** Three casts' worth; the oldest seed's colony withers when a fourth is sown. */
const SEEDS_MAX = SEEDS_PER_CAST * 3;
const CELL = 14;
const MOLD_TICK_MS = 100;
/** Growth per second for a cell that is allowed to grow and has a live neighbour. */
const MOLD_GROW_PER_SEC = 0.32;
const MOLD_WITHER_PER_SEC = 0.5;
/** A neighbour this grown spreads into the next cell. */
const MOLD_SPREAD_AT = 0.35;
/** Underfoot mold at least this grown rots whoever is standing on it. */
const MOLD_BITE_AT = 0.5;

// ── Corruption ───────────────────────────────────────────────────────────────
const CORRUPTION_MAX = 100;
/** Per second on mature mold; scaled down on younger mold. */
const MOLD_CORRUPTION_PER_SEC = 6;
/** Off the mold this long, the rot starts to fade. */
const CORRUPTION_FADE_AFTER_MS = 2500;
const CORRUPTION_FADE_PER_SEC = 1.2;
/** Lifesteal at full corruption: this share of every hit landed on that body. Linear below. */
const LIFESTEAL_MAX = 0.35;
/** Corruption put on an attacker per point of Corrupt HP they chew through. */
const CORRUPT_HP_BACKLASH = 0.25;

// ── Hearts and Corrupt HP ────────────────────────────────────────────────────
const HEART_EVERY_MS = 5000;
const HEART_MIN_MATURE = 20;
const HEARTS_MAX = 3;
const HEART_LIFE_MS = 20_000;
const HEART_R = 9;
const HEART_CORRUPT_HP = 75;
const HEART_REGEN_PER_SEC = 5;
const HEART_REGEN_MS = 5000;
/** Corrupt HP is capped at this share of max health (never below 150). */
const CORRUPT_CAP_SHARE = 0.5;

// ── R: Feeding Frenzy ────────────────────────────────────────────────────────
const CROWS = 3;
const CROW_MS = 6000;
const CROW_ORBIT_R = 52;
const CROW_SPIN = 4.2;
const CROW_SPEED = 560;
const CROW_HIT_R = 14;
const CROW_REHIT_MS = 450;
const CROW_DAMAGE = 5;
/** At full corruption a peck lands for this many times its base. */
const CROW_CORRUPT_MULT = 3;
/** A bot's (or a replica's) "cursor" drifts toward its target at this rate. */
const CROW_CENTRE_SPEED = 240;

// ── F: Consume ───────────────────────────────────────────────────────────────
const BITE_REACH = 84;
const BITE_HALF = (52 * Math.PI) / 180;
const BITE_DAMAGE = 18;
const HEAL_BLOCK_MS = 8000;
const FLESH_MAX = 3;
const FLESH_EAT_BELOW = 75;
const FLESH_CORRUPT_HP = 75;
const HEAVY_CORRUPTION = 40;
/** Copies of a bitten body's damage and speed buffs last this long on the scarecrow. */
const STOLEN_MS = 8000;

// ── Q: Reaping Hour ──────────────────────────────────────────────────────────
const REAP_WINDUP_MS = 320;
const REAP_REACH = 160;
const REAP_HALF = (80 * Math.PI) / 180;
const REAP_DAMAGE = 30;
const REAP_VULN = 1.15;
const EXECUTE_BASE = 0.10;
const EXECUTE_MAX = 0.25;

// ── Bot ──────────────────────────────────────────────────────────────────────
const NPC_HEART_AIM_R = LOOP_MAX;

// ── Types ────────────────────────────────────────────────────────────────────

interface Sickle {
  owner: Owner;
  /** Where the loop was thrown from, and the caster's position then (for the homing tail). */
  ox: number;
  oy: number;
  cx: number;
  cy: number;
  R: number;
  start: number;
  phi0: number;
  side: number;
  dur: number;
  x: number;
  y: number;
  hit: Set<Fighter>;
  trail: { x: number; y: number }[];
}

interface Seed {
  owner: Owner;
  x: number;
  y: number;
  born: number;
}

interface Heart {
  owner: Owner;
  x: number;
  y: number;
  born: number;
  seed: number;
}

interface Crow {
  owner: Owner;
  phase: number;
  x: number;
  y: number;
  ang: number;
  flap: number;
  hitAt: Map<Fighter, number>;
}

interface Flock {
  owner: Owner;
  until: number;
  cx: number;
  cy: number;
  crows: Crow[];
}

interface Swing {
  owner: Owner;
  at: number;
  ang: number;
  side: number;
}

interface Side {
  owner: Owner;
  aimX: number;
  aimY: number;
  /** Which way the sickle's loop curls: 1 or -1. Right-click flips it. */
  arc: number;
  flesh: number;
  heartRegenUntil: number;
  /** Fractional Corrupt HP and lifesteal, so small per-frame amounts are never rounded away. */
  corruptFrac: number;
  healFrac: number;
  stolenDmg: number;
  stolenSpeed: number;
  stolenUntil: number;
  heartTimer: number;
  swing: Swing | null;
}

function makeSide(owner: Owner): Side {
  return {
    owner, aimX: 0, aimY: 0, arc: 1, flesh: 0, heartRegenUntil: 0, corruptFrac: 0, healFrac: 0,
    stolenDmg: 1, stolenSpeed: 1, stolenUntil: 0, heartTimer: 0, swing: null,
  };
}

/** Small seeded PRNG, so both machines scatter one cast's seeds the same way. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface GluttonyArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  isTargetable(f: Fighter): boolean;
  gluttonyColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay a press that never touches a cooldown (the arc flip) as a pseudo-cast. */
  broadcast(id: string): void;
}

// ── GluttonyKit ──────────────────────────────────────────────────────────────

/**
 * Harvest — the scarecrow. (The element id is still `gluttony`, so every save keeps working.)
 *
 * The kit's one resource lives on the *enemy*: **Corruption**, 0–100, a Fighter field
 * (`harvestCorruption`) so the status tray and the online mirror carry it. It is put there by
 * standing on the scarecrow's mold, by chewing through its Corrupt HP, and by a bite taken while
 * it is half rot — and everything else in the kit reads it back: the lifesteal on every hit, the
 * crows' pecks, and the line under which Reaping Hour simply kills.
 *
 * - **Sickle** flies a full boomerang loop out to the cursor and back to the hand, piercing.
 *   It is also how hearts are harvested.
 * - **Sow Corruption** seeds colonies of mold on a coarse grid. Each colony spreads cell to cell
 *   within a reach that itself creeps outward; mature mold grows **hearts**.
 * - **Feeding Frenzy** is three crows orbiting the cursor.
 * - **Consume** bites, steals, blocks healing and tears off **Corrupt Flesh** for later.
 * - **Reaping Hour** is a wide scythe swing: permanent stacking vulnerability and an execute.
 *
 * Corrupt HP is a Fighter layer (`corruptHp`) with an absorb callback; the kit installs the
 * callback on its own bodies each frame and owns the cap and the regeneration.
 */
export class GluttonyKit {
  private api: GluttonyArenaApi;

  // ── Visuals ──
  private readonly pcol: HarvestColorFn;
  private readonly ncol: HarvestColorFn;
  private readonly pfx: HarvestFx;
  private readonly nfx: HarvestFx;
  private playerAvatar: GluttonyAvatar | null = null;
  private npcAvatar: GluttonyAvatar | null = null;
  /** Mold and hearts — on the floor, under the fighters. */
  private moldGfx: Phaser.GameObjects.Graphics | null = null;
  /** The rot creeping up corrupted bodies, over their sprites. */
  private veilGfx: Phaser.GameObjects.Graphics | null = null;
  /** Sickles, crows and the flesh trophies — over everything that walks. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private sickles: Sickle[] = [];
  private seeds: Seed[] = [];
  private hearts: Heart[] = [];
  private flocks: Flock[] = [];
  /** Growth 0–1 per cell, one grid per owner. */
  private grids: Record<Owner, Float32Array> | null = null;
  private gridW = 0;
  private gridH = 0;
  private scratch: Float32Array | null = null;
  private allow: Uint8Array | null = null;
  private moldAcc = 0;
  /** Last time each body stood on rotting mold, so corruption only fades once they are off it. */
  private lastOnMold = new Map<Fighter, number>();
  /** Reaping Hour stacks per body; written into `gluttonyIncomingMult` every frame. */
  private reaped = new Map<Fighter, number>();
  private wasRight = false;

  constructor(api: GluttonyArenaApi) {
    this.api = api;
    this.pcol = (base) => api.gluttonyColor('player', base);
    this.ncol = (base) => api.gluttonyColor('npc', base);
    this.pfx = new HarvestFx(api.scene, this.pcol);
    this.nfx = new HarvestFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): HarvestFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): HarvestColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): GluttonyAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }

  private isHarvest(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'gluttony' : this.api.npcElementId === 'gluttony';
  }

  /** An online opponent's body: drawn here, simulated on their own machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  private targetsOf(owner: Owner): Fighter[] {
    // In an Invasion the npc slot is on the player's side; a co-op ally's attacks resolve on its
    // own machine. Here they must touch nobody.
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  /** Everything this kit ever writes a field on, so a stale value can always be cleared. */
  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
    return Phaser.Math.Distance.Between(ax + dx * u, ay + dy * u, px, py);
  }

  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }

  /** A kit-made label: `showFloatingText` is a no-op in this codebase, so the ones that matter are ours. */
  private announce(x: number, y: number, text: string, color: number, size = 12): void {
    const { scene } = this.api;
    const t = scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'Arial Black', color: this.hex(color),
      stroke: '#0c0610', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    scene.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private corruptCap(f: Fighter): number { return Math.max(150, f.maxHp * CORRUPT_CAP_SHARE); }

  /** Corruption as 0–1. */
  private rotOf(f: Fighter): number { return Phaser.Math.Clamp(f.harvestCorruption / CORRUPTION_MAX, 0, 1); }

  private corrupt(f: Fighter, amount: number): void {
    if (amount <= 0 || !f.active) return;
    const was = f.harvestCorruption;
    f.harvestCorruption = Math.min(CORRUPTION_MAX, was + amount);
    this.lastOnMold.set(f, Math.max(this.lastOnMold.get(f) ?? 0, this.now));
    if (was < CORRUPTION_MAX && f.harvestCorruption >= CORRUPTION_MAX) {
      this.announce(f.x, f.y - 52, '🟣 FULLY CORRUPTED', HAR.purpleLit, 12);
    }
  }

  private addCorruptHp(owner: Owner, amount: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.isReplica(owner)) return;
    const s = this.side(owner);
    s.corruptFrac += amount;
    const whole = Math.floor(s.corruptFrac);
    if (whole <= 0) return;
    s.corruptFrac -= whole;
    f.corruptHp = Math.min(this.corruptCap(f), f.corruptHp + whole);
  }

  /**
   * Every Harvest hit goes through here: the stolen damage buff, the hit itself, then the
   * lifesteal off the body's corruption. The heal is read off `lastIncomingDamage`, the
   * post-mitigation figure the victim's own `takeDamage` records — which is also what an online
   * ghost reports, so lifesteal works on a remote body whose health we cannot see change.
   */
  private hit(owner: Owner, t: Fighter, base: number, opts?: DamageOpts): void {
    const s = this.side(owner);
    const dmg = base * (this.now < s.stolenUntil ? s.stolenDmg : 1);
    t.lastIncomingDamage = 0;
    t.takeDamage(dmg, opts);
    const dealt = t.lastIncomingDamage;
    const rot = this.rotOf(t);
    const f = this.fighter(owner);
    if (dealt <= 0 || rot <= 0 || this.isReplica(owner) || !this.alive(f)) return;
    s.healFrac += dealt * rot * LIFESTEAL_MAX;
    const whole = Math.floor(s.healFrac);
    if (whole > 0) {
      s.healFrac -= whole;
      f.heal(whole);
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.sickles = [];
    this.seeds = [];
    this.hearts = [];
    this.flocks = [];
    this.grids = null;
    this.scratch = null;
    this.allow = null;
    this.moldAcc = 0;
    this.lastOnMold.clear();
    this.reaped.clear();
    this.wasRight = false;
    this.vizT = 0;

    for (const f of this.allFighters()) {
      f.gluttonyIncomingMult = 1;
      f.harvestCorruption = 0;
      f.corruptHp = 0;
      f.onCorruptAbsorb = null;
    }

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.moldGfx, this.veilGfx, this.airGfx]) g?.destroy();
    this.moldGfx = this.veilGfx = this.airGfx = null;

    this.api.setStatusIndicator('harvest-flesh', null);
    this.api.setStatusIndicator('harvest-stolen', null);
    this.api.setStatusIndicator('harvest-arc', null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters sit at depth 5.
    if (!this.moldGfx) this.moldGfx = scene.add.graphics().setDepth(2.2);
    if (!this.veilGfx) this.veilGfx = scene.add.graphics().setDepth(5.6);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isHarvest('player') && !this.playerAvatar) this.playerAvatar = new GluttonyAvatar(scene, this.pcol);
    if (this.isHarvest('npc') && !this.npcAvatar) this.npcAvatar = new GluttonyAvatar(scene, this.ncol);
  }

  private ensureGrids(): void {
    if (this.grids) return;
    this.gridW = Math.ceil(this.api.width / CELL);
    this.gridH = Math.ceil(this.api.height / CELL);
    const n = this.gridW * this.gridH;
    this.grids = { player: new Float32Array(n), npc: new Float32Array(n) };
    this.scratch = new Float32Array(n);
    this.allow = new Uint8Array(n);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'gluttony') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const right = pointer.rightButtonDown();
    const flip = right && !this.wasRight;
    this.wasRight = right;
    if (!this.alive(p)) return;

    if (flip) this.flipArc('player');

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    if (pointer.leftButtonDown()) p.castAbility('harvest-sickle', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('harvest-sow', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('harvest-frenzy', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('harvest-consume', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('harvest-reap', ctx);
  }

  private flipArc(owner: Owner): void {
    const s = this.side(owner);
    s.arc = -s.arc;
    const f = this.fighter(owner);
    if (this.alive(f)) this.fx(owner).arcSwap(f.x, f.y - 44, s.arc);
    if (owner === 'player') {
      Sfx.playAt('ui-click', f.x, { rate: s.arc > 0 ? 1.3 : 1.0, volume: 0.35 });
      this.api.broadcast(s.arc > 0 ? 'harvest-arc-r' : 'harvest-arc-l');
    }
  }

  /** Online: the opponent's presses that touch no cooldown. */
  replayNet(id: string): void {
    const s = this.sides.npc;
    if (id === 'harvest-arc-r' && s.arc < 0) this.flipArc('npc');
    else if (id === 'harvest-arc-l' && s.arc > 0) this.flipArc('npc');
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Sickle. */
  doSickle(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;
    // A bot has no right mouse button: it picks a curl per throw.
    if (owner === 'npc' && !this.isReplica(owner)) s.arc = Math.random() < 0.5 ? 1 : -1;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const D = Phaser.Math.Clamp(Phaser.Math.Distance.Between(f.x, f.y, tx, ty), LOOP_MIN, LOOP_MAX);
    const R = D / 2;
    this.sickles.push({
      owner, ox: f.x, oy: f.y, cx: f.x + Math.cos(ang) * R, cy: f.y + Math.sin(ang) * R, R,
      start: this.now, phi0: ang + Math.PI, side: s.arc, dur: LOOP_BASE_MS + D * LOOP_MS_PER_PX,
      x: f.x, y: f.y, hit: new Set(), trail: [],
    });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).sickleThrow(f.x + Math.cos(ang) * 18, f.y + Math.sin(ang) * 18, ang);
    Sfx.playAt('whoosh', f.x, { rate: 1.45, volume: 0.45 });
  }

  /** E — Sow Corruption. Seeds land around the caster; the scatter is seeded by where it stood. */
  doSow(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    this.ensureGrids();
    const rnd = mulberry((Math.round(f.x) * 73856093) ^ (Math.round(f.y) * 19349663) ^ (owner === 'npc' ? 0x5bd1e995 : 0));
    const base = rnd() * Math.PI * 2;
    for (let i = 0; i < SEEDS_PER_CAST; i++) {
      const a = base + (i / SEEDS_PER_CAST) * Math.PI * 2 + (rnd() - 0.5) * 0.7;
      const d = SEED_DIST_MIN + rnd() * (SEED_DIST_MAX - SEED_DIST_MIN);
      const x = Phaser.Math.Clamp(f.x + Math.cos(a) * d, ARENA_PAD, this.api.width - ARENA_PAD);
      const y = Phaser.Math.Clamp(f.y + Math.sin(a) * d, ARENA_PAD, this.api.height - ARENA_PAD);
      this.seeds.push({ owner, x, y, born: this.now + SEED_FLIGHT_MS });
      this.fx(owner).seedFlight(f.x, f.y, x, y, SEED_FLIGHT_MS + i * 25);
    }
    // The oldest colonies of this owner wither to make room.
    let mine = this.seeds.filter((sd) => sd.owner === owner).length;
    while (mine > SEEDS_MAX) {
      const i = this.seeds.findIndex((sd) => sd.owner === owner);
      this.seeds.splice(i, 1);
      mine--;
    }
    this.fx(owner).sowCast(f.x, f.y);
    this.avatar(owner)?.setHold(null);
    this.avatar(owner)?.play('flex');
    Sfx.playAt('vine-grow', f.x, { rate: 0.7, volume: 0.7 });
  }

  /** R — Feeding Frenzy. */
  doFrenzy(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const flock: Flock = { owner, until: this.now + CROW_MS, cx: tx, cy: ty, crows: [] };
    for (let i = 0; i < CROWS; i++) {
      flock.crows.push({
        owner, phase: (i / CROWS) * Math.PI * 2, x: f.x, y: f.y - 10, ang: Math.atan2(ty - f.y, tx - f.x),
        flap: Math.random() * 6, hitAt: new Map(),
      });
    }
    this.flocks.push(flock);
    this.fx(owner).crowRelease(f.x, f.y - 8);
    this.avatar(owner)?.play('raise', undefined, 520);
    Sfx.playAt('roar', f.x, { rate: 1.9, volume: 0.45 });
  }

  /** F — Consume. */
  doConsume(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    // "Half or more of your health as Corrupt HP": the rotten share of everything you have left.
    const heavy = f.corruptHp > 0 && f.corruptHp >= f.hp;
    this.fx(owner).bite(f.x, f.y, ang, BITE_REACH, heavy);
    this.avatar(owner)?.play('clap', ang);
    Sfx.playAt('claw', f.x, { rate: 0.8, volume: 0.9 });

    let ate = false;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > BITE_REACH + this.bodyR(t)) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (d > this.bodyR(t) + 8 && off > BITE_HALF) continue;

      this.hit(owner, t, BITE_DAMAGE);
      this.fx(owner).splatter(t.x, t.y, 6, 20, 380, 10, ang);
      // Healing is blocked on the bitten body (Date.now clock, like every mutation heal-stop).
      t.healStopUntil = Math.max(t.healStopUntil, Date.now() + HEAL_BLOCK_MS);
      // Positive effects: the pools come straight across; damage and speed buffs are copied.
      if (this.isReplica(owner)) {
        // Their bite on us: strip our pools here (our sim owns them); the copy is theirs to keep.
        stealBuffs(t, null);
      } else {
        const took = stealBuffs(t, f);
        const dmgBuff = t.outgoingDamageMult * t.cardOutgoingDamageMult;
        const spdBuff = t.walkSpeedMult;
        if (dmgBuff > 1.001) { s.stolenDmg = Math.max(s.stolenDmg, dmgBuff); took.push('Damage'); }
        if (spdBuff > 1.001) { s.stolenSpeed = Math.max(s.stolenSpeed, spdBuff); took.push('Speed'); }
        if (dmgBuff > 1.001 || spdBuff > 1.001) s.stolenUntil = this.now + STOLEN_MS;
        if (took.length) {
          this.fx(owner).steal(t.x, t.y, f.x, f.y);
          this.announce(t.x, t.y - 64, `STOLEN: ${took.join(', ')}`, HAR.glow, 11);
        }
      }
      this.announce(t.x, t.y - 48, '💔 NO HEALING', HAR.fleshLit, 11);
      if (heavy) {
        this.corrupt(t, HEAVY_CORRUPTION);
        this.announce(t.x, t.y - 34, `+${HEAVY_CORRUPTION} CORRUPTION`, HAR.purpleLit, 12);
      }
      ate = true;
    }
    if (ate && !this.isReplica(owner) && s.flesh < FLESH_MAX) {
      s.flesh++;
      this.announce(f.x, f.y - 50, `+1 CORRUPT FLESH (${s.flesh})`, HAR.fleshLit, 11);
    }
  }

  /** Q — Reaping Hour: wound up, then swung. */
  doReap(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const side = this.side(owner).arc;
    this.side(owner).swing = { owner, at: this.now + REAP_WINDUP_MS, ang, side };
    this.fx(owner).reapWindup(f.x, f.y, ang, REAP_WINDUP_MS);
    this.avatar(owner)?.play('raise', ang, REAP_WINDUP_MS);
    Sfx.playAt('roar', f.x, { rate: 0.55, volume: 0.6 });
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isHarvest('player');
    const npcIs = this.isHarvest('npc');
    const anyState = this.sickles.length || this.seeds.length || this.hearts.length || this.flocks.length
      || this.reaped.size || this.api.player?.harvestCorruption;
    if (!playerIs && !npcIs && !anyState) return;

    this.ensureLayers();
    this.ensureAvatars();
    this.ensureGrids();
    const dt = delta / 1000;
    this.vizT += dt;

    this.updateSwings();
    this.updateSickles();
    this.updateMold(delta);
    this.updateCorruption(dt);
    this.updateHearts(delta);
    this.updateFlocks(dt);
    this.updateSelf(dt);
    this.writeVulnerability();

    this.paint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  private updateSwings(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const sw = s.swing;
      if (!sw || this.now < sw.at) continue;
      s.swing = null;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      this.fx(owner).reapSwing(f.x, f.y, sw.ang, REAP_REACH, REAP_HALF, sw.side);
      this.avatar(owner)?.reap(sw.ang, sw.side);
      Sfx.playAt('slash', f.x, { rate: 0.6, volume: 1 });
      for (const t of this.targetsOf(owner)) {
        const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
        if (d > REAP_REACH + this.bodyR(t)) continue;
        const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - sw.ang));
        if (d > this.bodyR(t) + 10 && off > REAP_HALF) continue;
        this.hit(owner, t, REAP_DAMAGE);
        const n = (this.reaped.get(t) ?? 0) + 1;
        this.reaped.set(t, n);
        t.gluttonyIncomingMult = Math.pow(REAP_VULN, n);
        this.fx(owner).reapHit(t.x, t.y, sw.ang);
        this.announce(t.x, t.y - 50, `🌾 REAPED +15% (${Math.round((Math.pow(REAP_VULN, n) - 1) * 100)}%)`, HAR.purpleLit, 12);
        this.tryExecute(owner, t, sw.ang);
      }
    }
  }

  /** The execute line: 10% of max health, rising to 25% at full corruption. */
  executeLine(t: Fighter): number {
    return EXECUTE_BASE + (EXECUTE_MAX - EXECUTE_BASE) * this.rotOf(t);
  }

  private tryExecute(owner: Owner, t: Fighter, ang: number): void {
    if (!this.alive(t) || t.hp / Math.max(1, t.maxHp) > this.executeLine(t)) return;
    this.fx(owner).execute(t.x, t.y, ang);
    this.announce(t.x, t.y - 60, '☠ HARVESTED', HAR.glow, 16);
    Sfx.playAt('hit-heavy', t.x, { rate: 0.5, volume: 1 });
    // Pierced, and five times what is left: Justice's verdict pattern. Deliberately not wrapped in
    // `asNonAllyDamage`, so a co-op ally in the npc slot can never be executed by its own side.
    t.takeDamage(t.hp * 5 + 50, { pierce: true });
  }

  /**
   * The sickle's loop: a circle of radius R whose far side is the cursor, swept a full turn in
   * `dur`. The return leg is pulled toward the thrower's *current* position, so it comes back to
   * the hand even when the scarecrow has walked off.
   */
  private updateSickles(): void {
    for (let i = this.sickles.length - 1; i >= 0; i--) {
      const sk = this.sickles[i];
      const f = this.fighter(sk.owner);
      const u = Phaser.Math.Clamp((this.now - sk.start) / sk.dur, 0, 1);
      const th = sk.phi0 + sk.side * u * Math.PI * 2;
      const home = u * u * (3 - 2 * u);
      const dx = this.alive(f) ? f.x - sk.ox : 0;
      const dy = this.alive(f) ? f.y - sk.oy : 0;
      const nx = sk.cx + Math.cos(th) * sk.R + dx * home;
      const ny = sk.cy + Math.sin(th) * sk.R + dy * home;
      const px = sk.x;
      const py = sk.y;
      sk.x = nx;
      sk.y = ny;
      sk.trail.push({ x: nx, y: ny });
      if (sk.trail.length > 9) sk.trail.shift();

      for (const t of this.targetsOf(sk.owner)) {
        if (sk.hit.has(t)) continue;
        if (this.segDist(px, py, nx, ny, t.x, t.y) > SICKLE_HIT_R + this.bodyR(t)) continue;
        sk.hit.add(t);
        this.hit(sk.owner, t, SICKLE_DAMAGE);
        this.fx(sk.owner).sickleHit(t.x, t.y, Math.atan2(ny - py, nx - px));
        Sfx.playAt('slash', t.x, { rate: 1.4, volume: 0.5 });
      }
      // Your own hearts burst under your own sickle.
      for (let h = this.hearts.length - 1; h >= 0; h--) {
        const ht = this.hearts[h];
        if (ht.owner !== sk.owner) continue;
        if (this.segDist(px, py, nx, ny, ht.x, ht.y) > HEART_HIT_R) continue;
        this.hearts.splice(h, 1);
        this.harvestHeart(sk.owner, ht);
      }
      if (u >= 1) {
        this.sickles.splice(i, 1);
        if (this.alive(f)) this.fx(sk.owner).sickleCatch(f.x, f.y);
      }
    }
  }

  private harvestHeart(owner: Owner, ht: Heart): void {
    this.fx(owner).heartBurst(ht.x, ht.y);
    Sfx.playAt('hit-heavy', ht.x, { rate: 1.3, volume: 0.6 });
    if (this.isReplica(owner) || !this.isHarvest(owner)) return;
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.addCorruptHp(owner, HEART_CORRUPT_HP);
    this.side(owner).heartRegenUntil = this.now + HEART_REGEN_MS;
    this.fx(owner).corruptGain(f.x, f.y, HEART_CORRUPT_HP);
    this.announce(f.x, f.y - 48, `+${HEART_CORRUPT_HP} CORRUPT HP`, HAR.purpleLit, 13);
  }

  // ── Mold ───────────────────────────────────────────────────────────────────

  private seedReach(sd: Seed): number {
    const age = Math.max(0, this.now - sd.born);
    return SEED_R_MIN + (SEED_R_MAX - SEED_R_MIN) * Math.min(1, age / SEED_GROW_MS);
  }

  private cellHash(i: number): number {
    const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return v - Math.floor(v);
  }

  private updateMold(delta: number): void {
    this.moldAcc += delta;
    if (this.moldAcc < MOLD_TICK_MS) return;
    const step = this.moldAcc / 1000;
    this.moldAcc = 0;
    const W = this.gridW;
    const H = this.gridH;
    const allow = this.allow!;
    const prev = this.scratch!;
    for (const owner of BOTH) {
      const grid = this.grids![owner];
      allow.fill(0);
      const mine = this.seeds.filter((sd) => sd.owner === owner && this.now >= sd.born);
      for (const sd of mine) {
        const r = this.seedReach(sd);
        const c0 = Math.max(0, Math.floor((sd.x - r) / CELL));
        const c1 = Math.min(W - 1, Math.floor((sd.x + r) / CELL));
        const r0 = Math.max(0, Math.floor((sd.y - r) / CELL));
        const r1 = Math.min(H - 1, Math.floor((sd.y + r) / CELL));
        for (let cy = r0; cy <= r1; cy++) {
          for (let cx = c0; cx <= c1; cx++) {
            const x = (cx + 0.5) * CELL;
            const y = (cy + 0.5) * CELL;
            // A ragged edge: each cell's own hash shaves up to a fifth off the reach.
            const k = cy * W + cx;
            if ((x - sd.x) ** 2 + (y - sd.y) ** 2 <= (r * (0.8 + 0.2 * this.cellHash(k))) ** 2) allow[k] = 1;
          }
        }
        // The seed's own cell is always alive.
        const sc = Math.floor(sd.y / CELL) * W + Math.floor(sd.x / CELL);
        if (sc >= 0 && sc < grid.length) allow[sc] = 2;
      }
      prev.set(grid);
      for (let k = 0; k < grid.length; k++) {
        const a = allow[k];
        if (!a) {
          if (prev[k] > 0) grid[k] = Math.max(0, prev[k] - MOLD_WITHER_PER_SEC * step);
          continue;
        }
        if (prev[k] >= 1.25) continue;
        let live = a === 2;
        if (!live) {
          const cx = k % W;
          live = (cx > 0 && prev[k - 1] >= MOLD_SPREAD_AT) || (cx < W - 1 && prev[k + 1] >= MOLD_SPREAD_AT)
            || (k >= W && prev[k - W] >= MOLD_SPREAD_AT) || (k + W < grid.length && prev[k + W] >= MOLD_SPREAD_AT);
        }
        if (live || prev[k] > 0) {
          const rate = MOLD_GROW_PER_SEC * (0.6 + 0.8 * this.cellHash(k));
          grid[k] = Math.min(1.25, prev[k] + rate * step);
        }
      }
    }
  }

  /** How grown `owner`'s mold is under (x, y). */
  private moldAt(owner: Owner, x: number, y: number): number {
    if (!this.grids) return 0;
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    if (cx < 0 || cy < 0 || cx >= this.gridW || cy >= this.gridH) return 0;
    return this.grids[owner][cy * this.gridW + cx];
  }

  private updateCorruption(dt: number): void {
    for (const owner of BOTH) {
      for (const t of this.targetsOf(owner)) {
        const m = this.moldAt(owner, t.x, t.y + 8);
        if (m < MOLD_BITE_AT) continue;
        this.corrupt(t, MOLD_CORRUPTION_PER_SEC * Math.min(1, m) * dt);
      }
    }
    for (const f of this.allFighters()) {
      if (f.harvestCorruption <= 0) continue;
      if (!f.active || f.hp <= 0) { f.harvestCorruption = 0; continue; }
      if (this.now - (this.lastOnMold.get(f) ?? 0) < CORRUPTION_FADE_AFTER_MS) continue;
      f.harvestCorruption = Math.max(0, f.harvestCorruption - CORRUPTION_FADE_PER_SEC * dt);
    }
  }

  private updateHearts(delta: number): void {
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      // A heart dies with the mold under it, or of old age.
      if (this.now - h.born > HEART_LIFE_MS || this.moldAt(h.owner, h.x, h.y) < 0.5) this.hearts.splice(i, 1);
    }
    for (const owner of BOTH) {
      const s = this.side(owner);
      s.heartTimer += delta;
      if (s.heartTimer < HEART_EVERY_MS) continue;
      s.heartTimer = 0;
      if (this.hearts.filter((h) => h.owner === owner).length >= HEARTS_MAX) continue;
      const grid = this.grids![owner];
      const mature: number[] = [];
      for (let k = 0; k < grid.length; k++) if (grid[k] >= 1) mature.push(k);
      if (mature.length < HEART_MIN_MATURE) continue;
      const k = mature[Math.floor(Math.random() * mature.length)];
      const x = (k % this.gridW + 0.5) * CELL;
      const y = (Math.floor(k / this.gridW) + 0.5) * CELL;
      this.hearts.push({ owner, x, y, born: this.now, seed: Math.random() * 99 });
      this.fx(owner).splatter(x, y, 6, 18, 420, 4);
    }
  }

  // ── Crows ──────────────────────────────────────────────────────────────────

  private updateFlocks(dt: number): void {
    for (let i = this.flocks.length - 1; i >= 0; i--) {
      const fl = this.flocks[i];
      const f = this.fighter(fl.owner);
      if (this.now >= fl.until || !this.alive(f)) {
        for (const c of fl.crows) this.fx(fl.owner).splatter(c.x, c.y, 2, 10, 260, 9);
        this.flocks.splice(i, 1);
        continue;
      }
      // The orbit centre: the live cursor for the local player; for a bot or an online replica
      // (whose cursor never crosses the wire) a point that drifts toward the body it is hunting.
      if (fl.owner === 'player') {
        fl.cx = this.sides.player.aimX;
        fl.cy = this.sides.player.aimY;
      } else {
        const t = this.targetsOf('npc')[0];
        if (t) {
          const d = Phaser.Math.Distance.Between(fl.cx, fl.cy, t.x, t.y);
          const step = Math.min(d, CROW_CENTRE_SPEED * dt);
          if (d > 0.5) {
            fl.cx += ((t.x - fl.cx) / d) * step;
            fl.cy += ((t.y - fl.cy) / d) * step;
          }
        }
      }
      const spin = this.vizT * CROW_SPIN;
      for (const c of fl.crows) {
        const a = spin + c.phase;
        const wob = Math.sin(this.vizT * 3 + c.phase) * 8;
        const tx = fl.cx + Math.cos(a) * (CROW_ORBIT_R + wob);
        const ty = fl.cy + Math.sin(a) * (CROW_ORBIT_R + wob) * 0.85;
        const d = Phaser.Math.Distance.Between(c.x, c.y, tx, ty);
        const step = Math.min(d, CROW_SPEED * dt);
        const px = c.x;
        const py = c.y;
        if (d > 0.5) {
          c.x += ((tx - c.x) / d) * step;
          c.y += ((ty - c.y) / d) * step;
          c.ang = Math.atan2(c.y - py, c.x - px);
        }
        c.flap += dt * 16;
        for (const t of this.targetsOf(fl.owner)) {
          if (this.now < (c.hitAt.get(t) ?? 0)) continue;
          if (this.segDist(px, py, c.x, c.y, t.x, t.y) > CROW_HIT_R + this.bodyR(t)) continue;
          c.hitAt.set(t, this.now + CROW_REHIT_MS);
          const rot = this.rotOf(t);
          this.hit(fl.owner, t, CROW_DAMAGE * (1 + (CROW_CORRUPT_MULT - 1) * rot));
          this.fx(fl.owner).peck(t.x, t.y, c.ang, rot > 0.5);
          Sfx.playAt('claw', t.x, { rate: 1.8, volume: 0.25 });
        }
      }
    }
  }

  // ── The scarecrow's own body ───────────────────────────────────────────────

  private updateSelf(dt: number): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!f) continue;
      const s = this.side(owner);
      if (!this.isHarvest(owner) || this.isReplica(owner)) {
        if (f.onCorruptAbsorb) f.onCorruptAbsorb = null;
        continue;
      }
      // Whoever chews through Corrupt HP catches the rot. `takeDamage` has no attacker, so the
      // source is the hit's own `source` when it is a body, else the nearest enemy.
      f.onCorruptAbsorb = (spent, opts) => {
        const src = opts?.source instanceof Fighter ? opts.source : this.nearestEnemy(owner);
        if (!src || src === f) return;
        this.corrupt(src, spent * CORRUPT_HP_BACKLASH);
        this.fx(owner).splatter(f.x, f.y, 3, 16, 300, 10);
      };
      if (!this.alive(f)) continue;
      if (this.now < s.heartRegenUntil) this.addCorruptHp(owner, HEART_REGEN_PER_SEC * dt);
      f.corruptHp = Math.min(f.corruptHp, this.corruptCap(f));
      if (this.now >= s.stolenUntil) { s.stolenDmg = 1; s.stolenSpeed = 1; }
      // Below 75: a piece of flesh goes straight in.
      if (s.flesh > 0 && f.hp < FLESH_EAT_BELOW) {
        s.flesh--;
        f.corruptHp = Math.min(this.corruptCap(f), f.corruptHp + FLESH_CORRUPT_HP);
        this.fx(owner).eatFlesh(f.x, f.y);
        this.avatar(owner)?.play('clap', -Math.PI / 2);
        this.announce(f.x, f.y - 50, `🫀 +${FLESH_CORRUPT_HP} CORRUPT HP`, HAR.purpleLit, 13);
        Sfx.playAt('claw', f.x, { rate: 0.6, volume: 0.8 });
      }
    }
  }

  private nearestEnemy(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = 420;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private writeVulnerability(): void {
    for (const [t, n] of this.reaped) {
      if (!t.active) { this.reaped.delete(t); continue; }
      t.gluttonyIncomingMult = Math.pow(REAP_VULN, n);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paint(): void {
    const mg = this.moldGfx;
    const vg = this.veilGfx;
    const ag = this.airGfx;
    if (!mg || !vg || !ag || !this.grids) return;
    mg.clear(); vg.clear(); ag.clear();

    for (const owner of BOTH) {
      const grid = this.grids[owner];
      const cells: MoldCell[] = [];
      for (let k = 0; k < grid.length; k++) {
        const gv = grid[k];
        if (gv <= 0.03) continue;
        cells.push({
          x: (k % this.gridW + 0.5) * CELL, y: (Math.floor(k / this.gridW) + 0.5) * CELL, g: gv,
          h: this.cellHash(k * 7 + 3),
        });
      }
      const look = this.targetsOf(owner)[0];
      moldLayer(mg, this.col(owner), cells, CELL, this.vizT, 0.92, look ? { x: look.x, y: look.y } : undefined);
    }
    for (const sd of this.seeds) {
      if (this.now < sd.born) continue;
      const sprout = Phaser.Math.Clamp((this.now - sd.born) / 1500, 0, 1);
      seedShape(mg, this.col(sd.owner), sd.x, sd.y, sd.x * 0.1, 3.2, 0.95, sprout);
    }
    for (const h of this.hearts) {
      const grow = Phaser.Math.Clamp((this.now - h.born) / 500, 0, 1);
      const fade = Phaser.Math.Clamp((HEART_LIFE_MS - (this.now - h.born)) / 1000, 0, 1);
      corruptHeart(mg, this.col(h.owner), h.x, h.y, HEART_R * (0.4 + 0.6 * grow), this.vizT + h.seed, fade);
    }

    for (const f of this.allFighters()) {
      if (!f.active || f.alpha <= 0.05 || f.harvestCorruption <= 0.5) continue;
      const by: Owner = f === this.api.player ? 'npc' : 'player';
      corruptionVeil(vg, this.col(by), f.x, f.y, this.rotOf(f), this.vizT, f.alpha);
    }

    for (const sk of this.sickles) {
      sickleTrail(ag, this.col(sk.owner), sk.trail, 1);
      sickleShape(ag, this.col(sk.owner), sk.x, sk.y, (this.now - sk.start) * 0.028 * sk.side, SICKLE_SIZE, 1);
    }
    for (const fl of this.flocks) {
      const fade = Phaser.Math.Clamp((fl.until - this.now) / 400, 0, 1);
      for (const c of fl.crows) crowShape(ag, this.col(fl.owner), c.x, c.y, c.ang, 9, c.flap, fade);
    }
    // Flesh trophies orbit the scarecrow's shoulders, one per piece.
    for (const owner of BOTH) {
      const n = this.side(owner).flesh;
      const f = this.fighter(owner);
      if (!n || !this.alive(f) || !this.isHarvest(owner) || f.alpha <= 0.05) continue;
      for (let i = 0; i < n; i++) {
        const a = this.vizT * 1.4 + (i / n) * Math.PI * 2;
        fleshChunk(ag, this.col(owner), f.x + Math.cos(a) * 30, f.y + Math.sin(a) * 10 + 14, 3.4, this.vizT + i, f.alpha);
      }
    }
  }

  // ── Avatars & HUD ──────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      if (owner === 'npc') {
        const t = this.targetsOf('npc')[0];
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      av.setRot(f.corruptHp / Math.max(1, f.maxHp));
      av.setSickleOut(this.sickles.some((sk) => sk.owner === owner));
      av.setMastered(false);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    this.api.setStatusIndicator('harvest-flesh', playerIs && s.flesh > 0 ? {
      name: 'Corrupt Flesh', emoji: '🥩', color: HAR.fleshLit, priority: 150,
      description: `Torn off bitten fighters by Consume (up to ${FLESH_MAX}). Drop below ${FLESH_EAT_BELOW} health and you eat one at once for ${FLESH_CORRUPT_HP} Corrupt HP.`,
      count: s.flesh,
    } : null);
    const stolen = playerIs && this.now < s.stolenUntil;
    this.api.setStatusIndicator('harvest-stolen', stolen ? {
      name: 'Stolen Strength', emoji: '🩸', color: HAR.glow, priority: 151,
      description: `Copied off a bitten enemy for ${STOLEN_MS / 1000}s: ×${s.stolenDmg.toFixed(2)} damage on everything Harvest deals and ×${s.stolenSpeed.toFixed(2)} speed.`,
    } : null);
    this.api.setStatusIndicator('harvest-arc', playerIs ? {
      name: s.arc > 0 ? 'Sickle: curls right' : 'Sickle: curls left', emoji: s.arc > 0 ? '↻' : '↺', color: HAR.steelLit, priority: 152,
      description: 'Which way the sickle\'s loop curls. Right-click to swap.',
    } : null);
  }

  // ── Public accessors (read by ArenaScene / the AI) ─────────────────────────

  getPlayerSpeedMult(): number {
    const s = this.sides.player;
    return this.isHarvest('player') && this.now < s.stolenUntil ? s.stolenSpeed : 1;
  }

  getNpcSpeedMult(): number {
    const s = this.sides.npc;
    // An online replica's motion is streamed; its own boosts already happened on its machine.
    if (!this.isHarvest('npc') || this.api.isOnline) return 1;
    return this.now < s.stolenUntil ? s.stolenSpeed : 1;
  }

  /** A heart of the bot's own the sickle can reach: aim there and the loop's far side cuts it. */
  npcHeartAim(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    if (!this.alive(n) || !this.isHarvest('npc')) return undefined;
    let best: Heart | undefined;
    let bestD = NPC_HEART_AIM_R;
    for (const h of this.hearts) {
      if (h.owner !== 'npc') continue;
      const d = Phaser.Math.Distance.Between(n.x, n.y, h.x, h.y);
      if (d < bestD) { bestD = d; best = h; }
    }
    return best ? { x: best.x, y: best.y } : undefined;
  }

  /** The bot's target is standing on the bot's rotting mold. */
  npcTargetOnMold(): boolean {
    const p = this.api.player;
    return this.alive(p) && this.moldAt('npc', p.x, p.y + 8) >= MOLD_BITE_AT;
  }

  /** Corruption on the bot's target, 0–100. */
  npcTargetCorruption(): number { return this.api.player?.harvestCorruption ?? 0; }

  /** Reaping Hour would kill: the swing's 30 (with vulnerability) puts the target under the line. */
  npcCanExecute(): boolean {
    const p = this.api.player;
    if (!this.alive(p)) return false;
    const after = p.hp - REAP_DAMAGE * p.gluttonyIncomingMult;
    return after / Math.max(1, p.maxHp) <= this.executeLine(p);
  }

  /** The bite would be heavy: the bot's Corrupt HP is at least its health. */
  npcBiteHeavy(): boolean {
    const n = this.api.npc;
    return this.alive(n) && n.corruptHp > 0 && n.corruptHp >= n.hp;
  }

  /** Something on the bot's target is worth stealing. */
  npcTargetBuffed(): boolean {
    const p = this.api.player;
    if (!this.alive(p)) return false;
    return p.shieldCharges > 0 || p.shieldHp > 20 || p.weakHp > 20 || p.corruptHp > 20 || p.dodgeChance > 0.15
      || p.windDodge > 0.15 || p.outgoingDamageMult * p.cardOutgoingDamageMult > 1.1 || p.walkSpeedMult > 1.1;
  }

  /** How many of the bot's own mold cells are mature — the bot sows again when this is thin. */
  npcMatureMold(): number {
    if (!this.grids) return 0;
    let n = 0;
    const g = this.grids.npc;
    for (let k = 0; k < g.length; k++) if (g[k] >= 1) n++;
    return n;
  }

  /**
   * Somewhere worth standing: the middle of its own mold while the target is close but off it,
   * so a chasing target walks onto the rot. Side-effect-free.
   */
  npcSeekPoint(): { x: number; y: number } | undefined {
    const n = this.api.npc;
    const p = this.api.player;
    if (!this.alive(n) || !this.alive(p) || !this.isHarvest('npc') || !this.grids) return undefined;
    if (this.npcTargetOnMold()) return undefined;
    const d = Phaser.Math.Distance.Between(n.x, n.y, p.x, p.y);
    if (d < 120 || d > 420) return undefined;
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (const sd of this.seeds) {
      if (sd.owner !== 'npc' || this.now < sd.born) continue;
      sx += sd.x; sy += sd.y; c++;
    }
    if (!c) return undefined;
    const mx = sx / c;
    const my = sy / c;
    return Phaser.Math.Distance.Between(n.x, n.y, mx, my) < 30 ? undefined : { x: mx, y: my };
  }
}
