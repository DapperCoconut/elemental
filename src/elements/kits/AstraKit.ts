import Phaser from 'phaser';
import { Fighter, DamageOpts } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { Sfx } from '../../audio';
import {
  ASTRA, AstraAvatar, AstraColorFn, AstraFx, drawGiant, drawGiantHand, stabilityBar, starAura, wallExcite, wormOrb,
} from './AstraVisuals';

type Owner = 'player' | 'npc';

const BOTH: Owner[] = ['player', 'npc'];

const ID = {
  click: 'astra-starstruck',
  e: 'astra-solar-flares',
  r: 'astra-smite',
  f: 'astra-worm-warp',
  q: 'astra-true-self',
};
/** The four non-ultimate abilities, in slot order — Worm Warp's star-mode theft is slot for slot. */
const SLOT_IDS = [ID.click, ID.e, ID.r, ID.f];

// ── Click: Starstruck ────────────────────────────────────────────────────────
const SHOTS = 4;
const SHOT_GAP_MS = 70;
const SHOT_DMG = 4;
const SHOT_W = 12;
// Click+ Atomical Excitement.
const EXCITE_MS = 2000;
const EXCITE_MERGE = 20;
const EXCITE_MAX_SHOTS = 4;

// ── E: Solar Flares ──────────────────────────────────────────────────────────
const FLARE_DMG = 12;
const FLARE_W = 46;
const FLARE_GAP_MS = 380;
/** The fx gathers for this long before an arm blasts out; the hit lands with the blast. */
const FLARE_WINDUP_MS = 90;
const PLUS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
const CROSS = [Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4, -Math.PI / 4];
/** Star mode: the flares erupt at the cursor, but no further from Astra than this. */
const STAR_FLARE_REACH = 440;
// E+ Cosmic Combo.
const RING_R = 150;
const RING_W = 34;
const RING_DMG = 12;
const RING_DMG_COMBO = 42;
const RING_WINDUP_MS = 120;

// ── R: Celestial Smite ───────────────────────────────────────────────────────
const SMITE_TELL_MS = 250;
const SMITE_DMG = 18;
const SMITE_SLOW_MS = 2000;
// R+ Never Strikes Twice.
const RECAST_MS = 4000;

// ── F: Worm Warp ─────────────────────────────────────────────────────────────
const WARP_SPEED = 640;
const WARP_RANGE = 560;
const WARP_R = 12;
const WARP_DMG = 8;
// F+ Superiority Complex.
const STEAL_CD_MS = 3000;
const STEAL_ULT = 20;
// Star mode's theft.
const STAR_STEAL_ULT = 0.25;
// Star mode with F+.
const STAR_F_STEAL_ULT = 0.4;
const STAR_F_STEAL_HP = 20;

// ── Q: True Self ─────────────────────────────────────────────────────────────
const TRIAL_MS = 8000;
const STAB_START = 50;
const STAB_MAX = 100;
const STAB_DECAY = 3.5;
const STAB_DECAY_PER_STAR = 1.5;
const STAB_GAIN = 2.4;
const STAB_LOSS = 0.5;
const STAB_LOSS_PER_STAR = 0.4;
const STAR_MS = 15000;
const STAR_MS_PER_STAR = 3000;
const AURA_R = 90;
const AURA_DMG = 4;
const AURA_TICK_MS = 500;
const AURA_SUMMON_R = 70;
const AURA_SUMMON_MS = 1000;
/** The rest of the match, as far as a lock is concerned. */
const FOREVER_MS = 1e9;
// The slap.
const SLAP_DMG = 60;
const SLAP_STUN_MS = 1400;
const SLAP_BEHIND = 44;
const FLING_SPEED = 1500;
const FLING_MS = 900;
// Q+ Gods Do Not Fear Mortals.
const HOLD_TAP_MS = 350;
const HOLD_STAR_MS = 1100;
const MAX_STARS = 5;
// The five-star finale.
const CINE_MS = 4400;
const CINE_RISE_MS = 1300;
const CINE_REACH_MS = 2300;
const CINE_GRAB_MS = 2900;
const CINE_CRUSH_MS = 3300;

// ── Bot ──────────────────────────────────────────────────────────────────────
const NPC_LANE_TOL = 26;
const NPC_LANE_DIST = 240;
const NPC_TRIAL_DIST = 150;

// ── Types ────────────────────────────────────────────────────────────────────

interface Burst {
  left: number;
  next: number;
  ang: number;
}

interface Excite {
  owner: Owner;
  x: number;
  y: number;
  /** Into the arena, radians. */
  normal: number;
  fireAt: number;
  born: number;
  shots: number;
  seed: number;
}

interface Warp {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  born: number;
}

interface Fling {
  vx: number;
  vy: number;
  until: number;
  ang: number;
}

interface Cine {
  owner: Owner;
  start: number;
  victims: Fighter[];
  done: boolean;
  /** Overlay layers: the dark sky, the giant behind the floor, the hand over everything. */
  sky: Phaser.GameObjects.Graphics;
  giant: Phaser.GameObjects.Graphics;
  hand: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
}

interface Side {
  aimX: number;
  aimY: number;
  burst: Burst | null;
  /** R+: scene time the recast window closes (0 = shut). */
  recastUntil: number;
  /** Star Trial: scene time it ends (0 = none), the stars it was taken at, and its stability. */
  trialUntil: number;
  trialStars: number;
  stability: number;
  lastSelfHp: number;
  lastHp: Map<Fighter, number>;
  /** Star mode: scene time it ends (0 = off), and whether its slap is spent. */
  starUntil: number;
  slapUsed: boolean;
  nextAuraTick: number;
  nextSummonBurn: number;
  /** A failed trial: Q is gone for the match. */
  qLocked: boolean;
  /** Q+ hold: when it started (0 = not holding), and the stars it has reached. */
  holdStart: number;
  holdStars: number;
  /** We set `isInvincible` for the hold, and owe it back. */
  invulnOwed: boolean;
  /** The stars the next True Self resolves at — the player's release, or a relayed one. -1 when none. */
  pending: number;
  /** Bot: the stars it means to hold to. */
  botStars: number;
  starAnnounced: boolean;
  wasLeft: boolean;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, burst: null, recastUntil: 0, trialUntil: 0, trialStars: 0, stability: STAB_START,
    lastSelfHp: -1, lastHp: new Map(), starUntil: 0, slapUsed: false, nextAuraTick: 0, nextSummonBurn: 0,
    qLocked: false, holdStart: 0, holdStars: 0, invulnOwed: false, pending: -1, botStars: 0,
    starAnnounced: false, wasLeft: false,
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
  /** The arena's walls — every beam runs to them. */
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  /** Mirror an x across the arena — positions online are seen from the other side. */
  get worldW(): number;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get projectileRegistry(): ProjectileRegistry;
  isTargetable(f: Fighter): boolean;
  purgeSummons(x: number, y: number, r: number, exceptOwner: Owner): number;
  astraColor(owner: Owner, base: number): number;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  /** The player's shop upgrade, or the opponent's (online handshake / Hard+ bot loadout). */
  hasUpgrade(owner: Owner, slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── AstraKit ─────────────────────────────────────────────────────────────────

/**
 * Astra — the cracked shell with a dwarf star inside.
 *
 * - **Starstruck** — a burst of four instant shots, locked level: only left or right. Click+ makes
 *   the wall they reach excited, and two seconds later the wall shoots back along the same line.
 * - **Solar Flares** — a plus of wide beams out of Astra, then an X. E+ adds a ring of fire round
 *   it that is devastating on anyone the first two caught.
 * - **Celestial Smite** — a bolt onto whoever is highest on the screen, Astra included. R+ recasts
 *   it onto whoever is lowest.
 * - **Worm Warp** — a wormhole that swaps Astra with what it hits. F+ steals cooldown and charge.
 * - **True Self** — the Star Trial: eight seconds of a stability bar that drains on its own, rises
 *   with damage dealt and falls with damage taken. Survive it to be the star: everything aims,
 *   the corona burns shots and bodies, and Q is a teleporting slap. Fail it and Q is gone. Q+
 *   holds to take on harder trials for longer star modes — and five stars wins outright.
 *
 * Online, the owner's sim decides everything; the trial's stars, its result, the swap, the theft,
 * the slap and the finale are relayed as `astra-*` pseudo-casts.
 */
export class AstraKit {
  private api: AstraArenaApi;

  private readonly pcol: AstraColorFn;
  private readonly ncol: AstraColorFn;
  private readonly pfx: AstraFx;
  private readonly nfx: AstraFx;
  private playerAvatar: AstraAvatar | null = null;
  private npcAvatar: AstraAvatar | null = null;
  /** Excited walls and the corona — under the bodies. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Wormholes in flight, stability bars. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private excites: Excite[] = [];
  private warps: Warp[] = [];
  private flings = new Map<Fighter, Fling>();
  private cine: Cine | null = null;

  constructor(api: AstraArenaApi) {
    this.api = api;
    this.pcol = (base) => api.astraColor('player', base);
    this.ncol = (base) => api.astraColor('npc', base);
    this.pfx = new AstraFx(api.scene, this.pcol);
    this.nfx = new AstraFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): AstraFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): AstraColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): AstraAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }

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
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
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

  /** A shop upgrade, on a side that is actually playing Astra. */
  private up(owner: Owner, slot: string): boolean {
    return this.isAstra(owner) && this.api.hasUpgrade(owner, slot);
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline) this.api.broadcast(id);
  }

  private starMode(owner: Owner): boolean { return this.now < this.side(owner).starUntil; }
  private inTrial(owner: Owner): boolean { return this.side(owner).trialUntil > 0; }
  private holding(owner: Owner): boolean { return this.side(owner).holdStart > 0; }

  private canAct(f: Fighter, slot: 'click' | 'other'): boolean {
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.stunnedUntil || wall < f.chickenUntil) return false;
    if (slot !== 'click' && wall < f.silencedUntil) return false;
    return true;
  }

  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }

  private announce(_x: number, _y: number, _text: string, _color: number, _size = 12): void {
    // Battle text pop-ups are disabled — they cluttered every attack.
  }

  private segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
    return Phaser.Math.Distance.Between(ax + dx * u, ay + dy * u, px, py);
  }

  /** Where a ray from (x,y) along `ang` leaves the arena, and the inward normal of the wall it meets. */
  private toWall(x: number, y: number, ang: number): { x: number; y: number; normal: number } {
    const b = this.api.bounds;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    let best = Infinity;
    let normal = 0;
    if (dx > 1e-6) { const t = (b.right - x) / dx; if (t < best) { best = t; normal = Math.PI; } }
    if (dx < -1e-6) { const t = (b.left - x) / dx; if (t < best) { best = t; normal = 0; } }
    if (dy > 1e-6) { const t = (b.bottom - y) / dy; if (t < best) { best = t; normal = -Math.PI / 2; } }
    if (dy < -1e-6) { const t = (b.top - y) / dy; if (t < best) { best = t; normal = Math.PI / 2; } }
    if (!Number.isFinite(best)) best = 0;
    best = Math.max(0, best);
    return { x: x + dx * best, y: y + dy * best, normal };
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

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      if (s.invulnOwed && f) f.isInvincible = false;
    }
    this.sides = { player: makeSide(), npc: makeSide() };
    this.excites = [];
    this.warps = [];
    this.flings.clear();
    this.endCine();
    this.vizT = 0;
    for (const f of this.allFighters()) f.astraSlowUntil = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.groundGfx, this.airGfx]) g?.destroy();
    this.groundGfx = this.airGfx = null;
    for (const id of ['astra-trial', 'astra-star', 'astra-recast', 'astra-hold', 'astra-fallen']) {
      this.api.setStatusIndicator(id, null);
    }
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3.3);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isAstra('player') && !this.playerAvatar) this.playerAvatar = new AstraAvatar(scene, this.pcol);
    if (!this.isAstra('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isAstra('npc') && !this.npcAvatar) this.npcAvatar = new AstraAvatar(scene, this.ncol);
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
    s.wasLeft = left;
    if (!this.alive(p) || this.cine) return;

    const qDown = this.api.qKey.isDown;
    const qJust = Phaser.Input.Keyboard.JustDown(this.api.qKey);

    // Q+: holding takes everything — no moving (the speed mult), no attacking, nothing gets in.
    if (this.holding('player')) {
      if (!this.canAct(p, 'other')) { this.dropHold('player'); return; }
      if (!qDown) this.releaseHold('player', mouseX, mouseY);
      return;
    }

    if (left && this.canAct(p, 'click')) p.castAbility(ID.click, this.api.buildPlayerContext(mouseX, mouseY));
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility(ID.e, this.api.buildPlayerContext(mouseX, mouseY));
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      // R+: the window after a smite turns the next press into the second bolt.
      if (this.now < s.recastUntil && this.canAct(p, 'other')) {
        s.recastUntil = 0;
        this.relay('player', 'astra-recast');
        this.smite('player', true);
      } else {
        p.castAbility(ID.r, this.api.buildPlayerContext(mouseX, mouseY));
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility(ID.f, this.api.buildPlayerContext(mouseX, mouseY));

    if (qJust) {
      if (this.starMode('player')) {
        if (!s.slapUsed && this.canAct(p, 'other')) this.slap('player');
      } else if (!this.inTrial('player') && !s.qLocked && this.canAct(p, 'other')
          && p.getCooldownRatio(ID.q) >= 1 && p.lockRemaining(ID.q) <= 0) {
        if (this.up('player', 'q')) this.beginHold('player');
        else p.castAbility(ID.q, this.api.buildPlayerContext(mouseX, mouseY));
      }
    }
  }

  private beginHold(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.holdStart = this.now;
    s.holdStars = 0;
    if (!f.isInvincible && this.simulates(owner)) { f.isInvincible = true; s.invulnOwed = true; }
    this.avatar(owner)?.setHold('charge', -Math.PI / 2);
    this.relay(owner, 'astra-hold');
  }

  private endHoldState(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.holdStart = 0;
    if (s.invulnOwed) { if (f) f.isInvincible = false; s.invulnOwed = false; }
    this.avatar(owner)?.setHold(null);
    this.avatar(owner)?.setTrialStars(0, false);
  }

  private dropHold(owner: Owner): void {
    if (!this.holding(owner)) return;
    this.endHoldState(owner);
    this.side(owner).holdStars = 0;
    this.relay(owner, 'astra-drop');
  }

  /** The player lets Q go: the trial starts at the stars the hold reached. */
  private releaseHold(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const stars = s.holdStars;
    this.endHoldState(owner);
    s.pending = stars;
    // Ahead of the cast, so the opponent's replay begins the same trial.
    this.relay(owner, `astra-stars:${stars}`);
    if (!this.fighter(owner).castAbility(ID.q, this.api.buildPlayerContext(tx, ty))) {
      s.pending = -1;
      this.relay(owner, 'astra-drop');
    }
  }

  private starsFor(heldMs: number): number {
    if (heldMs < HOLD_TAP_MS) return 0;
    return Math.min(MAX_STARS, 1 + Math.floor((heldMs - HOLD_TAP_MS) / HOLD_STAR_MS));
  }

  /**
   * Online: what only the owner's sim decides. Gameplay was settled on their machine; this keeps
   * our picture of them honest — and the swap, the theft and the slap land on *our* body, which
   * only our sim may move or rob.
   */
  replayNet(id: string): void {
    const s = this.sides.npc;
    const parts = id.split(':');
    const head = parts[0];
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    const f = this.api.npc;
    const me = this.api.player;
    this.ensureLayers();
    this.ensureAvatars();
    if (head === 'astra-hold') {
      s.holdStart = this.now;
      s.holdStars = 0;
      this.npcAvatar?.setHold('charge', -Math.PI / 2);
    } else if (head === 'astra-drop') {
      this.endHoldState('npc');
    } else if (head === 'astra-stars') {
      this.endHoldState('npc');
      s.pending = Phaser.Math.Clamp(Math.round(n(1)), 0, MAX_STARS);
    } else if (head === 'astra-recast') {
      if (this.alive(f)) this.smite('npc', true);
    } else if (head === 'astra-fail') {
      this.failTrial('npc');
    } else if (head === 'astra-star') {
      this.passTrial('npc', Phaser.Math.Clamp(Math.round(n(1)), 0, MAX_STARS));
    } else if (head === 'astra-swap') {
      // Their x is seen from the other side of the arena.
      const x = this.api.worldW - n(1);
      const y = n(2);
      if (this.alive(me)) {
        this.nfx.warpSwap(me.x, me.y, x, y);
        this.teleport(me, x, y);
      }
    } else if (head === 'astra-steal') {
      if (this.alive(me) && this.alive(f)) this.robVictim('npc', me, parts[1] ?? 'f');
    } else if (head === 'astra-slap') {
      // An angle mirrors about the vertical axis.
      const ang = Math.PI - (n(1) / 1000);
      if (this.alive(f)) this.slapLanded('npc', me, ang, false);
      if (this.alive(me)) this.fling(me, ang);
    } else if (head === 'astra-win') {
      if (this.alive(f)) this.startCine('npc');
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — Starstruck. Level left or right; at the cursor in star mode. */
  doStarstruck(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.holding(owner) || this.cine) return;
    this.ensureLayers();
    const ang = this.starMode(owner) ? Math.atan2(ty - f.y, tx - f.x) : (tx < f.x ? Math.PI : 0);
    this.side(owner).burst = { left: SHOTS, next: this.now, ang };
    this.avatar(owner)?.play('punch', ang);
  }

  /** E — Solar Flares. Out of Astra; out of the cursor in star mode. */
  doSolarFlares(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.holding(owner) || this.cine) return;
    this.ensureLayers();
    let c = { x: f.x, y: f.y };
    if (this.starMode(owner)) {
      const d = Math.min(STAR_FLARE_REACH, Phaser.Math.Distance.Between(f.x, f.y, tx, ty));
      const a = Math.atan2(ty - f.y, tx - f.x);
      c = this.clampToArena(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d);
    }
    this.avatar(owner)?.play('flex');
    if (owner === 'npc' && !this.api.isOnline) Sfx.playAt('flame-burst', f.x, { rate: 1.2, volume: 0.7 });
    const struck = new Set<Fighter>();
    this.flare(owner, c.x, c.y, PLUS, false, struck);
    this.api.scene.time.delayedCall(FLARE_GAP_MS, () => {
      if (!this.alive(this.fighter(owner))) return;
      this.flare(owner, c.x, c.y, CROSS, true, struck);
    });
    if (this.up(owner, 'e')) {
      this.api.scene.time.delayedCall(FLARE_GAP_MS * 2, () => {
        if (!this.alive(this.fighter(owner))) return;
        this.ringFlare(owner, c.x, c.y, struck);
      });
    }
  }

  /** R — Celestial Smite. */
  doSmite(owner: Owner, tx: number, ty: number): void {
    void tx; void ty;
    const f = this.fighter(owner);
    if (!this.alive(f) || this.holding(owner) || this.cine) return;
    this.ensureLayers();
    this.avatar(owner)?.play('raise', -Math.PI / 2, 420);
    this.smite(owner, false);
    if (this.up(owner, 'r')) this.side(owner).recastUntil = this.now + RECAST_MS;
  }

  /** F — Worm Warp. */
  doWormWarp(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.holding(owner) || this.cine) return;
    this.ensureLayers();
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const x = f.x + Math.cos(ang) * 22;
    const y = f.y + Math.sin(ang) * 22;
    this.warps.push({ owner, x, y, vx: Math.cos(ang) * WARP_SPEED, vy: Math.sin(ang) * WARP_SPEED, travelled: 0, born: this.now });
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).warpLaunch(x, y);
    if (owner === 'npc' && !this.api.isOnline) Sfx.playAt('portal', f.x, { rate: 1.1, volume: 0.7 });
  }

  /** Q — True Self. The trial; or, for a bot with Q+, the hold that picks its difficulty first. */
  doTrueSelf(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.cine) return;
    this.ensureLayers();
    const s = this.side(owner);
    if (this.starMode(owner) || this.inTrial(owner)) return;
    if (owner === 'npc' && this.simulates(owner) && this.up(owner, 'q') && s.pending < 0) {
      s.botStars = Math.random() < 0.5 ? 1 : 2;
      this.beginHold(owner);
      return;
    }
    const stars = s.pending >= 0 ? s.pending : 0;
    s.pending = -1;
    this.beginTrial(owner, stars);
  }

  // ── Resolution ─────────────────────────────────────────────────────────────

  private shoot(owner: Owner, ang: number): void {
    const f = this.fighter(owner);
    const x0 = f.x + Math.cos(ang) * 16;
    const y0 = f.y + Math.sin(ang) * 16;
    const end = this.toWall(x0, y0, ang);
    this.fx(owner).shot(x0, y0, end.x, end.y, SHOT_W);
    if (owner === 'npc' && !this.api.isOnline) Sfx.playAt('beam-fire', f.x, { rate: 1.8, volume: 0.35 });
    if (this.simulates(owner)) {
      for (const t of this.targetsOf(owner)) {
        if (this.segDist(x0, y0, end.x, end.y, t.x, t.y) > SHOT_W / 2 + this.bodyR(t)) continue;
        this.fx(owner).shotHit(t.x, t.y);
        this.hit(owner, t, SHOT_DMG);
      }
    }
    if (this.up(owner, 'click')) this.excite(owner, end.x, end.y, end.normal, 1);
  }

  /** Click+: a section of wall struck by a shot. Shots landing close together pile into one. */
  private excite(owner: Owner, x: number, y: number, normal: number, shots: number): void {
    const near = this.excites.find((e) => e.owner === owner && e.normal === normal
      && Phaser.Math.Distance.Between(e.x, e.y, x, y) < EXCITE_MERGE);
    if (near) { near.shots = Math.min(EXCITE_MAX_SHOTS, near.shots + shots); return; }
    this.excites.push({ owner, x, y, normal, fireAt: this.now + EXCITE_MS, born: this.now, shots, seed: Math.random() * 100 });
  }

  private releaseExcite(e: Excite): void {
    const f = this.fighter(e.owner);
    const x0 = e.x + Math.cos(e.normal) * 4;
    const y0 = e.y + Math.sin(e.normal) * 4;
    const end = this.toWall(x0, y0, e.normal);
    const fx = this.fx(e.owner);
    fx.wallRelease(e.x, e.y);
    fx.wallBeam(x0, y0, end.x, end.y);
    if (this.simulates(e.owner) && this.alive(f)) {
      for (const t of this.targetsOf(e.owner)) {
        if (this.segDist(x0, y0, end.x, end.y, t.x, t.y) > SHOT_W / 2 + this.bodyR(t)) continue;
        fx.shotHit(t.x, t.y);
        this.hit(e.owner, t, SHOT_DMG * e.shots);
      }
    }
    // A wall's beam never excites another wall — except in star mode.
    if (this.starMode(e.owner) && this.up(e.owner, 'click')) this.excite(e.owner, end.x, end.y, end.normal, e.shots);
  }

  private flare(owner: Owner, x: number, y: number, angles: number[], cross: boolean, struck: Set<Fighter>): void {
    const arms = angles.map((a) => ({ a, end: this.toWall(x, y, a) }));
    const reach = Math.max(...arms.map((m) => Phaser.Math.Distance.Between(x, y, m.end.x, m.end.y)));
    this.fx(owner).flare(x, y, angles, reach, FLARE_W, cross);
    this.api.scene.time.delayedCall(FLARE_WINDUP_MS, () => {
      if (!this.simulates(owner) || !this.alive(this.fighter(owner))) return;
      for (const t of this.targetsOf(owner)) {
        const inArm = arms.some((m) => this.segDist(x, y, m.end.x, m.end.y, t.x, t.y) <= FLARE_W / 2 + this.bodyR(t));
        if (!inArm) continue;
        struck.add(t);
        this.hit(owner, t, FLARE_DMG, { aoe: true });
      }
    });
  }

  private ringFlare(owner: Owner, x: number, y: number, struck: Set<Fighter>): void {
    const combo = struck.size > 0;
    this.fx(owner).ringFlare(x, y, RING_R, RING_W, combo);
    this.api.scene.time.delayedCall(RING_WINDUP_MS, () => {
      if (!this.simulates(owner) || !this.alive(this.fighter(owner))) return;
      for (const t of this.targetsOf(owner)) {
        const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
        if (Math.abs(d - RING_R) > RING_W / 2 + this.bodyR(t)) continue;
        const dev = struck.has(t);
        this.hit(owner, t, dev ? RING_DMG_COMBO : RING_DMG, { aoe: true });
        if (dev) this.announce(t.x, t.y - 48, 'COSMIC COMBO', ASTRA.starHot, 13);
      }
    });
  }

  /**
   * Who the bolt picks: whoever stands highest on the screen (lowest for R+'s second bolt), Astra
   * included — or, in star mode, simply the nearest enemy.
   */
  private smiteTarget(owner: Owner, low: boolean): Fighter | null {
    const f = this.fighter(owner);
    if (this.starMode(owner)) return this.nearestTarget(owner);
    const pool = [...this.targetsOf(owner)];
    if (this.alive(f)) pool.push(f);
    let best: Fighter | null = null;
    for (const t of pool) {
      if (!best || (low ? t.y > best.y : t.y < best.y)) best = t;
    }
    return best;
  }

  private smite(owner: Owner, low: boolean): void {
    const t = this.smiteTarget(owner, low);
    if (!t) return;
    const fx = this.fx(owner);
    fx.smiteMark(() => ({ x: t.x, y: t.y }), SMITE_TELL_MS);
    if (owner === 'npc' && !this.api.isOnline) Sfx.playAt('zap', t.x, { rate: 0.7, volume: 0.8 });
    this.api.scene.time.delayedCall(SMITE_TELL_MS, () => {
      if (!t.active) return;
      fx.smiteBolt(t.x, t.y, this.api.bounds.top - 60);
      if (!this.simulates(owner) || t.hp <= 0) return;
      const self = t === this.fighter(owner);
      if (self) {
        // Astra's own bolt: real damage, through the shields like any other hit.
        Fighter.asNonAllyDamage(() => t.takeDamage(SMITE_DMG, { selfInflicted: true }));
        this.announce(t.x, t.y - 48, 'SMITTEN', ASTRA.smite, 12);
      } else {
        this.hit(owner, t, SMITE_DMG);
      }
      if (!t.unstoppable) t.astraSlowUntil = Math.max(t.astraSlowUntil, Date.now() + SMITE_SLOW_MS);
    });
  }

  private landWarp(w: Warp, t: Fighter): void {
    const owner = w.owner;
    const f = this.fighter(owner);
    if (!this.simulates(owner)) { this.fx(owner).warpFizzle(w.x, w.y); return; }
    this.hit(owner, t, WARP_DMG);
    const ax = f.x;
    const ay = f.y;
    const bx = t.x;
    const by = t.y;
    this.fx(owner).warpSwap(ax, ay, bx, by);
    this.teleport(f, bx, by);
    // A replica's body belongs to its own machine: it is told where to go instead.
    if (t.netGhost) this.relay(owner, `astra-swap:${Math.round(ax)}:${Math.round(ay)}`);
    else this.teleport(t, ax, ay);
    // The theft: star mode's, or F+'s.
    const star = this.starMode(owner);
    const fUp = this.up(owner, 'f');
    if (!star && !fUp) return;
    const mode = star ? (fUp ? 'sf' : 's') : 'f';
    // What there is to take, read before it is taken. A replica's bars and charge live on its own
    // machine: every bar counts as full, and the charge as one ultimate's worth.
    const qAbility = f.element.abilities.find((a) => a.id === ID.q);
    const theirCharge = t.netGhost ? (qAbility ? f.ultCost(qAbility) : 300) : t.ultCharge;
    const ready = SLOT_IDS.map((_, i) => {
      const a = t.element.abilities[i];
      return !!a && a.displayKey !== 'Q' && (t.netGhost || t.getCooldownRatio(a.id) >= 1);
    });
    this.robVictim(owner, t, mode);
    if (t.netGhost) this.relay(owner, `astra-steal:${mode}`);
    this.payThief(owner, t, mode, ready, theirCharge);
  }

  /**
   * The victim's half of the theft, on whichever sim owns their body. `s` takes every ability they
   * have ready (and a quarter of their charge), `f` three seconds off everything and 20 charge, and
   * `sf` both, harder, plus their health.
   */
  private robVictim(thief: Owner, v: Fighter, mode: string): void {
    const thiefF = this.fighter(thief);
    this.fx(thief).steal(v.x, v.y, () => ({ x: thiefF.x, y: thiefF.y }), mode === 'f' ? ASTRA.worm : ASTRA.starHot);
    this.announce(v.x, v.y - 50, mode === 'f' ? 'SUPERIORITY' : 'STOLEN', mode === 'f' ? ASTRA.worm : ASTRA.starHot, 12);
    if (v.netGhost) return;
    const abilities = v.element.abilities;
    if (mode === 's' || mode === 'sf') {
      for (let i = 0; i < 4 && i < abilities.length; i++) {
        const a = abilities[i];
        if (a.displayKey === 'Q' || v.getCooldownRatio(a.id) < 1) continue;
        v.lockAbility(a.id, Math.max(1000, a.cooldown * (v.cooldownMult || 1)));
      }
      v.ultCharge = Math.max(0, v.ultCharge * (1 - (mode === 'sf' ? STAR_F_STEAL_ULT : STAR_STEAL_ULT)));
    }
    if (mode === 'f' || mode === 'sf') {
      for (const a of abilities) {
        if (a.displayKey === 'Q') continue;
        if (v.getCooldownRatio(a.id) < 1) v.delayCooldown(a.id, STEAL_CD_MS);
        else v.lockAbility(a.id, STEAL_CD_MS);
      }
      v.ultCharge = Math.max(0, v.ultCharge - STEAL_ULT);
    }
  }

  /** The thief's half: the bars that were full, the charge, and — star mode with F+ — health. */
  private payThief(owner: Owner, v: Fighter, mode: string, ready: boolean[], theirCharge: number): void {
    const f = this.fighter(owner);
    if (mode === 's' || mode === 'sf') {
      ready.forEach((was, i) => { if (was) f.resetCooldown(SLOT_IDS[i]); });
      f.addUltCharge(theirCharge * (mode === 'sf' ? STAR_F_STEAL_ULT : STAR_STEAL_ULT));
    }
    if (mode === 'f' || mode === 'sf') {
      f.reduceCooldowns(STEAL_CD_MS, ID.q);
      f.addUltCharge(STEAL_ULT);
    }
    if (mode === 'sf' && this.alive(v)) {
      this.hit(owner, v, STAR_F_STEAL_HP);
      f.heal(STAR_F_STEAL_HP);
    }
  }

  // ── The trial and the star ─────────────────────────────────────────────────

  private beginTrial(owner: Owner, stars: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.trialUntil = this.now + TRIAL_MS;
    s.trialStars = stars;
    s.stability = STAB_START;
    s.lastSelfHp = f.hp;
    s.lastHp.clear();
    for (const t of this.targetsOf(owner)) s.lastHp.set(t, t.hp);
    this.fx(owner).trialBegin(f.x, f.y);
    this.avatar(owner)?.play('raise');
    this.announce(f.x, f.y - 58, stars > 0 ? `STAR TRIAL ${'★'.repeat(stars)}` : 'STAR TRIAL', ASTRA.starHot, 14);
  }

  private failTrial(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.trialUntil = 0;
    s.qLocked = true;
    if (this.simulates(owner)) {
      f.lockAbility(ID.q, FOREVER_MS);
      this.relay(owner, 'astra-fail');
    }
    if (this.alive(f)) {
      this.fx(owner).trialFail(f.x, f.y);
      this.announce(f.x, f.y - 58, 'THE STAR GUTTERS', ASTRA.stabilityLow, 13);
    }
  }

  private passTrial(owner: Owner, stars: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    s.trialUntil = 0;
    s.starUntil = this.now + STAR_MS + STAR_MS_PER_STAR * stars;
    s.slapUsed = false;
    s.nextAuraTick = this.now + AURA_TICK_MS;
    s.nextSummonBurn = this.now + AURA_SUMMON_MS;
    s.starAnnounced = false;
    if (this.simulates(owner)) this.relay(owner, `astra-star:${stars}`);
    if (this.alive(f)) {
      this.fx(owner).starModeOn(f.x, f.y);
      this.announce(f.x, f.y - 60, 'TRUE SELF', ASTRA.white, 16);
    }
    // Five stars, and the trial beaten: the giant comes for them.
    if (stars >= MAX_STARS && this.simulates(owner) && this.up(owner, 'q')) {
      this.relay(owner, 'astra-win');
      this.startCine(owner);
    }
  }

  // ── The slap ───────────────────────────────────────────────────────────────

  private slap(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const t = this.nearestTarget(owner);
    if (!t || !this.alive(f)) return;
    s.slapUsed = true;
    const ang = Math.atan2(t.y - f.y, t.x - f.x);
    const at = this.clampToArena(t.x - Math.cos(ang) * SLAP_BEHIND, t.y - Math.sin(ang) * SLAP_BEHIND);
    this.fx(owner).warpSwap(f.x, f.y, at.x, at.y);
    this.teleport(f, at.x, at.y);
    this.relay(owner, `astra-slap:${Math.round(ang * 1000)}`);
    this.slapLanded(owner, t, ang, true);
    // A replica is flung on its own machine (the relay above); everything else is flung here.
    if (!t.netGhost) this.fling(t, ang);
  }

  /** The hit itself: impact frames, the palm, the damage and the stun. */
  private slapLanded(owner: Owner, t: Fighter, ang: number, decide: boolean): void {
    const f = this.fighter(owner);
    this.avatar(owner)?.play('sweep', ang, 320);
    const hx = (f.x + t.x) / 2;
    const hy = (f.y + t.y) / 2;
    this.fx(owner).impactFrames(hx, hy, ang, [{ x: f.x, y: f.y }, { x: t.x, y: t.y }]);
    this.fx(owner).slap(t.x, t.y, ang);
    Sfx.playAt('hit-heavy', t.x, { rate: 0.55, volume: 1 });
    this.announce(t.x, t.y - 56, 'SLAPPED', ASTRA.white, 18);
    if (decide && this.simulates(owner)) {
      this.hit(owner, t, SLAP_DMG);
    }
    this.stun(t, SLAP_STUN_MS);
  }

  /** Send a body flying along `ang` until it meets the wall. */
  private fling(t: Fighter, ang: number): void {
    if (t.unstoppable) return;
    this.flings.set(t, { vx: Math.cos(ang) * FLING_SPEED, vy: Math.sin(ang) * FLING_SPEED, until: Date.now() + FLING_MS, ang });
  }

  // ── The finale ─────────────────────────────────────────────────────────────

  private startCine(owner: Owner): void {
    if (this.cine) return;
    const { scene } = this.api;
    const f = this.fighter(owner);
    const victims = this.simulates(owner) ? this.targetsOf(owner) : (this.alive(this.api.player) ? [this.api.player] : []);
    const cam = scene.cameras.main;
    const title = scene.add.text(cam.worldView.centerX, cam.worldView.y + cam.worldView.height * 0.18, 'GODS DO NOT FEAR MORTALS', {
      fontSize: '26px', fontFamily: 'Arial Black', color: this.hex(ASTRA.starHot), stroke: '#07061a', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(40).setAlpha(0);
    this.cine = {
      owner, start: this.now, victims, done: false, title,
      sky: scene.add.graphics().setDepth(2.95),
      giant: scene.add.graphics().setDepth(3.0),
      hand: scene.add.graphics().setDepth(12),
    };
    scene.tweens.add({ targets: title, alpha: 1, duration: 500, yoyo: true, hold: 1600 });
    // Nobody moves while the sky decides.
    for (const b of this.allFighters()) {
      if (!this.alive(b)) continue;
      if (b === f) { b.stunnedUntil = Math.max(b.stunnedUntil, Date.now() + CINE_MS); b.applyDisarm(CINE_MS); continue; }
      this.stun(b, CINE_MS);
    }
    if (!f.isInvincible) {
      f.isInvincible = true;
      scene.time.delayedCall(CINE_MS, () => { if (f.active) f.isInvincible = false; });
    }
    cam.shake(CINE_RISE_MS, 0.004);
    Sfx.playAt('beam-charge', f.x, { rate: 0.5, volume: 1 });
  }

  private updateCine(): void {
    const c = this.cine;
    if (!c) return;
    const el = this.now - c.start;
    const tint = this.col(c.owner);
    const cam = this.api.scene.cameras.main;
    const v = cam.worldView;
    const t = this.vizT;
    const victim = c.victims.find((b) => b.active) ?? null;
    const look = victim ? { x: victim.x, y: victim.y } : { x: v.centerX, y: v.centerY };
    // The sky goes dark and fills with stars.
    const dark = Phaser.Math.Clamp(el / 500, 0, 1) * (el > CINE_MS - 500 ? Phaser.Math.Clamp((CINE_MS - el) / 500, 0, 1) : 1);
    c.sky.clear();
    c.sky.fillStyle(tint(ASTRA.void), 0.82 * dark);
    c.sky.fillRect(v.x - 100, v.y - 100, v.width + 200, v.height + 200);
    for (let i = 0; i < 60; i++) {
      const sx = v.x + ((i * 157.3) % v.width);
      const sy = v.y + ((i * 91.7) % v.height);
      c.sky.fillStyle(tint(ASTRA.farStar), dark * (0.3 + 0.6 * Math.abs(Math.sin(t * 1.5 + i))));
      c.sky.fillCircle(sx, sy, 1 + (i % 3) * 0.6);
    }
    // The giant rises behind the arena.
    const R = Math.min(v.width, v.height) * 0.42;
    const rise = Phaser.Math.Easing.Cubic.Out(Phaser.Math.Clamp(el / CINE_RISE_MS, 0, 1));
    const gx = v.centerX;
    const gy = v.bottom + R * 0.6 - rise * (R * 1.25);
    c.giant.clear();
    drawGiant(c.giant, tint, gx, gy, R, t, dark, look);
    // The hand comes down for them, closes, and crushes.
    c.hand.clear();
    if (victim && el > CINE_RISE_MS * 0.8) {
      const reach = Phaser.Math.Easing.Cubic.InOut(Phaser.Math.Clamp((el - CINE_RISE_MS * 0.8) / (CINE_REACH_MS - CINE_RISE_MS * 0.8), 0, 1));
      const startX = gx + R * 0.9;
      const startY = gy - R * 0.2;
      const hx = startX + (victim.x - startX) * reach;
      const hy = startY + (victim.y - startY) * reach;
      const close = Phaser.Math.Clamp((el - CINE_REACH_MS) / (CINE_GRAB_MS - CINE_REACH_MS), 0, 1);
      // The arm: a thick band of night from the giant's shoulder to the wrist.
      c.hand.lineStyle(R * 0.22, tint(ASTRA.shellDark), dark);
      c.hand.lineBetween(startX, startY, hx + 30, hy + 50);
      c.hand.lineStyle(R * 0.08, tint(ASTRA.shell), dark * 0.8);
      c.hand.lineBetween(startX, startY, hx + 30, hy + 50);
      const lift = el > CINE_GRAB_MS ? Math.min(1, (el - CINE_GRAB_MS) / 300) * 24 : 0;
      drawGiantHand(c.hand, tint, hx, hy - lift, 46, close, t, dark);
      if (el > CINE_GRAB_MS && !victim.netGhost && this.simulates(c.owner)) {
        (victim.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
      }
    }
    if (!c.done && el >= CINE_CRUSH_MS) {
      c.done = true;
      cam.flash(260, 255, 250, 220);
      cam.shake(500, 0.03);
      for (const b of c.victims) {
        if (!this.alive(b)) continue;
        this.fx(c.owner).slap(b.x, b.y, -Math.PI / 2);
        if (this.simulates(c.owner)) {
          this.hit(c.owner, b, b.hp + b.maxHp + 9999, { trueDamage: true, pierce: true });
        }
      }
    }
    if (el >= CINE_MS) this.endCine();
  }

  private endCine(): void {
    const c = this.cine;
    if (!c) return;
    for (const g of [c.sky, c.giant, c.hand]) g.destroy();
    c.title.destroy();
    this.cine = null;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isAstra('player');
    const npcIs = this.isAstra('npc');
    const anyState = this.excites.length || this.warps.length || this.flings.size || this.cine || this.playerAvatar;
    if (!playerIs && !npcIs && !anyState) return;
    this.ensureLayers();
    this.ensureAvatars();
    const dt = delta / 1000;
    this.vizT += dt;

    this.updateSides(dt);
    this.updateBot();
    this.updateExcites();
    this.updateWarps(dt);
    this.updateFlings();
    this.updateCine();
    this.paint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  private updateSides(dt: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isAstra(owner) || !this.alive(f)) {
        if (s.holdStart) this.endHoldState(owner);
        s.burst = null;
        continue;
      }
      // The burst: four shots, one every 70ms, all along the line it was cast on.
      const b = s.burst;
      if (b && this.now >= b.next) {
        b.left -= 1;
        b.next += SHOT_GAP_MS;
        this.shoot(owner, b.ang);
        if (b.left <= 0) s.burst = null;
      }
      // The Q+ hold counts its stars.
      if (s.holdStart) {
        const stars = this.starsFor(this.now - s.holdStart);
        if (stars !== s.holdStars) {
          s.holdStars = stars;
          if (stars > 0) this.fx(owner).trialBegin(f.x, f.y - 46);
        }
        (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
      }
      if (this.inTrial(owner)) this.updateTrial(owner, dt);
      if (this.starMode(owner)) this.updateStar(owner);
      else if (s.starUntil > 0) {
        s.starUntil = 0;
        if (this.alive(f)) this.announce(f.x, f.y - 52, 'THE STAR SETS', ASTRA.violetLit, 12);
      }
    }
  }

  private updateTrial(owner: Owner, dt: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.simulates(owner)) {
      // The replica's result arrives over the wire; until then it simply counts down.
      if (this.now >= s.trialUntil + 1500) s.trialUntil = 0;
      return;
    }
    let dealt = 0;
    for (const t of this.targetsOf(owner)) {
      const last = s.lastHp.get(t);
      if (last !== undefined && t.hp < last) dealt += last - t.hp;
      s.lastHp.set(t, t.hp);
    }
    const taken = s.lastSelfHp >= 0 && f.hp < s.lastSelfHp ? s.lastSelfHp - f.hp : 0;
    s.lastSelfHp = f.hp;
    const stars = s.trialStars;
    s.stability += dealt * STAB_GAIN;
    s.stability -= taken * STAB_LOSS * (1 + STAB_LOSS_PER_STAR * stars);
    s.stability -= (STAB_DECAY + STAB_DECAY_PER_STAR * stars) * dt;
    s.stability = Math.min(STAB_MAX, s.stability);
    if (s.stability <= 0) { this.failTrial(owner); return; }
    if (this.now >= s.trialUntil) this.passTrial(owner, stars);
  }

  /** The corona: burns shots out of the air, scorches bodies and summons in reach. */
  private updateStar(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.simulates(owner)) return;
    const mine = owner === 'player';
    for (const obj of this.api.projectiles.getChildren()) {
      const p = obj as Projectile;
      if (!p.active || p.isHeal || p.isFromPlayer === mine) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) > AURA_R) continue;
      this.fx(owner).burn(p.x, p.y);
      p.destroy();
    }
    for (const rp of this.api.projectileRegistry.within(this.other(owner), f.x, f.y, AURA_R)) {
      this.fx(owner).burn(rp.getX(), rp.getY());
      this.api.projectileRegistry.steal(rp);
    }
    if (this.now >= s.nextAuraTick) {
      s.nextAuraTick = this.now + AURA_TICK_MS;
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > AURA_R + this.bodyR(t)) continue;
        this.fx(owner).scorch(t.x, t.y);
        this.hit(owner, t, AURA_DMG);
      }
    }
    if (this.now >= s.nextSummonBurn) {
      s.nextSummonBurn = this.now + AURA_SUMMON_MS;
      this.api.purgeSummons(f.x, f.y, AURA_SUMMON_R, owner);
    }
  }

  /** The bot's kit-fired synergies: R+'s second bolt, the slap, and letting go of its Q+ hold. */
  private updateBot(): void {
    const owner: Owner = 'npc';
    if (!this.isAstra(owner) || !this.simulates(owner)) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || this.cine) return;
    if (s.holdStart) {
      if (!this.canAct(f, 'other')) { this.dropHold(owner); return; }
      if (s.holdStars >= s.botStars) {
        const stars = s.holdStars;
        this.endHoldState(owner);
        this.beginTrial(owner, stars);
      }
      return;
    }
    if (this.now < s.recastUntil && this.npcAstraRecastSafe() && this.canAct(f, 'other')) {
      s.recastUntil = 0;
      this.smite(owner, true);
    }
    if (this.starMode(owner) && !s.slapUsed && this.canAct(f, 'other')) {
      const left = s.starUntil - this.now;
      const t = this.nearestTarget(owner);
      // Saved for when it finishes them, or before the star sets.
      if (t && (t.hp <= SLAP_DMG + 10 || left < 3000)) this.slap(owner);
    }
  }

  private updateExcites(): void {
    const keep: Excite[] = [];
    for (const e of this.excites) {
      if (this.now >= e.fireAt) { this.releaseExcite(e); continue; }
      keep.push(e);
    }
    this.excites = keep;
  }

  private updateWarps(dt: number): void {
    const b = this.api.bounds;
    const keep: Warp[] = [];
    for (const w of this.warps) {
      const step = WARP_SPEED * dt;
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      w.travelled += step;
      let gone = w.travelled > WARP_RANGE || !Phaser.Geom.Rectangle.Contains(b, w.x, w.y) || !this.alive(this.fighter(w.owner));
      if (!gone) {
        for (const t of this.targetsOf(w.owner)) {
          if (Phaser.Math.Distance.Between(w.x, w.y, t.x, t.y) > WARP_R + this.bodyR(t)) continue;
          this.landWarp(w, t);
          gone = true;
          break;
        }
        if (gone) continue;
      } else {
        this.fx(w.owner).warpFizzle(w.x, w.y);
        continue;
      }
      keep.push(w);
    }
    this.warps = keep;
  }

  /** Slapped bodies flying to the wall — on every body this sim moves. */
  private updateFlings(): void {
    const b = this.api.bounds;
    const wall = Date.now();
    for (const [f, fl] of this.flings) {
      if (!f.active || f.netGhost || wall >= fl.until) { this.flings.delete(f); continue; }
      const body = f.body as Phaser.Physics.Arcade.Body | null;
      const r = this.bodyR(f);
      const atWall = f.x <= b.left + r + 3 || f.x >= b.right - r - 3 || f.y <= b.top + r + 3 || f.y >= b.bottom - r - 3;
      // Give it a frame or two to leave the wall it might already be standing against.
      if (atWall && wall > fl.until - FLING_MS + 60) {
        this.flings.delete(f);
        const hit = this.toWall(f.x, f.y, fl.ang);
        this.pfx.wallCrash(hit.x, hit.y, hit.normal);
        body?.setVelocity(0, 0);
        continue;
      }
      body?.setVelocity(fl.vx, fl.vy);
    }
  }

  // ── Paint ──────────────────────────────────────────────────────────────────

  private paint(): void {
    const ground = this.groundGfx!;
    const air = this.airGfx!;
    ground.clear();
    air.clear();
    const t = this.vizT;
    for (const e of this.excites) {
      const k = Phaser.Math.Clamp((this.now - e.born) / EXCITE_MS, 0, 1);
      wallExcite(ground, this.col(e.owner), e.x, e.y, e.normal, k, t, e.seed);
    }
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.isAstra(owner) || !this.alive(f)) continue;
      const s = this.side(owner);
      if (this.starMode(owner)) starAura(ground, this.col(owner), f.x, f.y, AURA_R, t, f.alpha);
      if (this.inTrial(owner)) {
        const left = Phaser.Math.Clamp((s.trialUntil - this.now) / TRIAL_MS, 0, 1);
        // A replica's stability is decided on its own machine — we show the clock alone, at full.
        const stab = this.simulates(owner) ? s.stability / STAB_MAX : 1;
        stabilityBar(air, this.col(owner), f.x, f.y - 29, stab, left, f.alpha, t);
      }
    }
    for (const w of this.warps) wormOrb(air, this.col(w.owner), w.x, w.y, WARP_R, t + w.born * 0.001, 1);
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      if (owner === 'npc') {
        const t = this.nearestTarget('npc') ?? this.api.player;
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }
      av.setFacing(Math.atan2(s.aimY - f.y, s.aimX - f.x));
      const trialK = this.inTrial(owner) ? 0.45 + 0.55 * (1 - Phaser.Math.Clamp((s.trialUntil - this.now) / TRIAL_MS, 0, 1)) : 0;
      av.setBrightness(this.holding(owner) ? 0.3 + 0.14 * s.holdStars : trialK);
      av.setStarMode(this.starMode(owner));
      av.setTrialStars(this.holding(owner) ? s.holdStars : 0, this.holding(owner));
      if (this.holding(owner)) av.setHold('charge', -Math.PI / 2);
      av.setMastered(false);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const set = this.api.setStatusIndicator.bind(this.api);
    set('astra-trial', playerIs && this.inTrial('player') ? {
      name: 'Star Trial', emoji: '🌟', color: ASTRA.stability, priority: 150,
      description: `Keep stability above zero until the trial ends. Dealing damage raises it; taking damage and time drain it.${s.trialStars > 0 ? ` ${s.trialStars}-star trial: it drains faster and hits cost more.` : ''}`,
      count: Math.max(0, Math.round(s.stability)),
      until: s.trialUntil,
    } : null);
    set('astra-star', playerIs && this.starMode('player') ? {
      name: 'Star Mode', emoji: '☀️', color: ASTRA.starHot, priority: 149,
      description: s.slapUsed
        ? 'Every attack goes where you aim. Your corona burns up nearby shots and hurts enemies and their summons.'
        : 'Every attack goes where you aim. Your corona burns up nearby shots and hurts enemies and their summons. Q: teleport and slap.',
      until: s.starUntil,
    } : null);
    set('astra-recast', playerIs && this.now < s.recastUntil ? {
      name: 'Never Strikes Twice', emoji: '🌩️', color: ASTRA.smite, priority: 151,
      description: 'Press R again to strike whoever is lowest on the screen.',
      until: s.recastUntil,
    } : null);
    set('astra-hold', playerIs && this.holding('player') ? {
      name: 'Gods Do Not Fear Mortals', emoji: '⭐', color: ASTRA.starHot, priority: 152,
      description: 'Invincible, but you cannot move or attack. Every star makes the trial harder and the star mode longer. Five stars, beaten, wins the match.',
      count: s.holdStars,
    } : null);
    set('astra-fallen', playerIs && s.qLocked ? {
      name: 'Fallen Star', emoji: '🌑', color: ASTRA.shellLit, priority: 153,
      description: 'You failed the Star Trial. True Self is gone for the rest of the match.',
    } : null);
  }

  // ── Arena readers ──────────────────────────────────────────────────────────

  /** Rooted while holding Q+, and while the giant decides. */
  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    if (!this.isAstra(owner)) return 1;
    return this.holding(owner) || this.cine ? 0 : 1;
  }

  /** The ability cards: Q shows the trial's clock, the slap ready in star mode, nothing once fallen. */
  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: Owner): string | null {
    const s = this.side(owner);
    if (this.inTrial(owner)) {
      s.stability = Math.max(1, s.stability - STAB_MAX * 0.3);
      return '−30 STABILITY';
    }
    if (this.starMode(owner)) {
      // A third of what is left of the star goes.
      s.starUntil -= (s.starUntil - this.now) / 3;
      return '−STAR TIME';
    }
    return null;
  }

  getBarRatio(abilityId: string): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === ID.q) {
      if (s.qLocked) return 0;
      if (this.inTrial('player')) return 1 - Phaser.Math.Clamp((s.trialUntil - this.now) / TRIAL_MS, 0, 1);
      if (this.starMode('player')) return s.slapUsed ? 0 : 1;
    }
    if (abilityId === ID.r && this.now < s.recastUntil) return 1;
    return p.getCooldownRatio(abilityId);
  }

  // ── Readers for the bot (side-effect-free) ─────────────────────────────────

  /** Holding Q+ or watching the finale — the kit has the bot's hands. */
  npcAstraBusy(): boolean { return this.holding('npc') || !!this.cine; }

  /**
   * Where to stand: on the target's row (the click only flies level), a touch below it so the smite
   * picks them and not the bot, at range — closer during the trial, where only damage keeps it alive.
   * Nothing in star mode, where every attack aims itself.
   */
  astraSeekPoint(): { x: number; y: number } | null {
    const f = this.api.npc;
    if (!this.isAstra('npc') || !this.alive(f) || this.starMode('npc')) return null;
    const t = this.nearestTarget('npc');
    if (!t) return null;
    const dist = this.inTrial('npc') ? NPC_TRIAL_DIST : NPC_LANE_DIST;
    const sideX = f.x < t.x ? -1 : 1;
    const p = this.clampToArena(t.x + sideX * dist, t.y + 14, 40);
    if (Phaser.Math.Distance.Between(f.x, f.y, p.x, p.y) < 18) return null;
    return p;
  }

  /** The click would land: the target is on the bot's row, or the bot is the star. */
  npcAstraLanedUp(): boolean {
    const f = this.api.npc;
    const t = this.nearestTarget('npc');
    if (!t || !this.alive(f)) return false;
    return this.starMode('npc') || Math.abs(t.y - f.y) <= NPC_LANE_TOL;
  }

  /** The smite would strike the target, not the bot: the target is the highest body on the screen. */
  npcAstraSmiteSafe(): boolean {
    const t = this.smiteTarget('npc', false);
    return !!t && t !== this.api.npc;
  }

  /** R+'s second bolt would strike the target: the target is the lowest body on the screen. */
  npcAstraRecastSafe(): boolean {
    const t = this.smiteTarget('npc', true);
    return !!t && t !== this.api.npc;
  }

  /**
   * The flares would land: the target is slowed by a smite (it cannot step out of the arms in
   * time), or already standing on an arm of the plus or the X — and, with E+, on the ring too.
   */
  npcAstraFlareShot(): boolean {
    const f = this.api.npc;
    const t = this.nearestTarget('npc');
    if (!t || !this.alive(f)) return false;
    if (this.starMode('npc')) return Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < STAR_FLARE_REACH;
    const slowed = t.astraSlowUntil > Date.now() || t.stunnedUntil > Date.now();
    const dx = Math.abs(t.x - f.x);
    const dy = Math.abs(t.y - f.y);
    const tol = FLARE_W / 2 + this.bodyR(t) - 6;
    const onArm = dx < tol || dy < tol || Math.abs(dx - dy) < tol * 1.2;
    const d = Math.hypot(dx, dy);
    if (slowed && this.up('npc', 'e')) return Math.abs(d - RING_R) < 60 || onArm;
    return onArm || (slowed && d < 300);
  }

  /**
   * Worm Warp is worth firing: in star mode when it would steal two or more ready abilities; with
   * F+ any time; and otherwise to fix the smite — swapping with a target below the bot puts the
   * bot underneath them.
   */
  npcAstraWarpShot(): boolean {
    const f = this.api.npc;
    const t = this.nearestTarget('npc');
    if (!t || !this.alive(f)) return false;
    if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > WARP_RANGE * 0.85) return false;
    if (this.starMode('npc')) {
      const ready = t.element.abilities.filter((a) => a.displayKey !== 'Q' && t.getCooldownRatio(a.id) >= 1).length;
      return ready >= 2;
    }
    if (this.up('npc', 'f')) return true;
    return t.y > f.y && f.getCooldownRatio(ID.r) >= 1;
  }

  /** True Self now: close enough to keep the trial fed, healthy enough to survive it. */
  npcAstraTrialReady(): boolean {
    const f = this.api.npc;
    const s = this.sides.npc;
    const t = this.nearestTarget('npc');
    if (!t || !this.alive(f) || s.qLocked || this.inTrial('npc') || this.starMode('npc')) return false;
    return Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < 380 && f.hp > f.maxHp * 0.45;
  }

  /** In the trial: everything is spent on damage. */
  npcAstraInTrial(): boolean { return this.inTrial('npc'); }
}
