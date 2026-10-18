import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { Sfx } from '../../audio';
import {
  TMP, HeraldBroadcast, TempestAvatar, TempestColorFn, TempestFx, boltPip, chevron, current as paintCurrent, fallGauge,
  frontLane, gustLayered, hailStone, iceShard, knockTag, lightning, liftShadow, rainPuddle, staticTrail, stormBank, stormSky, swirl,
  thunderCloud,
} from './TempestVisuals';

type Owner = 'player' | 'npc';
const BOTH: Owner[] = ['player', 'npc'];

// ── The height sim ───────────────────────────────────────────────────────────
/**
 * Altitude is a second axis the arena does not have, so it lives here: `z` in px above the
 * floor and `vz` in px/s, integrated every frame under one gravity. Height only ever moves the
 * *drawing* — the rig is painted `z * LIFT` above the body, with a shadow left on the floor — so
 * the physics body, the hitbox and the health bar all stay where the fighter really is. Being
 * off the floor at all is what the Flight passive reads: melee and floor hazards cannot reach
 * you, shots and blasts still can.
 */
const GRAVITY = 520;
/** A body falling freely tops out here… */
const TERMINAL = 900;
/** …and a deliberate dive goes well past it. Landing damage is read off the speed at impact. */
const DIVE_VZ = -1500;
const LIFT = 0.55;
/** px of altitude per px of launch; 640 is a peak of ~390 px and ~2.4 s in the air. */
const LAUNCH_VZ = 640;
const AIR_SPEED_MULT = 0.5;

// ── Wall Slam (passive) ──────────────────────────────────────────────────────
const WALL_DAMAGE = 12;
const WALL_CD_MS = 1000;

// ── Gale Burst (Click) ───────────────────────────────────────────────────────
const GALE_DAMAGE = 10;
const GALE_R = 72;
const GALE_SPEED = 780;
const GALE_SHOVE = 620;
const GALE_SHOVE_MS = 380;
const GALE_MAX_CHARGES = 2;
/** px walked per charge. */
const GALE_RECHARGE_DIST = 240;
/** Elevation bought by a self-hit in the air, and the bigger one off a wall or the floor. */
const GALE_BOOST = 380;
const GALE_BOOST_BIG = 620;
const GALE_NEAR_WALL = 48;
const GALE_NEAR_FLOOR = 80;

// ── Kick Blast (E) ───────────────────────────────────────────────────────────
const KICK_DAMAGE = 15;
const KICK_DIST = 440;
const KICK_MS = 320;
const KICK_HIT_R = 50;
const KICK_SHOVE = 760;
const KICK_SHOVE_MS = 420;
const KICK_DODGE = 0.5;
const KICK_DODGE_TAIL_MS = 1000;
const KICK_BOOST = 520;

// ── Summon Front (R) ─────────────────────────────────────────────────────────
const FRONT_LEN = 360;
const FRONT_HALF_W = 58;
const FRONT_PUSH = 300;
const FRONT_MAX = 2;
const FRONT_FADE_MS = 350;
/** The in-air R: how long the flight to the front takes, and what the slam is worth. */
const SLAM_MS = 420;
const SLAM_DAMAGE = 20;
const SLAM_HEIGHT_DAMAGE = 0.12;
const SLAM_HEIGHT_CAP = 60;
const SLAM_SHOVE = 520;
const SLAM_SHOVE_MS = 360;
/** The bounce back up: the peak is this much of where you started, plus a floor. */
const SLAM_BOUNCE_MULT = 1.3;
const SLAM_BOUNCE_MIN = 120;

// ── Updraft (F) ──────────────────────────────────────────────────────────────
const CURRENT_COUNT = 3;
const CURRENT_R = 44;
const CURRENT_REACH = 80;
const CURRENT_LIFE_MS = 9000;
const CURRENT_RESPAWN_MS = 900;
const CURRENT_PAD = 90;

// ── Landing ──────────────────────────────────────────────────────────────────
const LAND_DAMAGE_MIN = 6;
const LAND_DAMAGE_SPAN = 34;
const LAND_R_MIN = 70;
const LAND_R_SPAN = 70;
const LAND_SHOVE = 420;
const LAND_SHOVE_MS = 320;
/** The speed that counts as a full-tilt landing: a dive. A free fall from a launch is ~0.43. */
const LAND_SPEED_FULL = 1500;

// ── Final Forecast (Q) ───────────────────────────────────────────────────────
const FORECAST_DASH_DIST = 420;
const FORECAST_DASH_MS = 300;
const FORECAST_GRAB_R = 48;
const FORECAST_HOLD_MS = 3000;
const FORECAST_VZ = 700;
const FORECAST_DAMAGE = 20;
const FORECAST_HEIGHT_DAMAGE = 0.15;
const FORECAST_HEIGHT_CAP = 70;
/** The in-air Q: the ping-pong currents after a dive. */
const PONG_R = 150;
const PONG_SPEED = 540;
const PONG_BOUNCES = 3;
const PONG_MAX_MS = 7000;

// ── Shop upgrades ────────────────────────────────────────────────────────────
/** Click+ Hailstorm: the stone hits a little harder and bursts into shrapnel where it goes off. */
const HAIL_DAMAGE = 13;
const SHRAPNEL_COUNT = 6;
const SHRAPNEL_DAMAGE = 4;
const SHRAPNEL_SPEED = 520;
const SHRAPNEL_RANGE = 170;
const SHRAPNEL_HIT_R = 18;
/** E+ Shocking Acceleration: the roll's static trail, and the airborne hop's thundercloud. */
const STATIC_MS = 5000;
const STATIC_HALF_W = 22;
const STATIC_STEP = 26;
const STATIC_DAMAGE = 5;
const STATIC_TICK_MS = 500;
const CLOUD_MS = 5000;
const CLOUD_R = 150;
const CLOUD_LIFT = 110;
const CLOUD_STRIKE_MS = 1000;
const CLOUD_STRIKE_DAMAGE = 8;
/** F+ Cyclone: made where you stand when no current is in reach. */
const CYCLONE_VZ = 880;
const CYCLONE_CD_MULT = 2;
/** Q+ Herald of Doom: the broadcast, then twelve seconds of the weather it forecast. */
const HERALD_MS = 2600;
const WEATHER_MS = 12000;
const WX_FADE_MS = 900;
const WX_BOLT_MS = 700;
const WX_BOLT_WARN_MS = 450;
const WX_BOLT_R = 50;
const WX_BOLT_DAMAGE = 12;
const WX_HAIL_MS = 150;
const WX_HAIL_SPEED = 460;
const WX_HAIL_DRIFT = 70;
const WX_HAIL_HIT_R = 18;
const WX_HAIL_DAMAGE = 5;
/** Gales: every gain of elevation, by anyone, is this much bigger while the weather lasts. */
const WX_LIFT_MULT = 1.4;
const WX_PUDDLE_MS = 550;
const PUDDLE_LIFE_MS = 5000;
const PUDDLE_R = 42;
const PUDDLE_SLOW = 0.6;

// ── Mastery ──────────────────────────────────────────────────────────────────
export const UPPERCUT_ID = 'tempest-gale-uppercut';
/** Gale Uppercut: a short dash, a small hit, and the body it lands on thrown into the air. */
const UPPERCUT_CD_MS = 9000;
const UPPERCUT_DASH = 250;
const UPPERCUT_DASH_MS = 220;
const UPPERCUT_HIT_R = 46;
const UPPERCUT_DAMAGE = 8;
const UPPERCUT_VZ = 720;
/** A thrown body has no terminal speed short of a dive, so a juggle that went high comes down hard. */
const KNOCK_TERMINAL = 1600;
/** A Click that catches a thrown body buys it this much more height. */
const KNOCK_BOOST = 360;
/** The fall: read off the speed at impact, like a landing. */
const KNOCK_FALL_MIN = 6;
const KNOCK_FALL_SPAN = 54;
const KNOCK_FALL_FULL = 1500;
/** Unrelenting Storm: the Herald's weather, tamed and left on for the whole match. */
const AMB_BOLT_MS = 5500;
const AMB_BOLT_SPAN_MS = 6000;
const AMB_HAIL_MS = 1100;
const AMB_PUDDLE_MS = 7000;
const AMB_PUDDLE_MAX = 2;
const AMB_PUDDLE_LIFE_MS = 6500;
/** The breeze: px/s to the right of the screen, on the storm's foes only. */
const BREEZE = 42;

export interface TempestArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** The physics world bounds — the walls the passive counts. */
  get bounds(): Phaser.Geom.Rectangle;
  /** Skins: maps a Tempest visual colour through that side's equipped skin. */
  tempestColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** This side owns the shop upgrade for `slot` (the player's loadout, or a bot/remote one). */
  hasUpgrade(owner: Owner, slot: string): boolean;
  /** The mastery enhancement bound over `slot`, for the player and for the opponent. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Credits the local player's mastery progress (the adapter only counts it while they are Tempest). */
  recordMasteryStat(key: string, amount: number): void;
  /** Online: relay a mastery press that never touches a cooldown. */
  broadcast(id: string): void;
  /** Online PvP: the npc is the opponent's replica, so the bot's own decisions are not made here. */
  get isOnline(): boolean;
}

interface GaleShot {
  owner: Owner;
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number;
  seed: number;
  reg: RegisteredProjectile | null;
  /** Click+ Hailstorm: thrown as a hailstone. */
  hail: boolean;
}

/** A knockback this kit owns. The passive only counts walls hit under one of these. */
interface Shove {
  owner: Owner;
  victim: Fighter;
  vx: number; vy: number;
  until: number; ms: number;
}

interface Front {
  owner: Owner;
  x: number; y: number; ang: number;
  bornAt: number;
  /** 0 while live; the moment it was told to fade otherwise. */
  fadeAt: number;
  seed: number;
}

interface Current {
  x: number; y: number;
  bornAt: number; diesAt: number;
  seed: number;
}

interface Pong {
  owner: Owner;
  victim: Fighter;
  vx: number; vy: number;
  bounces: number;
  until: number;
}

interface Grab {
  victim: Fighter;
  releaseAt: number;
  /** The height read at release — the whole damage of the crash. */
  releaseZ: number;
  crashing: boolean;
}

interface Slam {
  front: Front;
  fromX: number; fromY: number; fromZ: number;
  start: number; until: number;
}

/** Click+: one splinter of a burst hailstone. */
interface Shrapnel {
  owner: Owner;
  x: number; y: number; vx: number; vy: number;
  travelled: number;
  seed: number;
}

/** E+: the static a roll lays behind it. Points are added as the roll travels. */
interface StaticLine {
  owner: Owner;
  pts: { x: number; y: number }[];
  until: number;
  seed: number;
  lastTick: Map<Fighter, number>;
}

/** E+: the thundercloud an airborne hop leaves. Strikes its whole circle on a clock. */
interface Cloud {
  owner: Owner;
  x: number; y: number;
  bornAt: number; until: number;
  nextStrikeAt: number;
  seed: number;
}

/** Q+: a bolt out of the Herald's sky, warned before it lands. */
interface Bolt {
  owner: Owner;
  x: number; y: number;
  at: number;
}

/** Q+: a hailstone falling from the top of the screen. */
interface Hail {
  owner: Owner;
  x: number; y: number; vx: number; vy: number;
  rot: number; seed: number;
}

/** Q+: a slowing puddle the rain leaves. */
interface Puddle {
  owner: Owner;
  x: number; y: number;
  bornAt: number; until: number;
  seed: number;
  /** Mastery: left by the Unrelenting Storm rather than the Herald's weather. */
  ambient?: boolean;
}

/**
 * Mastery — Gale Uppercut: a body that is not a Tempest, thrown into the air. Height is simulated
 * here like a flier's, but a victim has no rig of ours to lift, so the *body* is lifted: held at
 * its anchor, raised by the drawn height, and dropped back onto it on landing.
 */
interface Knock {
  owner: Owner;
  victim: Fighter;
  z: number; vz: number;
  ax: number; ay: number;
  boosts: number;
}

interface Weather {
  owner: Owner;
  start: number; until: number;
  nextBolt: number; nextHail: number; nextPuddle: number;
}

interface Side {
  aimX: number; aimY: number;
  z: number; vz: number;
  airborne: boolean;
  /** Gale Burst's two charges and the distance walked toward the next. */
  charges: number; walked: number; lastX: number; lastY: number;
  /** Kick Blast's roll and its dodge window. */
  rollUntil: number; rollVx: number; rollVy: number; rollHit: Set<Fighter>; trailAccum: number;
  dodgeUntil: number; dodgeGiven: boolean;
  /** Final Forecast's dash. */
  dashUntil: number; dashVx: number; dashVy: number;
  grab: Grab | null;
  slam: Slam | null;
  /** The in-air Q: falling at dive speed, with the currents waiting at the bottom. */
  diving: boolean;
  wallSlamAt: Map<Fighter, number>;
  /** E+: the static line the roll in progress is laying. */
  laying: StaticLine | null;
  /** Q+: the Herald has already gone out for this fall — the weather comes when it lands. */
  heralded: boolean;
  /** Bot only: when it next goes looking for a current. */
  nextFlightAt: number;
  eyeWasOpen: boolean;
  // Mastery
  /** Gale Uppercut's dash, and when it was last thrown. */
  upDashUntil: number; upDashVx: number; upDashVy: number;
  upLastAt: number;
  /** A Tempest thrown by a foe's uppercut: whose it was, so the landing hurts and is credited. */
  knockedBy: Owner | null;
  /** Unrelenting Storm's clocks (0 until the storm first runs). */
  ambBolt: number; ambHail: number; ambPuddle: number;
  /** Airborne time not yet banked as a whole second of the mastery stat. */
  airMs: number;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, z: 0, vz: 0, airborne: false,
    charges: GALE_MAX_CHARGES, walked: 0, lastX: NaN, lastY: NaN,
    rollUntil: 0, rollVx: 0, rollVy: 0, rollHit: new Set(), trailAccum: 0,
    dodgeUntil: 0, dodgeGiven: false,
    dashUntil: 0, dashVx: 0, dashVy: 0,
    grab: null, slam: null, diving: false,
    wallSlamAt: new Map(),
    laying: null,
    heralded: false,
    nextFlightAt: 2500,
    eyeWasOpen: false,
    upDashUntil: 0, upDashVx: 0, upDashVy: 0,
    upLastAt: -Infinity,
    knockedBy: null,
    ambBolt: 0, ambHail: 0, ambPuddle: 0,
    airMs: 0,
  };
}

/**
 * Tempest — a test element, reachable only from a cheat-mode save for now.
 *
 * A storm with a second axis. On the floor it is a knockback brawler: a two-charge wind burst
 * that recharges by *moving*, a roll that resets it, conveyor fronts, and a wall that does the
 * last 12 damage of every shove. Off the floor — launched by a current or by grappling someone
 * into the sky — the same five keys become a flight kit: the burst buys elevation when it hits
 * you, the roll becomes a hop, the front becomes something to slam onto and bounce off, and Q
 * becomes a dive that leaves whoever it lands on ping-ponging between the walls under the Eye
 * of the Storm. Height is the resource: every landing, slam and crash pays out by how high it
 * came from.
 *
 * Both sides are mirrored — the bot flies too. Every `cast` in `tempest.ts` is a one-line
 * delegate into the `do*` methods here, and every opportunity the bot acts on is published
 * through the side-effect-free readers at the bottom.
 */
export class TempestKit {
  private api: TempestArenaApi;
  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private shots: GaleShot[] = [];
  private shoves: Shove[] = [];
  private fronts: Front[] = [];
  private currents: Current[] = [];
  private respawnAt: number[] = [];
  private pongs: Pong[] = [];
  private shrapnel: Shrapnel[] = [];
  private statics: StaticLine[] = [];
  private clouds: Cloud[] = [];
  private bolts: Bolt[] = [];
  private hail: Hail[] = [];
  private puddles: Puddle[] = [];
  private weathers: Weather[] = [];
  /** Mastery: bodies Gale Uppercut has in the air. */
  private knocks: Knock[] = [];
  /** Mastery: foes already carrying the kill-during-the-forecast listener this match. */
  private watched = new WeakSet<Fighter>();
  /** Mastery: how far the storm bank is faded in, and how dark it has turned. */
  private bankK = 0;
  private bankDark = 0;
  /** Bodies a puddle slowed last frame, so they can be handed back their speed. */
  private slowed = new Set<Fighter>();
  private pointerWasDown = false;
  private vizT = 0;

  private pcol: TempestColorFn;
  private ncol: TempestColorFn;
  private pfx: TempestFx;
  private nfx: TempestFx;
  private playerAvatar: TempestAvatar | null = null;
  private npcAvatar: TempestAvatar | null = null;
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Q+: the weather over the whole screen. */
  private skyGfx: Phaser.GameObjects.Graphics | null = null;

  constructor(api: TempestArenaApi) {
    this.api = api;
    this.pcol = (base) => api.tempestColor('player', base);
    this.ncol = (base) => api.tempestColor('npc', base);
    this.pfx = new TempestFx(api.scene, this.pcol);
    this.nfx = new TempestFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): TempestFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): TempestColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): TempestAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private is(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'tempest' : this.api.npcElementId === 'tempest';
  }
  private alive(f: Fighter | null | undefined): f is Fighter { return !!f && f.active && f.hp > 0; }
  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

  /** Everyone this owner's wind is aimed at. */
  private foes(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /** Which side a body belongs to, if it is one of the two fighters. */
  private ownerOf(f: Fighter): Owner | null {
    if (f === this.api.player) return 'player';
    if (f === this.api.npc) return 'npc';
    return null;
  }

  /** This side is a Tempest and owns the upgrade for `slot`. */
  private up(owner: Owner, slot: string): boolean {
    return this.is(owner) && this.api.hasUpgrade(owner, slot);
  }

  /** Q+ gales: every elevation gain is bigger while anyone's Herald weather is live. */
  private liftMult(): number {
    return this.weathers.some((w) => this.now < w.until) ? WX_LIFT_MULT : 1;
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  /** A cast that cannot happen: hand the cooldown back and say why, once, out loud. */
  private deny(owner: Owner, abilityId: string, text: string): void {
    const f = this.fighter(owner);
    this.refund(f, abilityId);
    if (owner !== 'player' || !this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 46, text, this.hex(TMP.gust));
    Sfx.playAt('ui-denied', f.x, { volume: 0.55 });
  }

  private text(owner: Owner, x: number, y: number, t: string, color = TMP.gust): void {
    if (owner !== 'player') return;
    this.api.showFloatingText(x, y, t, this.hex(color));
  }

  /** Wall-adjacent: within `pad` of any bound. Returns the wall normal, or null. */
  private nearWall(x: number, y: number, pad: number): { nx: number; ny: number } | null {
    const b = this.api.bounds;
    if (x - b.x <= pad) return { nx: 1, ny: 0 };
    if (b.right - x <= pad) return { nx: -1, ny: 0 };
    if (y - b.y <= pad) return { nx: 0, ny: 1 };
    if (b.bottom - y <= pad) return { nx: 0, ny: -1 };
    return null;
  }

  /**
   * The rig's drawn position: lifted by altitude. There is no ceiling — climb high enough and the
   * character flies off the top of the screen, and `paintAir` pins a marker to the edge instead.
   */
  private rigAt(owner: Owner): { x: number; y: number; lift: number } {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const lift = Math.max(0, s.z * LIFT);
    return { x: f.x, y: f.y - lift, lift };
  }

  /** True while something in this kit is driving the body: no conveyor, no shove on top. */
  private bodyDriven(f: Fighter): boolean {
    const o = this.ownerOf(f);
    if (o) {
      const s = this.side(o);
      if (s.rollUntil > this.now || s.dashUntil > this.now || s.upDashUntil > this.now || s.slam) return true;
    }
    return this.pongs.some((p) => p.victim === f) || BOTH.some((o2) => this.sides[o2].grab?.victim === f)
      || this.knocks.some((k) => k.victim === f);
  }

  /** A knockback this kit owns. Replaces any shove already on the body. */
  private shove(owner: Owner, victim: Fighter, vx: number, vy: number, ms: number): void {
    if (victim.knockbackImmune || victim.unstoppable) return;
    if (this.pongs.some((p) => p.victim === victim)) return;
    // A body in the air is held where it was thrown; a shove would drag it out from under its own fall.
    if (this.knocks.some((k) => k.victim === victim)) return;
    const i = this.shoves.findIndex((s) => s.victim === victim);
    if (i >= 0) this.shoves.splice(i, 1);
    this.shoves.push({ owner, victim, vx, vy, until: this.now + ms, ms });
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide(), npc: makeSide() };
    for (const s of this.shots) if (s.reg) this.api.projectileRegistry.remove(s.reg);
    this.shots = [];
    this.shoves = [];
    this.fronts = [];
    this.currents = [];
    this.respawnAt = [];
    this.pongs = [];
    this.shrapnel = [];
    this.statics = [];
    this.clouds = [];
    this.bolts = [];
    this.hail = [];
    this.puddles = [];
    this.weathers = [];
    // Bodies are rebuilt per match, so a thrown one is only forgotten, never written back.
    this.knocks = [];
    this.watched = new WeakSet();
    this.bankK = 0;
    this.bankDark = 0;
    for (const f of this.slowed) f.tempestSlowMult = 1;
    this.slowed.clear();
    this.pointerWasDown = false;
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.skyGfx?.destroy(); this.skyGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'tempest') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    const down = pointer.isDown;
    const clicked = down && !this.pointerWasDown;
    this.pointerWasDown = down;
    if (!this.alive(p)) return;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    // One burst per press: two charges held down would otherwise go in one frame.
    if (clicked) p.castAbility('tempest-gale', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('tempest-kick', ctx);
    // Mastery: the key Gale Uppercut was dropped on is the uppercut's, not the ability under it.
    const up = this.uppercutSlot('player');
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      if (up === 'r') this.doUppercut('player', mouseX, mouseY); else p.castAbility('tempest-front', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      if (up === 'f') this.doUppercut('player', mouseX, mouseY); else p.castAbility('tempest-updraft', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      if (up === 'q') this.doUppercut('player', mouseX, mouseY); else p.castAbility('tempest-forecast', ctx);
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — a burst thrown at the cursor. In the air, one that lands on you buys elevation. */
  doGale(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-gale'); return; }
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;
    if (s.charges <= 0) { this.deny(owner, 'tempest-gale', '💨 NO GALE — MOVE'); return; }
    s.charges -= 1;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const dist = Math.hypot(tx - f.x, ty - f.y);
    const shot: GaleShot = {
      owner,
      x: f.x + Math.cos(ang) * Math.min(18, dist), y: f.y + Math.sin(ang) * Math.min(18, dist),
      vx: Math.cos(ang) * GALE_SPEED, vy: Math.sin(ang) * GALE_SPEED,
      tx, ty, seed: Math.random() * 999, reg: null, hail: this.up(owner, 'click'),
    };
    const reg: RegisteredProjectile = {
      owner,
      getX: () => shot.x,
      getY: () => shot.y,
      damage: this.up(owner, 'click') ? HAIL_DAMAGE : GALE_DAMAGE,
      steal: () => {
        const i = this.shots.indexOf(shot);
        if (i >= 0) this.shots.splice(i, 1);
      },
    };
    shot.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.shots.push(shot);
    this.avatar(owner)?.play('punch', ang);
    // Aimed at yourself: there is no flight to wait for.
    if (dist <= 18) this.detonate(shot);
  }

  /** E — a roll that kicks whatever it meets. In the air, a hop. Either way the click is back to two. */
  doKick(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-kick'); return; }
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;
    if (s.slam) { this.deny(owner, 'tempest-kick', 'SLAMMING'); return; }
    if (s.charges < GALE_MAX_CHARGES) this.text(owner, f.x, f.y - 56, `💨 GALE ×${GALE_MAX_CHARGES}`);
    s.charges = GALE_MAX_CHARGES;
    s.walked = 0;

    if (s.airborne) {
      s.vz = Math.max(s.vz, 0) + KICK_BOOST * this.liftMult();
      this.fx(owner).burst(f.x, f.y + 10, 46, { boost: true });
      this.avatar(owner)?.play('raise', undefined, 420);
      this.text(owner, f.x, f.y - 76, '⬆ KICK', TMP.white);
      if (this.up(owner, 'e')) {
        this.clouds.push({
          owner, x: f.x, y: f.y, bornAt: this.now, until: this.now + CLOUD_MS,
          nextStrikeAt: this.now + CLOUD_STRIKE_MS, seed: Math.random() * 999,
        });
        Sfx.playAt('thunder', f.x, { rate: 1.4, volume: 0.5 });
        this.text(owner, f.x, f.y - 96, '⛈ THUNDERCLOUD', TMP.bolt);
      }
      return;
    }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const speed = KICK_DIST / (KICK_MS / 1000);
    s.rollUntil = this.now + KICK_MS;
    s.rollVx = Math.cos(ang) * speed;
    s.rollVy = Math.sin(ang) * speed;
    s.rollHit = new Set();
    s.trailAccum = 0;
    s.dodgeUntil = s.rollUntil + KICK_DODGE_TAIL_MS;
    if (!s.dodgeGiven) { f.dodgeChance += KICK_DODGE; s.dodgeGiven = true; }
    if (this.up(owner, 'e')) {
      s.laying = { owner, pts: [{ x: f.x, y: f.y }], until: this.now + STATIC_MS, seed: Math.random() * 999, lastTick: new Map() };
      this.statics.push(s.laying);
      Sfx.playAt('zap', f.x, { rate: 1.2, volume: 0.5 });
    }
    this.fx(owner).burst(f.x, f.y, 34);
    this.avatar(owner)?.play('dash', ang);
  }

  /** R — lay a conveyor front along the aim. In the air, drop onto the nearest one you own. */
  doFront(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-front'); return; }
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;

    if (s.airborne) {
      if (s.slam || s.grab) { this.deny(owner, 'tempest-front', s.grab ? 'HOLDING' : 'SLAMMING'); return; }
      const fr = this.nearestFront(owner, f.x, f.y);
      if (!fr) { this.deny(owner, 'tempest-front', '🌬 NO FRONT'); return; }
      s.slam = { front: fr, fromX: f.x, fromY: f.y, fromZ: s.z, start: this.now, until: this.now + SLAM_MS };
      s.vz = 0;
      this.avatar(owner)?.play('slam', Math.atan2(fr.y - f.y, fr.x - f.x), SLAM_MS + 80);
      this.text(owner, f.x, f.y - 70, '⤵ FRONT SLAM', TMP.white);
      return;
    }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const mine = this.fronts.filter((fr) => fr.owner === owner && fr.fadeAt === 0);
    // A third front retires the oldest — they only ever fade when you try to place one too many.
    while (mine.length >= FRONT_MAX) {
      const old = mine.shift()!;
      old.fadeAt = this.now + FRONT_FADE_MS;
    }
    const x = f.x + Math.cos(ang) * 22;
    const y = f.y + Math.sin(ang) * 22;
    this.fronts.push({ owner, x, y, ang, bornAt: this.now, fadeAt: 0, seed: Math.random() * 999 });
    this.fx(owner).frontPlace(x, y, ang, FRONT_LEN, FRONT_HALF_W);
    this.avatar(owner)?.play('sweep', ang);
  }

  /** F — ride a current up. Only on the floor, and only beside one. */
  doUpdraft(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-updraft'); return; }
    const s = this.side(owner);
    if (s.airborne) { this.deny(owner, 'tempest-updraft', 'ALREADY AIRBORNE'); return; }
    const c = this.nearestCurrent(f.x, f.y, CURRENT_REACH);
    if (!c && this.up(owner, 'f')) {
      // F+ Cyclone: no current to ride, so make one — a stronger one, on a doubled cooldown.
      f.scaleStampedCooldown('tempest-updraft', CYCLONE_CD_MULT);
      this.launch(owner, CYCLONE_VZ);
      s.nextFlightAt = this.now + 6500;
      this.fx(owner).cyclone(f.x, f.y);
      Sfx.playAt('whoosh', f.x, { rate: 0.6, volume: 1 });
      this.avatar(owner)?.play('raise');
      this.text(owner, f.x, f.y - 70, '🌪 CYCLONE', TMP.white);
      return;
    }
    if (!c) { this.deny(owner, 'tempest-updraft', '🌀 NO CURRENT'); return; }
    this.currents.splice(this.currents.indexOf(c), 1);
    this.respawnAt.push(this.now + CURRENT_RESPAWN_MS);
    this.launch(owner, LAUNCH_VZ);
    s.nextFlightAt = this.now + 6500;
    this.fx(owner).launch(c.x, c.y);
    this.avatar(owner)?.play('raise');
    this.text(owner, f.x, f.y - 70, '⬆ UPDRAFT', TMP.white);
  }

  /** Q — a dash that grapples whoever it meets into the sky. In the air, a dive. */
  doForecast(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-forecast'); return; }
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;

    if (s.airborne) {
      if (s.slam) { this.deny(owner, 'tempest-forecast', 'SLAMMING'); return; }
      if (s.grab && !s.grab.crashing) {
        // Holding someone: the dive is the crash, early.
        s.grab.crashing = true;
        s.grab.releaseZ = s.z;
      }
      s.diving = true;
      s.vz = Math.min(s.vz, DIVE_VZ);
      this.avatar(owner)?.play('slam', Math.PI / 2, 400);
      this.text(owner, f.x, f.y - 70, '☄ DIVE', TMP.white);
      Sfx.playAt('whoosh', f.x, { rate: 0.8, volume: 0.9 });
      this.herald(owner);
      return;
    }
    if (s.grab) { this.deny(owner, 'tempest-forecast', 'HOLDING'); return; }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const speed = FORECAST_DASH_DIST / (FORECAST_DASH_MS / 1000);
    s.dashUntil = this.now + FORECAST_DASH_MS;
    s.dashVx = Math.cos(ang) * speed;
    s.dashVy = Math.sin(ang) * speed;
    this.fx(owner).burst(f.x, f.y, 30);
    this.avatar(owner)?.play('dash', ang);
  }

  // ── Flight ─────────────────────────────────────────────────────────────────

  private launch(owner: Owner, vz: number): void {
    const s = this.side(owner);
    s.airborne = true;
    s.z = Math.max(s.z, 1);
    s.vz = Math.max(s.vz, 0) + vz * this.liftMult();
    Sfx.playAt('jump', this.fighter(owner).x, { rate: 0.85, volume: 0.9 });
  }

  /** R+ Float: airborne over a live front, on your own steam (not diving, slamming or crashing). */
  private floating(owner: Owner): boolean {
    const s = this.side(owner);
    if (!s.airborne || s.diving || s.slam || s.grab?.crashing || !this.up(owner, 'r')) return false;
    const f = this.fighter(owner);
    return this.fronts.some((fr) => fr.fadeAt === 0 && this.inFront(fr, f.x, f.y));
  }

  private updateHeights(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) {
        // A dead body is on the floor. Quietly: no shockwave for a corpse.
        if (s.airborne) { s.airborne = false; s.z = 0; s.vz = 0; s.diving = false; s.slam = null; }
        if (s.grab) this.releaseGrab(owner);
        continue;
      }
      if (!s.airborne) continue;
      if (s.slam) { this.updateSlamFlight(owner, s, f); continue; }

      const grab = s.grab;
      if (grab && !grab.crashing) {
        // Holding someone: gravity is mostly suspended so the pair hangs for the three seconds,
        // and the boosts the click and the kick buy still lift you higher — which is the damage.
        s.vz -= GRAVITY * 0.18 * dt;
        s.vz *= Math.pow(0.5, dt / 0.9);
        if (s.z < 160 && s.vz < 40) s.vz = 40;
        if (this.now >= grab.releaseAt) {
          grab.crashing = true;
          grab.releaseZ = s.z;
          s.vz = DIVE_VZ;
          this.avatar(owner)?.play('slam', Math.PI / 2, 400);
          this.text(owner, f.x, f.y - 70, '☄ CRASH', TMP.white);
          Sfx.playAt('whoosh', f.x, { rate: 0.75, volume: 1 });
          this.herald(owner);
        }
      } else {
        s.vz -= GRAVITY * dt;
        if (!s.diving && !grab?.crashing) s.vz = Math.max(s.vz, -TERMINAL);
      }
      // Float: a front underneath holds you where you are. Climbing still works; falling does not.
      if (s.vz < 0 && this.floating(owner)) s.vz = 0;
      s.z += s.vz * dt;
      if (s.z <= 0) this.land(owner, -s.vz);
    }
  }

  /** The in-air R: carried to the front's centre and driven into it. */
  private updateSlamFlight(owner: Owner, s: Side, f: Fighter): void {
    const sl = s.slam!;
    const fr = sl.front;
    const k = Phaser.Math.Clamp((this.now - sl.start) / (sl.until - sl.start), 0, 1);
    const e = k * k;
    const cx = fr.x + Math.cos(fr.ang) * FRONT_LEN / 2;
    const cy = fr.y + Math.sin(fr.ang) * FRONT_LEN / 2;
    const body = this.body(f);
    body.reset(sl.fromX + (cx - sl.fromX) * e, sl.fromY + (cy - sl.fromY) * e);
    body.setVelocity(0, 0);
    s.z = Math.max(1, sl.fromZ * (1 - e));
    s.vz = 0;
    s.trailAccum += 16;
    if (s.trailAccum >= 48) {
      s.trailAccum = 0;
      const rig = this.rigAt(owner);
      this.fx(owner).streak(rig.x, rig.y, Math.atan2(cy - sl.fromY, cx - sl.fromX), 40);
    }
    if (k < 1) return;

    // Arrived. The shockwave is the front's own rectangle.
    const hk = Phaser.Math.Clamp(sl.fromZ / 500, 0, 1);
    const dmg = SLAM_DAMAGE + Math.min(SLAM_HEIGHT_CAP, Math.round(sl.fromZ * SLAM_HEIGHT_DAMAGE));
    for (const t of this.foes(owner)) {
      if (!this.inFront(fr, t.x, t.y)) continue;
      t.takeDamage(dmg, { aoe: true });
      this.api.spawnHitFlash(t.x, t.y, TMP.white);
      this.shove(owner, t, Math.cos(fr.ang) * SLAM_SHOVE, Math.sin(fr.ang) * SLAM_SHOVE, SLAM_SHOVE_MS);
    }
    this.fx(owner).frontSlam(fr.x, fr.y, fr.ang, FRONT_LEN, FRONT_HALF_W, hk);
    this.api.scene.cameras.main.shake(120 + hk * 120, 0.003 + hk * 0.004);
    Sfx.playAt('stone-slam', cx, { rate: 1.1, volume: 0.9 });
    this.text(owner, cx, cy - 40, `🌬 SLAM ${dmg}`, TMP.white);
    const i = this.fronts.indexOf(fr);
    if (i >= 0) this.fronts.splice(i, 1);
    // And back up, higher than you started.
    const peak = sl.fromZ * SLAM_BOUNCE_MULT + SLAM_BOUNCE_MIN;
    s.vz = Math.sqrt(2 * GRAVITY * peak) * this.liftMult();
    s.z = 1;
    s.slam = null;
    s.charges = GALE_MAX_CHARGES;
  }

  private inFront(fr: Front, x: number, y: number): boolean {
    const dx = x - fr.x;
    const dy = y - fr.y;
    const u = dx * Math.cos(fr.ang) + dy * Math.sin(fr.ang);
    const v = -dx * Math.sin(fr.ang) + dy * Math.cos(fr.ang);
    return u >= -20 && u <= FRONT_LEN + 20 && Math.abs(v) <= FRONT_HALF_W + 20;
  }

  /** Back on the floor. The shockwave scales with the speed of the arrival. */
  private land(owner: Owner, speed: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.z = 0;
    s.vz = 0;
    s.airborne = false;
    const dived = s.diving;
    s.diving = false;
    const heralded = s.heralded;
    s.heralded = false;
    const k = Phaser.Math.Clamp(speed / LAND_SPEED_FULL, 0, 1);
    const r = LAND_R_MIN + LAND_R_SPAN * k;
    const dmg = Math.round(LAND_DAMAGE_MIN + LAND_DAMAGE_SPAN * k);
    this.fx(owner).landing(f.x, f.y, r, k);
    this.api.scene.cameras.main.shake(80 + k * 200, 0.002 + k * 0.006);
    Sfx.playAt('land', f.x, { rate: 1.1 - k * 0.4, volume: 0.6 + k * 0.5 });
    this.avatar(owner)?.play('clap', undefined, 300);

    const grab = s.grab;
    for (const t of this.foes(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > r && t !== grab?.victim) continue;
      let total = dmg;
      if (grab && t === grab.victim) {
        total += FORECAST_DAMAGE + Math.min(FORECAST_HEIGHT_CAP, Math.round(grab.releaseZ * FORECAST_HEIGHT_DAMAGE));
      }
      t.takeDamage(total, { aoe: true });
      this.api.spawnHitFlash(t.x, t.y, TMP.white);
      // Mastery stat: the crash that finished whoever was held — slammed into the ground.
      if (grab && t === grab.victim && !this.alive(t) && owner === 'player') this.api.recordMasteryStat('slamKills', 1);
      const a = d > 1 ? Math.atan2(t.y - f.y, t.x - f.x) : Math.random() * Math.PI * 2;
      this.shove(owner, t, Math.cos(a) * LAND_SHOVE, Math.sin(a) * LAND_SHOVE, LAND_SHOVE_MS);
      if (dived && d <= PONG_R) this.startPong(owner, t, a);
    }
    if (grab) {
      this.text(owner, f.x, f.y - 90, `☄ FORECAST ${FORECAST_DAMAGE + Math.min(FORECAST_HEIGHT_CAP, Math.round(grab.releaseZ * FORECAST_HEIGHT_DAMAGE))}`, TMP.white);
      this.releaseGrab(owner);
    }
    this.text(owner, f.x, f.y - 60, `💥 LANDING ${dmg}`);
    if (heralded) this.startWeather(owner);
    // Mastery: a Tempest a foe uppercut comes down on its own landing, and that landing hurts.
    const by = s.knockedBy;
    s.knockedBy = null;
    if (by && this.alive(f)) this.knockDamage(by, f, speed, f.x, f.y);
  }

  // ── Gale Burst ─────────────────────────────────────────────────────────────

  private updateShots(delta: number): void {
    const dt = delta / 1000;
    const b = this.api.bounds;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      const left = Math.hypot(s.tx - s.x, s.ty - s.y);
      const step = GALE_SPEED * dt;
      if (left <= step + 2) {
        s.x = s.tx; s.y = s.ty;
        this.detonate(s);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // A wall stops it where it stands; so does a body in the way.
      if (s.x < b.x || s.x > b.right || s.y < b.y || s.y > b.bottom) {
        s.x = Phaser.Math.Clamp(s.x, b.x, b.right);
        s.y = Phaser.Math.Clamp(s.y, b.y, b.bottom);
        this.detonate(s);
        continue;
      }
      const hit = this.foes(s.owner).find((t) => Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= 26);
      if (hit) this.detonate(s);
    }
  }

  private detonate(shot: GaleShot): void {
    const i = this.shots.indexOf(shot);
    if (i >= 0) this.shots.splice(i, 1);
    if (shot.reg) this.api.projectileRegistry.remove(shot.reg);
    const owner = shot.owner;
    const s = this.side(owner);
    const f = this.fighter(owner);

    let boost = false;
    let big = false;
    if (this.alive(f) && s.airborne && !s.slam
        && Phaser.Math.Distance.Between(shot.x, shot.y, f.x, f.y) <= GALE_R + 8) {
      boost = true;
      big = !!this.nearWall(shot.x, shot.y, GALE_NEAR_WALL) || (s.vz < 0 && s.z < GALE_NEAR_FLOOR);
      s.vz = Math.max(s.vz, 0) + (big ? GALE_BOOST_BIG : GALE_BOOST) * this.liftMult();
      this.text(owner, f.x, f.y - 76, big ? '⬆⬆ BIG BOOST' : '⬆ BOOST', TMP.white);
    }
    this.fx(owner).burst(shot.x, shot.y, GALE_R, { boost, big });
    Sfx.playAt('gust', shot.x, { rate: big ? 0.9 : 1.2, volume: 0.8 });
    this.juggle(owner, shot.x, shot.y);
    if (shot.hail) this.shatterHail(owner, shot.x, shot.y, Math.atan2(shot.vy, shot.vx));
    for (const t of this.foes(owner)) {
      const d = Phaser.Math.Distance.Between(shot.x, shot.y, t.x, t.y);
      if (d > GALE_R) continue;
      t.takeDamage(shot.hail ? HAIL_DAMAGE : GALE_DAMAGE, { aoe: true });
      this.api.spawnHitFlash(t.x, t.y, TMP.white);
      const a = d > 1 ? Math.atan2(t.y - shot.y, t.x - shot.x) : Math.atan2(shot.vy, shot.vx);
      this.shove(owner, t, Math.cos(a) * GALE_SHOVE, Math.sin(a) * GALE_SHOVE, GALE_SHOVE_MS);
    }
  }

  private updateCharges(): void {
    for (const owner of BOTH) {
      if (!this.is(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const d = Number.isNaN(s.lastX) ? 0 : Math.hypot(f.x - s.lastX, f.y - s.lastY);
      s.lastX = f.x;
      s.lastY = f.y;
      if (s.charges >= GALE_MAX_CHARGES) { s.walked = 0; continue; }
      // A teleport is not a walk.
      if (d > 60) continue;
      s.walked += d;
      if (s.walked >= GALE_RECHARGE_DIST) {
        s.walked -= GALE_RECHARGE_DIST;
        s.charges += 1;
        this.text(owner, f.x, f.y - 50, '💨 +1 GALE');
        if (s.charges >= GALE_MAX_CHARGES) s.walked = 0;
      }
    }
  }

  // ── Kick Blast ─────────────────────────────────────────────────────────────

  private updateRolls(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.rollUntil = 0; s.laying = null; continue; }
      if (s.laying) {
        // E+: the static goes down behind the roll, one point every STATIC_STEP px.
        const last = s.laying.pts[s.laying.pts.length - 1];
        if (Phaser.Math.Distance.Between(last.x, last.y, f.x, f.y) >= STATIC_STEP) s.laying.pts.push({ x: f.x, y: f.y });
        if (s.rollUntil <= this.now) s.laying = null;
      }
      if (s.rollUntil > this.now) {
        this.body(f).setVelocity(s.rollVx, s.rollVy);
        s.trailAccum += delta;
        if (s.trailAccum >= 40) {
          s.trailAccum = 0;
          this.fx(owner).rollTrail(f.x, f.y, Math.atan2(s.rollVy, s.rollVx));
        }
        const ang = Math.atan2(s.rollVy, s.rollVx);
        for (const t of this.foes(owner)) {
          if (s.rollHit.has(t)) continue;
          if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > KICK_HIT_R) continue;
          s.rollHit.add(t);
          t.takeDamage(KICK_DAMAGE);
          this.api.spawnHitFlash(t.x, t.y, TMP.white);
          this.shove(owner, t, Math.cos(ang) * KICK_SHOVE, Math.sin(ang) * KICK_SHOVE, KICK_SHOVE_MS);
          this.fx(owner).kickHit(t.x, t.y, ang);
          Sfx.playAt('hit-heavy', t.x, { rate: 1.1, volume: 0.8 });
          this.text(owner, t.x, t.y - 40, '🦵 KICK');
        }
      }
      // The dodge: topped back to 50% while the window runs (a dodge that fires spends 0.2 of
      // it), and taken back off the body when the window closes.
      if (s.dodgeGiven) {
        if (this.now < s.dodgeUntil) {
          if (f.dodgeChance < KICK_DODGE) f.dodgeChance = KICK_DODGE;
        } else {
          f.dodgeChance = Math.max(0, f.dodgeChance - KICK_DODGE);
          s.dodgeGiven = false;
        }
      }
    }
  }

  // ── Final Forecast ─────────────────────────────────────────────────────────

  private updateDashes(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.dashUntil = 0; continue; }
      if (s.dashUntil <= this.now) continue;
      this.body(f).setVelocity(s.dashVx, s.dashVy);
      s.trailAccum += delta;
      if (s.trailAccum >= 40) {
        s.trailAccum = 0;
        this.fx(owner).streak(f.x, f.y, Math.atan2(s.dashVy, s.dashVx), 44);
      }
      const victim = this.foes(owner).find((t) => Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= FORECAST_GRAB_R);
      if (!victim) continue;
      s.dashUntil = 0;
      this.body(f).setVelocity(0, 0);
      if (victim.knockbackImmune || victim.unstoppable) {
        this.text(owner, victim.x, victim.y - 40, 'UNMOVABLE', TMP.gust);
        continue;
      }
      // Caught. Up we both go.
      this.endPong(victim);
      s.grab = { victim, releaseAt: this.now + FORECAST_HOLD_MS, releaseZ: 0, crashing: false };
      this.launch(owner, FORECAST_VZ);
      this.fx(owner).grabSnap(victim.x, victim.y);
      Sfx.playAt('grapple', f.x, { rate: 0.9, volume: 1 });
      this.avatar(owner)?.setHold('reach', Math.atan2(victim.y - f.y, victim.x - f.x));
      this.text(owner, f.x, f.y - 70, '🌪 GRAPPLED', TMP.white);
      this.api.spawnHitFlash(victim.x, victim.y, TMP.white);
    }
  }

  /** The held body rides along at arm's length and cannot move. */
  private updateGrabs(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const g = s.grab;
      if (!g) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.alive(g.victim)) { this.releaseGrab(owner); continue; }
      const ang = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      const vb = this.body(g.victim);
      const fb = this.body(f);
      vb.reset(f.x + Math.cos(ang) * 30, f.y + Math.sin(ang) * 30);
      vb.setVelocity(fb.velocity.x, fb.velocity.y);
      this.avatar(owner)?.setHold('reach', ang);
    }
  }

  private releaseGrab(owner: Owner): void {
    const s = this.side(owner);
    if (!s.grab) return;
    s.grab = null;
    this.avatar(owner)?.setHold(null);
  }

  // ── Shoves and the wall ────────────────────────────────────────────────────

  private updateShoves(): void {
    for (let i = this.shoves.length - 1; i >= 0; i--) {
      const sh = this.shoves[i];
      const v = sh.victim;
      if (!this.alive(v) || this.now >= sh.until || v.knockbackImmune || v.unstoppable) {
        this.shoves.splice(i, 1);
        continue;
      }
      const k = (sh.until - this.now) / sh.ms;
      const ease = 0.35 + 0.65 * k;
      this.body(v).setVelocity(sh.vx * ease, sh.vy * ease);
      const wall = this.wallContact(v, sh.vx, sh.vy);
      if (wall) {
        this.shoves.splice(i, 1);
        this.wallSlam(sh.owner, v, wall.nx, wall.ny, false);
      }
    }
  }

  /** The wall this body is pressed into along its velocity, or null. */
  private wallContact(f: Fighter, vx: number, vy: number): { nx: number; ny: number } | null {
    const b = this.api.bounds;
    const body = this.body(f);
    const eps = 2.5;
    if (vx < -60 && (body.blocked.left || body.left <= b.x + eps)) return { nx: 1, ny: 0 };
    if (vx > 60 && (body.blocked.right || body.right >= b.right - eps)) return { nx: -1, ny: 0 };
    if (vy < -60 && (body.blocked.up || body.top <= b.y + eps)) return { nx: 0, ny: 1 };
    if (vy > 60 && (body.blocked.down || body.bottom >= b.bottom - eps)) return { nx: 0, ny: -1 };
    return null;
  }

  /** The passive: a body you shoved into a wall takes 12. Once a second per body. */
  private wallSlam(owner: Owner, victim: Fighter, nx: number, ny: number, electric: boolean): void {
    const s = this.side(owner);
    const last = s.wallSlamAt.get(victim) ?? -Infinity;
    const x = victim.x - nx * 20;
    const y = victim.y - ny * 20;
    this.fx(owner).wallSlam(x, y, nx, ny, { electric });
    if (this.now - last < WALL_CD_MS) return;
    s.wallSlamAt.set(victim, this.now);
    victim.takeDamage(WALL_DAMAGE);
    if (owner === 'player') this.api.recordMasteryStat('wallBlasts', 1);
    this.api.spawnHitFlash(victim.x, victim.y, TMP.white);
    Sfx.playAt('stone-slam', victim.x, { rate: 1.4, volume: 0.7 });
    this.text(owner, victim.x, victim.y - 44, `🧱 WALL SLAM ${WALL_DAMAGE}`, TMP.white);
  }

  // ── The Eye of the Storm ───────────────────────────────────────────────────

  private startPong(owner: Owner, victim: Fighter, ang: number): void {
    if (victim.knockbackImmune || victim.unstoppable) return;
    this.endPong(victim);
    const i = this.shoves.findIndex((s) => s.victim === victim);
    if (i >= 0) this.shoves.splice(i, 1);
    const first = !this.pongs.some((p) => p.owner === owner);
    this.pongs.push({
      owner, victim,
      vx: Math.cos(ang) * PONG_SPEED, vy: Math.sin(ang) * PONG_SPEED,
      bounces: 0, until: this.now + PONG_MAX_MS,
    });
    const f = this.fighter(owner);
    if (first && this.alive(f)) {
      const rig = this.rigAt(owner);
      this.fx(owner).eyeOpen(rig.x, rig.y);
      Sfx.playAt('thunder', f.x, { rate: 1.2, volume: 0.9 });
      this.text(owner, f.x, f.y - 92, '👁 EYE OF THE STORM', TMP.bolt);
    }
    this.text(owner, victim.x, victim.y - 56, '🏓 CURRENTS');
  }

  private endPong(victim: Fighter): void {
    const i = this.pongs.findIndex((p) => p.victim === victim);
    if (i >= 0) this.pongs.splice(i, 1);
  }

  private updatePongs(): void {
    const b = this.api.bounds;
    for (let i = this.pongs.length - 1; i >= 0; i--) {
      const p = this.pongs[i];
      const v = p.victim;
      if (!this.alive(v) || this.now >= p.until || v.knockbackImmune || v.unstoppable) {
        this.pongs.splice(i, 1);
        continue;
      }
      const body = this.body(v);
      let nx = 0;
      let ny = 0;
      if (p.vx < 0 && body.left <= b.x + 1.5) { p.vx = -p.vx; nx = 1; }
      else if (p.vx > 0 && body.right >= b.right - 1.5) { p.vx = -p.vx; nx = -1; }
      if (p.vy < 0 && body.top <= b.y + 1.5) { p.vy = -p.vy; ny = 1; }
      else if (p.vy > 0 && body.bottom >= b.bottom - 1.5) { p.vy = -p.vy; ny = -1; }
      if (nx !== 0 || ny !== 0) {
        p.bounces += 1;
        body.reset(v.x + nx * 3, v.y + ny * 3);
        this.wallSlam(p.owner, v, nx, ny, true);
        if (p.bounces >= PONG_BOUNCES) {
          this.pongs.splice(i, 1);
          this.shove(p.owner, v, p.vx * 0.4, p.vy * 0.4, 200);
          this.text(p.owner, v.x, v.y - 60, 'CURRENTS END', TMP.gust);
          continue;
        }
      }
      body.setVelocity(p.vx, p.vy);
    }
  }

  // ── Fronts ─────────────────────────────────────────────────────────────────

  private nearestFront(owner: Owner, x: number, y: number): Front | null {
    let best: Front | null = null;
    let bd = Infinity;
    for (const fr of this.fronts) {
      if (fr.owner !== owner || fr.fadeAt !== 0) continue;
      const cx = fr.x + Math.cos(fr.ang) * FRONT_LEN / 2;
      const cy = fr.y + Math.sin(fr.ang) * FRONT_LEN / 2;
      const d = Phaser.Math.Distance.Between(x, y, cx, cy);
      if (d < bd) { bd = d; best = fr; }
    }
    return best;
  }

  private updateFronts(): void {
    for (let i = this.fronts.length - 1; i >= 0; i--) {
      const fr = this.fronts[i];
      if (fr.fadeAt !== 0 && this.now >= fr.fadeAt) this.fronts.splice(i, 1);
    }
    // Every body on the floor, inside a live lane, is carried. Yours too.
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.alive(f) || this.side(owner).airborne || this.bodyDriven(f)) continue;
      const body = this.body(f);
      for (const fr of this.fronts) {
        if (fr.fadeAt !== 0 || !this.inFront(fr, f.x, f.y)) continue;
        body.setVelocity(body.velocity.x + Math.cos(fr.ang) * FRONT_PUSH, body.velocity.y + Math.sin(fr.ang) * FRONT_PUSH);
      }
    }
  }

  // ── Currents ───────────────────────────────────────────────────────────────

  private nearestCurrent(x: number, y: number, within: number): Current | null {
    let best: Current | null = null;
    let bd = within;
    for (const c of this.currents) {
      const d = Phaser.Math.Distance.Between(x, y, c.x, c.y);
      if (d <= bd) { bd = d; best = c; }
    }
    return best;
  }

  private updateCurrents(): void {
    const anyTempest = this.is('player') || this.is('npc');
    if (!anyTempest) { this.currents = []; this.respawnAt = []; return; }
    for (let i = this.currents.length - 1; i >= 0; i--) {
      if (this.now >= this.currents[i].diesAt) {
        this.currents.splice(i, 1);
        this.respawnAt.push(this.now + CURRENT_RESPAWN_MS);
      }
    }
    while (this.currents.length + this.respawnAt.length < CURRENT_COUNT) this.respawnAt.push(this.now + 300);
    for (let i = this.respawnAt.length - 1; i >= 0; i--) {
      if (this.now < this.respawnAt[i]) continue;
      this.respawnAt.splice(i, 1);
      this.spawnCurrent();
    }
  }

  private spawnCurrent(): void {
    const b = this.api.bounds;
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 12; tries++) {
      x = Phaser.Math.FloatBetween(b.x + CURRENT_PAD, b.right - CURRENT_PAD);
      y = Phaser.Math.FloatBetween(b.y + CURRENT_PAD, b.bottom - CURRENT_PAD);
      const clear = this.currents.every((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) > 150);
      if (clear) break;
    }
    this.currents.push({ x, y, bornAt: this.now, diesAt: this.now + CURRENT_LIFE_MS, seed: Math.random() * 999 });
  }

  // ── Shop upgrades ──────────────────────────────────────────────────────────

  /** Click+ Hailstorm: the stone bursts into shrapnel, fanned around the way it was flying. */
  private shatterHail(owner: Owner, x: number, y: number, ang: number): void {
    for (let i = 0; i < SHRAPNEL_COUNT; i++) {
      const a = ang + (i / SHRAPNEL_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      this.shrapnel.push({
        owner, x, y, vx: Math.cos(a) * SHRAPNEL_SPEED, vy: Math.sin(a) * SHRAPNEL_SPEED,
        travelled: 0, seed: Math.random() * 999,
      });
    }
    this.fx(owner).shatter(x, y, GALE_R);
    Sfx.playAt('ice-shatter', x, { rate: 1.15, volume: 0.6 });
  }

  /** Q+ Herald of Doom: cut in on the broadcast. Once per fall; the weather follows the landing. */
  private herald(owner: Owner): void {
    const s = this.side(owner);
    if (s.heralded || !this.up(owner, 'q')) return;
    s.heralded = true;
    new HeraldBroadcast(this.api.scene, this.col(owner)).play(this.api.width, HERALD_MS);
    Sfx.playAt('thunder', this.fighter(owner).x, { rate: 0.8, volume: 0.8 });
  }

  private startWeather(owner: Owner): void {
    const f = this.fighter(owner);
    // A second Herald from the same storm just extends the first.
    const old = this.weathers.find((w) => w.owner === owner);
    if (old) { old.until = this.now + WEATHER_MS; return; }
    this.weathers.push({
      owner, start: this.now, until: this.now + WEATHER_MS,
      nextBolt: this.now + 400, nextHail: this.now, nextPuddle: this.now + 300,
    });
    this.api.scene.cameras.main.flash(220, 255, 250, 210);
    Sfx.playAt('thunder', f.x, { rate: 0.6, volume: 1 });
    Sfx.playAt('rain', f.x, { volume: 0.7 });
    this.text(owner, f.x, f.y - 112, '⛈ THE WEATHER TURNS', TMP.bolt);
  }

  /** A point to drop something on: half the time on a foe (give or take), otherwise anywhere. */
  private weatherPoint(owner: Owner, pad: number): { x: number; y: number } {
    const b = this.api.bounds;
    const foes = this.foes(owner);
    if (foes.length > 0 && Math.random() < 0.5) {
      const t = foes[Math.floor(Math.random() * foes.length)];
      return {
        x: Phaser.Math.Clamp(t.x + (Math.random() - 0.5) * 70, b.x + pad, b.right - pad),
        y: Phaser.Math.Clamp(t.y + (Math.random() - 0.5) * 70, b.y + pad, b.bottom - pad),
      };
    }
    return { x: Phaser.Math.FloatBetween(b.x + pad, b.right - pad), y: Phaser.Math.FloatBetween(b.y + pad, b.bottom - pad) };
  }

  private updateUpgrades(delta: number): void {
    const dt = delta / 1000;
    const b = this.api.bounds;

    // Click+ — shrapnel: one hit and it is spent; it melts at the end of its range or a wall.
    for (let i = this.shrapnel.length - 1; i >= 0; i--) {
      const sh = this.shrapnel[i];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.travelled += SHRAPNEL_SPEED * dt;
      const out = sh.x < b.x || sh.x > b.right || sh.y < b.y || sh.y > b.bottom;
      const hit = this.foes(sh.owner).find((t) => Phaser.Math.Distance.Between(sh.x, sh.y, t.x, t.y) <= SHRAPNEL_HIT_R);
      if (hit) {
        hit.takeDamage(SHRAPNEL_DAMAGE);
        this.api.spawnHitFlash(hit.x, hit.y, TMP.ice);
        Sfx.playAt('ice-shard', hit.x, { volume: 0.4 });
      }
      if (hit || out || sh.travelled >= SHRAPNEL_RANGE) this.shrapnel.splice(i, 1);
    }

    // E+ — static lines bite whoever stands on them, every half second each. Floor only.
    for (let i = this.statics.length - 1; i >= 0; i--) {
      const st = this.statics[i];
      if (this.now >= st.until) { this.statics.splice(i, 1); continue; }
      for (const t of this.foes(st.owner)) {
        if (t.levitating || !this.onLine(st.pts, t.x, t.y, STATIC_HALF_W)) continue;
        const last = st.lastTick.get(t) ?? -Infinity;
        if (this.now - last < STATIC_TICK_MS) continue;
        st.lastTick.set(t, this.now);
        t.takeDamage(STATIC_DAMAGE);
        this.fx(st.owner).staticZap(t.x, t.y);
        Sfx.playAt('zap', t.x, { rate: 1.4, volume: 0.35 });
        this.text(st.owner, t.x, t.y - 40, `⚡ STATIC ${STATIC_DAMAGE}`, TMP.bolt);
      }
    }

    // E+ — thunderclouds strike their whole circle on a clock.
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      if (this.now >= c.until) { this.clouds.splice(i, 1); continue; }
      if (this.now < c.nextStrikeAt) continue;
      c.nextStrikeAt += CLOUD_STRIKE_MS;
      const fx = this.fx(c.owner);
      fx.strike(c.x, c.y, CLOUD_R * 0.45, c.y - CLOUD_LIFT);
      fx.ring(c.x, c.y, 20, CLOUD_R, 340, TMP.bolt, 2.5, 4);
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * Math.PI * 2;
        const d = CLOUD_R * (0.4 + Math.random() * 0.55);
        fx.strike(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.6, 22, c.y - CLOUD_LIFT);
      }
      Sfx.playAt('thunder', c.x, { rate: 1.3, volume: 0.6 });
      for (const t of this.foes(c.owner)) {
        if (Phaser.Math.Distance.Between(c.x, c.y, t.x, t.y) > CLOUD_R) continue;
        t.takeDamage(CLOUD_STRIKE_DAMAGE, { aoe: true });
        this.api.spawnHitFlash(t.x, t.y, TMP.bolt);
        this.text(c.owner, t.x, t.y - 40, `⛈ ${CLOUD_STRIKE_DAMAGE}`, TMP.bolt);
      }
    }

    // Q+ — the Herald's weather: bolts, hail and puddles on their own clocks while it lasts.
    for (let i = this.weathers.length - 1; i >= 0; i--) {
      const w = this.weathers[i];
      // Kept a moment past the end so the sky can fade out.
      if (this.now >= w.until + WX_FADE_MS) { this.weathers.splice(i, 1); continue; }
      if (this.now >= w.until) continue;
      while (this.now >= w.nextBolt) {
        w.nextBolt += WX_BOLT_MS * (0.7 + Math.random() * 0.6);
        const p = this.weatherPoint(w.owner, 30);
        this.bolts.push({ owner: w.owner, x: p.x, y: p.y, at: this.now + WX_BOLT_WARN_MS });
        this.fx(w.owner).strikeWarn(p.x, p.y, WX_BOLT_R, WX_BOLT_WARN_MS);
      }
      while (this.now >= w.nextHail) {
        w.nextHail += WX_HAIL_MS;
        const foes = this.foes(w.owner);
        // A quarter of the hail is dropped over somebody; the rest falls where it falls.
        const over = foes.length > 0 && Math.random() < 0.25 ? foes[Math.floor(Math.random() * foes.length)] : null;
        const x = over ? over.x - WX_HAIL_DRIFT * ((over.y - b.y) / WX_HAIL_SPEED) + (Math.random() - 0.5) * 40
          : Phaser.Math.FloatBetween(b.x - 60, b.right);
        this.hail.push({
          owner: w.owner, x, y: b.y - 12,
          vx: WX_HAIL_DRIFT, vy: WX_HAIL_SPEED * (0.9 + Math.random() * 0.2),
          rot: Math.random() * 6, seed: Math.random() * 999,
        });
      }
      while (this.now >= w.nextPuddle) {
        w.nextPuddle += WX_PUDDLE_MS;
        const p = this.weatherPoint(w.owner, PUDDLE_R);
        this.puddles.push({ owner: w.owner, x: p.x, y: p.y, bornAt: this.now, until: this.now + PUDDLE_LIFE_MS, seed: Math.random() * 999 });
      }
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bo = this.bolts[i];
      if (this.now < bo.at) continue;
      this.bolts.splice(i, 1);
      this.fx(bo.owner).strike(bo.x, bo.y, WX_BOLT_R, b.y - 40);
      Sfx.playAt('thunder', bo.x, { rate: 1.5, volume: 0.45 });
      for (const t of this.foes(bo.owner)) {
        if (Phaser.Math.Distance.Between(bo.x, bo.y, t.x, t.y) > WX_BOLT_R) continue;
        t.takeDamage(WX_BOLT_DAMAGE, { aoe: true });
        this.api.spawnHitFlash(t.x, t.y, TMP.bolt);
        this.text(bo.owner, t.x, t.y - 40, `⚡ ${WX_BOLT_DAMAGE}`, TMP.bolt);
      }
    }

    for (let i = this.hail.length - 1; i >= 0; i--) {
      const h = this.hail[i];
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += dt * 5;
      if (h.y > b.bottom + 12) { this.hail.splice(i, 1); continue; }
      if (h.y < b.y) continue;
      const hit = this.foes(h.owner).find((t) => Phaser.Math.Distance.Between(h.x, h.y, t.x, t.y) <= WX_HAIL_HIT_R);
      if (!hit) continue;
      this.hail.splice(i, 1);
      hit.takeDamage(WX_HAIL_DAMAGE);
      this.api.spawnHitFlash(hit.x, hit.y, TMP.ice);
      this.fx(h.owner).shatter(h.x, h.y, 22);
      Sfx.playAt('ice-shard', hit.x, { rate: 1.2, volume: 0.4 });
      this.text(h.owner, hit.x, hit.y - 40, `🧊 HAIL ${WX_HAIL_DAMAGE}`, TMP.ice);
    }

    // Puddles slow whoever is standing in one: the duel pair through the speed mults below,
    // husks through `tempestSlowMult`, which this kit is the only writer of.
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      if (this.now >= this.puddles[i].until) this.puddles.splice(i, 1);
    }
    const nowSlowed = new Set<Fighter>();
    for (const pd of this.puddles) {
      for (const t of this.foes(pd.owner)) {
        if (t.levitating || t.unstoppable) continue;
        const dx = (t.x - pd.x) / PUDDLE_R;
        const dy = (t.y - pd.y) / (PUDDLE_R * 0.625);
        if (dx * dx + dy * dy <= 1) nowSlowed.add(t);
      }
    }
    for (const f of this.slowed) if (!nowSlowed.has(f)) f.tempestSlowMult = 1;
    for (const f of nowSlowed) f.tempestSlowMult = PUDDLE_SLOW;
    this.slowed = nowSlowed;
  }

  /** Within `halfW` of the polyline `pts`. */
  private onLine(pts: { x: number; y: number }[], x: number, y: number, halfW: number): boolean {
    if (pts.length === 1) return Phaser.Math.Distance.Between(pts[0].x, pts[0].y, x, y) <= halfW;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const c = pts[i];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const L = dx * dx + dy * dy || 1;
      const k = Phaser.Math.Clamp(((x - a.x) * dx + (y - a.y) * dy) / L, 0, 1);
      if (Phaser.Math.Distance.Between(a.x + dx * k, a.y + dy * k, x, y) <= halfW) return true;
    }
    return false;
  }

  // ── Mastery ────────────────────────────────────────────────────────────────

  private masteryOn(owner: Owner): boolean {
    return this.is(owner) && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** Which slot Gale Uppercut was dropped on, or null. */
  private uppercutSlot(owner: Owner): 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const sl of ['r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(sl) : this.api.npcMasteryBindFor(sl);
      if (bind === UPPERCUT_ID) return sl;
    }
    return null;
  }

  private uppercutReady(owner: Owner): boolean {
    return this.now - this.side(owner).upLastAt >= UPPERCUT_CD_MS;
  }

  /**
   * Gale Uppercut — dash at the aim and drive a fist of wind up under the first foe met. Small
   * damage; the point is the throw (see `uppercut`). Its own clock, so it is relayed rather than
   * cast: a relayed press (`relayed`) skips the clock, the peer's machine already checked it.
   */
  doUppercut(owner: Owner, tx: number, ty: number, relayed = false): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) return;
    if (!relayed && !this.uppercutReady(owner)) {
      const left = Math.ceil((UPPERCUT_CD_MS - (this.now - s.upLastAt)) / 1000);
      this.deny(owner, '', `🌪 UPPERCUT ${left}s`);
      return;
    }
    if (s.slam || s.grab) { this.deny(owner, '', s.grab ? 'HOLDING' : 'SLAMMING'); return; }
    s.aimX = tx; s.aimY = ty;
    s.upLastAt = this.now;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const speed = UPPERCUT_DASH / (UPPERCUT_DASH_MS / 1000);
    s.upDashUntil = this.now + UPPERCUT_DASH_MS;
    s.upDashVx = Math.cos(ang) * speed;
    s.upDashVy = Math.sin(ang) * speed;
    s.rollUntil = 0;
    s.dashUntil = 0;
    this.fx(owner).burst(f.x, f.y, 28);
    this.avatar(owner)?.play('dash', ang, UPPERCUT_DASH_MS + 60);
    Sfx.playAt('whoosh', f.x, { rate: 1.15, volume: 0.85 });
    if (owner === 'player') this.api.broadcast(UPPERCUT_ID);
  }

  private updateUppercuts(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.upDashUntil <= 0) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.now >= s.upDashUntil) {
        if (f?.active && this.now >= s.upDashUntil) this.body(f).setVelocity(0, 0);
        s.upDashUntil = 0;
        continue;
      }
      this.body(f).setVelocity(s.upDashVx, s.upDashVy);
      s.trailAccum += delta;
      if (s.trailAccum >= 40) {
        s.trailAccum = 0;
        this.fx(owner).streak(f.x, f.y, Math.atan2(s.upDashVy, s.upDashVx), 38);
      }
      const victim = this.foes(owner).find((t) => !this.knocks.some((k) => k.victim === t)
        && Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= UPPERCUT_HIT_R);
      if (!victim) continue;
      s.upDashUntil = 0;
      this.body(f).setVelocity(0, 0);
      this.uppercut(owner, victim);
    }
  }

  /** The fist lands: a small hit, and the body goes up. */
  private uppercut(owner: Owner, victim: Fighter): void {
    victim.takeDamage(UPPERCUT_DAMAGE);
    this.api.spawnHitFlash(victim.x, victim.y, TMP.white);
    this.fx(owner).uppercut(victim.x, victim.y);
    this.avatar(owner)?.play('raise', undefined, 420);
    Sfx.playAt('hit-heavy', victim.x, { rate: 1.25, volume: 0.85 });
    Sfx.playAt('gust', victim.x, { rate: 0.8, volume: 0.8 });
    if (!this.alive(victim)) return;
    if (victim.knockbackImmune || victim.unstoppable) {
      this.text(owner, victim.x, victim.y - 44, 'UNMOVABLE', TMP.gust);
      return;
    }
    this.endPong(victim);
    const si = this.shoves.findIndex((sh) => sh.victim === victim);
    if (si >= 0) this.shoves.splice(si, 1);
    const vz = UPPERCUT_VZ * this.liftMult();
    const vo = this.ownerOf(victim);
    if (vo && this.is(vo)) {
      // Another Tempest: its own height sim carries it, and its own landing is the slam.
      const vs = this.side(vo);
      vs.airborne = true;
      vs.z = Math.max(vs.z, 1);
      vs.vz = Math.max(vs.vz, 0) + vz;
      vs.knockedBy = owner;
    } else {
      const old = this.knocks.find((k) => k.victim === victim);
      if (old) old.vz = Math.max(old.vz, 0) + vz;
      else this.knocks.push({ owner, victim, z: 1, vz, ax: victim.x, ay: victim.y, boosts: 0 });
    }
    this.text(owner, victim.x, victim.y - 48, `🌪 UPPERCUT ${UPPERCUT_DAMAGE}`, TMP.white);
  }

  /** A Gale Burst going off under a body this side threw: it goes higher. */
  private juggle(owner: Owner, x: number, y: number): void {
    for (const k of this.knocks) {
      if (k.owner !== owner || !this.alive(k.victim)) continue;
      if (Phaser.Math.Distance.Between(x, y, k.victim.x, k.victim.y) > GALE_R + 8) continue;
      k.vz = Math.max(k.vz, 0) + KNOCK_BOOST * this.liftMult();
      k.boosts += 1;
      this.text(owner, k.victim.x, k.victim.y - 52, '⬆ JUGGLED', TMP.white);
    }
    for (const vo of BOTH) {
      const vs = this.side(vo);
      if (vs.knockedBy !== owner || !vs.airborne) continue;
      const v = this.fighter(vo);
      if (!this.alive(v) || Phaser.Math.Distance.Between(x, y, v.x, v.y) > GALE_R + 8) continue;
      vs.vz = Math.max(vs.vz, 0) + KNOCK_BOOST * this.liftMult();
      this.text(owner, v.x, v.y - 52, '⬆ JUGGLED', TMP.white);
    }
  }

  /** The bodies Gale Uppercut threw: up under one gravity, held at the anchor, and dropped. */
  private updateKnocks(delta: number): void {
    const dt = delta / 1000;
    const b = this.api.bounds;
    for (let i = this.knocks.length - 1; i >= 0; i--) {
      const k = this.knocks[i];
      const v = k.victim;
      if (!v.active || v.hp <= 0) {
        if (v.active) { v.airborne = false; v.levitating = false; }
        this.knocks.splice(i, 1);
        continue;
      }
      k.vz -= GRAVITY * dt;
      k.vz = Math.max(k.vz, -KNOCK_TERMINAL);
      k.z += k.vz * dt;
      // Online, an opponent's replica is placed by their own stream (their machine lifts them off
      // the relayed uppercut); here the fall is only timed, so the slam can be dealt and relayed.
      const ghost = this.api.isOnline && v === this.api.npc;
      if (k.z <= 0) {
        this.knocks.splice(i, 1);
        if (!ghost) {
          this.body(v).reset(k.ax, k.ay);
          v.airborne = false;
          v.levitating = false;
        }
        this.knockDamage(k.owner, v, -k.vz, k.ax, k.ay);
        continue;
      }
      if (ghost) continue;
      // Off the floor: melee and floor hazards cannot reach it, same as a flier.
      v.airborne = true;
      v.levitating = true;
      this.body(v).reset(k.ax, k.ay - this.knockLift(k, b));
    }
  }

  /** How far a thrown body is drawn above its anchor: its height, but never off the top of the arena. */
  private knockLift(k: Knock, b: Phaser.Geom.Rectangle): number {
    return Math.min(k.z * LIFT, Math.max(0, k.ay - b.y - 24));
  }

  /** A thrown body meets the floor: the slam is read off how fast it was falling. */
  private knockDamage(owner: Owner, v: Fighter, speed: number, x: number, y: number): void {
    const k = Phaser.Math.Clamp(speed / KNOCK_FALL_FULL, 0, 1);
    const dmg = Math.round(KNOCK_FALL_MIN + KNOCK_FALL_SPAN * k);
    v.takeDamage(dmg, { aoe: true });
    this.api.spawnHitFlash(v.x, v.y, TMP.white);
    this.fx(owner).knockSlam(x, y, k);
    this.api.scene.cameras.main.shake(80 + k * 160, 0.002 + k * 0.005);
    Sfx.playAt('stone-slam', x, { rate: 1.2 - k * 0.4, volume: 0.6 + k * 0.4 });
    this.text(owner, x, y - 50, `💥 SLAMMED ${dmg}`, TMP.white);
    if (!this.alive(v) && owner === 'player') this.api.recordMasteryStat('slamKills', 1);
  }

  /**
   * Unrelenting Storm. A very tame Herald's weather on for the whole match: a rare bolt out of a
   * clear patch, a hailstone now and then, a couple of puddles, and a breeze that leans every foe
   * toward the right of the screen. It never touches the lift multiplier — no extra elevation.
   */
  private updateStorm(delta: number): void {
    const dt = delta / 1000;
    const b = this.api.bounds;
    let any = false;
    for (const owner of BOTH) {
      if (!this.masteryOn(owner) || !this.alive(this.fighter(owner))) continue;
      any = true;
      const s = this.side(owner);
      if (s.ambBolt === 0) {
        s.ambBolt = this.now + AMB_BOLT_MS * 0.5 + Math.random() * AMB_BOLT_SPAN_MS;
        s.ambHail = this.now + AMB_HAIL_MS;
        s.ambPuddle = this.now + 2500;
      }
      if (this.now >= s.ambBolt) {
        s.ambBolt = this.now + AMB_BOLT_MS + Math.random() * AMB_BOLT_SPAN_MS;
        // Rare and random: it is not aimed at anybody.
        const x = Phaser.Math.FloatBetween(b.x + 40, b.right - 40);
        const y = Phaser.Math.FloatBetween(b.y + 60, b.bottom - 40);
        this.bolts.push({ owner, x, y, at: this.now + WX_BOLT_WARN_MS * 1.6 });
        this.fx(owner).strikeWarn(x, y, WX_BOLT_R, WX_BOLT_WARN_MS * 1.6);
      }
      if (this.now >= s.ambHail) {
        s.ambHail = this.now + AMB_HAIL_MS * (0.5 + Math.random());
        // Spotty: as often as not the cloud holds it.
        if (Math.random() < 0.55) {
          this.hail.push({
            owner, x: Phaser.Math.FloatBetween(b.x - 40, b.right), y: b.y - 12,
            vx: WX_HAIL_DRIFT * 0.6, vy: WX_HAIL_SPEED * (0.85 + Math.random() * 0.2),
            rot: Math.random() * 6, seed: Math.random() * 999,
          });
        }
      }
      if (this.now >= s.ambPuddle) {
        s.ambPuddle = this.now + AMB_PUDDLE_MS * (0.7 + Math.random() * 0.6);
        if (this.puddles.filter((pd) => pd.owner === owner && pd.ambient).length < AMB_PUDDLE_MAX) {
          this.puddles.push({
            owner, x: Phaser.Math.FloatBetween(b.x + PUDDLE_R, b.right - PUDDLE_R),
            y: Phaser.Math.FloatBetween(b.y + 70, b.bottom - PUDDLE_R),
            bornAt: this.now, until: this.now + AMB_PUDDLE_LIFE_MS, seed: Math.random() * 999, ambient: true,
          });
        }
      }
      // The breeze. A nudge to the position rather than the velocity, so a body nobody is
      // steering this frame drifts at the breeze's speed instead of building it up.
      for (const t of this.foes(owner)) {
        if (t.knockbackImmune || t.unstoppable || this.bodyDriven(t) || this.shoves.some((sh) => sh.victim === t)) continue;
        t.x = Math.min(b.right - 18, t.x + BREEZE * dt);
      }
    }
    // The bank: in with the storm, and dark while anyone's Herald weather is live.
    const target = any ? 1 : 0;
    this.bankK += (target - this.bankK) * Math.min(1, dt * 2);
    const darkT = this.weatherLive() ? 1 : 0;
    this.bankDark += (darkT - this.bankDark) * Math.min(1, dt * 1.5);
  }

  /** The four mastery stats that are not counted where their hit lands. */
  private updateMasteryStats(delta: number): void {
    if (!this.is('player')) return;
    const s = this.sides.player;
    if (s.airborne && this.alive(this.api.player)) {
      s.airMs += delta;
      // Banked a whole second at a time, so the save is written once a second, not every frame.
      while (s.airMs >= 1000) { s.airMs -= 1000; this.api.recordMasteryStat('airSeconds', 1); }
    }
    // A kill inside your own forecast storm (Herald of Doom, Q+): every foe gets a listener once,
    // and the storm is checked at the moment of death, not when the listener went on.
    for (const t of this.api.enemies) {
      if (!t || !t.active || this.watched.has(t)) continue;
      this.watched.add(t);
      t.once('defeated', () => {
        if (this.is('player') && this.weathers.some((w) => w.owner === 'player' && this.now < w.until)) {
          this.api.recordMasteryStat('forecastKills', 1);
        }
      });
    }
  }

  /**
   * The bot's uppercut. Fired here because it runs off the kit's own clock: on a foe inside the
   * dash with nothing better going on, and above all on one already standing by a wall — the
   * throw holds them there for the juggle and the slam.
   */
  private updateNpcUppercut(): void {
    if (this.api.isOnline || !this.uppercutSlot('npc') || !this.uppercutReady('npc')) return;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f) || s.grab || s.slam || s.diving || s.rollUntil > this.now || s.dashUntil > this.now) return;
    const t = this.foes('npc')[0];
    if (!t || this.knocks.some((k) => k.victim === t)) return;
    if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > UPPERCUT_DASH + 20) return;
    this.doUppercut('npc', t.x, t.y);
  }

  /** Online: the opponent threw an uppercut; their replica dashes after it on this machine. */
  replayNet(id: string, tx: number, ty: number): void {
    if (id === UPPERCUT_ID) this.doUppercut('npc', tx, ty, true);
  }

  // ── Per frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.is('player');
    const npcIs = this.is('npc');
    if (!playerIs && !npcIs && !this.hasLiveState()) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateCharges();
    this.updateCurrents();
    this.updateShots(delta);
    this.updateRolls(delta);
    this.updateDashes(delta);
    this.updateUppercuts(delta);
    this.updateHeights(delta);
    this.updateKnocks(delta);
    this.updateGrabs();
    this.updateShoves();
    this.updatePongs();
    this.updateFronts();
    this.updateUpgrades(delta);
    this.updateStorm(delta);
    this.updateMasteryStats(delta);
    this.updateNpcUppercut();
    this.updateFlags();
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.paintSky();
    this.pushStatuses(playerIs);
  }

  private hasLiveState(): boolean {
    return this.shots.length > 0 || this.shoves.length > 0 || this.pongs.length > 0
      || this.shrapnel.length > 0 || this.statics.length > 0 || this.clouds.length > 0 || this.bolts.length > 0
      || this.hail.length > 0 || this.puddles.length > 0 || this.weathers.length > 0 || this.slowed.size > 0
      || this.knocks.length > 0 || this.bankK > 0.01
      || BOTH.some((o) => this.sides[o].airborne || this.sides[o].grab !== null || this.sides[o].dodgeGiven);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. Fronts and currents are floor; shots and gauges ride over the bodies.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    // The Herald's weather sits over the fight but under the HUD.
    if (!this.skyGfx) this.skyGfx = scene.add.graphics().setDepth(12);
  }

  /** The Flight passive is two flags on the body, written here every frame. */
  private updateFlags(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!f || !f.active) continue;
      // A body Gale Uppercut threw keeps the flags `updateKnocks` gave it.
      if (this.knocks.some((k) => k.victim === f)) continue;
      const s = this.side(owner);
      if (s.airborne) {
        f.airborne = true;
        f.levitating = true;
      } else if (f.airborne) {
        f.airborne = false;
        f.levitating = false;
      }
    }
  }

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const f = this.fighter(owner);
      let av = this.avatar(owner);
      if (!is || !f || !f.active) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new TempestAvatar(this.api.scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.sides[owner];
      const aim = owner === 'player'
        ? { x: s.aimX, y: s.aimY }
        : (this.foes(owner)[0] ?? { x: s.aimX, y: s.aimY });
      av.setFacing(Math.atan2(aim.y - f.y, aim.x - f.x));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.setAir(s.airborne);
      av.setFall(s.airborne && s.vz < 0 ? Math.min(1, -s.vz / LAND_SPEED_FULL) : 0);
      const eye = this.pongs.some((p) => p.owner === owner);
      av.setEye(eye);
      s.eyeWasOpen = eye;
      // Arms out for balance in the air; the grapple's reach is set by `updateGrabs` each frame.
      if (!s.grab) av.setHold(s.airborne && !s.slam ? 'ride' : null);
      av.setIntensity(eye ? 1.3 : 1);
      const rig = this.rigAt(owner);
      av.update(delta, rig.x, rig.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    for (const pd of this.puddles) {
      const born = Phaser.Math.Clamp((this.now - pd.bornAt) / 300, 0, 1);
      const fade = Phaser.Math.Clamp((pd.until - this.now) / 600, 0, 1);
      rainPuddle(g, this.col(pd.owner), pd.x, pd.y, PUDDLE_R * (0.6 + born * 0.4), fade, t, pd.seed);
    }
    for (const st of this.statics) {
      const fade = Phaser.Math.Clamp((st.until - this.now) / 700, 0, 1);
      staticTrail(g, this.col(st.owner), st.pts, STATIC_HALF_W, fade, t, st.seed);
    }

    for (const c of this.currents) {
      const life = Phaser.Math.Clamp((c.diesAt - this.now) / 1200, 0, 1);
      const born = Phaser.Math.Clamp((this.now - c.bornAt) / 400, 0, 1);
      paintCurrent(g, this.pcol, c.x, c.y, CURRENT_R * born, 0.5 + life * 0.5, { t, seed: c.seed, life });
    }
    for (const fr of this.fronts) {
      const fade = fr.fadeAt === 0 ? 1 : Phaser.Math.Clamp((fr.fadeAt - this.now) / FRONT_FADE_MS, 0, 1);
      const born = Phaser.Math.Clamp((this.now - fr.bornAt) / 360, 0, 1);
      frontLane(g, this.col(fr.owner), fr.x, fr.y, fr.ang, FRONT_LEN * born, FRONT_HALF_W, fade, { t, seed: fr.seed });
    }
    // Shadows under every lifted body: the flier's own, and anyone it is holding up with it.
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f) || !s.airborne) continue;
      const rig = this.rigAt(owner);
      liftShadow(g, this.col(owner), f.x, f.y, rig.lift, f.alpha);
      if (s.grab && this.alive(s.grab.victim)) {
        const v = s.grab.victim;
        liftShadow(g, this.col(owner), v.x, v.y, rig.lift, v.alpha);
      }
    }
    // Mastery: a thrown body's shadow stays on its anchor while the body itself is lifted.
    const b = this.api.bounds;
    for (const k of this.knocks) {
      if (!this.alive(k.victim)) continue;
      liftShadow(g, this.col(k.owner), k.ax, k.ay, this.knockLift(k, b), 1);
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    for (const s of this.shots) {
      const ang = Math.atan2(s.vy, s.vx);
      gustLayered(g, this.col(s.owner), s.x - Math.cos(ang) * 30, s.y - Math.sin(ang) * 30, ang, 46, 7, 0.95,
        { phase: t * 10, seed: s.seed, curl: 0.6 });
      if (s.hail) {
        hailStone(g, this.col(s.owner), s.x, s.y, 8, t * 9 + s.seed, 1, s.seed);
      } else {
        g.fillStyle(this.col(s.owner)(TMP.white), 0.9);
        g.fillCircle(s.x, s.y, 5);
        g.fillStyle(this.col(s.owner)(TMP.sky), 0.35);
        g.fillCircle(s.x, s.y, 9);
      }
      // The point it will go off at: a faint ring at the cursor, so the player can see the fuse.
      g.lineStyle(1.2, this.col(s.owner)(TMP.gust), 0.3);
      g.strokeCircle(s.tx, s.ty, GALE_R * 0.5);
    }

    for (const sh of this.shrapnel) {
      iceShard(g, this.col(sh.owner), sh.x, sh.y, Math.atan2(sh.vy, sh.vx), 11, 1 - (sh.travelled / SHRAPNEL_RANGE) * 0.5);
    }
    for (const c of this.clouds) {
      const born = Phaser.Math.Clamp((this.now - c.bornAt) / 350, 0, 1);
      const fade = Phaser.Math.Clamp((c.until - this.now) / 500, 0, 1);
      const charge = 1 - Phaser.Math.Clamp((c.nextStrikeAt - this.now) / CLOUD_STRIKE_MS, 0, 1);
      thunderCloud(g, this.col(c.owner), c.x, c.y, CLOUD_R, CLOUD_LIFT * (0.5 + born * 0.5), born * fade, t, charge, c.seed);
    }
    for (const h of this.hail) {
      hailStone(g, this.col(h.owner), h.x, h.y, 6, h.rot, 0.95, h.seed);
    }

    const b = this.api.bounds;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f) || !s.airborne) continue;
      const rig = this.rigAt(owner);
      // The acceleration bar, to the right of the character.
      const speedK = s.vz < 0 ? Math.min(1, -s.vz / LAND_SPEED_FULL) : 0;
      const heightK = Math.min(1, s.z / 520);
      // No ceiling: above the top of the screen the character is a pin on the edge, gauge and all.
      const off = rig.y < b.y + 10;
      if (off) {
        const px = rig.x;
        const py = b.y + 22;
        const c = this.col(owner);
        g.fillStyle(c(TMP.ink), 0.8);
        g.fillCircle(px, py, 13);
        g.fillStyle(c(TMP.storm), 1);
        g.fillCircle(px, py, 10);
        g.fillStyle(c(TMP.sky), 1);
        g.fillCircle(px - 2, py - 2, 6);
        for (let i = 0; i < 3; i++) {
          const k = (t * 1.5 + i / 3) % 1;
          chevron(g, c(TMP.white), px, py - 16 - k * 8, 6, 3, (1 - k) * 0.9, 2);
        }
        fallGauge(g, c, px + 26, py + 34, speedK, heightK, 0.95);
      } else {
        fallGauge(g, this.col(owner), rig.x + 42, rig.y, speedK, heightK, 0.95);
      }
      // R+ Float: a cushion of wind under a body a front is holding up.
      if (this.floating(owner) && !off) {
        swirl(g, this.col(owner)(TMP.gust), rig.x, rig.y + 22, 26, 0.7, { arms: 4, turns: 0.6, phase: t * 6, squash: 0.35 });
        g.lineStyle(1.6, this.col(owner)(TMP.white), 0.5 + Math.sin(t * 8) * 0.2);
        g.strokeEllipse(rig.x, rig.y + 24, 50, 12);
      }
      // Rising air under a body that is going up.
      if (s.vz > 60) {
        swirl(g, this.col(owner)(TMP.white), rig.x, rig.y + 26, 22, 0.5, { arms: 3, turns: 0.8, phase: -t * 8, squash: 0.5 });
      }
      // The grapple: a cord of wind from the hand to the held body, lit while the hold lasts.
      const gr = s.grab;
      if (gr && this.alive(gr.victim)) {
        const v = gr.victim;
        const hold = Phaser.Math.Clamp((gr.releaseAt - this.now) / FORECAST_HOLD_MS, 0, 1);
        g.lineStyle(3, this.col(owner)(TMP.gust), 0.5);
        g.lineBetween(rig.x, rig.y, v.x, v.y - rig.lift * 0.4);
        swirl(g, this.col(owner)(TMP.white), v.x, v.y - rig.lift * 0.4, 30, 0.7, { arms: 3, turns: 1, phase: -t * 7, squash: 0.65 });
        if (!gr.crashing) {
          // The three-second fuse as an arc around the pair.
          // A ring of storm cloud with the remaining hold lit in white, a bolt riding its head.
          const fx = rig.x, fy = rig.y - 34;
          g.lineStyle(5, this.col(owner)(TMP.ink), 0.55);
          g.strokeCircle(fx, fy, 16);
          g.lineStyle(2, this.col(owner)(TMP.slate), 0.7);
          g.strokeCircle(fx, fy, 16);
          g.lineStyle(2.5, this.col(owner)(TMP.white), 0.9);
          g.beginPath();
          g.arc(fx, fy, 16, -Math.PI / 2, -Math.PI / 2 + hold * Math.PI * 2);
          g.strokePath();
          const ha = -Math.PI / 2 + hold * Math.PI * 2;
          boltPip(g, this.col(owner), fx + Math.cos(ha) * 16, fy + Math.sin(ha) * 16, true, 1);
        }
      }
    }

    // Mastery: the bodies Gale Uppercut threw — wind under them on the way up, a tag over them,
    // and a pin on the top edge for one thrown higher than the arena can draw.
    for (const k of this.knocks) {
      const v = k.victim;
      if (!this.alive(v)) continue;
      const rising = k.vz > 0;
      const fallK = rising ? 0 : Math.min(1, -k.vz / KNOCK_FALL_FULL);
      if (rising) swirl(g, this.col(k.owner)(TMP.white), v.x, v.y + 24, 20, 0.55, { arms: 3, turns: 0.8, phase: -t * 9, squash: 0.5 });
      else gustLayered(g, this.col(k.owner), v.x, v.y - 30, -Math.PI / 2, 26 + fallK * 30, 4, 0.5 * fallK, { phase: t * 9, seed: k.boosts });
      knockTag(g, this.col(k.owner), v.x, v.y - 44, rising, fallK, k.boosts, 0.95);
      if (k.z * LIFT > this.knockLift(k, b) + 4) {
        for (let i = 0; i < 3; i++) {
          const q = (t * 1.5 + i / 3) % 1;
          chevron(g, this.col(k.owner)(TMP.white), v.x, v.y - 60 - q * 8, 6, 3, (1 - q) * 0.9, 2);
        }
      }
    }

    // Ping-pong victims trail wind and carry a crackle; their bounce count rides over them.
    for (const p of this.pongs) {
      const v = p.victim;
      if (!this.alive(v)) continue;
      const ang = Math.atan2(p.vy, p.vx);
      gustLayered(g, this.col(p.owner), v.x - Math.cos(ang) * 28, v.y - Math.sin(ang) * 28, ang + Math.PI, 40, 6, 0.8,
        { phase: t * 9, seed: p.bounces, hot: 1 });
      const n = Math.floor(t * 14);
      for (let i = 0; i < 2; i++) {
        const a = ((n + i * 7) % 12) / 12 * Math.PI * 2;
        lightning(g, this.col(p.owner)(TMP.bolt), v.x, v.y, v.x + Math.cos(a) * 30, v.y + Math.sin(a) * 30, 5, 1.4, 0.8, n + i);
      }
      // The bounce count, as a row of bolts on a little storm-cloud tag.
      const pw = PONG_BOUNCES * 10 + 6;
      g.fillStyle(this.col(p.owner)(TMP.ink), 0.7);
      g.fillRoundedRect(v.x - pw / 2 - 5, v.y - 46, pw, 16, 8);
      g.lineStyle(1, this.col(p.owner)(TMP.gust), 0.5);
      g.strokeRoundedRect(v.x - pw / 2 - 5, v.y - 46, pw, 16, 8);
      for (let i = 0; i < PONG_BOUNCES; i++) {
        boltPip(g, this.col(p.owner), v.x - 10 + i * 10, v.y - 38, i < p.bounces, 0.95);
      }
    }
  }

  /** Q+: the Herald's weather over the whole arena, faded in and out with it. */
  private paintSky(): void {
    const g = this.skyGfx;
    if (!g) return;
    g.clear();
    let k = 0;
    let owner: Owner = 'player';
    for (const w of this.weathers) {
      const inK = Phaser.Math.Clamp((this.now - w.start) / WX_FADE_MS, 0, 1);
      const outK = Phaser.Math.Clamp((w.until + WX_FADE_MS - this.now) / WX_FADE_MS, 0, 1);
      if (Math.min(inK, outK) > k) { k = Math.min(inK, outK); owner = w.owner; }
    }
    if (k > 0) stormSky(g, this.col(owner), this.api.width, this.api.height, this.vizT, k);
    // Mastery — Unrelenting Storm: the bank along the top, turning black under the Herald.
    if (this.bankK > 0.01) {
      const b = this.api.bounds;
      const bankOwner: Owner = this.masteryOn('player') ? 'player' : 'npc';
      stormBank(g, this.col(bankOwner), b.x, b.right, b.y, this.vizT, this.bankDark, this.bankK);
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const set = this.api.setStatusIndicator.bind(this.api);
    const s = this.sides.player;
    const p = this.api.player;
    set('tempest-air', playerIs && s.airborne ? {
      name: 'Airborne', emoji: '🪁', color: TMP.sky,
      description: 'Off the floor. Melee swings and floor hazards cannot reach you; shots and blasts still can. You drift at half speed, and the landing hits harder the faster you come down.',
      count: Math.round(s.z), suffix: 'px',
    } : null);
    set('tempest-gale', playerIs && s.charges < GALE_MAX_CHARGES ? {
      name: 'Gale Burst', emoji: '💨', color: TMP.gust,
      description: `Charges held. Walk ${GALE_RECHARGE_DIST}px for the next one; Kick Blast refills both.`,
      count: s.charges,
    } : null);
    set('tempest-kick', playerIs && s.dodgeGiven && this.now < s.dodgeUntil ? {
      name: 'Kick Blast', emoji: '🦵', color: TMP.white,
      description: '50% chance to dodge every hit for the roll and the second after it.',
      until: s.dodgeUntil,
    } : null);
    set('tempest-grab', playerIs && s.grab ? {
      name: 'Final Forecast', emoji: '🌪️', color: TMP.sky,
      description: 'Holding someone in the sky. In three seconds you both come down, and the fall is the damage: 20 plus 0.15 per px of height, up to 70.',
      until: s.grab.releaseAt,
    } : null);
    const myPongs = this.pongs.filter((q) => q.owner === 'player');
    set('tempest-eye', playerIs && myPongs.length > 0 ? {
      name: 'Eye of the Storm', emoji: '👁️', color: TMP.bolt,
      description: 'Your dive left them bouncing between the walls. Every wall they hit is a Wall Slam for 12; the currents end on the third.',
      count: PONG_BOUNCES - Math.min(...myPongs.map((q) => q.bounces)),
    } : null);
    set('tempest-float', playerIs && this.floating('player') ? {
      name: 'Float', emoji: '🎈', color: TMP.gust,
      description: 'A front is holding you up: you do not lose height while you stay over it. You can still climb.',
    } : null);
    const myWx = this.weathers.find((w) => w.owner === 'player' && this.now < w.until);
    set('tempest-weather', playerIs && myWx ? {
      name: 'Herald of Doom', emoji: '⛈️', color: TMP.bolt,
      description: 'Your weather: lightning, hail from the top of the screen and slowing puddles hit your foes, and gales make every gain of height 40% bigger.',
      until: myWx.until,
    } : null);
    set('tempest-storm', playerIs && this.masteryOn('player') ? {
      name: 'Unrelenting Storm', emoji: '🌩️', color: TMP.cloudLit,
      description: 'Your storm never lifts: a rare bolt, the odd hailstone and a few puddles hit your foes, and a breeze leans them toward the right of the screen. It turns black while your Herald\'s weather is live.',
    } : null);
    const upSlot = this.uppercutSlot('player');
    set('tempest-uppercut', playerIs && upSlot && !this.uppercutReady('player') ? {
      name: 'Gale Uppercut', emoji: '🌪️', color: TMP.white,
      description: 'Recharging. Throw a foe into the air, juggle them higher with Click, and they take damage when they hit the floor.',
      until: this.side('player').upLastAt + UPPERCUT_CD_MS,
    } : null);
    // The player on the receiving end.
    const thrown = this.knocks.find((k) => k.victim === p) ?? null;
    set('tempest-thrown', thrown ? {
      name: 'Thrown', emoji: '🌪️', color: TMP.white,
      description: 'Uppercut into the air. You cannot move until you come down, and the floor hurts more the faster you hit it.',
      count: Math.round(thrown.z), suffix: 'px', priority: 30,
    } : null);
    const soaked = this.slowed.has(p);
    set('tempest-puddle', soaked ? {
      name: 'Rain Puddle', emoji: '💧', color: TMP.rain,
      description: 'Wading through a storm puddle: 40% slower until you step out.',
      priority: 20,
    } : null);
    const held = BOTH.some((o) => this.sides[o].grab?.victim === p);
    set('tempest-held', held ? {
      name: 'Grappled', emoji: '🌪️', color: TMP.sky,
      description: 'A Tempest has you in the sky. You cannot move until you both come down.',
      priority: 30,
    } : null);
    const ponged = this.pongs.find((q) => q.victim === p);
    set('tempest-pong', ponged ? {
      name: 'Storm Currents', emoji: '🏓', color: TMP.bolt,
      description: 'Bounced between the walls. Each wall is 12 damage; it ends on the third.',
      count: PONG_BOUNCES - ponged.bounces,
      priority: 30,
    } : null);
  }

  // ── Readers for ArenaScene ─────────────────────────────────────────────────

  /** Half speed in the air — the drift the user picked over free flight. */
  // Puddles (Q+) slow the duel pair here; husks read `tempestSlowMult` themselves.
  getPlayerSpeedMult(): number {
    return (this.sides.player.airborne ? AIR_SPEED_MULT : 1) * (this.slowed.has(this.api.player) ? PUDDLE_SLOW : 1);
  }
  getNpcSpeedMult(): number {
    return (this.sides.npc.airborne ? AIR_SPEED_MULT : 1) * (this.slowed.has(this.api.npc) ? PUDDLE_SLOW : 1);
  }

  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === UPPERCUT_ID) {
      return Phaser.Math.Clamp(1 - (this.now - s.upLastAt) / UPPERCUT_CD_MS, 0, 1);
    }
    if (abilityId === 'tempest-gale') {
      // Charges, not a cooldown: the card drains as they are spent and fills as you walk.
      if (s.charges >= GALE_MAX_CHARGES) return 0;
      return Phaser.Math.Clamp(1 - (s.charges + s.walked / GALE_RECHARGE_DIST) / GALE_MAX_CHARGES, 0, 1);
    }
    if (abilityId === 'tempest-forecast' && s.grab && !s.grab.crashing) {
      return Phaser.Math.Clamp((s.grab.releaseAt - time) / FORECAST_HOLD_MS, 0, 1);
    }
    if (abilityId === 'tempest-updraft' && s.airborne) return 1;
    if (abilityId === 'tempest-front' && s.airborne && !this.nearestFront('player', p.x, p.y)) return 1;
    return p.getCooldownRatio(abilityId);
  }

  // ── Readers for the bot (side-effect-free) ─────────────────────────────────

  isAirborne(owner: Owner): boolean { return this.sides[owner].airborne; }
  galeCharges(owner: Owner): number { return this.sides[owner].charges; }
  frontCount(owner: Owner): number { return this.fronts.filter((f) => f.owner === owner && f.fadeAt === 0).length; }
  isGrabbing(owner: Owner): boolean { return this.sides[owner].grab !== null; }
  eyeLive(owner: Owner): boolean { return this.pongs.some((p) => p.owner === owner); }

  /**
   * Airborne, free, with a front of its own to drop onto. With Float (R+) a front it is hovering
   * over is worth more as a perch than as a slam, so then it is only offered with a foe in it.
   */
  canFrontSlam(owner: Owner): boolean {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!s.airborne || s.slam || s.grab || !this.alive(f)) return false;
    const fr = this.nearestFront(owner, f.x, f.y);
    if (!fr) return false;
    if (this.floating(owner)) return this.foes(owner).some((t) => this.inFront(fr, t.x, t.y));
    return true;
  }

  /**
   * R+ Float: the centre of the live front the bot should drift over while airborne, so the
   * front holds it up between bursts. Null without the upgrade, without a front in reach, or
   * once it has committed to a dive, slam or crash.
   */
  floatPoint(owner: Owner): { x: number; y: number } | null {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.up(owner, 'r') || !s.airborne || s.diving || s.slam || s.grab || !this.alive(f)) return null;
    let best: { x: number; y: number } | null = null;
    let bd = 360;
    for (const fr of this.fronts) {
      if (fr.fadeAt !== 0) continue;
      const cx = fr.x + Math.cos(fr.ang) * FRONT_LEN / 2;
      const cy = fr.y + Math.sin(fr.ang) * FRONT_LEN / 2;
      const d = Phaser.Math.Distance.Between(f.x, f.y, cx, cy);
      if (d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    return best;
  }

  /** E+: airborne with a foe under it — a hop now drops a thundercloud on them. */
  cloudShot(owner: Owner): boolean {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.up(owner, 'e') || !s.airborne || s.slam || !this.alive(f)) return false;
    if (this.clouds.some((c) => c.owner === owner)) return false;
    return this.foes(owner).some((t) => Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= CLOUD_R * 0.8);
  }

  /** F+: time to fly and no current in reach — make a Cyclone where it stands. */
  cycloneReady(owner: Owner): boolean {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.up(owner, 'f') || !this.alive(f) || s.airborne || s.grab || s.rollUntil > this.now) return false;
    if (this.now < s.nextFlightAt && !this.weatherLive()) return false;
    if (this.pongs.some((p) => p.victim === f)) return false;
    return !this.nearestCurrent(f.x, f.y, CURRENT_REACH);
  }

  /** Q+: someone's Herald weather is live — every launch is 40% bigger, so it is time to be in the air. */
  weatherLive(): boolean { return this.weathers.some((w) => this.now < w.until); }

  /** Falling and close to the floor: a burst on itself right now is the big boost. */
  landingSoon(owner: Owner): boolean {
    const s = this.sides[owner];
    return s.airborne && !s.slam && !s.grab?.crashing && !s.diving && s.vz < 0 && s.z < GALE_NEAR_FLOOR;
  }

  /** The current the bot should walk to, when it is time to fly. Null means stay in the fight. */
  currentSeek(owner: Owner): { x: number; y: number } | null {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.airborne || s.grab || s.rollUntil > this.now) return null;
    if (this.now < s.nextFlightAt && !this.weatherLive()) return null;
    if (this.pongs.some((p) => p.victim === f)) return null;
    const c = this.nearestCurrent(f.x, f.y, 480);
    return c ? { x: c.x, y: c.y } : null;
  }

  /** Mastery: the key Gale Uppercut was bound over. The kit throws it; the rotation leaves that key alone. */
  npcUppercutSlot(): 'r' | 'f' | 'q' | undefined { return this.uppercutSlot('npc') ?? undefined; }

  /**
   * Mastery synergy: a body this side's uppercut has in the air, inside a burst's reach, with a
   * charge to spend — a Click on it now juggles it higher, and higher is the slam's damage.
   */
  juggleShot(owner: Owner): { x: number; y: number } | null {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.charges <= 0) return null;
    for (const k of this.knocks) {
      if (k.owner !== owner || !this.alive(k.victim)) continue;
      // Not in the last stretch of the fall, where a burst would land after the body does.
      if (k.vz < 0 && k.z < 60) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, k.victim.x, k.victim.y) > 420) continue;
      return { x: k.victim.x, y: k.victim.y };
    }
    return null;
  }

  /** A foe standing close enough to a wall that a burst on them is also a Wall Slam. */
  wallShot(owner: Owner): { x: number; y: number } | null {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.charges <= 0) return null;
    for (const t of this.foes(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > 420) continue;
      const w = this.nearWall(t.x, t.y, 90);
      if (!w) continue;
      // Aim a little on the near side of them, so the burst throws them *into* the wall.
      return { x: t.x + w.nx * 18, y: t.y + w.ny * 18 };
    }
    return null;
  }
}
