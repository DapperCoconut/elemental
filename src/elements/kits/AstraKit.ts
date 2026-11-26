import Phaser from 'phaser';
import { Fighter, DamageOpts } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import { BaseAvatar } from './ElementVisuals';
import { ASTRA, AstraAvatar, AstraColorFn } from './AstraVisuals';
import {
  AstraMassFx, logicalView, DOOM_KILL_MS, DOOM_MS, MASS, antimatterBlob, blackHoleSky, cometRock, drawDoom, drawLaugh, dustCloud,
  eclipse, floorCracks, kneelPress, massBar, massHalo, photonBolt, punchCharge, rockShard, silhouette, throne,
} from './AstraMassVisuals';

type Owner = 'player' | 'npc';

const BOTH: Owner[] = ['player', 'npc'];

const ID = {
  click: 'astra-antimatter',
  e: 'astra-supernova',
  r: 'astra-fusion',
  f: 'astra-comet',
  q: 'astra-singularity',
};

/** What the five cards read while Astra is the black hole. */
const FORM_CARDS: Record<keyof typeof ID, [string, string]> = {
  click: ['Judgement', 'Tap: a laser that cannot miss. Hold 3s and release: end the world. Press on an enemy to drag them.'],
  e: ['Godfist', 'Teleport behind the enemy and punch them into the far wall. 50, and 50 more on the wall.'],
  r: ['Snap', 'Swap health with the enemy. Snapped just before a hit lands: dodge it, laugh, and fire three lasers.'],
  f: ['Kneel', 'The enemy kneels for 2s. They cannot move or attack.'],
  q: ['Play With Your Food', 'Return to the arena. The enemy is healed to full. Beating a bot after this pays double.'],
};

// ── Passive: Space Dust ──────────────────────────────────────────────────────
const MASS_MAX = 100;
/** Share of every hit the mass takes instead of the body, one point of mass per point of damage. */
const MASS_ABSORB = 0.75;
/** At full mass the body's radius is this many times its own. */
const MASS_SIZE = 3.2;
/** At full mass Astra moves at this fraction of its speed. */
const MASS_SLOW = 0.5;
const BODY_R = 22;
const DUST_MASS = 10;
const DUST_R = 20;
const DUST_GAP_MS = 2200;
const DUST_MAX = 5;
const DUST_WALL_PAD = 110;
const SHARD_MASS = 8;
const SHARD_R = 11;

// ── Click: Anti-Matter ───────────────────────────────────────────────────────
const BLOB_SPEED = 540;
const BLOB_R = 10;
const BOOM_R = 120;
const BOOM_DMG = 18;
/** Photons thrown off by each annihilation. They pile up: several blasts' worth can be out at once. */
const PHOTONS = 3;
const PHOTON_MAX = 15;
const PHOTON_MS = 8000;
const PHOTON_R = 8;
const PHOTON_DMG = 8;
/** How they chase the cursor: a spring toward it, a drag on their speed, and a top speed. */
const PHOTON_PULL = 34;
const PHOTON_DRAG = 3.4;
const PHOTON_TOP = 760;
/** Each one aims a little off the cursor, so a flock of them swarms it instead of becoming one dot. */
const PHOTON_SCATTER = 22;

// ── E: Supernova ─────────────────────────────────────────────────────────────
const NOVA_MIN = 10;
const NOVA_SPEND = 45;
const NOVA_DMG = 12;
const NOVA_DMG_PER_MASS = 0.5;
const NOVA_R = 105;
const NOVA_R_PER_MASS = 1.3;

// ── R: Nuclear Fusion ────────────────────────────────────────────────────────
const FUSION_MS = 3000;
const FUSION_TICK_MS = 500;
const FUSION_DMG = 6;
const MELT_MASS = 5;

// ── F: Comet ─────────────────────────────────────────────────────────────────
const COMET_FALL_MS = 500;
const COMET_R = 13;
const COMET_IMPACT_R = 58;
const COMET_IMPACT_DMG = 14;
const COMET_LIFE_MS = 20000;
const SPIN_START = 2.5;
const SPIN_ACC = 5.2;
const SPIN_MAX = 17;
const COMET_V0 = 320;
const COMET_V1 = 900;
const COMET_DMG_MIN = 10;
const COMET_DMG_MAX = 70;
/** Spin (0..1) at which the comet catches fire, and at which it shatters on what it hits. */
const COMET_FIERY = 0.5;
const COMET_SHATTER = 0.6;
const COMET_SHARDS = 4;
const CRACK_MS = 6000;

// ── Q: Singularity ───────────────────────────────────────────────────────────
const SING_IN_MS = 700;
const SING_LEAVE_MIN_MS = 1500;
const GIVE_UP_MS = 12000;
// Click.
const TAP_MS = 300;
const ZAP_CD_MS = 1100;
const ZAP_DMG = 28;
const AURA_MS = 3000;
// E.
const PUNCH_CD_MS = 6000;
const PUNCH_WIND_MS = 300;
const PUNCH_SLOW_MS = 450;
const PUNCH_SLOW = 0.15;
const PUNCH_DMG = 50;
const PUNCH_WALL_DMG = 50;
const PUNCH_BEHIND = 46;
const FLING_SPEED = 1500;
const FLING_MS = 1100;
// R.
const SNAP_CD_MS = 8000;
const SNAP_WINDOW_MS = 350;
/** A hit this soon *before* the snap still counts as "right before you take damage". */
const SNAP_GRACE_MS = 150;
const COUNTER_SHOTS = 3;
const COUNTER_DMG = 25;
const COUNTER_FIRST_MS = 420;
const COUNTER_GAP_MS = 170;
// F.
const KNEEL_CD_MS = 7000;
const KNEEL_MS = 2000;
// Bot.
const BOT_DOOM_AFTER_MS = 10000;
const BOT_SEEK_R = 320;

// ── Types ────────────────────────────────────────────────────────────────────

interface Pickup {
  id: number;
  owner: Owner;
  kind: 'dust' | 'shard';
  x: number;
  y: number;
  born: number;
  seed: number;
}

interface Blob {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  born: number;
}

interface Photon {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  born: number;
  until: number;
}

interface Comet {
  owner: Owner;
  state: 'falling' | 'ground' | 'held' | 'flying';
  x: number;
  y: number;
  landAt: number;
  expires: number;
  seed: number;
  /** Held: where it sits relative to Astra, and how fast it is being swung. */
  offA: number;
  offD: number;
  omega: number;
  spinSince: number;
  /** Flying: velocity, and the spin (0..1) it was let go at. */
  vx: number;
  vy: number;
  heat: number;
}

interface Crack { x: number; y: number; born: number; seed: number }

interface Fling {
  vx: number;
  vy: number;
  until: number;
  ang: number;
  from: number;
  wallDmg: number;
  by: Owner;
}

interface Punch {
  target: Fighter;
  ang: number;
  start: number;
  hitAt: number;
}

interface Counter {
  left: number;
  next: number;
}

interface Doom {
  owner: Owner;
  start: number;
  victims: Fighter[];
  done: boolean;
  g: Phaser.GameObjects.Graphics;
}

interface Laugh {
  owner: Owner;
  start: number;
  g: Phaser.GameObjects.Graphics;
}

interface Prompt {
  box: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
  yes: Phaser.GameObjects.Text;
  no: Phaser.GameObjects.Text;
}

interface Side {
  aimX: number;
  aimY: number;
  mass: number;
  sentMass: number;
  nextMassSend: number;
  appliedMult: number;
  nextDustAt: number;
  absorb: ((amount: number) => number) | null;
  fusionUntil: number;
  nextBurn: number;
  comet: Comet | null;
  spinning: boolean;
  // ── Singularity ──
  /** Scene time it began; 0 when Astra is not the black hole. */
  singSince: number;
  unstoppableOwed: boolean;
  /** Scene times each of the form's abilities is ready again. */
  zapAt: number;
  punchAt: number;
  snapAt: number;
  kneelAt: number;
  /** The click: when it went down (0 = up), and what it is doing. */
  pressAt: number;
  dragging: Fighter | null;
  nextDragSend: number;
  auraSent: boolean;
  punch: Punch | null;
  /** The snap in flight: when it was made and when it resolves (0 = none). */
  snapFrom: number;
  snapDue: number;
  /** Scene time of the last hit the black hole shrugged off — what a snap parries. */
  lastHitAt: number;
  counter: Counter | null;
  kneelUntil: number;
  kneelers: Fighter[];
  gestureUntil: number;
  /** Astra let them out, healed: a bot beaten after this pays double; a player gets laughed at. */
  fed: boolean;
  laughed: boolean;
  wasLeft: boolean;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, mass: 0, sentMass: 0, nextMassSend: 0, appliedMult: 1, nextDustAt: 0,
    absorb: null, fusionUntil: 0, nextBurn: 0, comet: null, spinning: false,
    singSince: 0, unstoppableOwed: false, zapAt: 0, punchAt: 0, snapAt: 0, kneelAt: 0, pressAt: 0, dragging: null,
    nextDragSend: 0, auraSent: false, punch: null, snapFrom: 0, snapDue: 0, lastHitAt: -1e9, counter: null,
    kneelUntil: 0, kneelers: [], gestureUntil: 0, fed: false, laughed: false, wasLeft: false,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface AstraArenaApi {
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
  /** The arena's walls. */
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  /** Mirror an x across the arena — positions online are seen from the other side. */
  get worldW(): number;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get projectileRegistry(): ProjectileRegistry;
  isTargetable(f: Fighter): boolean;
  /** Destroy enemy-built things in a circle; returns how many died. Antimatter's trigger. */
  purgeSummons(x: number, y: number, r: number, exceptOwner: Owner): number;
  astraColor(owner: Owner, base: number): number;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Rename one of the player's ability cards (the Singularity swaps all five). */
  relabelCard(abilityId: string, name: string, desc: string): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
}

// ── AstraKit ─────────────────────────────────────────────────────────────────

/**
 * Astra — the cracked shell with a dwarf star inside, gathering a body of dust round itself.
 *
 * - **Space Dust** (passive) — dust clouds drift in; walking into one adds to the mass bar. Mass
 *   slows Astra and swells its hitbox, and soaks 75% of every hit, losing itself instead.
 * - **Anti-Matter** — a mercury blob that does nothing to a body, and annihilates in a wide
 *   shockwave on anything else physical: a shot, a summon, a held shield, a built wall. Each cast also
 *   blast throws off three photons that chase the cursor and strike what they reach.
 * - **Supernova** — throws off a chunk of the mass as a flaming shockwave.
 * - **Nuclear Fusion** — for 3s the inside of the hitbox is a furnace: shots that enter are
 *   melted into mass, and bodies inside burn.
 * - **Comet** — falls at the cursor and stays. Cover it with the hitbox to catch it; hold F to
 *   swing it round faster and faster, release to throw it along its orbit.
 * - **Singularity** — only at full mass. Astra becomes a black hole with a kit of its own:
 *   a laser, a world-ending hold, a drag, a punch, a health-swapping snap, a kneel — and the
 *   choice to let them go, healed, to be beaten again.
 *
 * Online, the owner's sim decides everything; mass, pickups, early detonations, the comet's
 * catch and throw, and everything the black hole does to a body are relayed as `astra-*`
 * pseudo-casts (see `replayNet`).
 */
export class AstraKit {
  private api: AstraArenaApi;

  private readonly pcol: AstraColorFn;
  private readonly ncol: AstraColorFn;
  private readonly pfx: AstraMassFx;
  private readonly nfx: AstraMassFx;
  private playerAvatar: AstraAvatar | null = null;
  private npcAvatar: AstraAvatar | null = null;
  /** The black sky. */
  private skyGfx: Phaser.GameObjects.Graphics | null = null;
  /** Cracks, dust, the mass halo, the eclipse and the throne — under the bodies. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Silhouettes — over every rig. */
  private shadeGfx: Phaser.GameObjects.Graphics | null = null;
  /** Blobs, photons, the comet, the mass bar. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private pickups: Pickup[] = [];
  private nextPickupId = 1;
  private blobs: Blob[] = [];
  private photons: Photon[] = [];
  private cracks: Crack[] = [];
  private flings = new Map<Fighter, Fling>();
  private doom: Doom | null = null;
  private laugh: Laugh | null = null;
  private prompt: Prompt | null = null;
  /** The local player has answered this black hole's "give up?". */
  private promptAnswered = false;
  private skyK = 0;
  private slowed = false;

  constructor(api: AstraArenaApi) {
    this.api = api;
    this.pcol = (base) => api.astraColor('player', base);
    this.ncol = (base) => api.astraColor('npc', base);
    this.pfx = new AstraMassFx(api.scene, this.pcol);
    this.nfx = new AstraMassFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): AstraMassFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): AstraColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): AstraAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || BODY_R; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }
  private dist(ax: number, ay: number, bx: number, by: number): number { return Phaser.Math.Distance.Between(ax, ay, bx, by); }
  /** What the camera shows, in the game's own coordinates (`worldView` is canvas-sized under supersampling). */
  private view(): Phaser.Geom.Rectangle { return logicalView(this.api.scene); }

  private isAstra(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'astra' : this.api.npcElementId === 'astra';
  }

  /**
   * Whether this sim decides what this side's attacks do. An online opponent (or a co-op ally in
   * the npc slot of an Invasion) is simulated on its own machine: here it is drawn, nothing more.
   */
  private simulates(owner: Owner): boolean {
    return owner === 'player' || (!this.api.isOnline && !this.api.isInvasion);
  }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private nearestTarget(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = this.dist(f.x, f.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline) this.api.broadcast(id);
  }

  private singular(owner: Owner): boolean { return this.side(owner).singSince > 0; }
  private anySingular(): boolean { return this.sides.player.singSince > 0 || this.sides.npc.singSince > 0; }
  private fusing(owner: Owner): boolean { return this.now < this.side(owner).fusionUntil; }

  /** The radius the mass gives the body — the real hitbox, and the halo drawn round it. */
  private massMult(mass: number): number { return 1 + MASS_SIZE * Phaser.Math.Clamp(mass / MASS_MAX, 0, 1); }

  private canAct(f: Fighter, slot: 'click' | 'other'): boolean {
    if (f.unstoppable) return true;
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.stunnedUntil || wall < f.chickenUntil) return false;
    if (slot !== 'click' && wall < f.silencedUntil) return false;
    return true;
  }

  /** Where a ray from (x,y) along `ang` leaves the arena. */
  private toWall(x: number, y: number, ang: number): { x: number; y: number; d: number } {
    const b = this.api.bounds;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let best = Infinity;
    if (dx > 1e-6) best = Math.min(best, (b.right - x) / dx);
    if (dx < -1e-6) best = Math.min(best, (b.left - x) / dx);
    if (dy > 1e-6) best = Math.min(best, (b.bottom - y) / dy);
    if (dy < -1e-6) best = Math.min(best, (b.top - y) / dy);
    if (!Number.isFinite(best)) best = 0;
    best = Math.max(0, best);
    return { x: x + dx * best, y: y + dy * best, d: best };
  }

  private clampToArena(x: number, y: number, pad = 24): { x: number; y: number } {
    const b = this.api.bounds;
    return { x: Phaser.Math.Clamp(x, b.left + pad, b.right - pad), y: Phaser.Math.Clamp(y, b.top + pad, b.bottom - pad) };
  }

  private teleport(f: Fighter, x: number, y: number): void {
    const body = f.body as Phaser.Physics.Arcade.Body | null;
    if (body) body.reset(x, y);
    else f.setPosition(x, y);
  }

  private stun(f: Fighter, ms: number): void {
    if (f.unstoppable || ms <= 0) return;
    f.applyDisarm(ms);
    f.stunnedUntil = Math.max(f.stunnedUntil, Date.now() + ms);
    if (f !== this.api.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  /** Every Astra hit goes through here — and only on the sim that decides it. */
  private hit(owner: Owner, t: Fighter, dmg: number, opts?: DamageOpts): void {
    const f = this.fighter(owner);
    t.takeDamage(Math.round(dmg), { source: f, sourceX: f.x, sourceY: f.y, ...opts });
  }

  private kill(owner: Owner, t: Fighter): void {
    this.hit(owner, t, t.hp + t.maxHp + 9999, { trueDamage: true, pierce: true });
  }

  private npcSound(owner: Owner, key: string, x: number, rate: number, volume: number): void {
    if (owner === 'npc' && !this.api.isOnline) Sfx.playAt(key, x, { rate, volume });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (!f) continue;
      if (s.absorb && f.massAbsorb === s.absorb) f.massAbsorb = null;
      if (s.unstoppableOwed) f.unstoppable = false;
      f.massHitboxMult = 1;
    }
    this.restoreTime();
    this.sides = { player: makeSide(), npc: makeSide() };
    this.pickups = [];
    this.blobs = [];
    this.photons = [];
    this.cracks = [];
    this.flings.clear();
    this.endDoom();
    this.endLaugh();
    this.hidePrompt();
    this.promptAnswered = false;
    this.skyK = 0;
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.skyGfx, this.groundGfx, this.shadeGfx, this.airGfx]) g?.destroy();
    this.skyGfx = this.groundGfx = this.shadeGfx = this.airGfx = null;
    for (const id of ['astra-fusion', 'astra-comet', 'astra-sing', 'astra-fed']) this.api.setStatusIndicator(id, null);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.skyGfx) this.skyGfx = scene.add.graphics().setDepth(2.95);
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3.3);
    if (!this.shadeGfx) this.shadeGfx = scene.add.graphics().setDepth(8.4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isAstra('player') && !this.playerAvatar) this.playerAvatar = new AstraAvatar(scene, this.pcol);
    if (!this.isAstra('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isAstra('npc') && !this.npcAvatar) this.npcAvatar = new AstraAvatar(scene, this.ncol);
  }

  /** The mass's say in every hit: installed once per body, left on until `reset`. */
  private ensureAbsorb(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!f || f.netGhost) return;
    if (!s.absorb) s.absorb = (amount) => this.absorbHit(owner, amount);
    if (f.massAbsorb !== s.absorb) f.massAbsorb = s.absorb;
  }

  /** Returns what is left of a hit after the mass (or the black hole) has had its share. */
  private absorbHit(owner: Owner, amount: number): number {
    const s = this.side(owner);
    if (!this.isAstra(owner)) return amount;
    if (s.singSince > 0) { s.lastHitAt = this.now; return 0; }
    if (s.mass <= 0) return amount;
    const soaked = Math.min(amount * MASS_ABSORB, s.mass);
    const f = this.fighter(owner);
    if (this.fusing(owner)) {
      // The furnace eats what hits it: the mass grows by what it would have lost.
      s.mass = Math.min(MASS_MAX, s.mass + soaked);
    } else {
      s.mass = Math.max(0, s.mass - soaked);
      this.fx(owner).shed(f.x, f.y, this.bodyR(f), Math.min(8, 2 + Math.round(soaked / 4)));
    }
    return amount - soaked;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'astra') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const left = pointer.leftButtonDown();
    const leftJust = left && !s.wasLeft;
    const leftUp = !left && s.wasLeft;
    s.wasLeft = left;
    if (!this.alive(p) || this.doom) return;

    if (this.singular('player')) {
      this.formInput(left, leftJust, leftUp, mouseX, mouseY);
      return;
    }

    if (left && this.canAct(p, 'click')) p.castAbility(ID.click, this.api.buildPlayerContext(mouseX, mouseY));
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey) && s.mass >= NOVA_MIN) {
      p.castAbility(ID.e, this.api.buildPlayerContext(mouseX, mouseY));
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility(ID.r, this.api.buildPlayerContext(mouseX, mouseY));

    // F: with a comet caught, the key swings it and letting go throws it. Otherwise it calls one.
    const fDown = this.api.fKey.isDown;
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      if (s.comet?.state === 'held') {
        if (this.canAct(p, 'other')) this.beginSpin('player');
      } else {
        p.castAbility(ID.f, this.api.buildPlayerContext(mouseX, mouseY));
      }
    }
    if (s.spinning && (!fDown || !this.canAct(p, 'other'))) {
      if (fDown) s.spinning = false;
      else this.throwComet('player');
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.qKey) && s.mass >= MASS_MAX && this.canAct(p, 'other')) {
      p.castAbility(ID.q, this.api.buildPlayerContext(mouseX, mouseY));
    }
  }

  /** The black hole's own five. None of them is an `Ability`: the kit keeps their clocks. */
  private formInput(left: boolean, leftJust: boolean, leftUp: boolean, mx: number, my: number): void {
    const owner: Owner = 'player';
    const s = this.sides.player;
    const busy = !!s.punch || s.snapDue > 0 || !!s.counter || this.now < s.singSince + SING_IN_MS;

    // The click: on a body it drags; anywhere else a tap is the laser and a hold is the aura.
    if (leftJust && !busy) {
      const grabbed = this.targetsOf(owner).find((t) => this.dist(mx, my, t.x, t.y) <= this.bodyR(t) + 14) ?? null;
      if (grabbed) { s.dragging = grabbed; s.pressAt = 0; }
      else { s.pressAt = this.now; s.dragging = null; }
    }
    if (s.dragging) {
      if (!left || !this.alive(s.dragging) || busy) this.endDrag(owner);
      else this.dragTo(owner, s.dragging, mx, my);
    }
    if (s.pressAt > 0) {
      const held = this.now - s.pressAt;
      if (busy) { this.endAura(owner); }
      else if (left) {
        if (held > TAP_MS && !s.auraSent) { s.auraSent = true; this.relay(owner, 'astra-aura:1'); }
      } else if (leftUp || !left) {
        const full = held >= AURA_MS;
        this.endAura(owner);
        if (held <= TAP_MS) this.zap(owner);
        else if (full) this.startDoom(owner);
      }
    }
    if (busy) return;

    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) this.punch(owner);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) this.snap(owner);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) this.kneel(owner);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey) && this.now >= s.singSince + SING_LEAVE_MIN_MS) {
      this.leaveSingularity(owner, true);
    }
  }

  private endAura(owner: Owner): void {
    const s = this.side(owner);
    s.pressAt = 0;
    if (s.auraSent) { s.auraSent = false; this.relay(owner, 'astra-aura:0'); }
  }

  /** 0..1 — how far the held click has swollen the aura. */
  private aura(owner: Owner): number {
    const s = this.side(owner);
    if (s.pressAt <= 0) return 0;
    return Phaser.Math.Clamp((this.now - s.pressAt - TAP_MS) / (AURA_MS - TAP_MS), 0, 1);
  }

  // ── Online replay ──────────────────────────────────────────────────────────

  /**
   * Online: what only the owner's sim decides. Gameplay was settled on their machine; this keeps
   * our picture of them honest — and whatever the black hole does to *our* body (the drag, the
   * punch's flight, the snap, the kneel, the release's heal) lands here, because only our sim may
   * move or change it.
   */
  replayNet(id: string): void {
    const s = this.sides.npc;
    const parts = id.split(':');
    const head = parts[0];
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    const mx = (i: number): number => this.api.worldW - n(i);
    const f = this.api.npc;
    const me = this.api.player;
    this.ensureLayers();
    this.ensureAvatars();
    if (head === 'astra-m') {
      s.mass = Phaser.Math.Clamp(n(1), 0, MASS_MAX);
    } else if (head === 'astra-pk') {
      this.pickups.push({ id: n(1), owner: 'npc', kind: n(2) ? 'shard' : 'dust', x: mx(3), y: n(4), born: this.now, seed: n(1) * 1.37 });
    } else if (head === 'astra-eat') {
      const i = this.pickups.findIndex((p) => p.owner === 'npc' && p.id === n(1));
      if (i >= 0) {
        const p = this.pickups[i];
        this.pickups.splice(i, 1);
        this.nfx.eat(p.x, p.y, () => ({ x: f.x, y: f.y }), p.kind === 'shard');
      }
    } else if (head === 'astra-boom') {
      const x = mx(1);
      const y = n(2);
      let best = -1;
      let bestD = 200;
      this.blobs.forEach((b, i) => {
        if (b.owner !== 'npc') return;
        const d = this.dist(b.x, b.y, x, y);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best >= 0) this.blobs.splice(best, 1);
      this.nfx.annihilate(x, y, BOOM_R);
      this.spawnPhotons('npc', x, y);
    } else if (head === 'astra-cg') {
      const c = s.comet;
      if (c && this.alive(f)) this.catchComet('npc', c);
    } else if (head === 'astra-cs') {
      if (s.comet?.state === 'held') this.beginSpin('npc');
    } else if (head === 'astra-cl') {
      const c = s.comet;
      if (c) {
        // Seen from the other side: x mirrors, and so does the angle, about the vertical.
        const ang = Math.PI - n(3) / 1000;
        const heat = Phaser.Math.Clamp(n(4) / 100, 0, 1);
        this.launchComet(c, mx(1), n(2), ang, heat);
      }
    } else if (head === 'astra-cx') {
      const c = s.comet;
      if (c) this.endComet(c, mx(1), n(2), Math.PI - n(3) / 1000, n(4) > 0, false);
    } else if (head === 'astra-out') {
      const fed = n(1) > 0;
      this.leaveSingularity('npc', fed);
      if (fed && this.alive(me)) me.heal(me.maxHp);
    } else if (head === 'astra-zap') {
      if (this.alive(f) && this.alive(me)) this.zapFx('npc', me);
    } else if (head === 'astra-aura') {
      s.pressAt = n(1) > 0 ? this.now - TAP_MS : 0;
    } else if (head === 'astra-doom') {
      if (this.alive(f)) this.startDoom('npc');
    } else if (head === 'astra-wind') {
      if (this.alive(f) && this.alive(me)) this.beginPunch('npc', me, Math.PI - n(1) / 1000);
    } else if (head === 'astra-drag') {
      if (this.alive(me)) {
        const at = this.clampToArena(mx(1), n(2));
        this.teleport(me, at.x, at.y);
        this.stun(me, 220);
        s.dragging = me;
        s.nextDragSend = this.now + 260;
      }
    } else if (head === 'astra-snap') {
      if (this.alive(me) && this.alive(f)) {
        this.nfx.snap(f.x, f.y - 20);
        this.nfx.swapLives(() => ({ x: f.x, y: f.y }), () => ({ x: me.x, y: me.y }));
        me.hp = Phaser.Math.Clamp(Math.round(n(1)), 1, me.maxHp);
      }
    } else if (head === 'astra-parry') {
      if (this.alive(f) && this.alive(me)) this.counterFx('npc');
    } else if (head === 'astra-kneel') {
      if (this.alive(f)) this.kneel('npc');
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Anti-Matter: the blob. The photons only come if it finds something to annihilate. */
  doAntimatter(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.singular(owner) || this.doom) return;
    this.ensureLayers();
    const s = this.side(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const x = f.x + Math.cos(ang) * 22;
    const y = f.y + Math.sin(ang) * 22;
    this.blobs.push({ owner, x, y, vx: Math.cos(ang) * BLOB_SPEED, vy: Math.sin(ang) * BLOB_SPEED, ang, born: this.now });
    this.fx(owner).launch(x, y, ang);
    this.avatar(owner)?.play('punch', ang);
    this.npcSound(owner, 'portal', f.x, 1.6, 0.45);
    // A replica's aim is wherever its cast pointed; the player's follows the live cursor.
    if (owner === 'npc') { s.aimX = tx; s.aimY = ty; }
  }

  /** E — Supernova: a chunk of the mass, thrown off as fire. */
  doSupernova(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.singular(owner) || this.doom) return;
    this.ensureLayers();
    const s = this.side(owner);
    const spent = Math.min(s.mass, NOVA_SPEND);
    const r = this.bodyR(f) + NOVA_R + spent * NOVA_R_PER_MASS;
    s.mass = Math.max(0, s.mass - spent);
    this.fx(owner).supernova(f.x, f.y, r);
    this.avatar(owner)?.play('flex');
    this.npcSound(owner, 'flame-burst', f.x, 0.8, 0.9);
    if (!this.simulates(owner)) return;
    const dmg = NOVA_DMG + spent * NOVA_DMG_PER_MASS;
    for (const t of this.targetsOf(owner)) {
      if (this.dist(f.x, f.y, t.x, t.y) > r + this.bodyR(t)) continue;
      this.hit(owner, t, dmg, { aoe: true });
    }
  }

  /** R — Nuclear Fusion: three seconds of furnace. */
  doFusion(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.singular(owner) || this.doom) return;
    this.ensureLayers();
    const s = this.side(owner);
    s.fusionUntil = this.now + FUSION_MS;
    s.nextBurn = this.now + 200;
    this.fx(owner).ignite(f.x, f.y, this.bodyR(f));
    this.avatar(owner)?.play('flex');
    this.npcSound(owner, 'flame-burst', f.x, 1.5, 0.7);
  }

  /** F — Comet: down at the cursor, and there it stays until something moves it. */
  doComet(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.singular(owner) || this.doom) return;
    this.ensureLayers();
    const s = this.side(owner);
    const at = this.clampToArena(tx, ty, 30);
    s.spinning = false;
    s.comet = {
      owner, state: 'falling', x: at.x, y: at.y, landAt: this.now + COMET_FALL_MS, expires: 0, seed: (at.x * 0.13 + at.y * 0.71) % 97,
      offA: 0, offD: 0, omega: 0, spinSince: 0, vx: 0, vy: 0, heat: 0,
    };
    this.fx(owner).cometFall(at.x, at.y, COMET_FALL_MS, COMET_IMPACT_R);
    this.avatar(owner)?.play('slam', Math.atan2(at.y - f.y, at.x - f.x));
    this.npcSound(owner, 'beam-charge', at.x, 1.6, 0.6);
  }

  /** Q — Singularity. Only at full mass, on the sim that owns the mass. */
  doSingularity(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.singular(owner) || this.doom) return;
    if (this.simulates(owner) && this.side(owner).mass < MASS_MAX) return;
    this.ensureLayers();
    this.enterSingularity(owner);
  }

  // ── Mass and pickups ───────────────────────────────────────────────────────

  private updateMass(owner: Owner, dt: number): void {
    void dt;
    const s = this.side(owner);
    const f = this.fighter(owner);
    const live = this.isAstra(owner) && this.alive(f);
    if (!this.isAstra(owner) || this.singular(owner)) s.mass = 0;
    // The hitbox follows the mass on every sim: a replica's body must be as big as its owner says.
    const mult = live ? this.massMult(s.mass) : 1;
    if (f && Math.abs(mult - s.appliedMult) > 0.015) {
      s.appliedMult = mult;
      f.massHitboxMult = mult;
      f.applySizeMult();
    }
    if (!live) return;
    this.ensureAbsorb(owner);
    if (!this.simulates(owner) || this.anySingular()) return;

    // Dust drifts in on a clock, a few clouds at a time, never right on top of Astra.
    const mine = this.pickups.filter((p) => p.owner === owner && p.kind === 'dust').length;
    if (s.nextDustAt === 0) s.nextDustAt = this.now + 900;
    if (this.now >= s.nextDustAt) {
      s.nextDustAt = this.now + DUST_GAP_MS;
      if (mine < DUST_MAX) {
        const b = this.api.bounds;
        for (let tries = 0; tries < 6; tries++) {
          const x = Phaser.Math.Between(b.left + DUST_WALL_PAD, b.right - DUST_WALL_PAD);
          const y = Phaser.Math.Between(b.top + DUST_WALL_PAD, b.bottom - DUST_WALL_PAD);
          if (this.dist(x, y, f.x, f.y) < this.bodyR(f) + 70) continue;
          this.spawnPickup(owner, 'dust', x, y);
          break;
        }
      }
    }
    const reach = this.bodyR(f);
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.owner !== owner) continue;
      if (this.dist(p.x, p.y, f.x, f.y) > reach + (p.kind === 'dust' ? DUST_R : SHARD_R)) continue;
      this.pickups.splice(i, 1);
      s.mass = Math.min(MASS_MAX, s.mass + (p.kind === 'dust' ? DUST_MASS : SHARD_MASS));
      this.fx(owner).eat(p.x, p.y, () => ({ x: f.x, y: f.y }), p.kind === 'shard');
      this.relay(owner, `astra-eat:${p.id}`);
    }
    // A replica is told the mass a few times a second, whenever it has moved.
    const whole = Math.round(s.mass);
    if (owner === 'player' && this.api.isOnline && whole !== s.sentMass && this.now >= s.nextMassSend) {
      s.sentMass = whole;
      s.nextMassSend = this.now + 200;
      this.relay(owner, `astra-m:${whole}`);
    }
  }

  private spawnPickup(owner: Owner, kind: Pickup['kind'], x: number, y: number): void {
    const id = this.nextPickupId++;
    this.pickups.push({ id, owner, kind, x, y, born: this.now, seed: id * 1.37 });
    this.relay(owner, `astra-pk:${id}:${kind === 'shard' ? 1 : 0}:${Math.round(x)}:${Math.round(y)}`);
  }

  // ── Antimatter and photons ─────────────────────────────────────────────────

  private updateBlobs(dt: number): void {
    const b = this.api.bounds;
    const keep: Blob[] = [];
    for (const blob of this.blobs) {
      blob.x += blob.vx * dt;
      blob.y += blob.vy * dt;
      const owner = blob.owner;
      // The arena's own wall is not something to annihilate against: the blob just splashes out.
      if (blob.x <= b.left + 4 || blob.x >= b.right - 4 || blob.y <= b.top + 4 || blob.y >= b.bottom - 4) {
        const at = this.clampToArena(blob.x, blob.y, 4);
        this.fx(owner).launch(at.x, at.y, blob.ang + Math.PI);
        continue;
      }
      if (this.simulates(owner) && this.blobTouches(blob)) {
        this.detonate(owner, blob.x, blob.y, true);
        continue;
      }
      keep.push(blob);
    }
    this.blobs = keep;
  }

  /**
   * Anything physical that is not a body: a shot in flight, a registered kit projectile, a thing
   * somebody built (walls they raised included), a shield somebody is holding, the other Astra's
   * blob or comet. The shot or the summon it touched is annihilated with it. The arena's own
   * boundary does not count.
   */
  private blobTouches(blob: Blob): boolean {
    const owner = blob.owner;
    const mine = owner === 'player';
    const reach = BLOB_R + 9;
    for (const obj of this.api.projectiles.getChildren()) {
      const p = obj as Projectile;
      if (!p.active || p.isFromPlayer === mine) continue;
      if (this.dist(p.x, p.y, blob.x, blob.y) > reach) continue;
      p.destroy();
      return true;
    }
    for (const rp of this.api.projectileRegistry.within(this.other(owner), blob.x, blob.y, reach)) {
      this.api.projectileRegistry.steal(rp);
      return true;
    }
    for (const t of this.targetsOf(owner)) {
      if (t.shieldCharges <= 0 && t.shieldHp <= 0) continue;
      if (this.dist(t.x, t.y, blob.x, blob.y) <= BLOB_R + this.bodyR(t)) return true;
    }
    const theirs = this.other(owner);
    const oi = this.blobs.findIndex((o) => o.owner === theirs && this.dist(o.x, o.y, blob.x, blob.y) <= BLOB_R * 2);
    if (oi >= 0) { this.blobs.splice(oi, 1); return true; }
    const oc = this.sides[theirs].comet;
    if (oc && oc.state !== 'falling' && this.dist(oc.x, oc.y, blob.x, blob.y) <= BLOB_R + COMET_R) return true;
    return this.api.purgeSummons(blob.x, blob.y, reach, owner) > 0;
  }

  private detonate(owner: Owner, x: number, y: number, early: boolean): void {
    this.fx(owner).annihilate(x, y, BOOM_R);
    Sfx.playAt('hit-heavy', x, { rate: 1.5, volume: 0.6 });
    if (early) this.relay(owner, `astra-boom:${Math.round(x)}:${Math.round(y)}`);
    this.spawnPhotons(owner, x, y);
    if (!this.simulates(owner)) return;
    for (const t of this.targetsOf(owner)) {
      if (this.dist(x, y, t.x, t.y) > BOOM_R + this.bodyR(t)) continue;
      this.hit(owner, t, BOOM_DMG, { aoe: true });
    }
  }

  /** Three photons out of an annihilation, flung apart before the cursor starts to draw them in. */
  private spawnPhotons(owner: Owner, x: number, y: number): void {
    for (let i = 0; i < PHOTONS; i++) {
      const a = (i / PHOTONS) * Math.PI * 2 + this.vizT * 3;
      this.photons.push({
        owner, x, y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, phase: a + this.photons.length,
        born: this.now, until: this.now + PHOTON_MS,
      });
    }
    // They stack, to a point: past it the oldest wink out.
    let over = this.photons.filter((p) => p.owner === owner).length - PHOTON_MAX;
    if (over > 0) this.photons = this.photons.filter((p) => p.owner !== owner || over-- <= 0);
  }

  /**
   * Photons are projectiles of their own: each one flies, pulled toward its owner's cursor by a
   * spring and held back by drag, so they overshoot, swing round and swarm it. The first enemy one
   * touches takes its hit and the photon is spent.
   */
  private updatePhotons(dt: number): void {
    const b = this.api.bounds;
    const keep: Photon[] = [];
    for (const p of this.photons) {
      if (this.now >= p.until || !this.alive(this.fighter(p.owner))) continue;
      const s = this.side(p.owner);
      // Its own spot beside the cursor, slowly circling it.
      const oa = p.phase + this.vizT * 2.2;
      const tx = s.aimX + Math.cos(oa) * PHOTON_SCATTER;
      const ty = s.aimY + Math.sin(oa) * PHOTON_SCATTER;
      p.vx += ((tx - p.x) * PHOTON_PULL - p.vx * PHOTON_DRAG) * dt;
      p.vy += ((ty - p.y) * PHOTON_PULL - p.vy * PHOTON_DRAG) * dt;
      const v = Math.hypot(p.vx, p.vy);
      if (v > PHOTON_TOP) { p.vx *= PHOTON_TOP / v; p.vy *= PHOTON_TOP / v; }
      p.x = Phaser.Math.Clamp(p.x + p.vx * dt, b.left + 4, b.right - 4);
      p.y = Phaser.Math.Clamp(p.y + p.vy * dt, b.top + 4, b.bottom - 4);
      // On a sim that only draws this side, a photon that reaches a body is simply gone.
      const decide = this.simulates(p.owner);
      const bodies = decide ? this.targetsOf(p.owner) : (this.alive(this.api.player) ? [this.api.player] : []);
      const struck = bodies.find((t) => this.dist(p.x, p.y, t.x, t.y) <= PHOTON_R + this.bodyR(t));
      if (struck) {
        this.fx(p.owner).photonHit(p.x, p.y);
        if (decide) this.hit(p.owner, struck, PHOTON_DMG);
        continue;
      }
      keep.push(p);
    }
    this.photons = keep;
  }

  // ── Fusion ─────────────────────────────────────────────────────────────────

  private updateFusion(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.fusing(owner) || !this.alive(f) || !this.simulates(owner)) return;
    const r = this.bodyR(f);
    const mine = owner === 'player';
    const core = (): { x: number; y: number } => ({ x: f.x, y: f.y });
    for (const obj of this.api.projectiles.getChildren()) {
      const p = obj as Projectile;
      if (!p.active || p.isHeal || p.isFromPlayer === mine) continue;
      if (this.dist(p.x, p.y, f.x, f.y) > r + 6) continue;
      this.fx(owner).melt(p.x, p.y, core);
      p.destroy();
      s.mass = Math.min(MASS_MAX, s.mass + MELT_MASS);
    }
    for (const rp of this.api.projectileRegistry.within(this.other(owner), f.x, f.y, r + 6)) {
      this.fx(owner).melt(rp.getX(), rp.getY(), core);
      this.api.projectileRegistry.steal(rp);
      s.mass = Math.min(MASS_MAX, s.mass + MELT_MASS);
    }
    if (this.now >= s.nextBurn) {
      s.nextBurn = this.now + FUSION_TICK_MS;
      for (const t of this.targetsOf(owner)) {
        if (this.dist(f.x, f.y, t.x, t.y) > r + this.bodyR(t)) continue;
        this.fx(owner).sear(t.x, t.y);
        this.hit(owner, t, FUSION_DMG);
      }
    }
  }

  // ── The comet ──────────────────────────────────────────────────────────────

  private catchComet(owner: Owner, c: Comet): void {
    const f = this.fighter(owner);
    c.state = 'held';
    c.offA = Math.atan2(c.y - f.y, c.x - f.x);
    c.offD = Math.max(30, this.dist(c.x, c.y, f.x, f.y));
    c.omega = 0;
    if (this.simulates(owner)) this.relay(owner, 'astra-cg');
  }

  private beginSpin(owner: Owner): void {
    const s = this.side(owner);
    const c = s.comet;
    if (!c || c.state !== 'held' || s.spinning) return;
    s.spinning = true;
    c.omega = SPIN_START;
    c.spinSince = this.now;
    if (this.simulates(owner)) this.relay(owner, 'astra-cs');
  }

  /** Let go: it leaves along its orbit, as fast and as hot as it was swung. */
  private throwComet(owner: Owner): void {
    const s = this.side(owner);
    const c = s.comet;
    s.spinning = false;
    if (!c || c.state !== 'held') return;
    const heat = Phaser.Math.Clamp((c.omega - SPIN_START) / (SPIN_MAX - SPIN_START), 0, 1);
    const ang = c.offA + Math.PI / 2;
    this.relay(owner, `astra-cl:${Math.round(c.x)}:${Math.round(c.y)}:${Math.round(ang * 1000)}:${Math.round(heat * 100)}`);
    this.launchComet(c, c.x, c.y, ang, heat);
    this.avatar(owner)?.play('sweep', ang, 300);
  }

  private launchComet(c: Comet, x: number, y: number, ang: number, heat: number): void {
    this.side(c.owner).spinning = false;
    const v = COMET_V0 + COMET_V1 * heat;
    c.state = 'flying';
    c.x = x;
    c.y = y;
    c.vx = Math.cos(ang) * v;
    c.vy = Math.sin(ang) * v;
    c.heat = heat;
    c.expires = this.now + 4000;
    Sfx.playAt('beam-fire', x, { rate: 0.7 + 0.6 * heat, volume: 0.5 + 0.4 * heat });
  }

  /**
   * A thrown comet stopping at (x, y). Hot enough and it breaks into shards Astra can gather;
   * otherwise it drops where it stopped, to be caught again.
   */
  private endComet(c: Comet, x: number, y: number, ang: number, shatter: boolean, decide: boolean): void {
    const owner = c.owner;
    const s = this.side(owner);
    this.fx(owner).cometHit(x, y, ang, c.heat);
    Sfx.playAt('hit-heavy', x, { rate: 0.8 + 0.5 * c.heat, volume: 0.6 + 0.4 * c.heat });
    if (decide) this.relay(owner, `astra-cx:${Math.round(x)}:${Math.round(y)}:${Math.round(ang * 1000)}:${shatter ? 1 : 0}`);
    if (shatter) {
      this.cracks.push({ x, y, born: this.now, seed: x * 0.31 + y });
      s.comet = null;
      if (!decide) return;
      for (let i = 0; i < COMET_SHARDS; i++) {
        // Thrown back off what it hit, in a fan.
        const a = ang + Math.PI + (i - (COMET_SHARDS - 1) / 2) * 0.55;
        const d = 46 + i * 17;
        const at = this.clampToArena(x + Math.cos(a) * d, y + Math.sin(a) * d, 30);
        this.spawnPickup(owner, 'shard', at.x, at.y);
      }
      return;
    }
    const at = this.clampToArena(x, y, 22);
    c.state = 'ground';
    c.x = at.x;
    c.y = at.y;
    c.vx = c.vy = 0;
    c.heat = 0;
    c.expires = this.now + COMET_LIFE_MS;
  }

  private updateComet(owner: Owner, dt: number): void {
    const s = this.side(owner);
    const c = s.comet;
    if (!c) return;
    const f = this.fighter(owner);
    const decide = this.simulates(owner);
    if (!this.alive(f)) { s.comet = null; s.spinning = false; return; }
    if (c.state === 'falling') {
      if (this.now < c.landAt) return;
      c.state = 'ground';
      c.expires = this.now + COMET_LIFE_MS;
      this.cracks.push({ x: c.x, y: c.y, born: this.now, seed: c.seed });
      this.fx(owner).cometImpact(c.x, c.y, COMET_IMPACT_R);
      Sfx.playAt('hit-heavy', c.x, { rate: 1.1, volume: 0.7 });
      if (decide) {
        for (const t of this.targetsOf(owner)) {
          if (this.dist(c.x, c.y, t.x, t.y) > COMET_IMPACT_R + this.bodyR(t)) continue;
          this.hit(owner, t, COMET_IMPACT_DMG, { aoe: true });
        }
      }
      return;
    }
    if (c.state === 'ground') {
      if (this.now >= c.expires) { s.comet = null; return; }
      // Covered by the hitbox: it is Astra's now.
      if (decide && this.dist(c.x, c.y, f.x, f.y) <= this.bodyR(f)) this.catchComet(owner, c);
      return;
    }
    if (c.state === 'held') {
      if (s.spinning) {
        c.omega = Math.min(SPIN_MAX, c.omega + SPIN_ACC * dt);
        c.offA += c.omega * dt;
        // Swung out to the rim of the body, so the orbit is as wide as Astra is heavy.
        const rim = Math.max(38, this.bodyR(f) + 8);
        c.offD += (rim - c.offD) * Math.min(1, dt * 6);
      } else {
        c.omega = 0;
      }
      c.x = f.x + Math.cos(c.offA) * c.offD;
      c.y = f.y + Math.sin(c.offA) * c.offD;
      c.heat = Phaser.Math.Clamp((c.omega - SPIN_START) / (SPIN_MAX - SPIN_START), 0, 1);
      return;
    }
    // Flying.
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    const ang = Math.atan2(c.vy, c.vx);
    const b = this.api.bounds;
    const atWall = c.x <= b.left + COMET_R || c.x >= b.right - COMET_R || c.y <= b.top + COMET_R || c.y >= b.bottom - COMET_R;
    if (decide) {
      for (const t of this.targetsOf(owner)) {
        if (this.dist(c.x, c.y, t.x, t.y) > COMET_R + this.bodyR(t)) continue;
        const dmg = COMET_DMG_MIN + (COMET_DMG_MAX - COMET_DMG_MIN) * Math.pow(c.heat, 1.4);
        this.hit(owner, t, dmg);
        this.endComet(c, c.x, c.y, ang, c.heat >= COMET_SHATTER, true);
        return;
      }
      if (atWall || this.now >= c.expires) this.endComet(c, c.x, c.y, ang, c.heat >= COMET_SHATTER, true);
    } else if (this.now >= c.expires + 1500) {
      // A replica's comet ends when its owner says so; this is only a net for a lost message.
      s.comet = null;
    } else if (atWall) {
      c.vx = c.vy = 0;
    }
  }

  // ── The Singularity ────────────────────────────────────────────────────────

  private enterSingularity(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.singSince = this.now;
    s.mass = 0;
    s.fusionUntil = 0;
    s.comet = null;
    s.spinning = false;
    s.pressAt = 0;
    s.dragging = null;
    s.lastHitAt = -1e9;
    const ready = this.now + SING_IN_MS;
    s.zapAt = s.punchAt = s.snapAt = s.kneelAt = ready;
    // Mass does not exist in here: every cloud, shard, blob and photon goes with the arena.
    this.pickups = [];
    this.blobs = [];
    this.photons = [];
    if (this.simulates(owner) && !f.unstoppable) { f.unstoppable = true; s.unstoppableOwed = true; }
    this.fx(owner).collapse(f.x, f.y);
    Sfx.playAt('beam-charge', f.x, { rate: 0.4, volume: 1 });
    if (owner === 'npc') this.promptAnswered = false;
    if (owner === 'player') this.relabel(true);
    // Nobody acts while the world falls in.
    for (const t of this.simulates(owner) ? this.targetsOf(owner) : []) this.stun(t, SING_IN_MS);
  }

  /** Out of the black hole. `fed`: Astra chose to let them go, and they leave it whole. */
  private leaveSingularity(owner: Owner, fed: boolean): void {
    const s = this.side(owner);
    if (s.singSince <= 0) return;
    const f = this.fighter(owner);
    s.singSince = 0;
    this.endDrag(owner);
    this.endAura(owner);
    s.punch = null;
    s.snapDue = 0;
    s.counter = null;
    s.kneelUntil = 0;
    s.kneelers = [];
    s.mass = 0;
    s.nextDustAt = this.now + 1200;
    this.restoreTime();
    if (s.unstoppableOwed) { if (f) f.unstoppable = false; s.unstoppableOwed = false; }
    if (owner === 'player') this.relabel(false);
    if (owner === 'npc') this.hidePrompt();
    if (f?.active) this.fx(owner).release(f.x, f.y);
    if (fed) s.fed = true;
    if (!this.simulates(owner)) return;
    this.relay(owner, `astra-out:${fed ? 1 : 0}`);
    if (fed) {
      // A replica heals itself when the message reaches it.
      for (const t of this.targetsOf(owner)) if (!t.netGhost) t.heal(t.maxHp);
    }
  }

  private relabel(form: boolean): void {
    const p = this.api.player;
    if (!p?.element) return;
    for (const key of Object.keys(ID) as (keyof typeof ID)[]) {
      const ab = p.element.abilities.find((a) => a.id === ID[key]);
      if (!ab) continue;
      if (form) this.api.relabelCard(ab.id, FORM_CARDS[key][0], FORM_CARDS[key][1]);
      else this.api.relabelCard(ab.id, ab.name, ab.description);
    }
  }

  // Click — the laser.

  private zap(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (this.now < s.zapAt) return;
    const t = this.nearestTarget(owner);
    if (!t || !this.alive(f)) return;
    s.zapAt = this.now + ZAP_CD_MS;
    this.relay(owner, 'astra-zap');
    this.zapFx(owner, t);
    if (this.simulates(owner)) this.hit(owner, t, ZAP_DMG);
  }

  private zapFx(owner: Owner, t: Fighter): void {
    const f = this.fighter(owner);
    this.fx(owner).laser(f.x, f.y - 6, t.x, t.y);
    this.fx(owner).shatterBody(() => ({ x: t.x, y: t.y }), Math.min(26, this.bodyR(t)));
    Sfx.playAt('beam-fire', f.x, { rate: 2.2, volume: 0.7 });
  }

  // Click, held on a body — the drag.

  private dragTo(owner: Owner, t: Fighter, x: number, y: number): void {
    const s = this.side(owner);
    const at = this.clampToArena(x, y, this.bodyR(t) + 4);
    this.stun(t, 220);
    if (t.netGhost) {
      if (this.now >= s.nextDragSend) {
        s.nextDragSend = this.now + 80;
        this.relay(owner, `astra-drag:${Math.round(at.x)}:${Math.round(at.y)}`);
      }
      return;
    }
    this.teleport(t, at.x, at.y);
  }

  private endDrag(owner: Owner): void {
    this.side(owner).dragging = null;
  }

  // E — the punch.

  private punch(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (this.now < s.punchAt || s.punch) return;
    const t = this.nearestTarget(owner);
    if (!t || !this.alive(f)) return;
    s.punchAt = this.now + PUNCH_CD_MS;
    // Into the far wall: of eight ways to send them, the one with the most room to fly.
    let ang = 0;
    let far = -1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = this.toWall(t.x, t.y, a).d;
      if (d > far) { far = d; ang = a; }
    }
    this.relay(owner, `astra-wind:${Math.round(ang * 1000)}`);
    this.beginPunch(owner, t, ang);
  }

  private beginPunch(owner: Owner, t: Fighter, ang: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    this.endDrag(owner);
    this.endAura(owner);
    const at = this.clampToArena(t.x - Math.cos(ang) * PUNCH_BEHIND, t.y - Math.sin(ang) * PUNCH_BEHIND);
    this.fx(owner).blink(f.x, f.y);
    this.fx(owner).blink(at.x, at.y);
    if (this.simulates(owner)) this.teleport(f, at.x, at.y);
    s.punch = { target: t, ang, start: this.now, hitAt: this.now + PUNCH_WIND_MS + PUNCH_SLOW_MS };
    s.gestureUntil = s.punch.hitAt + 300;
    this.avatar(owner)?.play('dash', ang, PUNCH_WIND_MS + PUNCH_SLOW_MS);
    this.stun(t, PUNCH_WIND_MS + PUNCH_SLOW_MS + 200);
    Sfx.playAt('beam-charge', at.x, { rate: 1.3, volume: 0.8 });
  }

  private updatePunch(owner: Owner): void {
    const s = this.side(owner);
    const p = s.punch;
    if (!p) return;
    const f = this.fighter(owner);
    const t = p.target;
    if (!this.alive(f) || !t.active) { s.punch = null; this.restoreTime(); return; }
    (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    // The last stretch before the fist lands, the whole world crawls.
    if (this.now >= p.start + PUNCH_WIND_MS && this.now < p.hitAt) this.slowTime();
    if (this.now < p.hitAt) return;
    s.punch = null;
    this.restoreTime();
    const fx = this.fx(owner);
    const hx = (f.x + t.x) / 2;
    const hy = (f.y + t.y) / 2;
    const bodies = [{ x: f.x, y: f.y }, { x: t.x, y: t.y }];
    const cam = this.api.scene.cameras.main;
    // Impact frames, on the beat of the shake: black, white, black off-centre, white.
    const plates: [number, boolean, number, number][] = [[0, false, 0, 0], [55, true, 0, 0], [110, false, 26, -18], [160, true, -20, 14], [205, false, 0, 0]];
    for (const [at, invert, ox, oy] of plates) {
      this.api.scene.time.delayedCall(at, () => {
        fx.impactPlate(hx + ox, hy + oy, p.ang, bodies, invert, 50);
        cam.shake(60, 0.03);
      });
    }
    this.api.scene.time.delayedCall(250, () => { cam.shake(520, 0.035); fx.punch(t.x, t.y, p.ang); });
    Sfx.playAt('hit-heavy', t.x, { rate: 0.45, volume: 1 });
    this.avatar(owner)?.play('punch', p.ang, 320);
    if (this.simulates(owner)) this.hit(owner, t, PUNCH_DMG);
    this.stun(t, 900);
    // A replica is flung — and takes the wall — on its own machine.
    if (!t.netGhost && !t.unstoppable) {
      this.flings.set(t, {
        vx: Math.cos(p.ang) * FLING_SPEED, vy: Math.sin(p.ang) * FLING_SPEED, until: Date.now() + FLING_MS + 250,
        from: Date.now() + 250, ang: p.ang, wallDmg: PUNCH_WALL_DMG, by: owner,
      });
    }
  }

  private slowTime(): void {
    if (this.slowed || this.api.isOnline) return;
    const { scene } = this.api;
    this.slowed = true;
    scene.physics.world.timeScale = 1 / PUNCH_SLOW;
    scene.tweens.timeScale = PUNCH_SLOW;
  }

  private restoreTime(): void {
    if (!this.slowed) return;
    const { scene } = this.api;
    this.slowed = false;
    if (scene.physics?.world) scene.physics.world.timeScale = 1;
    if (scene.tweens) scene.tweens.timeScale = 1;
  }

  /** Punched bodies flying to the wall — on every body this sim moves. */
  private updateFlings(): void {
    const b = this.api.bounds;
    const wall = Date.now();
    for (const [f, fl] of this.flings) {
      if (!f.active || f.netGhost || wall >= fl.until) { this.flings.delete(f); continue; }
      const body = f.body as Phaser.Physics.Arcade.Body | null;
      // Held where the fist met it until the impact frames are done.
      if (wall < fl.from) { body?.setVelocity(0, 0); continue; }
      const r = this.bodyR(f);
      const atWall = f.x <= b.left + r + 3 || f.x >= b.right - r - 3 || f.y <= b.top + r + 3 || f.y >= b.bottom - r - 3;
      // Give it a frame or two to leave the wall it might already be standing against.
      if (atWall && wall > fl.from + 60) {
        this.flings.delete(f);
        body?.setVelocity(0, 0);
        this.fx(fl.by).whiteCrash(f.x, f.y, f.x * 0.7 + f.y);
        Sfx.playAt('hit-heavy', f.x, { rate: 0.7, volume: 0.9 });
        if (fl.wallDmg > 0 && f.hp > 0) {
          // The owner's sim decides its own hits; a hit that lands on *our* body because another
          // machine's Astra threw us is applied here, as a relayed one.
          if (this.simulates(fl.by)) this.hit(fl.by, f, fl.wallDmg);
          else f.takeDamage(fl.wallDmg, { netApplied: true, source: this.fighter(fl.by) });
        }
        continue;
      }
      body?.setVelocity(fl.vx, fl.vy);
    }
  }

  // R — the snap.

  private snap(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (this.now < s.snapAt || s.snapDue > 0 || !this.alive(f)) return;
    if (!this.nearestTarget(owner)) return;
    s.snapAt = this.now + SNAP_CD_MS;
    s.snapFrom = this.now;
    s.snapDue = this.now + SNAP_WINDOW_MS;
    s.gestureUntil = s.snapDue + 250;
    this.avatar(owner)?.play('raise', -Math.PI / 2, SNAP_WINDOW_MS + 200);
    this.fx(owner).snap(f.x + 14, f.y - 26);
    Sfx.playAt('zap', f.x, { rate: 2.4, volume: 0.6 });
  }

  private updateSnap(owner: Owner): void {
    const s = this.side(owner);
    if (s.snapDue <= 0 || !this.simulates(owner)) return;
    const f = this.fighter(owner);
    const t = this.nearestTarget(owner);
    if (!this.alive(f) || !t) { s.snapDue = 0; return; }
    // Something tried to hurt the black hole just as it snapped: it is elsewhere, and amused.
    if (s.lastHitAt >= s.snapFrom - SNAP_GRACE_MS) {
      s.snapDue = 0;
      this.relay(owner, 'astra-parry');
      // Away: whichever corner of the arena is furthest from them.
      const b = this.api.bounds;
      let best = { x: f.x, y: f.y };
      let far = -1;
      for (const cx of [b.left + 90, b.right - 90]) {
        for (const cy of [b.top + 90, b.bottom - 90]) {
          const d = this.dist(cx, cy, t.x, t.y);
          if (d > far) { far = d; best = { x: cx, y: cy }; }
        }
      }
      this.fx(owner).blink(f.x, f.y);
      this.teleport(f, best.x, best.y);
      this.counterFx(owner);
      s.counter = { left: COUNTER_SHOTS, next: this.now + COUNTER_FIRST_MS };
      return;
    }
    if (this.now < s.snapDue) return;
    s.snapDue = 0;
    const mine = Math.round(f.hp);
    const theirs = Math.round(t.hp);
    this.fx(owner).swapLives(() => ({ x: f.x, y: f.y }), () => ({ x: t.x, y: t.y }));
    f.hp = Phaser.Math.Clamp(theirs, 1, f.maxHp);
    // A replica's health belongs to its own machine: it is told what it has now.
    if (t.netGhost) this.relay(owner, `astra-snap:${mine}`);
    else t.hp = Phaser.Math.Clamp(mine, 1, t.maxHp);
  }

  private counterFx(owner: Owner): void {
    const f = this.fighter(owner);
    this.fx(owner).blink(f.x, f.y);
    this.fx(owner).mock(f.x, f.y);
    this.side(owner).gestureUntil = this.now + COUNTER_FIRST_MS + COUNTER_SHOTS * COUNTER_GAP_MS;
    Sfx.playAt('holy-chord', f.x, { rate: 1.6, volume: 0.6 });
  }

  /** The three lasers after a parried snap. They cannot miss. */
  private updateCounter(owner: Owner): void {
    const s = this.side(owner);
    const c = s.counter;
    if (!c || this.now < c.next) return;
    const f = this.fighter(owner);
    const t = this.nearestTarget(owner);
    if (!this.alive(f) || !t) { s.counter = null; return; }
    c.left -= 1;
    c.next = this.now + COUNTER_GAP_MS;
    this.relay(owner, 'astra-zap');
    this.fx(owner).laser(f.x, f.y - 6, t.x, t.y);
    this.fx(owner).photonHit(t.x, t.y);
    Sfx.playAt('beam-fire', f.x, { rate: 2.4, volume: 0.6 });
    this.avatar(owner)?.play('punch', Math.atan2(t.y - f.y, t.x - f.x), 150);
    if (this.simulates(owner)) this.hit(owner, t, COUNTER_DMG);
    if (c.left <= 0) s.counter = null;
  }

  // F — kneel.

  private kneel(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const decide = this.simulates(owner);
    if (decide && this.now < s.kneelAt) return;
    // The owner's sim names who kneels; on another machine, the one body it owns there does.
    const who = decide ? this.targetsOf(owner) : (this.alive(this.api.player) ? [this.api.player] : []);
    if (!this.alive(f) || who.length === 0) return;
    s.kneelAt = this.now + KNEEL_CD_MS;
    s.kneelUntil = this.now + KNEEL_MS;
    s.kneelers = who;
    s.gestureUntil = this.now + 900;
    for (const t of who) this.stun(t, KNEEL_MS);
    this.avatar(owner)?.play('raise', -Math.PI / 2, 900);
    Sfx.playAt('holy-chord', f.x, { rate: 0.6, volume: 0.8 });
    if (decide) this.relay(owner, 'astra-kneel');
  }

  // Click, held three seconds — the end of the world.

  private startDoom(owner: Owner): void {
    if (this.doom) return;
    const { scene } = this.api;
    const f = this.fighter(owner);
    const victims = this.simulates(owner) ? this.targetsOf(owner) : (this.alive(this.api.player) ? [this.api.player] : []);
    this.endDrag(owner);
    this.side(owner).pressAt = 0;
    this.side(owner).auraSent = false;
    this.restoreTime();
    this.hidePrompt();
    this.doom = { owner, start: this.now, victims, done: false, g: scene.add.graphics().setDepth(59) };
    this.relay(owner, 'astra-doom');
    for (const b of this.allFighters()) {
      if (!this.alive(b)) continue;
      if (b === f) { b.applyDisarm(DOOM_MS); continue; }
      this.stun(b, DOOM_KILL_MS + 200);
    }
    scene.cameras.main.shake(900, 0.004);
    Sfx.playAt('beam-charge', f.x, { rate: 0.5, volume: 1 });
  }

  private updateDoom(): void {
    const d = this.doom;
    if (!d) return;
    const el = this.now - d.start;
    const cam = this.api.scene.cameras.main;
    d.g.clear();
    drawDoom(d.g, this.col(d.owner), this.view(), el, this.vizT);
    if (el > 900 && el < DOOM_KILL_MS && Math.floor(el / 90) !== Math.floor((el - 17) / 90)) cam.shake(90, 0.006 + 0.012 * ((el - 900) / 1800));
    if (!d.done && el >= DOOM_KILL_MS) {
      d.done = true;
      cam.shake(700, 0.04);
      Sfx.playAt('hit-heavy', this.view().centerX, { rate: 0.35, volume: 1 });
      if (this.simulates(d.owner)) {
        for (const b of d.victims) if (this.alive(b)) this.kill(d.owner, b);
      }
    }
    if (el >= DOOM_MS) this.endDoom();
  }

  private endDoom(): void {
    if (!this.doom) return;
    this.doom.g.destroy();
    this.doom = null;
  }

  // ── "Give up?" and the laugh ───────────────────────────────────────────────

  /**
   * The local player, twelve seconds into somebody else's black hole, is asked whether they have
   * had enough. Yes kills them; no puts the question away for the rest of this black hole.
   */
  private updatePrompt(): void {
    const s = this.sides.npc;
    const p = this.api.player;
    const due = s.singSince > 0 && !this.api.isInvasion && this.alive(p) && !this.promptAnswered && !this.doom
      && this.now - s.singSince >= GIVE_UP_MS;
    if (!due) { this.hidePrompt(); return; }
    const { scene } = this.api;
    if (!this.prompt) {
      const style = (size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle => ({
        fontSize: `${size}px`, fontFamily: 'Arial Black', color, stroke: '#000000', strokeThickness: 4,
      });
      const box = scene.add.graphics().setDepth(70);
      const title = scene.add.text(0, 0, 'GIVE UP?', style(20, '#ffffff')).setOrigin(0.5).setDepth(71);
      const yes = scene.add.text(0, 0, 'YES', style(16, '#ff6b7f')).setOrigin(0.5).setDepth(71).setPadding(14, 6, 14, 6);
      const no = scene.add.text(0, 0, 'NO', style(16, '#ffe27a')).setOrigin(0.5).setDepth(71).setPadding(14, 6, 14, 6);
      yes.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.answerPrompt(true));
      no.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.answerPrompt(false));
      this.prompt = { box, title, yes, no };
    }
    const v = this.view();
    const cx = v.centerX;
    const y = v.y + 44;
    const pr = this.prompt;
    pr.title.setPosition(cx, y);
    pr.yes.setPosition(cx - 52, y + 34);
    pr.no.setPosition(cx + 52, y + 34);
    pr.box.clear();
    pr.box.fillStyle(0x000000, 0.86);
    pr.box.fillRoundedRect(cx - 120, y - 22, 240, 78, 8);
    pr.box.lineStyle(2, 0xffffff, 0.7 + 0.3 * Math.sin(this.vizT * 5));
    pr.box.strokeRoundedRect(cx - 120, y - 22, 240, 78, 8);
    pr.box.lineStyle(1.5, 0xff6b7f, 1);
    pr.box.strokeRoundedRect(cx - 86, y + 20, 68, 28, 5);
    pr.box.lineStyle(1.5, 0xffe27a, 1);
    pr.box.strokeRoundedRect(cx + 18, y + 20, 68, 28, 5);
  }

  private answerPrompt(yes: boolean): void {
    this.promptAnswered = true;
    this.hidePrompt();
    const p = this.api.player;
    if (!yes || !this.alive(p)) return;
    // Their own choice, on their own body: nothing they are wearing may refuse it.
    Fighter.asNonAllyDamage(() => p.takeDamage(p.hp + p.maxHp + 9999, { netApplied: true, trueDamage: true, pierce: true }));
  }

  private hidePrompt(): void {
    const pr = this.prompt;
    if (!pr) return;
    for (const o of [pr.box, pr.title, pr.yes, pr.no]) o.destroy();
    this.prompt = null;
  }

  /**
   * Let out of the black hole, healed, and beaten anyway: if the one who lost is a person, the
   * last thing they see is Astra laughing at them.
   */
  private updateLaugh(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.fed || s.laughed || this.api.isInvasion) continue;
      // A person lost: the local player to the npc slot's Astra, or an online opponent to ours.
      const loser = owner === 'npc' ? this.api.player : (this.api.isOnline ? this.api.npc : null);
      if (!loser || loser.hp > 0 || !this.alive(this.fighter(owner))) continue;
      s.laughed = true;
      this.endLaugh();
      this.laugh = { owner, start: this.now, g: this.api.scene.add.graphics().setDepth(61) };
      Sfx.playAt('holy-chord', loser.x, { rate: 1.9, volume: 0.9 });
    }
    const l = this.laugh;
    if (!l) return;
    const el = this.now - l.start;
    const k = Phaser.Math.Clamp(el / 260, 0, 1) * Phaser.Math.Clamp((3200 - el) / 400, 0, 1);
    l.g.clear();
    drawLaugh(l.g, this.col(l.owner), this.view(), k, this.vizT);
    if (el >= 3200) this.endLaugh();
  }

  private endLaugh(): void {
    if (!this.laugh) return;
    this.laugh.g.destroy();
    this.laugh = null;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isAstra('player');
    const npcIs = this.isAstra('npc');
    const anyState = this.pickups.length || this.blobs.length || this.photons.length || this.cracks.length
      || this.flings.size || this.doom || this.laugh || this.playerAvatar || this.skyK > 0;
    if (!playerIs && !npcIs && !anyState) return;
    this.ensureLayers();
    this.ensureAvatars();
    const dt = delta / 1000;
    this.vizT += dt;

    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (owner === 'npc' && this.isAstra(owner) && this.simulates(owner)) {
        // The bot aims at whoever it is fighting.
        const t = this.nearestTarget(owner);
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }
      this.updateMass(owner, dt);
      if (!this.isAstra(owner) || !this.alive(f)) {
        if (s.singSince > 0) this.leaveSingularity(owner, false);
        s.fusionUntil = 0;
        continue;
      }
      this.updateFusion(owner);
      this.updateComet(owner, dt);
      if (s.singSince > 0) this.updateForm(owner);
    }
    this.updateBot();
    this.updateBlobs(dt);
    this.updatePhotons(dt);
    this.updateFlings();
    this.updateDoom();
    this.updatePrompt();
    this.updateLaugh();
    this.cracks = this.cracks.filter((c) => this.now - c.born < CRACK_MS);
    this.paint(dt);
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  private updateForm(owner: Owner): void {
    const s = this.side(owner);
    this.updatePunch(owner);
    this.updateSnap(owner);
    this.updateCounter(owner);
    if (s.kneelUntil > 0 && this.now >= s.kneelUntil) { s.kneelUntil = 0; s.kneelers = []; }
    // A replica's drag is only a picture: it ends when the messages stop.
    if (!this.simulates(owner) && s.dragging && this.now >= s.nextDragSend) s.dragging = null;
    // In an Invasion the black hole closes by itself once there is nothing left in it.
    if (this.simulates(owner) && this.api.isInvasion && !this.doom && this.targetsOf(owner).length === 0
        && this.now >= s.singSince + SING_LEAVE_MIN_MS) {
      this.leaveSingularity(owner, false);
    }
  }

  /** The bot's kit-fired plays: the comet's swing and throw, and everything the black hole does. */
  private updateBot(): void {
    const owner: Owner = 'npc';
    if (!this.isAstra(owner) || !this.simulates(owner)) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || this.doom) return;
    const t = this.nearestTarget(owner);

    if (s.singSince <= 0) {
      const c = s.comet;
      if (c?.state !== 'held' || !t) return;
      if (!s.spinning) { if (this.canAct(f, 'other')) this.beginSpin(owner); return; }
      // Thrown once it is burning and its orbit is carrying it at the target — or after too long.
      const tangent = c.offA + Math.PI / 2;
      const bearing = Math.atan2(t.y - c.y, t.x - c.x);
      const off = Math.abs(Phaser.Math.Angle.Wrap(bearing - tangent));
      if ((c.heat >= 0.7 && off < 0.2) || this.now - c.spinSince > 4500) this.throwComet(owner);
      return;
    }

    if (!t || s.punch || s.snapDue > 0 || s.counter || this.now < s.singSince + SING_IN_MS) return;
    const el = this.now - s.singSince;
    // The end: after ten seconds of play it starts to glow, and three seconds later the world ends.
    if (s.pressAt > 0) {
      if (this.aura(owner) >= 1) { s.pressAt = 0; this.startDoom(owner); }
      return;
    }
    if (el >= BOT_DOOM_AFTER_MS) { s.pressAt = this.now - TAP_MS; return; }
    // Kneel sets up the punch; the snap is for when they have more health than the bot does.
    if (this.now >= s.kneelAt) { this.kneel(owner); return; }
    if (this.now >= s.punchAt && (s.kneelUntil > 0 || el > 2500)) { this.punch(owner); return; }
    if (this.now >= s.snapAt && f.hp < t.hp - 15) { this.snap(owner); return; }
    if (this.now >= s.zapAt) this.zap(owner);
  }

  // ── Paint ──────────────────────────────────────────────────────────────────

  private paint(dt: number): void {
    const sky = this.skyGfx!;
    const ground = this.groundGfx!;
    const shade = this.shadeGfx!;
    const air = this.airGfx!;
    sky.clear();
    ground.clear();
    shade.clear();
    air.clear();
    const t = this.vizT;
    const view = this.view();

    // The black hole fades in behind its collapse and out with its release.
    const singOwner = BOTH.find((o) => this.singular(o)) ?? null;
    this.skyK += ((singOwner ? 1 : 0) - this.skyK) * Math.min(1, dt * (singOwner ? 3.2 : 6));
    if (this.skyK < 0.01 && !singOwner) this.skyK = 0;
    if (this.skyK > 0) blackHoleSky(sky, this.col(singOwner ?? 'player'), view, view.centerX, view.centerY, t, this.skyK);

    for (const c of this.cracks) {
      const a = 1 - Phaser.Math.Clamp((this.now - c.born - CRACK_MS * 0.6) / (CRACK_MS * 0.4), 0, 1);
      floorCracks(ground, this.col('player'), c.x, c.y, COMET_IMPACT_R * 1.2, a, c.seed);
    }
    for (const p of this.pickups) {
      const grow = Phaser.Math.Clamp((this.now - p.born) / 300, 0, 1);
      if (p.kind === 'dust') dustCloud(ground, this.col(p.owner), p.x, p.y, DUST_R * grow, t, p.seed, grow);
      else rockShard(ground, this.col(p.owner), p.x, p.y, SHARD_R * grow, t, p.seed, grow);
    }

    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.isAstra(owner) || !this.alive(f)) continue;
      const s = this.side(owner);
      const tint = this.col(owner);
      if (s.singSince > 0) {
        const hover = Math.sin(t * 2.4) * 2.5;
        eclipse(ground, tint, f.x, f.y, t, f.alpha, this.aura(owner));
        throne(ground, tint, f.x, f.y + 4 + hover, t, f.alpha);
        if (s.punch) {
          const k = Phaser.Math.Clamp((this.now - s.punch.start) / (s.punch.hitAt - s.punch.start), 0, 1);
          punchCharge(air, tint, f.x + Math.cos(s.punch.ang) * 20, f.y + Math.sin(s.punch.ang) * 20, k, t);
        }
        if (s.dragging?.active) {
          const d = s.dragging;
          air.lineStyle(2, MASS.rim, 0.9);
          air.strokeCircle(d.x, d.y, this.bodyR(d) + 8 + 2 * Math.sin(t * 12));
          air.lineStyle(1, MASS.rim, 0.5);
          air.lineBetween(f.x, f.y, d.x, d.y);
        }
        for (const kn of s.kneelers) if (kn.active) kneelPress(air, tint, kn.x, kn.y, t, 1);
        continue;
      }
      const k = s.mass / MASS_MAX;
      const fusion = this.fusing(owner) ? Math.min(1, (s.fusionUntil - this.now) / 300) : 0;
      massHalo(ground, tint, f.x, f.y, this.bodyR(f), k, t, f.alpha, fusion);
      massBar(air, tint, f.x, f.y - this.bodyR(f) - 22, k, t, f.alpha);
      const c = s.comet;
      if (c && c.state !== 'falling') {
        const ang = c.state === 'flying' ? Math.atan2(c.vy, c.vx) : c.offA + Math.PI / 2;
        const moving = c.state === 'flying' || (c.state === 'held' && s.spinning);
        cometRock(air, tint, c.x, c.y, COMET_R, c.heat, ang, t, c.seed, moving);
        if (c.state === 'ground') {
          // A ring the size Astra's body must be to cover it.
          ground.lineStyle(1, tint(MASS.ice), 0.3 + 0.2 * Math.sin(t * 4));
          ground.strokeCircle(c.x, c.y, COMET_R + 7);
        }
      }
    }
    for (const b of this.blobs) antimatterBlob(air, this.col(b.owner), b.x, b.y, BLOB_R, b.ang, t + b.born * 0.001);
    for (const p of this.photons) {
      const life = Phaser.Math.Clamp((p.until - this.now) / 300, 0, 1) * Phaser.Math.Clamp((this.now - p.born) / 150, 0, 1);
      photonBolt(air, this.col(p.owner), p.x, p.y, Math.atan2(p.vy, p.vx), Math.hypot(p.vx, p.vy), t + p.phase, life);
    }

    // Everyone else in the black hole is a shape cut out of it.
    if (this.skyK > 0.05) {
      const { scene } = this.api;
      for (const f of this.allFighters()) {
        if (!f.active || f.hp <= 0 || f.alpha <= 0.05) continue;
        const own = BOTH.find((o) => this.fighter(o) === f && this.isAstra(o) && this.singular(o));
        if (own) continue;
        const kneeling = BOTH.some((o) => this.side(o).kneelUntil > this.now && this.side(o).kneelers.includes(f));
        silhouette(shade, f.x, f.y, Math.min(30, this.bodyR(f)), BaseAvatar.handsAt(scene, f.x, f.y), this.skyK * f.alpha, kneeling ? 1 : 0);
      }
    }
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      if (owner === 'npc' && !this.simulates(owner)) {
        const t = this.alive(this.api.player) ? this.api.player : null;
        if (t && this.photons.every((p) => p.owner !== 'npc')) { s.aimX = t.x; s.aimY = t.y; }
      }
      const facing = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      av.setFacing(facing);
      const sing = s.singSince > 0;
      av.setSingular(sing);
      av.setStarMode(false);
      av.setBrightness(sing ? 0 : Math.max(s.mass / MASS_MAX * 0.6, this.fusing(owner) ? 1 : 0));
      // Hands behind the back on the throne, except for the moment a hand is doing something.
      if (sing) av.setHold(this.now < s.gestureUntil || s.pressAt > 0 ? null : 'behind', facing);
      else if (s.spinning) av.setHold('charge', facing);
      else av.setHold(null);
      av.setMastered(false);
      av.update(delta, f.x, f.y + (sing ? Math.sin(this.vizT * 2.4) * 2.5 : 0), f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const set = this.api.setStatusIndicator.bind(this.api);
    set('astra-fusion', playerIs && this.fusing('player') ? {
      name: 'Nuclear Fusion', emoji: '☢️', color: MASS.fusion, priority: 150,
      description: 'Shots that enter your body are melted into mass, and enemies inside it burn.',
      until: s.fusionUntil,
    } : null);
    set('astra-comet', playerIs && s.comet?.state === 'held' ? {
      name: 'Comet', emoji: '☄️', color: MASS.ice, priority: 151,
      description: 'Caught. Hold F to swing it round you — the longer, the hotter. Release to throw it along its orbit.',
      count: s.spinning ? Math.round((s.comet?.heat ?? 0) * 100) : undefined,
    } : null);
    set('astra-sing', playerIs && s.singSince > 0 ? {
      name: 'Singularity', emoji: '⚫', color: ASTRA.starHot, priority: 152,
      description: 'Invincible. Tap: laser. Hold 3s: end the world. Press on an enemy: drag. E punch, R snap, F kneel, Q let them go.',
    } : null);
    set('astra-fed', playerIs && s.fed && s.singSince <= 0 && !this.api.isOnline ? {
      name: 'Played With Your Food', emoji: '🍽️', color: ASTRA.starHot, priority: 149,
      description: 'You let them go. Win this fight for double rewards.',
    } : null);
  }

  // ── Arena readers ──────────────────────────────────────────────────────────

  /** Mass is slow; the finale and the punch's wind-up hold Astra still. */
  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    if (!this.isAstra(owner)) return 1;
    const s = this.side(owner);
    if (this.doom || s.punch) return 0;
    if (s.singSince > 0) return 1;
    return 1 - MASS_SLOW * Phaser.Math.Clamp(s.mass / MASS_MAX, 0, 1);
  }

  /** Double rewards for beating a bot Astra chose to let out of the black hole. */
  rewardMult(): number {
    return this.sides.player.fed && !this.api.isOnline ? 2 : 1;
  }

  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: Owner): string | null {
    const s = this.side(owner);
    if (s.singSince > 0 || s.mass <= 0) return null;
    s.mass = Math.max(0, s.mass - MASS_MAX * 0.3);
    return '−30 MASS';
  }

  /** The ability cards: Q is the mass bar; in the black hole each card is that form's own clock. */
  getBarRatio(abilityId: string): number {
    const p = this.api.player;
    const s = this.sides.player;
    const clock = (readyAt: number, cd: number): number => 1 - Phaser.Math.Clamp((readyAt - this.now) / cd, 0, 1);
    if (s.singSince > 0) {
      if (abilityId === ID.click) return s.pressAt > 0 && this.aura('player') > 0 ? this.aura('player') : clock(s.zapAt, ZAP_CD_MS);
      if (abilityId === ID.e) return clock(s.punchAt, PUNCH_CD_MS);
      if (abilityId === ID.r) return clock(s.snapAt, SNAP_CD_MS);
      if (abilityId === ID.f) return clock(s.kneelAt, KNEEL_CD_MS);
      if (abilityId === ID.q) return clock(s.singSince + SING_LEAVE_MIN_MS, SING_LEAVE_MIN_MS);
    }
    if (abilityId === ID.q) return Phaser.Math.Clamp(s.mass / MASS_MAX, 0, 1);
    if (abilityId === ID.f && s.comet?.state === 'held') return s.spinning ? Math.max(0.15, s.comet.heat) : 1;
    if (abilityId === ID.e && s.mass < NOVA_MIN) return Math.min(p.getCooldownRatio(abilityId), s.mass / NOVA_MIN * 0.5);
    return p.getCooldownRatio(abilityId);
  }

  // ── Readers for the bot (side-effect-free) ─────────────────────────────────

  /** The kit has the bot's hands: the black hole plays itself, and the finale plays alone. */
  npcAstraBusy(): boolean {
    const s = this.sides.npc;
    return s.singSince > 0 || !!this.doom || s.spinning;
  }

  /**
   * Where to walk: onto a comet lying on the floor (covering it is how it is caught), else to the
   * nearest of its own dust clouds or shards — but only one close by, so it gathers between
   * exchanges instead of wandering off across the arena. Nothing while it is the black hole.
   */
  astraSeekPoint(): { x: number; y: number } | null {
    const f = this.api.npc;
    const s = this.sides.npc;
    if (!this.isAstra('npc') || !this.alive(f) || !this.simulates('npc') || s.singSince > 0 || this.doom) return null;
    const c = s.comet;
    if (c?.state === 'ground' && this.dist(c.x, c.y, f.x, f.y) < BOT_SEEK_R * 1.4) return { x: c.x, y: c.y };
    if (s.mass >= MASS_MAX || s.spinning) return null;
    let best: Pickup | null = null;
    let bestD = BOT_SEEK_R;
    for (const p of this.pickups) {
      if (p.owner !== 'npc') continue;
      const d = this.dist(p.x, p.y, f.x, f.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  /** Supernova would catch them, and there is mass worth throwing. */
  npcAstraNovaShot(): boolean {
    const f = this.api.npc;
    const s = this.sides.npc;
    const t = this.nearestTarget('npc');
    if (!t || !this.alive(f) || s.singSince > 0 || s.mass < 25 || s.mass >= MASS_MAX) return false;
    const r = this.bodyR(f) + NOVA_R + Math.min(s.mass, NOVA_SPEND) * NOVA_R_PER_MASS;
    return this.dist(f.x, f.y, t.x, t.y) < r + this.bodyR(t) - 12;
  }

  /** Fusion pays: a body is inside the hitbox to burn, or shots are about to enter it to be eaten. */
  npcAstraFusionShot(): boolean {
    const f = this.api.npc;
    const s = this.sides.npc;
    if (!this.alive(f) || s.singSince > 0 || this.fusing('npc')) return false;
    const r = this.bodyR(f);
    const t = this.nearestTarget('npc');
    if (t && this.dist(f.x, f.y, t.x, t.y) < r + this.bodyR(t) - 6) return true;
    let incoming = 0;
    for (const obj of this.api.projectiles.getChildren()) {
      const p = obj as Projectile;
      if (p.active && p.isFromPlayer && !p.isHeal && this.dist(p.x, p.y, f.x, f.y) < r + 110) incoming++;
    }
    return incoming >= 2;
  }

  /** A comet is worth calling: none is out, and the target is where one could land on them. */
  npcAstraCometShot(): boolean {
    const f = this.api.npc;
    const s = this.sides.npc;
    const t = this.nearestTarget('npc');
    if (!t || !this.alive(f) || s.singSince > 0 || s.comet) return false;
    return this.dist(f.x, f.y, t.x, t.y) < 520;
  }

  /** The mass bar is full: collapse. */
  npcAstraSingReady(): boolean {
    const s = this.sides.npc;
    return this.alive(this.api.npc) && s.singSince <= 0 && s.mass >= MASS_MAX && !!this.nearestTarget('npc');
  }
}
