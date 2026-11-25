import Phaser from 'phaser';
import { Fighter, DamageOpts } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import { Sfx } from '../../audio';
import {
  PRESSURE, PressureAvatar, PressureColorFn, PressureFx, groundedCrater, painLockMark, painOrb, pressureBar, ventJet,
} from './PressureVisuals';

type Owner = 'player' | 'npc';
type Slot = 'click' | 'e' | 'r' | 'f';

const BOTH: Owner[] = ['player', 'npc'];

const SLOT_ID: Record<Slot, string> = {
  click: 'pressure-punch',
  e: 'pressure-slam',
  r: 'pressure-point',
  f: 'pressure-release',
};

// ── Pressure ─────────────────────────────────────────────────────────────────
/** 0 → 100 in six seconds of holding. */
const CHARGE_PER_SEC = 100 / 6;
const MAX_PRESSURE = 100;
/** Q+ Overcharge: during Exceed every gauge runs on to this. */
const OVERCHARGE_MAX = 125;
/** Release banks three times slower than the others charge. */
const RELEASE_RATE = 1 / 3;
/** While a full 100 is banked in Release, every other key charges this much faster. */
const BANKED_FULL_BONUS = 0.2;
/** A press of F shorter than this is a tap — it vents — rather than a hold that banks. */
const TAP_MS = 220;
/** How slow the robot walks while holding each key. */
const CHARGE_SLOW: Record<Slot, number> = { click: 0.55, e: 0.7, r: 0.7, f: 0.85 };

// ── Click: Pressure Punch ────────────────────────────────────────────────────
const PUNCH_BASE = 8;
const PUNCH_PER_P = 0.32;
const PUNCH_FULL_BONUS = 10;
const PUNCH_REACH = 64;
const PUNCH_HALF = (60 * Math.PI) / 180;
const PUNCH_SLOW_MULT = 0.6;
const PUNCH_SLOW_MS = 1500;
const PUNCH_STUN_MS = 1200;
const LUNGE_BASE = 90;
const LUNGE_PER_P = 0.8;
const LUNGE_MS = 140;
// Click+ Pressure-gear.
const GEAR_PER_SEC = 5;

// ── E: Seismic Slam ──────────────────────────────────────────────────────────
const SLAM_BASE = 10;
const SLAM_PER_P = 0.3;
const SLAM_R = 110;
const SLAM_R_50 = 160;
const GROUND_MS = 3000;
// E+ Shell-Shock.
const SHELL_MIN_P = 30;
const SHELL_STUN_MS = 5000;
/** Victim side: a grounding mirrored back within this long of being knocked loose is stale. */
const GROUND_REMIRROR_GUARD_MS = 1200;

// ── R: Pressure Point ────────────────────────────────────────────────────────
const ORB_BASE = 6;
const ORB_PER_P = 0.14;
const ORB_SPEED = 85;
const ORB_SPEED_100 = 150;
const ORB_R = 14;
const ORB_R_100 = 22;
const ORB_LIFE_MS = 5500;
const LOCK_BASE_MS = 3000;
const LOCK_PER_P_MS = 70;
const LOCK_STUN_MS = 300;
const LOCK_STUN_50_MS = 500;
const LOCK_COST = 5;
const LOCK_COST_100 = 8;
/** A husk never casts, so a PainLocked one is jolted on its attack rhythm instead. */
const HUSK_JOLT_MS = 2000;
// R+ Compression Charge.
const COMPRESS_ARM_MS = 600;
const COMPRESS_BASE_MS = 12000;
const COMPRESS_PER_P_MS = 60;
const COMPRESS_COST = 5;
const COMPRESS_COST_PER_P = 0.03;
const COMPRESS_BONUS = 0.15;
const COMPRESS_BONUS_PER_P = 0.0015;
const HURT_BOOST_MS = 1000;

// ── F: Release ───────────────────────────────────────────────────────────────
const VENT_LEN = 230;
const VENT_LEN_100 = 260;
const VENT_W = 70;
const VENT_BASE_MS = 1500;
const VENT_PER_P_MS = 25;
const VENT_DPS = 4;
const VENT_DPS_PER_P = 0.08;
const VENT_TICK_MS = 250;
const VENT_SLOW_MULT = 0.85;
const VENT_BLAST = 30;
const VENT_BLAST_PER_OVER = 1.2;
const VENT_BLAST_STUN_MS = 1000;
// F+ Depressurize.
const DEPRESS_MIN = 75;
const DEPRESS_DMG_MULT = 1.2;
const DEPRESS_STEAM_R = 60;
const DEPRESS_STEAM_DMG = 6;
const DEPRESS_SLOW_MULT = 0.75;
const DEPRESS_SLOW_MS = 1500;

// ── Q: Exceed ────────────────────────────────────────────────────────────────
const EXCEED_MS = 15000;
const EXCEED_RATE = 2;
const EXCEED_CRASH_MS = 3000;

// ── Bot ──────────────────────────────────────────────────────────────────────
/** How long past its planned pressure a bot will keep holding for the target to come into reach. */
const NPC_HOLD_GRACE_MS = 2500;
const NPC_EXCEED_RANGE = 320;

// ── Types ────────────────────────────────────────────────────────────────────

interface Lunge {
  vx: number;
  vy: number;
  until: number;
  ang: number;
  p: number;
}

interface Orb {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  p: number;
  born: number;
}

interface Vent {
  owner: Owner;
  ang: number;
  len: number;
  width: number;
  p: number;
  start: number;
  until: number;
  nextTick: number;
}

interface Pin {
  x: number;
  y: number;
  hp: number;
  seed: number;
}

interface Side {
  aimX: number;
  aimY: number;
  /** The key being held, and the pressure it has built. Release banks into `store` instead. */
  charging: Slot | null;
  charge: number;
  chargeStart: number;
  /** What the next cast resolves at: the player's release, or a relayed one. -1 when none. */
  pending: number;
  /** Release's banked pressure — kept between holds. */
  store: number;
  /** Click+ Pressure-gear's wound-up punch. */
  gear: number;
  /** Scene time Exceed ends (0 = off), and whether its crash is still owed. */
  exceedUntil: number;
  crashOwed: boolean;
  /** R+ Compression Charge: scene time it ends, its per-cast cost and charge bonus. */
  compressUntil: number;
  compressCost: number;
  compressBonus: number;
  hurtBoostUntil: number;
  lastHp: number;
  lunge: Lunge | null;
  /** Player input edges. */
  wasLeft: boolean;
  wasE: boolean;
  wasR: boolean;
  wasF: boolean;
  fDownAt: number;
  /** Bot: the pressure it means to let go at, and when it gives up waiting for reach. */
  plan: number;
  planDeadline: number;
  /** The fighter instance whose `cast` event this side listens to. */
  hooked: Fighter | null;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, charging: null, charge: 0, chargeStart: 0, pending: -1, store: 0, gear: 0,
    exceedUntil: 0, crashOwed: false, compressUntil: 0, compressCost: 0, compressBonus: 0,
    hurtBoostUntil: 0, lastHp: -1, lunge: null, wasLeft: false, wasE: false, wasR: false, wasF: false,
    fDownAt: 0, plan: 0, planDeadline: 0, hooked: null,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface PressureArenaApi {
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
  /** The arena's walls — a pain orb that leaves them is gone. */
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  isTargetable(f: Fighter): boolean;
  pressureColor(owner: Owner, base: number): number;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
  /** The player's shop upgrade, or the opponent's (online handshake / Hard+ bot loadout). */
  hasUpgrade(owner: Owner, slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

// ── PressureKit ──────────────────────────────────────────────────────────────

/**
 * Pressure — the boiler-robot with the giant gauntlet.
 *
 * Every key is held to build pressure (0–100 over six seconds; 125 under Q+ Overcharge) and let
 * go to spend it, so the cast happens on the release: the kit owns the hold and the player's
 * `castAbility` only fires when the key comes up, carrying the level in `pending`. A bot has no
 * keys to let go of — its `castAbility` *starts* a hold and the kit lets go when the planned
 * pressure is reached and the target is in reach.
 *
 * - **Pressure Punch** — a cone in front of the gauntlet. 50+ lunges and slows, 100 stuns.
 * - **Seismic Slam** — a ring round the robot. 50+ is wider, 100 drives everyone into the floor
 *   (`pressureGroundedUntil`): pinned, still able to attack, knocked loose by any hit.
 * - **Pressure Point** — a slow pain orb that PainLocks (`painLockUntil` on Fighter, which bites in
 *   the victim's own cast stamp). R+ lets it hit its maker for a charge-rate buff.
 * - **Release** — banks pressure three times slower, keeps it, and vents on a tap: a steam jet
 *   that disarms and (50+) slows, with a stunning blast at 100. A full bank speeds every other key.
 * - **Exceed** — every gauge charges twice as fast for 15 seconds, then a 3 second seizure.
 *
 * Online, the owner's sim decides everything; the level rides ahead of each cast as
 * `pressure-lvl:<n>`, and holds, banks and compressions are relayed as visuals.
 */
export class PressureKit {
  private api: PressureArenaApi;

  private readonly pcol: PressureColorFn;
  private readonly ncol: PressureColorFn;
  private readonly pfx: PressureFx;
  private readonly nfx: PressureFx;
  private playerAvatar: PressureAvatar | null = null;
  private npcAvatar: PressureAvatar | null = null;
  /** Craters and vents, on the floor under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** PainLock rings on bodies, over their sprites. */
  private veilGfx: Phaser.GameObjects.Graphics | null = null;
  /** Orbs and pressure bars — over everything that walks. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private orbs: Orb[] = [];
  private vents: Vent[] = [];
  /** Bodies driven into the floor, wherever they were driven in. */
  private pins = new Map<Fighter, Pin>();
  /** Victim side: when a body was last knocked loose, so a stale mirror cannot re-pin it. */
  private loosedAt = new Map<Fighter, number>();
  /** Last PainLock jolt drawn per body. */
  private joltSeen = new Map<Fighter, number>();
  /** Husks under PainLock: when each is next jolted. */
  private huskJoltAt = new Map<Fighter, number>();

  constructor(api: PressureArenaApi) {
    this.api = api;
    this.pcol = (base) => api.pressureColor('player', base);
    this.ncol = (base) => api.pressureColor('npc', base);
    this.pfx = new PressureFx(api.scene, this.pcol);
    this.nfx = new PressureFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): PressureFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): PressureColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): PressureAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }

  private isPressure(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'pressure' : this.api.npcElementId === 'pressure';
  }

  /** An online opponent's body (or a co-op ally's): drawn here, simulated on their own machine. */
  private isReplica(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline;
  }

  private targetsOf(owner: Owner): Fighter[] {
    // In an Invasion the npc slot is on the player's side; a co-op ally's attacks resolve on its
    // own machine. Here they must touch nobody.
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private allFighters(): Fighter[] {
    const out: Fighter[] = [];
    for (const f of [this.api.player, this.api.npc, ...this.api.enemies]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  }

  /** A shop upgrade, on a side that is actually playing Pressure. */
  private up(owner: Owner, slot: string): boolean {
    return this.isPressure(owner) && this.api.hasUpgrade(owner, slot);
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline) this.api.broadcast(id);
  }

  private exceeding(owner: Owner): boolean { return this.now < this.side(owner).exceedUntil; }

  /** The most pressure a gauge may hold right now. */
  private maxCharge(owner: Owner): number {
    return this.exceeding(owner) && this.up(owner, 'q') ? OVERCHARGE_MAX : MAX_PRESSURE;
  }

  /** Pressure per second for a key, with every multiplier the kit has. */
  private rate(owner: Owner, slot: Slot): number {
    const s = this.side(owner);
    let r = CHARGE_PER_SEC;
    if (this.exceeding(owner)) r *= EXCEED_RATE;
    if (slot !== 'f' && s.store >= MAX_PRESSURE) r *= 1 + BANKED_FULL_BONUS;
    if (this.now < s.compressUntil) r *= 1 + s.compressBonus;
    if (this.now < s.hurtBoostUntil) r *= 2;
    if (slot === 'f') r *= RELEASE_RATE;
    return r;
  }

  /** Can this body start or finish a cast at all? */
  private canAct(f: Fighter, slot: Slot | 'q'): boolean {
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

  // ── Control effects ────────────────────────────────────────────────────────

  /**
   * A hard stun: a cast lock and the generic `stunnedUntil` (both mirrored online), the scene-clock
   * stun the bot's and a husk's movement read, and a hold on the body in `updateHolds`.
   */
  private stun(f: Fighter, ms: number): void {
    if (f.unstoppable || ms <= 0) return;
    f.applyDisarm(ms);
    f.stunnedUntil = Math.max(f.stunnedUntil, Date.now() + ms);
    if (f !== this.api.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  private slow(f: Fighter, mult: number, ms: number): void {
    if (f.unstoppable) return;
    const wall = Date.now();
    f.pressureSlowFactor = wall < f.pressureSlowUntil ? Math.min(f.pressureSlowFactor, mult) : mult;
    f.pressureSlowUntil = Math.max(f.pressureSlowUntil, wall + ms);
  }

  private ground(owner: Owner, f: Fighter, ms: number): void {
    if (f.unstoppable) return;
    f.pressureGroundedUntil = Math.max(f.pressureGroundedUntil, Date.now() + ms);
    this.loosedAt.delete(f);
    this.pins.set(f, { x: f.x, y: f.y, hp: f.hp, seed: Math.random() * 6 });
    this.fx(owner).groundImpact(f.x, f.y);
  }

  private loosen(f: Fighter): void {
    if (f.pressureGroundedUntil <= 0) return;
    f.pressureGroundedUntil = 0;
    this.pins.delete(f);
    this.loosedAt.set(f, Date.now());
    if (f.active) this.pfx.groundBreak(f.x, f.y);
  }

  /**
   * Every Pressure hit goes through here. E+ Shell-Shock turns a hard-enough hit on a grounded
   * body into a long stun; F+ Depressurize adds damage and a puff of steam while Release is banked.
   */
  private hit(owner: Owner, t: Fighter, dmg: number, p: number, opts?: DamageOpts): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const depress = this.up(owner, 'f') && s.store >= DEPRESS_MIN;
    const wasGrounded = t.pressureGroundedUntil > Date.now();
    const amount = Math.round(dmg * (depress ? DEPRESS_DMG_MULT : 1));
    t.takeDamage(amount, { source: f, sourceX: f.x, sourceY: f.y, ...opts });
    if (wasGrounded) {
      this.loosen(t);
      if (this.up(owner, 'e') && p >= SHELL_MIN_P) {
        this.stun(t, SHELL_STUN_MS);
        this.announce(t.x, t.y - 46, 'SHELL-SHOCKED', PRESSURE.amberLit, 12);
      }
    }
    if (depress) {
      this.fx(owner).steamBurst(t.x, t.y, DEPRESS_STEAM_R);
      for (const o of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(o.x, o.y, t.x, t.y) > DEPRESS_STEAM_R + this.bodyR(o)) continue;
        o.takeDamage(DEPRESS_STEAM_DMG, { source: f, sourceX: t.x, sourceY: t.y });
        this.slow(o, DEPRESS_SLOW_MULT, DEPRESS_SLOW_MS);
      }
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide(), npc: makeSide() };
    this.orbs = [];
    this.vents = [];
    this.pins.clear();
    this.loosedAt.clear();
    this.joltSeen.clear();
    this.huskJoltAt.clear();
    this.vizT = 0;
    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    for (const f of this.allFighters()) {
      f.painLockUntil = 0;
      f.painLockDamage = 0;
      f.painLockStunMs = 0;
      f.pressureSlowUntil = 0;
      f.pressureSlowFactor = 1;
      f.pressureGroundedUntil = 0;
    }
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.groundGfx, this.veilGfx, this.airGfx]) g?.destroy();
    this.groundGfx = this.veilGfx = this.airGfx = null;
    for (const id of ['pressure-charge', 'pressure-bank', 'pressure-exceed', 'pressure-compress', 'pressure-gear']) {
      this.api.setStatusIndicator(id, null);
    }
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3.2);
    if (!this.veilGfx) this.veilGfx = scene.add.graphics().setDepth(5.6);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isPressure('player') && !this.playerAvatar) this.playerAvatar = new PressureAvatar(scene, this.pcol);
    if (!this.isPressure('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isPressure('npc') && !this.npcAvatar) this.npcAvatar = new PressureAvatar(scene, this.ncol);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'pressure') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const left = pointer.leftButtonDown();
    const eDown = this.api.eKey.isDown;
    const rDown = this.api.rKey.isDown;
    const fDown = this.api.fKey.isDown;
    const edges = {
      click: { down: left && !s.wasLeft, up: !left && s.wasLeft },
      e: { down: eDown && !s.wasE, up: !eDown && s.wasE },
      r: { down: rDown && !s.wasR, up: !rDown && s.wasR },
    };
    const fPressed = fDown && !s.wasF;
    const fReleased = !fDown && s.wasF;
    s.wasLeft = left;
    s.wasE = eDown;
    s.wasR = rDown;
    s.wasF = fDown;
    if (!this.alive(p)) { this.dropCharge('player'); return; }

    // A stun, a disarm or the Exceed crash empties whatever was being held.
    if (s.charging && !this.canAct(p, s.charging)) this.dropCharge('player');

    // Let go of the held key: spend it.
    if (s.charging && s.charging !== 'f' && edges[s.charging].up) {
      this.releaseHeld('player', mouseX, mouseY);
    }
    // Start a hold.
    if (!s.charging) {
      for (const slot of ['click', 'e', 'r'] as const) {
        if (!edges[slot].down) continue;
        if (!this.canAct(p, slot) || p.getCooldownRatio(SLOT_ID[slot]) < 1) continue;
        this.startCharge('player', slot);
        break;
      }
    }

    // Release: a hold banks, a tap vents.
    if (fPressed) {
      s.fDownAt = this.now;
      if (!s.charging && this.canAct(p, 'f')) this.startCharge('player', 'f');
    }
    if (fReleased) {
      const tapped = this.now - s.fDownAt < TAP_MS;
      if (s.charging === 'f') {
        s.charging = null;
        this.relay('player', `pressure-bank:${Math.round(s.store)}`);
        this.relay('player', 'pressure-drop');
      }
      if (tapped && s.store >= 1 && this.canAct(p, 'f') && p.getCooldownRatio(SLOT_ID.f) >= 1) {
        s.pending = s.store;
        this.relay('player', `pressure-lvl:${Math.round(s.pending)}`);
        if (!p.castAbility(SLOT_ID.f, this.api.buildPlayerContext(mouseX, mouseY))) s.pending = -1;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      p.castAbility('pressure-exceed', this.api.buildPlayerContext(mouseX, mouseY));
    }
  }

  private startCharge(owner: Owner, slot: Slot): void {
    const s = this.side(owner);
    s.charging = slot;
    s.chargeStart = this.now;
    s.charge = 0;
    // Click+ Pressure-gear: the punch starts wherever the gear has wound it to, and spends it.
    if (slot === 'click' && this.up(owner, 'click')) {
      s.charge = s.gear;
      s.gear = 0;
    }
    this.avatar(owner)?.setHold(slot === 'click' ? 'brace' : 'charge', Math.atan2(s.aimY - this.fighter(owner).y, s.aimX - this.fighter(owner).x));
    this.relay(owner, `pressure-hold:${slot}`);
  }

  private dropCharge(owner: Owner): void {
    const s = this.side(owner);
    if (!s.charging) return;
    s.charging = null;
    s.charge = 0;
    this.avatar(owner)?.setHold(null);
    this.relay(owner, 'pressure-drop');
  }

  /** The player lets go of a held key (not Release): the cast goes off at the pressure built. */
  private releaseHeld(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const slot = s.charging;
    if (!slot || slot === 'f') return;
    const level = s.charge;
    s.charging = null;
    s.charge = 0;
    this.avatar(owner)?.setHold(null);
    s.pending = level;
    // Ahead of the cast, so the opponent's replay resolves at the same pressure as ours.
    this.relay(owner, `pressure-lvl:${Math.round(level)}`);
    const p = this.fighter(owner);
    if (!p.castAbility(SLOT_ID[slot], this.api.buildPlayerContext(tx, ty))) {
      s.pending = -1;
      this.relay(owner, 'pressure-drop');
    }
  }

  /** The level a cast resolves at: the player's/relayed pending level, or the bot's live charge. */
  private takePending(owner: Owner): number {
    const s = this.side(owner);
    const v = s.pending >= 0 ? s.pending : 0;
    s.pending = -1;
    return v;
  }

  /**
   * Online: the opponent's holds, banks and compressions, and the pressure the next cast goes off at.
   * Gameplay was decided on their machine; this keeps our picture of them honest.
   */
  replayNet(id: string): void {
    const s = this.sides.npc;
    const [head, arg] = id.split(':');
    const n = Number(arg);
    if (head === 'pressure-lvl') {
      s.pending = Number.isFinite(n) ? n : 0;
      s.charging = null;
      s.charge = 0;
      this.npcAvatar?.setHold(null);
    } else if (head === 'pressure-hold') {
      const slot = arg as Slot;
      if (slot in SLOT_ID) {
        s.charging = slot;
        s.chargeStart = this.now;
        s.charge = 0;
        this.npcAvatar?.setHold(slot === 'click' ? 'brace' : 'charge');
      }
    } else if (head === 'pressure-drop') {
      s.charging = null;
      s.charge = 0;
      this.npcAvatar?.setHold(null);
    } else if (head === 'pressure-bank') {
      s.store = Number.isFinite(n) ? n : 0;
    } else if (head === 'pressure-comp') {
      const f = this.api.npc;
      s.compressUntil = this.now + COMPRESS_BASE_MS + COMPRESS_PER_P_MS * n;
      if (this.alive(f)) this.nfx.compress(f.x, f.y);
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * A bot's `castAbility` starts a hold instead of resolving one: it plans the pressure it wants
   * and the kit lets go in `updateBotHolds`. Returns true when that is what happened.
   */
  private botBegins(owner: Owner, slot: Slot, tx: number, ty: number): boolean {
    if (owner !== 'npc' || this.isReplica(owner)) return false;
    const s = this.side(owner);
    if (s.pending >= 0) return false;
    s.aimX = tx;
    s.aimY = ty;
    this.startCharge(owner, slot);
    s.plan = this.botPlan(slot);
    const toPlan = Math.max(0, s.plan - s.charge) / Math.max(1, this.rate(owner, slot));
    s.planDeadline = this.now + toPlan * 1000 + NPC_HOLD_GRACE_MS;
    return true;
  }

  /** Click — Pressure Punch. */
  doPunch(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    if (this.botBegins(owner, 'click', tx, ty)) return;
    this.resolvePunch(owner, this.takePending(owner), tx, ty);
  }

  /** E — Seismic Slam. */
  doSlam(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    if (this.botBegins(owner, 'e', tx, ty)) return;
    this.resolveSlam(owner, this.takePending(owner));
  }

  /** R — Pressure Point. */
  doPoint(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    if (this.botBegins(owner, 'r', tx, ty)) return;
    this.resolvePoint(owner, this.takePending(owner), tx, ty);
  }

  /** F — Release. Vents whatever is banked; the bot banks in the background (`updateBotBank`). */
  doRelease(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    let level: number;
    if (owner === 'npc' && !this.isReplica(owner)) {
      level = s.store;
    } else {
      level = this.takePending(owner);
    }
    s.store = 0;
    if (level < 1) return;
    this.resolveRelease(owner, level, tx, ty);
  }

  /** Q — Exceed. */
  doExceed(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const s = this.side(owner);
    s.exceedUntil = this.now + EXCEED_MS;
    s.crashOwed = true;
    this.fx(owner).exceedOn(f.x, f.y);
    this.avatar(owner)?.play('raise');
    this.announce(f.x, f.y - 56, 'EXCEED', PRESSURE.hot, 14);
  }

  // ── Resolution ─────────────────────────────────────────────────────────────

  private resolvePunch(owner: Owner, p: number, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.avatar(owner)?.setHold(null);
    this.avatar(owner)?.punch(ang);
    const s = this.side(owner);
    if (p >= 50) {
      const dist = LUNGE_BASE + (Math.min(p, OVERCHARGE_MAX) - 50) * LUNGE_PER_P;
      const v = dist / (LUNGE_MS / 1000);
      // A replica's body is moved by the network; only the owner's sim drives the lunge.
      if (!this.isReplica(owner)) s.lunge = { vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, until: this.now + LUNGE_MS, ang, p };
      this.fx(owner).lungeBurst(f.x, f.y, ang);
      this.api.scene.time.delayedCall(LUNGE_MS, () => {
        s.lunge = null;
        if (this.alive(f)) this.landPunch(owner, p, ang);
      });
    } else {
      this.landPunch(owner, p, ang);
    }
  }

  private landPunch(owner: Owner, p: number, ang: number): void {
    const f = this.fighter(owner);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > PUNCH_REACH + this.bodyR(t) + 10) continue;
      const da = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang));
      if (d > this.bodyR(t) + 6 && da > PUNCH_HALF) continue;
      if (d < bestD) { bestD = d; best = t; }
    }
    if (owner === 'npc' && !this.isReplica(owner)) Sfx.playAt('hit-heavy', f.x, { rate: 0.75, volume: 0.7 });
    if (!best) {
      this.fx(owner).punchWhiff(f.x, f.y, ang, PUNCH_REACH);
      return;
    }
    const t = best;
    const dmg = PUNCH_BASE + PUNCH_PER_P * p + (p >= MAX_PRESSURE ? PUNCH_FULL_BONUS : 0);
    this.fx(owner).punchHit(t.x - Math.cos(ang) * this.bodyR(t) * 0.6, t.y - Math.sin(ang) * this.bodyR(t) * 0.6, ang, p);
    this.hit(owner, t, dmg, p);
    if (p >= MAX_PRESSURE) {
      this.stun(t, PUNCH_STUN_MS * (p / MAX_PRESSURE));
      this.api.scene.cameras.main.shake(160, 0.005);
    } else if (p >= 50) {
      this.slow(t, PUNCH_SLOW_MULT, PUNCH_SLOW_MS);
    }
  }

  private resolveSlam(owner: Owner, p: number): void {
    const f = this.fighter(owner);
    const over = Math.max(0, p - MAX_PRESSURE);
    const R = (p >= 50 ? SLAM_R_50 : SLAM_R) * (1 + over / 250);
    this.avatar(owner)?.setHold(null);
    this.avatar(owner)?.play('slam', Math.PI / 2);
    this.fx(owner).slam(f.x, f.y + 6, R, p);
    if (owner === 'npc' && !this.isReplica(owner)) Sfx.playAt('stone-slam', f.x, { rate: 0.95, volume: 0.85 });
    const dmg = SLAM_BASE + SLAM_PER_P * p;
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > R + this.bodyR(t)) continue;
      this.hit(owner, t, dmg, p, { aoe: true });
      if (p >= MAX_PRESSURE && this.alive(t)) this.ground(owner, t, GROUND_MS * (p / MAX_PRESSURE));
    }
  }

  private resolvePoint(owner: Owner, p: number, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const full = p >= MAX_PRESSURE;
    const speed = full ? ORB_SPEED_100 + (p - MAX_PRESSURE) * 1.5 : ORB_SPEED;
    const r = full ? ORB_R_100 + (p - MAX_PRESSURE) * 0.12 : ORB_R + p * 0.03;
    const x = f.x + Math.cos(ang) * 26;
    const y = f.y + Math.sin(ang) * 26;
    this.orbs.push({ owner, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r, p, born: this.now });
    this.avatar(owner)?.setHold(null);
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).orbLaunch(x, y);
    if (owner === 'npc' && !this.isReplica(owner)) Sfx.playAt('curse-cast', f.x, { rate: 0.75, volume: 0.8 });
  }

  private resolveRelease(owner: Owner, p: number, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const full = p >= MAX_PRESSURE;
    this.vents = this.vents.filter((v) => v.owner !== owner);
    this.vents.push({
      owner, ang, p,
      len: full ? VENT_LEN_100 : VENT_LEN,
      width: VENT_W,
      start: this.now,
      until: this.now + VENT_BASE_MS + VENT_PER_P_MS * p,
      nextTick: this.now,
    });
    this.avatar(owner)?.setHold('spray', ang);
    if (owner === 'npc' && !this.isReplica(owner)) Sfx.playAt('sizzle', f.x, { rate: 1, volume: 0.7 });
    this.relay(owner, 'pressure-bank:0');
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isPressure('player');
    const npcIs = this.isPressure('npc');
    const anyState = this.orbs.length || this.vents.length || this.pins.size || this.playerAvatar;
    if (!playerIs && !npcIs && !anyState) return;
    this.ensureLayers();
    this.ensureAvatars();
    const dt = delta / 1000;
    this.vizT += dt;

    this.updateSides(dt);
    this.updateBotBank(dt);
    this.updateBotHolds();
    this.updateOrbs(dt);
    this.updateVents();
    this.updateGrounded();
    this.updateHuskPain();
    this.updateHolds();
    this.paint();
    this.updateAvatars(delta);
    this.pushStatuses(playerIs);
  }

  /** Charging, the gear, Exceed's clock and crash, Compression's hurt boost, the cast hook, lunges. */
  private updateSides(dt: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isPressure(owner) || !this.alive(f)) {
        s.charging = null;
        s.lunge = null;
        continue;
      }
      // The cast stamp is where Compression Charge costs health — hooked once per body.
      if (s.hooked !== f) {
        s.hooked = f;
        f.on('cast', () => this.onOwnCast(owner, f));
      }
      const max = this.maxCharge(owner);
      if (s.charging === 'f') {
        s.store = Math.min(max, s.store + this.rate(owner, 'f') * dt);
      } else if (s.charging) {
        s.charge = Math.min(max, s.charge + this.rate(owner, s.charging) * dt);
      }
      if (this.up(owner, 'click') && s.charging !== 'click') {
        s.gear = Math.min(MAX_PRESSURE, s.gear + GEAR_PER_SEC * dt);
      }
      // A gauge overcharged under Exceed settles back to 100 once it ends.
      if (!this.exceeding(owner)) {
        if (s.charge > MAX_PRESSURE && s.charging !== null && s.charging !== 'f') s.charge = MAX_PRESSURE;
      }
      // Exceed runs out: the boiler seizes.
      if (s.crashOwed && this.now >= s.exceedUntil) {
        s.crashOwed = false;
        this.fx(owner).exceedCrash(f.x, f.y);
        if (!this.isReplica(owner)) {
          this.dropCharge(owner);
          this.stun(f, EXCEED_CRASH_MS);
          this.announce(f.x, f.y - 56, 'OVERHEATED', PRESSURE.steelLit, 13);
        }
      }
      // R+ Compression Charge: twice as fast for a second after any damage.
      if (s.lastHp >= 0 && f.hp < s.lastHp && this.now < s.compressUntil) s.hurtBoostUntil = this.now + HURT_BOOST_MS;
      s.lastHp = f.hp;
      if (s.lunge) {
        const body = f.body as Phaser.Physics.Arcade.Body | null;
        if (this.now < s.lunge.until && body) body.setVelocity(s.lunge.vx, s.lunge.vy);
      }
    }
  }

  /** Compression Charge: every ability you use costs you. Owner's sim only. */
  private onOwnCast(owner: Owner, f: Fighter): void {
    const s = this.side(owner);
    if (this.isReplica(owner) || this.fighter(owner) !== f || this.now >= s.compressUntil) return;
    if (!this.alive(f)) return;
    Fighter.asNonAllyDamage(() => f.takeDamage(s.compressCost, { selfInflicted: true }));
    this.fx(owner).painJolt(f.x, f.y);
  }

  /** The bot banks Release in the background whenever its hands are free. */
  private updateBotBank(dt: number): void {
    const owner: Owner = 'npc';
    if (!this.isPressure(owner) || this.isReplica(owner)) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.charging || !this.canAct(f, 'f')) return;
    s.store = Math.min(MAX_PRESSURE, s.store + this.rate(owner, 'f') * dt);
  }

  /** A bot lets go once it has the pressure it planned and the target is where it lands. */
  private updateBotHolds(): void {
    const owner: Owner = 'npc';
    if (!this.isPressure(owner) || this.isReplica(owner)) return;
    const s = this.side(owner);
    const f = this.fighter(owner);
    const slot = s.charging;
    if (!slot || slot === 'f') return;
    if (!this.alive(f) || !this.canAct(f, slot)) { this.dropCharge(owner); return; }
    const t = this.targetsOf(owner)[0];
    if (t) { s.aimX = t.x; s.aimY = t.y; }
    const ready = s.charge >= Math.min(s.plan, this.maxCharge(owner)) - 0.01;
    const maxed = s.charge >= this.maxCharge(owner) - 0.01;
    const timedOut = this.now >= s.planDeadline;
    if (!ready && !maxed && !timedOut) return;
    if (!timedOut && !this.inReach(owner, slot, s.charge)) return;
    const level = s.charge;
    s.charging = null;
    s.charge = 0;
    if (slot === 'click') this.resolvePunch(owner, level, s.aimX, s.aimY);
    else if (slot === 'e') this.resolveSlam(owner, level);
    else this.resolvePoint(owner, level, s.aimX, s.aimY);
  }

  /** Would this key, let go at `p` now, land on the bot's target? */
  private inReach(owner: Owner, slot: Slot, p: number): boolean {
    const f = this.fighter(owner);
    const t = this.targetsOf(owner)[0];
    if (!t) return false;
    const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
    if (slot === 'click') {
      const lunge = p >= 50 ? LUNGE_BASE + (Math.min(p, OVERCHARGE_MAX) - 50) * LUNGE_PER_P : 0;
      return d <= PUNCH_REACH + this.bodyR(t) + lunge * 0.85;
    }
    if (slot === 'e') return d <= (p >= 50 ? SLAM_R_50 : SLAM_R) + this.bodyR(t) - 10;
    return d <= 520;
  }

  /** The pressure a bot means to let a key go at. The synergies decide it. */
  private botPlan(slot: Slot): number {
    const owner: Owner = 'npc';
    const max = this.maxCharge(owner);
    const t = this.targetsOf(owner)[0];
    const rate = this.rate(owner, slot);
    const pinnedMs = t ? this.pinnedLeftMs(t) : 0;
    if (slot === 'click') {
      // A body held in place can be wound up on: as much as the hold leaves time for.
      if (pinnedMs > 0) {
        // E+: a quick 30+ on a grounded body turns three seconds into five more of stun.
        if (t && t.pressureGroundedUntil > Date.now() && this.up(owner, 'e')) return SHELL_MIN_P + 5;
        const reachable = (pinnedMs / 1000 - 0.3) * rate;
        return Phaser.Math.Clamp(reachable, 50, max);
      }
      if (this.exceeding(owner)) return max;
      return Math.random() < 0.35 ? MAX_PRESSURE : 55 + Math.random() * 15;
    }
    if (slot === 'e') return this.exceeding(owner) || Math.random() < 0.55 ? Math.min(max, MAX_PRESSURE) : 55;
    return this.exceeding(owner) || Math.random() < 0.4 ? MAX_PRESSURE : 50 + Math.random() * 20;
  }

  /** How much longer this body is held still by Pressure's own control (stun or the floor). */
  private pinnedLeftMs(t: Fighter): number {
    const wall = Date.now();
    return Math.max(0, t.pressureGroundedUntil - wall, t.stunnedUntil - wall);
  }

  private updateOrbs(dt: number): void {
    const b = this.api.bounds;
    const keep: Orb[] = [];
    for (const o of this.orbs) {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      const age = this.now - o.born;
      let gone = age > ORB_LIFE_MS || !Phaser.Geom.Rectangle.Contains(b, o.x, o.y);
      if (!gone) {
        for (const t of this.targetsOf(o.owner)) {
          if (Phaser.Math.Distance.Between(o.x, o.y, t.x, t.y) > o.r + this.bodyR(t)) continue;
          this.orbHit(o, t);
          gone = true;
          break;
        }
      }
      // R+ Compression Charge: the maker can walk into its own orb.
      if (!gone && age > COMPRESS_ARM_MS && !this.isReplica(o.owner) && this.up(o.owner, 'r')) {
        const f = this.fighter(o.owner);
        if (this.alive(f) && Phaser.Math.Distance.Between(o.x, o.y, f.x, f.y) <= o.r + this.bodyR(f)) {
          this.compress(o.owner, o.p);
          gone = true;
        }
      }
      if (!gone) keep.push(o);
    }
    this.orbs = keep;
  }

  private orbHit(o: Orb, t: Fighter): void {
    const p = o.p;
    this.fx(o.owner).orbHit(t.x, t.y);
    this.hit(o.owner, t, ORB_BASE + ORB_PER_P * p, p);
    const wall = Date.now();
    const lockMs = LOCK_BASE_MS + LOCK_PER_P_MS * p;
    const live = wall < t.painLockUntil;
    t.painLockUntil = Math.max(t.painLockUntil, wall + lockMs);
    const cost = p >= MAX_PRESSURE ? LOCK_COST_100 + Math.round((p - MAX_PRESSURE) * 0.08) : LOCK_COST;
    const stunMs = p >= 50 ? LOCK_STUN_50_MS : LOCK_STUN_MS;
    t.painLockDamage = live ? Math.max(t.painLockDamage, cost) : cost;
    t.painLockStunMs = live ? Math.max(t.painLockStunMs, stunMs) : stunMs;
    this.announce(t.x, t.y - 48, 'PAINLOCK', PRESSURE.pain, 12);
  }

  private compress(owner: Owner, p: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.compressUntil = this.now + COMPRESS_BASE_MS + COMPRESS_PER_P_MS * p;
    s.compressCost = Math.round(COMPRESS_COST + COMPRESS_COST_PER_P * p);
    s.compressBonus = COMPRESS_BONUS + COMPRESS_BONUS_PER_P * p;
    this.fx(owner).compress(f.x, f.y);
    this.announce(f.x, f.y - 52, `COMPRESSED +${Math.round(s.compressBonus * 100)}%`, PRESSURE.amber, 12);
    this.relay(owner, `pressure-comp:${Math.round(p)}`);
  }

  private ventOrigin(v: Vent): { x: number; y: number } {
    const f = this.fighter(v.owner);
    return { x: f.x + Math.cos(v.ang) * 18, y: f.y + Math.sin(v.ang) * 18 };
  }

  private inVent(v: Vent, t: Fighter, pad = 0): boolean {
    const o = this.ventOrigin(v);
    const ex = o.x + Math.cos(v.ang) * v.len;
    const ey = o.y + Math.sin(v.ang) * v.len;
    // The jet widens from the nozzle: half-width grows along it.
    const dx = t.x - o.x;
    const dy = t.y - o.y;
    const along = dx * Math.cos(v.ang) + dy * Math.sin(v.ang);
    if (along < -this.bodyR(t) || along > v.len + this.bodyR(t) + pad) return false;
    const half = 10 + (v.width / 2) * Phaser.Math.Clamp(along / v.len, 0, 1) + pad;
    return this.segDist(o.x, o.y, ex, ey, t.x, t.y) <= half + this.bodyR(t);
  }

  private updateVents(): void {
    const keep: Vent[] = [];
    for (const v of this.vents) {
      const f = this.fighter(v.owner);
      if (!this.alive(f)) continue;
      const done = this.now >= v.until;
      if (!done) {
        const wall = Date.now();
        const inside = this.targetsOf(v.owner).filter((t) => this.inVent(v, t));
        for (const t of inside) {
          // Cannot attack, can still move. A husk (anything outside the duel slots) has no cast
          // lock, so it is set dancing — the husk AI's "keep coming, every attack off" state.
          t.applyDisarm(VENT_TICK_MS + 60);
          if (t !== this.api.player && t !== this.api.npc) t.soundDanceUntil = Math.max(t.soundDanceUntil, wall + VENT_TICK_MS + 60);
          if (v.p >= 50) this.slow(t, VENT_SLOW_MULT, 400);
        }
        if (this.now >= v.nextTick) {
          v.nextTick += VENT_TICK_MS;
          const dmg = (VENT_DPS + VENT_DPS_PER_P * v.p) * (VENT_TICK_MS / 1000);
          for (const t of inside) this.hit(v.owner, t, Math.max(1, dmg), v.p);
        }
        keep.push(v);
        continue;
      }
      // The jet runs out. At 100 it goes out with a bang.
      this.avatar(v.owner)?.setHold(null);
      if (v.p >= MAX_PRESSURE) {
        const o = this.ventOrigin(v);
        this.fx(v.owner).ventBlast(o.x, o.y, v.ang, v.len, v.width);
        const dmg = VENT_BLAST + Math.max(0, v.p - MAX_PRESSURE) * VENT_BLAST_PER_OVER;
        for (const t of this.targetsOf(v.owner)) {
          if (!this.inVent(v, t, 30)) continue;
          this.hit(v.owner, t, dmg, v.p, { aoe: true });
          this.stun(t, VENT_BLAST_STUN_MS);
        }
      }
    }
    this.vents = keep;
  }

  /**
   * Bodies in the floor: pinned where they went in, knocked loose by any damage. Grounding that
   * arrives over the wire (our own body, mirrored from the attacker's sim) is pinned here too.
   */
  private updateGrounded(): void {
    const wall = Date.now();
    for (const f of this.allFighters()) {
      if (!f.active) { this.pins.delete(f); continue; }
      if (f.pressureGroundedUntil <= wall) {
        if (this.pins.has(f)) this.pins.delete(f);
        continue;
      }
      // A stale mirror re-raising a grounding we already broke out of.
      const loosed = this.loosedAt.get(f);
      if (loosed && wall - loosed < GROUND_REMIRROR_GUARD_MS) { f.pressureGroundedUntil = 0; continue; }
      let pin = this.pins.get(f);
      if (!pin) {
        pin = { x: f.x, y: f.y, hp: f.hp, seed: Math.random() * 6 };
        this.pins.set(f, pin);
      }
      if (f.hp < pin.hp) { this.loosen(f); continue; }
      pin.hp = Math.max(pin.hp, f.hp);
      if (f.unstoppable) { this.loosen(f); continue; }
      // A ghost's position belongs to the network.
      if (!f.netGhost) {
        const body = f.body as Phaser.Physics.Arcade.Body | null;
        if (body) body.reset(pin.x, pin.y);
      }
    }
  }

  /**
   * PainLock bites in a body's own cast stamp, and a husk never casts — so a PainLocked husk (any
   * enemy outside the two duel slots) is jolted every couple of seconds instead, about as often as
   * it would attack. Its replica on a co-op guest's machine is left to the host.
   */
  private updateHuskPain(): void {
    const wall = Date.now();
    for (const f of this.api.enemies) {
      if (f === this.api.player || f === this.api.npc) continue;
      if (!this.alive(f) || f.netGhost || wall >= f.painLockUntil) { this.huskJoltAt.delete(f); continue; }
      const at = this.huskJoltAt.get(f);
      if (at === undefined) { this.huskJoltAt.set(f, this.now + HUSK_JOLT_MS); continue; }
      if (this.now < at) continue;
      this.huskJoltAt.set(f, this.now + HUSK_JOLT_MS);
      if (f.painLockDamage > 0) f.takeDamage(f.painLockDamage);
      this.stun(f, f.painLockStunMs);
      f.painLockFiredAt = wall;
    }
  }

  /** Stunned bodies this sim moves stand still — the player's own included, which nothing else holds. */
  private updateHolds(): void {
    const wall = Date.now();
    for (const f of this.allFighters()) {
      if (!f.active || f.netGhost || f.unstoppable || wall >= f.stunnedUntil) continue;
      (f.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    }
  }

  // ── Paint ──────────────────────────────────────────────────────────────────

  private paint(): void {
    const ground = this.groundGfx!;
    const veil = this.veilGfx!;
    const air = this.airGfx!;
    ground.clear();
    veil.clear();
    air.clear();
    const t = this.vizT;
    const wall = Date.now();
    // Craters under grounded bodies.
    for (const [f, pin] of this.pins) {
      if (!f.active) continue;
      const left = f.pressureGroundedUntil - wall;
      groundedCrater(ground, this.pcol, pin.x, pin.y, pin.seed, Phaser.Math.Clamp(left / 400, 0, 1));
    }
    // Vents.
    for (const v of this.vents) {
      const o = this.ventOrigin(v);
      const fade = Phaser.Math.Clamp((v.until - this.now) / 250, 0, 1) * Phaser.Math.Clamp((this.now - v.start) / 120, 0, 1);
      ventJet(veil, this.col(v.owner), o.x, o.y, v.ang, v.len, v.width, t, fade, v.p >= MAX_PRESSURE);
    }
    // PainLock on bodies, and its jolts.
    for (const f of this.allFighters()) {
      if (!f.active) continue;
      if (wall < f.painLockUntil) painLockMark(veil, this.pcol, f.x, f.y, t + f.x * 0.01, 0.9);
      if (f.painLockFiredAt > 0 && this.joltSeen.get(f) !== f.painLockFiredAt) {
        this.joltSeen.set(f, f.painLockFiredAt);
        if (wall - f.painLockFiredAt < 500) {
          this.pfx.painJolt(f.x, f.y);
          this.announce(f.x, f.y - 44, `PAIN -${f.painLockDamage}`, PRESSURE.pain, 11);
        }
      }
    }
    // Orbs.
    for (const o of this.orbs) painOrb(air, this.col(o.owner), o.x, o.y, o.r, t + o.born * 0.001, 1);
    // Pressure bars under each Pressure body.
    for (const owner of BOTH) {
      if (!this.isPressure(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const s = this.side(owner);
      const live = s.charging === 'f' ? s.store : s.charging ? s.charge : 0;
      const show = s.charging !== null || s.store > 0 || (owner === 'player' && s.gear > 0);
      if (!show) continue;
      const max = this.maxCharge(owner);
      pressureBar(air, this.col(owner), f.x, f.y + 30, live, max, s.charging === 'f' ? 0 : s.store, s.charging ? 1 : 0.55, t);
    }
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      if (owner === 'npc' && !s.charging) {
        const t = this.targetsOf('npc')[0] ?? this.api.player;
        if (t) { s.aimX = t.x; s.aimY = t.y; }
      }
      const facing = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      av.setFacing(facing);
      if (s.charging) av.setHold(s.charging === 'click' ? 'brace' : 'charge', facing);
      av.setCharge(s.charging === 'f' ? s.store : s.charge);
      av.setExceed(this.exceeding(owner));
      av.setMastered(false);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const s = this.sides.player;
    const set = this.api.setStatusIndicator.bind(this.api);
    const live = s.charging === 'f' ? s.store : s.charge;
    set('pressure-charge', playerIs && s.charging ? {
      name: 'Pressure', emoji: '🔩', color: PRESSURE.amber, priority: 150,
      description: s.charging === 'f'
        ? 'Banking Release. Let go to keep it; tap F to vent it.'
        : 'Building pressure. Let go to spend it — 50 and 100 each add something.',
      count: Math.round(live),
    } : null);
    set('pressure-bank', playerIs && s.store >= 1 && s.charging !== 'f' ? {
      name: 'Release banked', emoji: '♨️', color: PRESSURE.steam, priority: 151,
      description: s.store >= MAX_PRESSURE
        ? 'A full bank: every other key charges 20% faster. Tap F to vent it.'
        : 'Pressure banked in Release. Tap F to vent it.',
      count: Math.round(s.store),
    } : null);
    set('pressure-exceed', playerIs && this.exceeding('player') ? {
      name: 'Exceed', emoji: '🔥', color: PRESSURE.hot, priority: 149,
      description: 'Every ability charges twice as fast. When it runs out you are stunned for 3 seconds.',
      until: s.exceedUntil,
    } : null);
    set('pressure-compress', playerIs && this.now < s.compressUntil ? {
      name: 'Compressed', emoji: '🔴', color: PRESSURE.pain, priority: 152,
      description: `Every ability you use costs ${s.compressCost} health. Everything charges ${Math.round(s.compressBonus * 100)}% faster — twice as fast for a second after you take damage.`,
      until: s.compressUntil,
    } : null);
    set('pressure-gear', playerIs && this.up('player', 'click') && s.charging !== 'click' ? {
      name: 'Pressure-gear', emoji: '⚙️', color: PRESSURE.brassLit, priority: 153,
      description: 'Your next Pressure Punch starts from what the gear has wound.',
      count: Math.round(s.gear),
    } : null);
  }

  // ── Arena readers ──────────────────────────────────────────────────────────

  /** Walking speed while holding a key, and stood still while a lunge carries you. */
  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: Owner): string | null {
    const s = this.side(owner);
    if (s.store <= 0 && s.gear <= 0) return null;
    s.store = Math.floor(s.store * 0.5);
    s.gear = Math.floor(s.gear * 0.5);
    return '−50% BANKED';
  }

  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    if (!this.isPressure(owner)) return 1;
    const s = this.side(owner);
    return s.charging ? CHARGE_SLOW[s.charging] : 1;
  }

  /** The ability cards: a held key shows its gauge, the click its gear, Release its bank. */
  getBarRatio(abilityId: string): number {
    const p = this.api.player;
    const s = this.sides.player;
    const cd = p.getCooldownRatio(abilityId);
    if (cd < 1) return cd;
    if (s.charging && s.charging !== 'f' && SLOT_ID[s.charging] === abilityId) return Math.min(1, s.charge / MAX_PRESSURE);
    if (abilityId === SLOT_ID.f) return Math.min(1, s.store / MAX_PRESSURE);
    if (abilityId === SLOT_ID.click && this.up('player', 'click')) return Math.min(1, s.gear / MAX_PRESSURE);
    return cd;
  }

  // ── Readers for the bot (side-effect-free) ─────────────────────────────────

  /** The bot is holding a key: its hands are full until the kit lets go. */
  npcCharging(): boolean { return this.sides.npc.charging !== null && this.sides.npc.charging !== 'f'; }

  /** The bot's target is held in place by its own control — time to wind up on it. */
  npcTargetPinned(): boolean {
    const t = this.targetsOf('npc')[0];
    return !!t && this.pinnedLeftMs(t) > 900;
  }

  /**
   * Release is worth venting: enough banked, the target in the jet, and no reason to keep the bank
   * (a full one speeds every key; F+ turns 75+ into damage) — unless it is a finisher or a peel.
   */
  npcVentShot(): boolean {
    const s = this.sides.npc;
    const f = this.api.npc;
    const t = this.targetsOf('npc')[0];
    if (!t || !this.alive(f) || s.store < 50) return false;
    const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
    if (d > (s.store >= MAX_PRESSURE ? VENT_LEN_100 : VENT_LEN) * 0.85) return false;
    const finisher = t.hp < t.maxHp * 0.3;
    const peel = f.hp < f.maxHp * 0.35 && d < 150;
    const keep = s.store >= MAX_PRESSURE || (this.up('npc', 'f') && s.store >= DEPRESS_MIN);
    return !keep || finisher || peel || this.npcTargetPinned();
  }

  /** R+: the bot's own orb, worth walking into while it has health to spend on it. */
  npcCompressPoint(): { x: number; y: number } | null {
    if (!this.up('npc', 'r')) return null;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f) || this.now < s.compressUntil || f.hp < f.maxHp * 0.5 || s.charging) return null;
    let best: Orb | null = null;
    let bestD = 260;
    for (const o of this.orbs) {
      if (o.owner !== 'npc' || this.now - o.born < COMPRESS_ARM_MS * 0.5) continue;
      const d = Phaser.Math.Distance.Between(f.x, f.y, o.x, o.y);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  /** Exceed now: in the fight, healthy enough to sit out the crash, and not already in it. */
  npcExceedReady(): boolean {
    const f = this.api.npc;
    const t = this.targetsOf('npc')[0];
    if (!t || !this.alive(f) || this.exceeding('npc')) return false;
    return Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) < NPC_EXCEED_RANGE && f.hp > f.maxHp * 0.35;
  }
}
