import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Ability, CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { Sfx } from '../../audio';
import { FONT_UI } from '../../ui/Theme';
import { BanterLine, BanterSet, banterFor } from '../../data/MythBanter';
import {
  GunKind, MYTH, MythAvatar, MythColorFn, MythFx, beast as paintBeast, beyonder, bubble as paintBubble, cloud as paintCloud,
  crowdFigure, jitter, pinpricks, portal as paintPortal, redBlast, buttImpact, spentGrenade, stunCrown, rift as paintRift, shard as paintShard, spear, star, starMace, voidDisc,
  whip as paintWhip,
} from './MythVisuals';
import { MythView, ViewEntity } from './MythView';

type Owner = 'player' | 'npc';
const BOTH: Owner[] = ['player', 'npc'];

// ── The Crowd (passive) ──────────────────────────────────────────────────────
const CROWD_WINDOW_MS = 4000;
/** Damage dealt inside the window that earns an Echo Shard… */
const CHEER_DEALT = 45;
/** …and damage taken inside it that gets you jeered. */
const BOO_TAKEN = 50;
const SHARD_MAX = 3;
const CHEER_MS = 2600;
const BOO_MS = 2600;
const CHEER_SLEEP_MS = 5000;
const BOO_SLEEP_MS = 6000;
const JEER_MS = 4000;

// ── Cosmic Whip (Click) ──────────────────────────────────────────────────────
const WHIP_LEN = 180;
const WHIP_HALF_W = 22;
const WHIP_DAMAGE = 12;
const TIP_LEN = 36;
const TIP_DAMAGE = 24;
const TIP_STUN_MS = 600;
const WHIP_ANIM_MS = 280;
const WHIP_PLUS_MS = 8000;
const MACE_LIFE_MS = 3000;
const MACE_ORBIT_R = 26;
const MACE_DAMAGE = 6;
const MACE_GATE_MS = 500;
const MACE_SPIN = 4.5;

// ── Truth Breaker (E) ────────────────────────────────────────────────────────
const TRUTH_R = 150;
const TRUTH_HALF = Math.PI / 4;
const TRUTH_DAMAGE = 22;
const TRUTH_WINDOW_MS = 3000;
const TRUTH_DASH = 240;
const TRUTH_DASH_MS = 220;
const TRUTH_DASH_DAMAGE = 32;
const TRUTH_DASH_HIT_R = 46;

// ── Parry (R) ────────────────────────────────────────────────────────────────
const PARRY_MS = 500;
const PARRY_STUN_MS = 2000;
const INDOMITABLE_MS = 8000;
/** After a parry lands: how long a shard can still buy the riposte. */
const RIPOSTE_WINDOW_MS = 3000;
const RIPOSTE_DAMAGE = 35;
/** R+ Outskilled: after a parry whiffs, how long a shard can still buy a second one. */
const REPARRY_WINDOW_MS = 1500;
/** The bot's cue: a foe this close, or a hostile shot this close and closing. */
const PARRY_CUE_MELEE = 95;
const PARRY_CUE_SHOT = 120;

// ── Shop upgrades ────────────────────────────────────────────────────────────
/** Click+ Unquenched: the bigger hand, and the crowd's frenzy. */
const SHARD_MAX_UP = 5;
const FRENZY_CHAIN_MS = 10000;
const FRENZY_MS = 6000;
const FRENZY_THROW_MS = 450;
const CROWD_STAR_SPEED = 400;
const CROWD_STAR_DAMAGE = 3;
const CROWD_STAR_LIFE_MS = 1800;
/** E+ World Shatter: rifts in the floor where Excalibur cuts. */
const RIFT_MAX = 4;
const RIFT_TOUCH = 16;
const RIFT_BUFF_MS = 3000;
const RIFT_RECHARGE_MS = 8000;
const RIFT_SPEED = 1.3;
/** F+ Beyonders: the rider on the beast, and its barrage after a recall. */
const SPEAR_GAP_MS = 1200;
const SPEAR_RANGE = 300;
const SPEAR_SPEED = 620;
const SPEAR_DAMAGE = 6;
const SPEAR_LIFE_MS = 800;
const BEYONDER_WAIT_MS = 8000;
const BARRAGE_R = 130;
const BARRAGE_MS = 3000;
const BARRAGE_TICK_MS = 250;
const BARRAGE_TICK_DAMAGE = 3;
/** Q+ Slayer: the five shard acts inside Final Destiny. */
const RAPID_MS = 5000;
const BUTT_R = 78;
const BUTT_HALF = Phaser.Math.DegToRad(50);
const BUTT_DAMAGE = 8;
const BUTT_STUN_MS = 3000;
const REGREN_R = 104;
const REGREN_DAMAGE = 18;
const REGREN_WINDOW_MS = 5000;
const REAIM_SPEED_MULT = 2;
/** First person: the butt swing on the gun, the impact flash on the target, the red blast. */
const BUTT_ANIM_MS = 420;
const BUTT_FX_MS = 380;
const BLAST_FPS_MS = 700;
/** First-person mouse look: radians of yaw per pixel the mouse travels. */
const LOOK_SENS = 0.0042;
/** First-person mouse look: pixels the horizon moves per pixel of vertical mouse travel. */
const PITCH_SENS = 2;
/** Unlocked fallback: the cursor parked within this fraction of an edge keeps turning. */
const EDGE_K = 0.9;
/** First person: how long a kit message stays in the frame. */
const TOAST_MS = 1400;
/** Unlocked fallback: px/s the horizon moves with the cursor parked at the top or bottom edge. */
const EDGE_PITCH_RATE = 420;

// ── Beast of Myth (F) ────────────────────────────────────────────────────────
const BEAST_DELAY_MS = 450;
const BEAST_SPEED = 260;
const BEAST_HEAD_R = 30;
const BEAST_SEGMENTS = 9;
const BEAST_SEG_GAP = 15;
const BEAST_GRAB_R = 42;
const BEAST_TICK_MS = 500;
const BEAST_TICK_DAMAGE = 8;
const BEAST_PORTAL_BACK = 70;
const BEAST_FADE_MS = 420;
const FLIP_MS = 520;
const FLIP_SPEED = 1.2;
const FLIP_SPEED_MS = 4000;
const FLIP_GATE_MS = 900;

// ── Final Destiny (Q) ────────────────────────────────────────────────────────
const DESTINY_MS = 15000;
const TURN_RATE = 3.1;
const PISTOL_DAMAGE = 8;
const PISTOL_SPEED = 980;
const PISTOL_LIFE_MS = 1100;
const PISTOL_HIT_R = 20;
const VULN_PER_STACK = 0.05;
const VULN_MAX = 4;
const VULN_MS = 5000;
const SHOT_PELLETS = 7;
const SHOT_DAMAGE = 6;
const SHOT_RANGE = 200;
const SHOT_HALF = Phaser.Math.DegToRad(14);
const SHOT_RAY_W = 14;
const GREN_COUNT = 3;
const GREN_HALF = Phaser.Math.DegToRad(20);
const GREN_RANGE = 230;
const GREN_FLIGHT_MS = 700;
const GREN_R = 72;
const GREN_DAMAGE = 14;
const GREN_STACK = [1, 1.25, 1.5];
const RIFLE_DAMAGE = 26;
const RIFLE_RANGE = 900;
const RIFLE_HALF_W = 16;
const HEADSHOT_R = 9;
const HEADSHOT_MULT = 1.5;
const ROCKET_SPEED = 190;
const ROCKET_R = 150;
const ROCKET_DAMAGE = 30;
const ROCKET_DIRECT = 20;
const ROCKET_HIT_R = 22;
const CLOUD_R = 110;
const CLOUD_TICK_MS = 500;
const CLOUD_TICK_DAMAGE = 2.5;
const CLOUD_MS = 5000;

const FIGHTER_R = 20;

/** The ids the kit relays for presses that never touch a cooldown (and the parry landing). */
export const MYTH_NET_IDS = [
  'myth-whip-plus', 'myth-truth-plus', 'myth-beast-recall',
  'myth-parry-hit', 'myth-riposte', 'myth-reparry', 'myth-barrage',
  'myth-rapid', 'myth-butt', 'myth-regrenade', 'myth-rifle-refresh', 'myth-reaim',
] as const;

export interface MythArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get wKey(): Phaser.Input.Keyboard.Key;
  get aKey(): Phaser.Input.Keyboard.Key;
  get sKey(): Phaser.Input.Keyboard.Key;
  get dKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  get isInvasion(): boolean;
  get playerAbilities(): Ability[];
  get abilityBars(): Array<{ abilityId: string; lbl?: Phaser.GameObjects.Text; desc?: Phaser.GameObjects.Text }>;
  /** Skins: maps a Myth visual colour through that side's equipped skin. */
  mythColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  /** Online: relay a press that never touches a cooldown (see `MYTH_NET_IDS`). */
  broadcastMasteryCast(id: string): void;
  /** The shop upgrade on `slot` is equipped for that side (online: the opponent's loadout). */
  hasUpgrade(owner: Owner, slot: string): boolean;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

interface Tally { at: number; amount: number }

interface WhipSwing { x0: number; y0: number; x1: number; y1: number; start: number; seed: number }

interface Mace {
  owner: Owner;
  cx: number; cy: number;
  born: number; until: number;
  seed: number;
  hitAt: Map<Fighter, number>;
}

interface Beast {
  owner: Owner;
  portalX: number; portalY: number;
  ang: number;
  x: number; y: number;
  trail: { x: number; y: number }[];
  born: number;
  /** Set once the beast has cleared the portal and is on its way. */
  moving: boolean;
  returning: boolean;
  grabbed: Map<Fighter, number>;
  /** The moment it hit a wall or came home; it fades for `BEAST_FADE_MS` after. */
  doneAt: number;
  seed: number;
}

interface Bullet { owner: Owner; x: number; y: number; vx: number; vy: number; born: number; reg: RegisteredProjectile | null }
interface Grenade { owner: Owner; x0: number; y0: number; tx: number; ty: number; start: number; until: number; salvo: number }
interface Rocket { owner: Owner; x: number; y: number; vx: number; vy: number; reg: RegisteredProjectile | null; seed: number }
interface Cloud { owner: Owner; x: number; y: number; until: number; nextTickAt: number; seed: number }
/** Click+: a star a spectator threw over the wall. */
interface CrowdStar { owner: Owner; x: number; y: number; vx: number; vy: number; born: number; seed: number }
/** E+: a crack Excalibur left in the floor. */
interface Rift { owner: Owner; x0: number; y0: number; x1: number; y1: number; readyAt: number; born: number; seed: number }
/** F+: a spear the beyonder threw. */
interface Spear { owner: Owner; x: number; y: number; vx: number; vy: number; born: number }
/** F+: the beyonder's barrage — spears raining on one patch of floor. */
interface Barrage { owner: Owner; x: number; y: number; born: number; until: number; nextTickAt: number; seed: number }
/** Q+: a salvo's landing points, still smoking, for the red second blast. */
interface SpentSalvo { points: { x: number; y: number }[]; until: number }

interface Side {
  aimX: number; aimY: number;
  shards: number;
  dealt: Tally[];
  taken: Tally[];
  lastRawTaken: number;
  cheerSleepUntil: number;
  booSleepUntil: number;
  whip: WhipSwing | null;
  whipPlusUntil: number;
  truthWindowUntil: number;
  dashUntil: number; dashVx: number; dashVy: number; dashX0: number; dashY0: number; dashHit: Set<Fighter>;
  /** The parry window: the sword is out until this moment. 0 when it is not. */
  parryUntil: number;
  /** The absorber the parry replaced, and the one it installed (so it only restores its own). */
  parryPrevAbsorber: ((amount: number) => boolean) | null;
  parryAbsorber: ((amount: number) => boolean) | null;
  parryRawAt: number;
  /** A parry landed: the foe it caught, and how long a shard buys the riposte. */
  parriedFoe: Fighter | null;
  riposteUntil: number;
  /** R+: a parry whiffed; a shard buys another until this moment. */
  reparryUntil: number;
  /** Immune to stuns and slows (the parry's 8s, a rift's 3s). `unstoppable` saved and restored. */
  indomitableUntil: number;
  indomLive: boolean;
  indomHadUnstoppable: boolean;
  flipUntil: number;
  flipSpeedUntil: number;
  flipGateUntil: number;
  /** Who this side stunned, held still until the clock runs out. */
  stunHeld: Map<Fighter, number>;
  destinyUntil: number;
  destinyLive: boolean;
  yaw: number;
  gun: GunKind;
  gunRecoil: number;
  bob: number;
  hurt: number;
  salvo: number;
  /** Bot only: the next moment it may spend a shard. */
  nextRecastAt: number;
  // Click+ Unquenched
  lastCheerAt: number;
  frenzyUntil: number;
  nextThrowAt: number;
  // E+ World Shatter
  riftSpeedUntil: number;
  // F+ Beyonders
  nextSpearAt: number;
  /** A recalled beast came home: its rider waits at the portal until `until` for a shard. */
  beyonder: { x: number; y: number; until: number } | null;
  // Q+ Slayer
  rapidUntil: number;
  spent: SpentSalvo | null;
  /** A shard refreshed the rifle: every headshot from here refreshes it again. */
  rifleChain: boolean;
  /** First person: a hit marker (any gun hit) and the headshot cue, both 1 → 0. */
  hitMark: number;
  headMark: number;
  /** First person: how far the horizon sits below its rest line, in px — positive is looking up. */
  pitch: number;
  /** Q+ Slayer: when the last butt slam and the last second blast went off, for the frame's cues. */
  buttAt: number;
  blastAt: number;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, shards: 0, dealt: [], taken: [], lastRawTaken: NaN,
    cheerSleepUntil: 0, booSleepUntil: 0,
    whip: null, whipPlusUntil: 0,
    truthWindowUntil: 0, dashUntil: 0, dashVx: 0, dashVy: 0, dashX0: 0, dashY0: 0, dashHit: new Set(),
    parryUntil: 0, parryPrevAbsorber: null, parryAbsorber: null, parryRawAt: 0,
    parriedFoe: null, riposteUntil: 0, reparryUntil: 0,
    indomitableUntil: 0, indomLive: false, indomHadUnstoppable: false,
    flipUntil: 0, flipSpeedUntil: 0, flipGateUntil: 0,
    stunHeld: new Map(),
    destinyUntil: 0, destinyLive: false, yaw: 0, gun: 'pistol', gunRecoil: 0, bob: 0, hurt: 0, salvo: 0,
    nextRecastAt: 0,
    lastCheerAt: -Infinity, frenzyUntil: 0, nextThrowAt: 0,
    riftSpeedUntil: 0,
    nextSpearAt: 0, beyonder: null,
    rapidUntil: 0, spent: null, rifleChain: false, hitMark: 0, headMark: 0, pitch: 0, buttAt: -Infinity, blastAt: -Infinity,
  };
}

interface Spectator { x: number; y: number; s: number; seed: number; lit: boolean }

interface Bubble { who: 'myth' | 'foe'; text: string; until: number }

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): { d: number; k: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const k = l2 === 0 ? 0 : Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return { d: Math.hypot(px - (ax + dx * k), py - (ay + dy * k)), k };
}

/**
 * Myth — the ultimate element. A test element, reachable only from a cheat-mode save for now.
 *
 * The kit is built around one resource and one rule. The resource is the **Echo Shard**: the
 * crowd ringing the arena throws one whenever a Myth deals 45 inside four seconds (and jeers
 * them, 10% more damage taken for 4s, when they *take* 50 inside four). The rule is that every
 * ability has a second act that costs a shard: the whip's phantom maces (right-click), Truth
 * Breaker's true-damage dash (E again), the Parry's riposte (R again, after a parry lands) and the
 * beast's recall (F again) — each as many times as there are shards to spend. The ultimate is
 * Final Destiny: fifteen seconds in first person with five guns on the five keys, drawn by
 * `MythView` while the arena carries on in two dimensions underneath; the mouse is captured and
 * turns the camera, the crosshair pinned to the centre.
 *
 * The five shop upgrades (2026-10-17) each add more to spend shards on: Unquenched (a hand of
 * five and a crowd that throws stars in a frenzy), World Shatter (rifts in the floor that grant
 * speed and Indomitable, mended by any shard), Outskilled (a shard re-parries a whiff), Beyonders
 * (a spear-throwing rider on the beast, and a barrage after a recall) and Slayer (a second act on
 * each of the five guns).
 *
 * Both sides are mirrored — the bot has a crowd, shards and guns too, and spends its shards
 * itself (`updateBotRecasts`), since a recast is a press that never touches a cooldown and so
 * never reaches `castAbility`. Every `cast` in `myth.ts` is a one-line delegate into the `do*`
 * methods here; every opportunity the bot acts on is published through the readers at the bottom.
 *
 * Myth also talks: three exchanges a match, written per opponent in `MythBanter.ts`, as speech
 * bubbles over the two heads.
 */
export class MythKit {
  private api: MythArenaApi;
  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private maces: Mace[] = [];
  private beasts: Beast[] = [];
  private bullets: Bullet[] = [];
  private grenades: Grenade[] = [];
  private rockets: Rocket[] = [];
  private clouds: Cloud[] = [];
  private crowdStars: CrowdStar[] = [];
  private rifts: Rift[] = [];
  private spears: Spear[] = [];
  private barrages: Barrage[] = [];
  /** The crowd's frenzy, whoever earned it — a paint state, like `cheerUntil`. */
  private frenzyUntil = 0;
  /** First person: mouse travel since the last frame, read off raw `movementX`. */
  private lookDX = 0;
  private lookDY = 0;
  /** First person: Slayer's hits as billboards — a butt impact (riding its victim) or a second blast. */
  private fpsBursts: { kind: 'butt' | 'blast'; x: number; y: number; at: number; t: Fighter | null }[] = [];
  /** First person: the last thing the kit said to the player, shown in the frame (world text is under it). */
  private fpsToast: { text: string; color: number; at: number } | null = null;
  private lookListener: ((e: MouseEvent) => void) | null = null;
  private pointerWasDown = false;
  private rightWasDown = false;
  private vizT = 0;
  private matchT = 0;
  private cheerUntil = 0;
  private booUntil = 0;
  private spectators: Spectator[] = [];

  private pcol: MythColorFn;
  private ncol: MythColorFn;
  private pfx: MythFx;
  private nfx: MythFx;
  private playerAvatar: MythAvatar | null = null;
  private npcAvatar: MythAvatar | null = null;
  private crowdGfx: Phaser.GameObjects.Graphics | null = null;
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  private headGfx: Phaser.GameObjects.Graphics | null = null;
  private view: MythView | null = null;

  // Banter
  private banter: BanterSet | null = null;
  private banterStage = 0;
  private banterQueue: BanterLine[] = [];
  private banterNextAt = 0;
  private bubble: Bubble | null = null;
  private bubbleGfx: Phaser.GameObjects.Graphics | null = null;
  private bubbleText: Phaser.GameObjects.Text | null = null;

  constructor(api: MythArenaApi) {
    this.api = api;
    this.pcol = (base) => api.mythColor('player', base);
    this.ncol = (base) => api.mythColor('npc', base);
    this.pfx = new MythFx(api.scene, this.pcol);
    this.nfx = new MythFx(api.scene, this.ncol);
    // A match can end mid-Destiny; the cursor must never stay captured on the next screen.
    api.scene.events.on('shutdown', () => this.stopLook());
  }

  // ── First-person mouse look ────────────────────────────────────────────────

  /** Capture the mouse for Final Destiny: the cursor vanishes and its travel turns the camera. */
  private startLook(): void {
    if (!this.lookListener) {
      this.lookListener = (e: MouseEvent) => { this.lookDX += e.movementX || 0; this.lookDY += e.movementY || 0; };
      document.addEventListener('mousemove', this.lookListener);
    }
    this.lookDX = 0;
    this.lookDY = 0;
    this.requestLock();
  }

  private requestLock(): void {
    const canvas = this.api.scene.game.canvas as HTMLCanvasElement & { requestPointerLock(): unknown };
    if (!canvas || document.pointerLockElement === canvas) return;
    try {
      const r = canvas.requestPointerLock();
      // Newer browsers return a promise that rejects without a recent gesture; the unlocked
      // fallback (edge turning) covers that, and a click asks again.
      if (r instanceof Promise) r.catch(() => {});
    } catch { /* no pointer lock here: the fallback runs */ }
  }

  private stopLook(): void {
    if (this.lookListener) {
      document.removeEventListener('mousemove', this.lookListener);
      this.lookListener = null;
    }
    this.lookDX = 0;
    this.lookDY = 0;
    this.fpsToast = null;
    if (document.pointerLockElement === this.api.scene.game.canvas) {
      try { document.exitPointerLock(); } catch { /* already gone */ }
    }
  }

  private lookLocked(): boolean {
    return document.pointerLockElement === this.api.scene.game.canvas;
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): MythFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): MythColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): MythAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  is(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'myth' : this.api.npcElementId === 'myth';
  }
  private alive(f: Fighter | null | undefined): f is Fighter { return !!f && f.active && f.hp > 0; }
  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }
  /** Online: the npc is the opponent's replica. Its control effects on us arrive by relay, not from here. */
  private isReplica(owner: Owner): boolean { return owner === 'npc' && this.api.isOnline; }

  private foes(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  private ownerOf(f: Fighter): Owner | null {
    if (f === this.api.player) return 'player';
    if (f === this.api.npc) return 'npc';
    return null;
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  private deny(owner: Owner, abilityId: string | null, text: string): void {
    const f = this.fighter(owner);
    if (abilityId) this.refund(f, abilityId);
    if (owner !== 'player' || !this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 46, text, this.hex(MYTH.haze));
    this.toast(text, MYTH.haze);
    Sfx.playAt('ui-denied', f.x, { volume: 0.55 });
  }

  private text(owner: Owner, x: number, y: number, t: string, color = MYTH.haze): void {
    if (owner !== 'player') return;
    this.api.showFloatingText(x, y, t, this.hex(color));
    this.toast(t, color);
  }

  /** First person covers the world, so what the kit says to the player is printed in the frame. */
  private toast(t: string, color: number): void {
    if (this.sides.player.destinyLive) this.fpsToast = { text: t, color, at: this.now };
  }

  private shake(ms: number, k: number): void { this.api.scene.cameras.main.shake(ms, k); }

  /** A shop upgrade, only while that side really is Myth. */
  private up(owner: Owner, slot: string): boolean {
    return this.is(owner) && this.api.hasUpgrade(owner, slot);
  }

  /** Click+ Unquenched holds five. */
  private shardMax(owner: Owner): number {
    return this.up(owner, 'click') ? SHARD_MAX_UP : SHARD_MAX;
  }

  /**
   * The one place this kit lands damage. Tallies it for the crowd — except the crowd's own
   * stars (`noTally`), which would otherwise feed the frenzy that throws them.
   */
  private hit(owner: Owner, t: Fighter, dmg: number, o: { trueDamage?: boolean; aoe?: boolean; noTally?: boolean } = {}): void {
    if (!this.alive(t) || dmg <= 0) return;
    t.takeDamage(Math.round(dmg), { pierce: o.trueDamage, trueDamage: o.trueDamage, aoe: o.aoe });
    if (!o.noTally) this.side(owner).dealt.push({ at: this.now, amount: dmg });
  }

  /** A stun this kit owns. Skipped for a replica's effects on us — the relay carries them. */
  private stun(owner: Owner, t: Fighter, ms: number): void {
    if (!this.alive(t) || t.unstoppable) return;
    if (this.isReplica(owner) && t === this.api.player) return;
    const wall = Date.now() + ms;
    t.stunnedUntil = Math.max(t.stunnedUntil, wall);
    t.disarmedUntil = Math.max(t.disarmedUntil, wall);
    this.side(owner).stunHeld.set(t, Math.max(this.side(owner).stunHeld.get(t) ?? 0, this.now + ms));
  }

  /** Spend a shard, or say why not. */
  private spend(owner: Owner): boolean {
    const s = this.side(owner);
    if (s.shards <= 0) { this.deny(owner, null, 'NO ECHO SHARD'); return false; }
    s.shards -= 1;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.fx(owner).starSpray(f.x, f.y - 40, 6, 24, 380, 12, MYTH.shard);
      Sfx.playAt('shard-gain', f.x, { rate: 1.35, volume: 0.5 });
    }
    // E+ World Shatter: any shard, on any key, mends every rift at once.
    if (this.up(owner, 'e')) {
      let any = false;
      for (const r of this.rifts) if (r.owner === owner && r.readyAt > this.now) { r.readyAt = this.now; any = true; }
      if (any && this.alive(f)) this.text(owner, f.x, f.y - 74, 'RIFTS RESET', MYTH.gold);
    }
    return true;
  }

  /** The nearest living foe to a point, or null. */
  private nearestFoe(owner: Owner, x: number, y: number, maxD = Infinity): Fighter | null {
    let best: Fighter | null = null;
    let bestD = maxD;
    for (const t of this.foes(owner)) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player') this.api.broadcastMasteryCast(id);
  }

  /** The target's vulnerability from pistol stacks, 0–0.2. */
  private vulnOf(t: Fighter): number {
    return Date.now() < t.mythVulnUntil ? t.mythVulnStacks * VULN_PER_STACK : 0;
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  reset(): void {
    // Fighters are rebuilt per match, so only references are dropped here — nothing is
    // written back onto bodies that may already be gone.
    this.sides = { player: makeSide(), npc: makeSide() };
    this.stopLook();
    for (const b of this.bullets) if (b.reg) this.api.projectileRegistry.remove(b.reg);
    for (const r of this.rockets) if (r.reg) this.api.projectileRegistry.remove(r.reg);
    this.maces = []; this.beasts = []; this.bullets = []; this.grenades = []; this.rockets = []; this.clouds = [];
    this.crowdStars = []; this.rifts = []; this.spears = []; this.barrages = []; this.frenzyUntil = 0;
    this.fpsBursts = [];
    this.pointerWasDown = false; this.rightWasDown = false;
    this.vizT = 0; this.matchT = 0; this.cheerUntil = 0; this.booUntil = 0;
    this.spectators = [];
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.crowdGfx?.destroy(); this.crowdGfx = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.headGfx?.destroy(); this.headGfx = null;
    this.view?.destroy(); this.view = null;
    this.banter = null; this.banterStage = 0; this.banterQueue = []; this.banterNextAt = 0; this.bubble = null;
    this.bubbleGfx?.destroy(); this.bubbleGfx = null;
    this.bubbleText?.destroy(); this.bubbleText = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'myth') return;
    const s = this.sides.player;
    const p = this.api.player;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    const right = pointer.rightButtonDown();
    const down = pointer.isDown && !right;
    const rightClicked = right && !this.rightWasDown;
    this.pointerWasDown = down;
    this.rightWasDown = right;
    if (!this.alive(p)) return;

    if (s.destinyLive) {
      // First person: the crosshair is pinned to the centre of the screen and the mouse turns
      // the camera, like any shooter — every shot goes straight down the facing.
      if (!this.lookLocked() && (down || right) && !this.pointerWasDownBefore) this.requestLock();
      this.pointerWasDownBefore = down || right;
      s.aimX = p.x + Math.cos(s.yaw) * 320;
      s.aimY = p.y + Math.sin(s.yaw) * 320;
      const ctx = this.api.buildPlayerContext(s.aimX, s.aimY);
      const slayer = this.up('player', 'q');
      if (down) {
        // Q+ Slayer's rapid fire: the pistol's cooldown counts as done at half way.
        if (this.now < s.rapidUntil && p.getCooldownRatio('myth-pistol') >= 0.5) p.resetCooldown('myth-pistol');
        p.castAbility('myth-pistol', ctx);
      }
      if (rightClicked && slayer) this.doRapid('player');
      // Each gun key: ready, it fires; on cooldown, with Slayer and a shard, it is that gun's second act.
      const gunKey = (key: Phaser.Input.Keyboard.Key, id: string, recast: () => boolean): void => {
        if (!Phaser.Input.Keyboard.JustDown(key)) return;
        // No shard-count gate here: the recast itself says why it cannot go (no shard, nothing to re-aim).
        if (slayer && p.getCooldownRatio(id) < 1) { recast(); return; }
        p.castAbility(id, ctx);
      };
      gunKey(this.api.eKey, 'myth-shotgun', () => this.doButt('player'));
      gunKey(this.api.rKey, 'myth-grenades', () => this.doRegrenade('player'));
      gunKey(this.api.fKey, 'myth-rifle', () => this.doRifleRefresh('player'));
      gunKey(this.api.qKey, 'myth-rocket', () => this.doReaim('player', s.aimX, s.aimY));
      return;
    }
    this.pointerWasDownBefore = down || right;

    s.aimX = mouseX;
    s.aimY = mouseY;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    // Held: the whip lashes every time it is off cooldown.
    if (down) p.castAbility('myth-whip', ctx);
    if (rightClicked) this.doWhipPlus('player');
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) {
      // A press inside the window with a shard is the dash; otherwise the slash (or nothing).
      if (this.now < s.truthWindowUntil && s.shards > 0) this.doTruthPlus('player', mouseX, mouseY);
      else p.castAbility('myth-truth', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) {
      // After a parry lands: the riposte. After one whiffs (R+): another parry. Else the parry.
      if (this.riposteReady('player') && s.shards > 0) this.doRiposte('player');
      else if (this.reparryReady('player') && s.shards > 0) this.doReparry('player');
      else p.castAbility('myth-determination', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      const b = this.beastOf('player');
      if (b && !b.returning && s.shards > 0) this.doBeastRecall('player');
      else if (this.beyonderReady('player') && s.shards > 0) this.doBarrage('player', mouseX, mouseY);
      else p.castAbility('myth-beast', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('myth-destiny', ctx);
  }

  private pointerWasDownBefore = false;

  /** Online: where the local player is really aiming — the facing in first person, not the cursor. */
  netAim(): { x: number; y: number } | null {
    const s = this.sides.player;
    if (this.api.elementId !== 'myth' || !s.destinyLive) return null;
    return { x: s.aimX, y: s.aimY };
  }

  /** First person: WASD walks relative to where you look. ArenaScene hands over the body while this is true. */
  ownsPlayerMovement(): boolean {
    return this.api.elementId === 'myth' && this.sides.player.destinyLive;
  }

  /** The velocity for this frame, given the fighter's speed already multiplied through. */
  playerVelocity(speed: number): { vx: number; vy: number } {
    const s = this.sides.player;
    let fwd = 0;
    let strafe = 0;
    if (this.api.wKey.isDown) fwd += 1;
    if (this.api.sKey.isDown) fwd -= 1;
    if (this.api.dKey.isDown) strafe += 1;
    if (this.api.aKey.isDown) strafe -= 1;
    if (fwd !== 0 && strafe !== 0) { fwd *= 0.7071; strafe *= 0.7071; }
    const ca = Math.cos(s.yaw);
    const sa = Math.sin(s.yaw);
    return { vx: (ca * fwd - sa * strafe) * speed, vy: (sa * fwd + ca * strafe) * speed };
  }

  // ── Click — Cosmic Whip ────────────────────────────────────────────────────

  doWhip(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-whip'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-whip'); return; }
    s.aimX = tx; s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const x0 = f.x + Math.cos(ang) * 14;
    const y0 = f.y + Math.sin(ang) * 14;
    const x1 = x0 + Math.cos(ang) * WHIP_LEN;
    const y1 = y0 + Math.sin(ang) * WHIP_LEN;
    s.whip = { x0, y0, x1, y1, start: this.now, seed: Math.random() * 999 };
    this.avatar(owner)?.play('sweep', ang, WHIP_ANIM_MS);

    let tipLanded = false;
    for (const t of this.foes(owner)) {
      const r = FIGHTER_R * (t.sizeMult || 1);
      const { d } = segDist(t.x, t.y, x0, y0, x1, y1);
      if (d > WHIP_HALF_W + r) continue;
      const tipD = Math.hypot(t.x - x1, t.y - y1);
      if (tipD <= TIP_LEN / 2 + r) {
        this.hit(owner, t, TIP_DAMAGE);
        this.stun(owner, t, TIP_STUN_MS);
        this.fx(owner).tipHit(t.x, t.y);
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.mace));
        this.text(owner, t.x, t.y - 40, 'STAR MACE', MYTH.gold);
        tipLanded = true;
      } else {
        this.hit(owner, t, WHIP_DAMAGE);
        this.fx(owner).graze(t.x, t.y);
      }
    }
    if (tipLanded) { Sfx.playAt('hit-heavy', x1, { rate: 1.2, volume: 0.6 }); this.shake(90, 0.003); }
    if (this.now < s.whipPlusUntil) {
      this.maces.push({ owner, cx: x1, cy: y1, born: this.now, until: this.now + MACE_LIFE_MS, seed: Math.random() * 999, hitAt: new Map() });
    }
  }

  /** Right-click: a shard for eight seconds of phantom maces. */
  doWhipPlus(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || s.destinyLive) return;
    if (this.now < s.whipPlusUntil) { this.deny(owner, null, 'ALREADY ENHANCED'); return; }
    if (!this.spend(owner)) return;
    s.whipPlusUntil = this.now + WHIP_PLUS_MS;
    this.relay(owner, 'myth-whip-plus');
    this.fx(owner).ring(f.x, f.y, 10, 44, 420, MYTH.mace, 2.5, 10);
    this.text(owner, f.x, f.y - 50, 'PHANTOM MACES', MYTH.mace);
    Sfx.playAt('sparkle', f.x, { rate: 0.9, volume: 0.6 });
  }

  // ── E — Truth Breaker ──────────────────────────────────────────────────────

  doTruth(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-truth'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-truth'); return; }
    s.aimX = tx; s.aimY = ty;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const av = this.avatar(owner);
    av?.setBlade(true);
    av?.setEye(true);
    av?.play('sweep', ang, 320);
    this.api.scene.time.delayedCall(700, () => { if (this.now >= this.side(owner).dashUntil) { av?.setBlade(false); av?.setEye(this.masteryOn(owner)); } });
    this.fx(owner).slash(f.x, f.y, ang, TRUTH_R, TRUTH_HALF);
    this.shake(80, 0.0025);
    let any = false;
    for (const t of this.foes(owner)) {
      const r = FIGHTER_R * (t.sizeMult || 1);
      const d = Math.hypot(t.x - f.x, t.y - f.y);
      if (d > TRUTH_R + r) continue;
      const da = Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang);
      if (Math.abs(da) > TRUTH_HALF + (r / Math.max(1, d))) continue;
      this.hit(owner, t, TRUTH_DAMAGE, { trueDamage: true });
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.gold));
      if (!any) this.text(owner, t.x, t.y - 44, 'TRUE', MYTH.gold);
      any = true;
    }
    s.truthWindowUntil = this.now + TRUTH_WINDOW_MS;
    // E+ World Shatter: the cut goes on into the floor, straight down the middle of the arc.
    if (this.up(owner, 'e')) {
      this.addRift(owner, f.x + Math.cos(ang) * 36, f.y + Math.sin(ang) * 36, f.x + Math.cos(ang) * TRUTH_R, f.y + Math.sin(ang) * TRUTH_R);
    }
  }

  /** E+: a new rift, ready at once; the oldest of that side's goes when there are too many. */
  private addRift(owner: Owner, x0: number, y0: number, x1: number, y1: number): void {
    const b = this.api.bounds;
    const cx = (v: number) => Phaser.Math.Clamp(v, b.x + 8, b.right - 8);
    const cy = (v: number) => Phaser.Math.Clamp(v, b.y + 8, b.bottom - 8);
    this.rifts.push({ owner, x0: cx(x0), y0: cy(y0), x1: cx(x1), y1: cy(y1), readyAt: this.now, born: this.now, seed: Math.random() * 999 });
    const mine = this.rifts.filter((r) => r.owner === owner);
    if (mine.length > RIFT_MAX) this.rifts.splice(this.rifts.indexOf(mine[0]), 1);
    this.fx(owner).starSpray((x0 + x1) / 2, (y0 + y1) / 2, 8, 40, 420, 9, MYTH.gold);
    Sfx.playAt('hit-heavy', (x0 + x1) / 2, { rate: 0.6, volume: 0.5 });
  }

  /** E again inside the window: a shard for a true-damage dash. */
  doTruthPlus(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || s.destinyLive) return;
    if (this.now >= s.truthWindowUntil) return;
    if (!this.spend(owner)) return;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.dashUntil = this.now + TRUTH_DASH_MS;
    s.dashVx = Math.cos(ang) * (TRUTH_DASH / (TRUTH_DASH_MS / 1000));
    s.dashVy = Math.sin(ang) * (TRUTH_DASH / (TRUTH_DASH_MS / 1000));
    s.dashX0 = f.x; s.dashY0 = f.y;
    s.dashHit = new Set();
    // The window stays open past the dash: a second shard is a second dash.
    s.truthWindowUntil = this.now + TRUTH_DASH_MS + TRUTH_WINDOW_MS;
    this.relay(owner, 'myth-truth-plus');
    const av = this.avatar(owner);
    av?.setBlade(true);
    av?.setEye(true);
    av?.play('dash', ang, TRUTH_DASH_MS + 100);
    Sfx.playAt('slash', f.x, { rate: 0.8, volume: 0.8 });
  }

  // ── R — Parry ──────────────────────────────────────────────────────────────

  doParry(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-determination'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-determination'); return; }
    this.openParry(owner);
    this.text(owner, f.x, f.y - 50, 'PARRY', MYTH.gold);
    Sfx.playAt('slash', f.x, { rate: 1.5, volume: 0.45 });
  }

  /**
   * Hold the sword out for half a second. Anything that lands on the body in that time is
   * turned aside (a `damageAbsorber` layered over whatever was there) and the parry resolves;
   * a piercing hit skips absorbers, so the raw-damage tally catches that one instead.
   * A replica never resolves its own parry — the parrier's machine does, and relays it.
   */
  private openParry(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    this.closeParry(owner);
    s.parryUntil = this.now + PARRY_MS;
    s.parriedFoe = null;
    s.riposteUntil = 0;
    s.reparryUntil = 0;
    s.parryRawAt = f.rawDamageTaken;
    if (!this.isReplica(owner)) {
      s.parryPrevAbsorber = f.damageAbsorber;
      const prev = s.parryPrevAbsorber;
      const mine = (amount: number): boolean => {
        if (this.now < s.parryUntil) { this.landParry(owner); return true; }
        return prev ? prev(amount) : false;
      };
      s.parryAbsorber = mine;
      f.damageAbsorber = mine;
    }
    const av = this.avatar(owner);
    av?.setBlade(true);
    av?.setEye(true);
    av?.setHold('brace');
    av?.play('sweep', Math.atan2(s.aimY - f.y, s.aimX - f.x), 200);
  }

  /** Take the parry's absorber back off, if it is still the one on the body. */
  private closeParry(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.parryAbsorber && f && f.damageAbsorber === s.parryAbsorber) f.damageAbsorber = s.parryPrevAbsorber;
    s.parryAbsorber = null;
    s.parryPrevAbsorber = null;
    s.parryUntil = 0;
    if (!s.destinyLive) {
      const av = this.avatar(owner);
      av?.setHold(null);
      if (this.now >= s.dashUntil) { av?.setBlade(false); av?.setEye(this.masteryOn(owner)); }
    }
  }

  /**
   * The parry caught something. There is no attacker on a hit, so the foe it turns on is the
   * nearest one — in a duel that is always the opponent. Stunned 2s; 8s Indomitable for us.
   */
  private landParry(owner: Owner, foe?: Fighter | null): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (s.parryUntil <= 0 || !this.alive(f)) return;
    this.closeParry(owner);
    const t = foe !== undefined ? foe : this.nearestFoe(owner, f.x, f.y);
    if (t) this.stun(owner, t, PARRY_STUN_MS);
    s.parriedFoe = t;
    s.riposteUntil = this.now + RIPOSTE_WINDOW_MS;
    s.indomitableUntil = Math.max(s.indomitableUntil, this.now + INDOMITABLE_MS);
    this.relay(owner, 'myth-parry-hit');
    const fx = this.fx(owner);
    fx.ring(f.x, f.y, 10, 64, 420, MYTH.gold, 4, 10);
    fx.starSpray(f.x, f.y, 12, 52, 520, 10, MYTH.gold);
    fx.tipHit(f.x + Math.cos(Math.atan2(s.aimY - f.y, s.aimX - f.x)) * 24, f.y + Math.sin(Math.atan2(s.aimY - f.y, s.aimX - f.x)) * 24);
    if (t) {
      fx.ring(t.x, t.y, 8, 40, 380, MYTH.red, 3, 10);
      this.text(owner, t.x, t.y - 44, 'STUNNED', MYTH.red);
    }
    this.text(owner, f.x, f.y - 56, 'PARRIED!  INDOMITABLE', MYTH.gold);
    this.avatar(owner)?.play('flex', undefined, 500);
    Sfx.playAt('shield-block', f.x, { rate: 0.8, volume: 1 });
    Sfx.playAt('hit-heavy', f.x, { rate: 1.4, volume: 0.6 });
    this.shake(140, 0.005);
  }

  private riposteReady(owner: Owner): boolean {
    const s = this.side(owner);
    return this.now < s.riposteUntil && this.alive(s.parriedFoe);
  }

  private reparryReady(owner: Owner): boolean {
    return this.up(owner, 'r') && this.now < this.side(owner).reparryUntil;
  }

  /** R again after a parry lands: a shard for one cut, 35 true, straight onto the foe it caught. */
  doRiposte(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const t = s.parriedFoe;
    if (!this.alive(f) || !this.riposteReady(owner) || !this.alive(t)) return;
    if (!this.spend(owner)) return;
    s.riposteUntil = 0;
    s.parriedFoe = null;
    this.relay(owner, 'myth-riposte');
    const ang = Math.atan2(t.y - f.y, t.x - f.x);
    this.hit(owner, t, RIPOSTE_DAMAGE, { trueDamage: true });
    const fx = this.fx(owner);
    fx.dashTrail(f.x, f.y, t.x, t.y);
    fx.slash(t.x, t.y, ang, 70, Math.PI / 3, 10);
    this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.gold));
    this.text(owner, t.x, t.y - 46, `RIPOSTE ${RIPOSTE_DAMAGE} TRUE`, MYTH.gold);
    const av = this.avatar(owner);
    av?.setBlade(true);
    av?.play('sweep', ang, 300);
    this.api.scene.time.delayedCall(500, () => { if (this.side(owner).parryUntil <= 0 && this.now >= this.side(owner).dashUntil) av?.setBlade(false); });
    Sfx.playAt('slash', t.x, { rate: 0.7, volume: 1 });
    this.shake(120, 0.005);
  }

  /** R+ Outskilled: R again after a whiff — a shard for another half second with the sword out. */
  doReparry(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || !this.reparryReady(owner) || this.side(owner).destinyLive) return;
    if (!this.spend(owner)) return;
    this.relay(owner, 'myth-reparry');
    this.openParry(owner);
    this.fx(owner).ring(f.x, f.y, 8, 40, 300, MYTH.haze, 2.5, 10);
    this.text(owner, f.x, f.y - 50, 'OUTSKILLED — PARRY AGAIN', MYTH.haze);
    Sfx.playAt('slash', f.x, { rate: 1.7, volume: 0.45 });
  }

  /** Indomitable: `unstoppable` for as long as the clock runs, then whatever it was before. */
  private updateParry(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!f || !f.active) continue;
      if (s.parryUntil > 0) {
        // A pierce never asks an absorber; the raw tally still saw it.
        if (!this.isReplica(owner) && f.rawDamageTaken > s.parryRawAt && this.now < s.parryUntil) this.landParry(owner);
        else if (this.now >= s.parryUntil) {
          this.closeParry(owner);
          if (this.up(owner, 'r')) s.reparryUntil = this.now + REPARRY_WINDOW_MS;
          if (this.alive(f)) this.text(owner, f.x, f.y - 50, this.up(owner, 'r') && s.shards > 0 ? 'MISSED — R + SHARD TO RE-PARRY' : 'MISSED', MYTH.haze);
        }
      }
      const want = this.now < s.indomitableUntil && this.alive(f);
      if (want && !s.indomLive) {
        s.indomLive = true;
        s.indomHadUnstoppable = f.unstoppable;
        f.unstoppable = true;
        // Whatever already had hold of us lets go.
        if (!this.isReplica(owner)) { f.stunnedUntil = 0; f.disarmedUntil = Math.min(f.disarmedUntil, Date.now()); }
        this.avatar(owner)?.setDetermined(true);
      } else if (!want && s.indomLive) {
        s.indomLive = false;
        f.unstoppable = s.indomHadUnstoppable;
        this.avatar(owner)?.setDetermined(false);
      } else if (want) {
        f.unstoppable = true;
      }
    }
  }

  // ── F — Beast of Myth ──────────────────────────────────────────────────────

  private beastOf(owner: Owner): Beast | null {
    return this.beasts.find((b) => b.owner === owner && b.doneAt === 0) ?? null;
  }

  doBeast(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-beast'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-beast'); return; }
    if (this.beastOf(owner)) { this.deny(owner, 'myth-beast', 'BEAST ALREADY LOOSE'); return; }
    s.aimX = tx; s.aimY = ty;
    s.beyonder = null;
    s.nextSpearAt = this.now + BEAST_DELAY_MS + SPEAR_GAP_MS * 0.5;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const b = this.api.bounds;
    const px = Phaser.Math.Clamp(f.x - Math.cos(ang) * BEAST_PORTAL_BACK, b.x + 20, b.right - 20);
    const py = Phaser.Math.Clamp(f.y - Math.sin(ang) * BEAST_PORTAL_BACK, b.y + 20, b.bottom - 20);
    this.beasts.push({
      owner, portalX: px, portalY: py, ang, x: px, y: py, trail: [], born: this.now,
      moving: false, returning: false, grabbed: new Map(), doneAt: 0, seed: Math.random() * 999,
    });
    this.avatar(owner)?.play('raise', ang + Math.PI, 500);
    this.fx(owner).ring(px, py, 6, 50, 500, MYTH.iris, 3, 9);
    this.fx(owner).starSpray(px, py, 10, 40, 600, 9, MYTH.starBlue);
    Sfx.playAt('portal', px, { rate: 0.8, volume: 0.9 });
    this.shake(300, 0.003);
  }

  /** F again while the beast is loose: a shard to call it home, catch and all. */
  doBeastRecall(owner: Owner): void {
    const f = this.fighter(owner);
    const bst = this.beastOf(owner);
    if (!this.alive(f) || !bst || bst.returning) return;
    if (!this.spend(owner)) return;
    bst.returning = true;
    bst.moving = true;
    bst.ang = Math.atan2(bst.portalY - bst.y, bst.portalX - bst.x);
    this.relay(owner, 'myth-beast-recall');
    this.fx(owner).ring(bst.x, bst.y, 10, 60, 420, MYTH.haze, 2.5, 10);
    this.text(owner, bst.x, bst.y - 50, 'COME HOME', MYTH.haze);
    Sfx.playAt('roar', bst.x, { rate: 0.75, volume: 0.9 });
  }

  private beyonderReady(owner: Owner): boolean {
    const b = this.side(owner).beyonder;
    return !!b && this.now < b.until && this.up(owner, 'f');
  }

  /**
   * F+ Beyonders: F again once a recalled beast is home — a shard, and its rider looses a rain
   * of spears on the foe nearest the aim: a 130px patch, 3 to everyone in it every 0.25s for 3s.
   */
  doBarrage(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const by = s.beyonder;
    if (!this.alive(f) || !by || !this.beyonderReady(owner)) return;
    if (!this.spend(owner)) return;
    s.beyonder = null;
    const t = this.nearestFoe(owner, tx, ty, 260) ?? this.nearestFoe(owner, f.x, f.y);
    const x = t ? t.x : tx;
    const y = t ? t.y : ty;
    this.barrages.push({ owner, x, y, born: this.now, until: this.now + BARRAGE_MS, nextTickAt: this.now + 200, seed: Math.random() * 999 });
    this.relay(owner, 'myth-barrage');
    this.fx(owner).ring(by.x, by.y, 10, 50, 400, MYTH.red, 3, 10);
    this.text(owner, x, y - 60, 'BARRAGE', MYTH.red);
    Sfx.playAt('roar', by.x, { rate: 1.3, volume: 0.6 });
  }

  // ── Q — Final Destiny ──────────────────────────────────────────────────────

  doDestiny(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'myth-destiny'); return; }
    const s = this.side(owner);
    if (s.destinyLive) { this.refund(f, 'myth-destiny'); return; }
    s.destinyLive = true;
    s.destinyUntil = this.now + DESTINY_MS;
    s.yaw = Math.atan2(ty - f.y, tx - f.x);
    s.gun = 'pistol';
    s.gunRecoil = 0;
    s.bob = 0;
    s.hurt = 0;
    s.lastRawTaken = f.rawDamageTaken;
    s.rapidUntil = 0;
    s.spent = null;
    s.rifleChain = false;
    s.hitMark = 0;
    s.headMark = 0;
    s.pitch = 0;
    // The beast, the window, the parry and the blade all step aside: five guns are the whole kit now.
    s.truthWindowUntil = 0;
    s.riposteUntil = 0;
    s.reparryUntil = 0;
    if (s.parryUntil > 0) this.closeParry(owner);
    const av = this.avatar(owner);
    av?.setGun('pistol');
    av?.setHold('brace');
    av?.setBlade(false);
    this.fx(owner).ring(f.x, f.y, 10, 70, 600, MYTH.gold, 3, 10);
    this.fx(owner).starSpray(f.x, f.y, 14, 60, 700, 10);
    Sfx.playAt('reload', f.x, { rate: 0.9, volume: 1 });
    if (owner === 'player') {
      this.ensureView().show();
      this.startLook();
      this.relabelBars(true);
      this.text(owner, f.x, f.y - 50, 'FINAL DESTINY', MYTH.gold);
    }
  }

  private endDestiny(owner: Owner): void {
    const s = this.side(owner);
    if (!s.destinyLive) return;
    s.destinyLive = false;
    const av = this.avatar(owner);
    av?.setGun(null);
    av?.setHold(null);
    const f = this.fighter(owner);
    if (this.alive(f)) {
      this.fx(owner).ring(f.x, f.y, 10, 50, 500, MYTH.haze, 2.5, 10);
      Sfx.playAt('reload', f.x, { rate: 1.2, volume: 0.6 });
    }
    s.rapidUntil = 0;
    s.rifleChain = false;
    if (owner === 'player') {
      this.view?.hide();
      this.stopLook();
      this.relabelBars(false);
    }
  }

  private gunReady(owner: Owner, kind: GunKind, abilityId: string): Fighter | null {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f)) { this.refund(f, abilityId); return null; }
    if (!s.destinyLive) { this.deny(owner, abilityId, 'ONLY IN FINAL DESTINY'); return null; }
    s.gun = kind;
    s.gunRecoil = 1;
    this.avatar(owner)?.setGun(kind);
    this.avatar(owner)?.recoil();
    return f;
  }

  private aimOf(owner: Owner, f: Fighter, tx: number, ty: number): number {
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;
    return Math.atan2(ty - f.y, tx - f.x);
  }

  doPistol(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'pistol', 'myth-pistol');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const b: Bullet = {
      owner, x: f.x + Math.cos(ang) * 22, y: f.y + Math.sin(ang) * 22,
      vx: Math.cos(ang) * PISTOL_SPEED, vy: Math.sin(ang) * PISTOL_SPEED, born: this.now, reg: null,
    };
    const reg: RegisteredProjectile = {
      owner, getX: () => b.x, getY: () => b.y, damage: PISTOL_DAMAGE,
      steal: () => { const i = this.bullets.indexOf(b); if (i >= 0) this.bullets.splice(i, 1); },
    };
    b.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.bullets.push(b);
    this.fx(owner).muzzle(f.x, f.y, ang, 8);
  }

  doShotgun(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'shotgun', 'myth-shotgun');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const totals = new Map<Fighter, number>();
    const fx = this.fx(owner);
    for (let i = 0; i < SHOT_PELLETS; i++) {
      const a = ang + (i / (SHOT_PELLETS - 1) - 0.5) * 2 * SHOT_HALF;
      const x1 = f.x + Math.cos(a) * SHOT_RANGE;
      const y1 = f.y + Math.sin(a) * SHOT_RANGE;
      let best: Fighter | null = null;
      let bestK = 2;
      for (const t of this.foes(owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        const { d, k } = segDist(t.x, t.y, f.x, f.y, x1, y1);
        if (d <= SHOT_RAY_W + r && k < bestK) { best = t; bestK = k; }
      }
      const ex = best ? f.x + (x1 - f.x) * bestK : x1;
      const ey = best ? f.y + (y1 - f.y) * bestK : y1;
      fx.tracer(f.x + Math.cos(a) * 20, f.y + Math.sin(a) * 20, ex, ey);
      if (best) totals.set(best, (totals.get(best) ?? 0) + SHOT_DAMAGE * (1 + 2 * this.vulnOf(best)));
    }
    for (const [t, dmg] of totals) {
      this.hit(owner, t, dmg);
      this.side(owner).hitMark = 1;
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.star));
      if (this.vulnOf(t) > 0) this.text(owner, t.x, t.y - 44, `VULNERABLE ×${(1 + 2 * this.vulnOf(t)).toFixed(2)}`, MYTH.red);
    }
    fx.muzzle(f.x, f.y, ang, 16);
    this.shake(120, 0.004);
    Sfx.playAt('shotgun', f.x, { volume: 1 });
  }

  doGrenades(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'launcher', 'myth-grenades');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const s = this.side(owner);
    s.salvo += 1;
    const b = this.api.bounds;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < GREN_COUNT; i++) {
      const a = ang + (i - (GREN_COUNT - 1) / 2) * GREN_HALF;
      const lx = Phaser.Math.Clamp(f.x + Math.cos(a) * GREN_RANGE, b.x + 10, b.right - 10);
      const ly = Phaser.Math.Clamp(f.y + Math.sin(a) * GREN_RANGE, b.y + 10, b.bottom - 10);
      this.grenades.push({ owner, x0: f.x, y0: f.y, tx: lx, ty: ly, start: this.now + i * 60, until: this.now + i * 60 + GREN_FLIGHT_MS, salvo: s.salvo });
      points.push({ x: lx, y: ly });
    }
    // Q+ Slayer: where they will lie, smoking, for the red second blast.
    s.spent = { points, until: this.now + (GREN_COUNT - 1) * 60 + GREN_FLIGHT_MS + REGREN_WINDOW_MS };
    this.fx(owner).muzzle(f.x, f.y, ang, 10);
    Sfx.playAt('grenade-throw', f.x, { volume: 0.9 });
  }

  doRifle(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'rifle', 'myth-rifle');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const x1 = f.x + Math.cos(ang) * RIFLE_RANGE;
    const y1 = f.y + Math.sin(ang) * RIFLE_RANGE;
    const s = this.side(owner);
    let anyHead = false;
    for (const t of this.foes(owner)) {
      const r = FIGHTER_R * (t.sizeMult || 1);
      const { d } = segDist(t.x, t.y, f.x, f.y, x1, y1);
      if (d > RIFLE_HALF_W + r) continue;
      const head = d <= HEADSHOT_R;
      this.hit(owner, t, head ? RIFLE_DAMAGE * HEADSHOT_MULT : RIFLE_DAMAGE);
      this.api.spawnHitFlash(t.x, t.y, this.col(owner)(head ? MYTH.gold : MYTH.star));
      s.hitMark = 1;
      if (head) {
        anyHead = true;
        s.headMark = 1;
        this.fx(owner).headshot(t.x, t.y);
        this.text(owner, t.x, t.y - 46, `HEADSHOT ${Math.round(RIFLE_DAMAGE * HEADSHOT_MULT)}`, MYTH.gold);
      }
    }
    if (anyHead) {
      Sfx.playAt('hit-heavy', f.x, { rate: 1.7, volume: 0.8 });
      Sfx.playAt('sparkle', f.x, { rate: 1.3, volume: 0.7 });
    }
    // Q+ Slayer: a shard-refreshed rifle stays hot for as long as the headshots keep coming.
    if (s.rifleChain) {
      if (anyHead) {
        this.refund(f, 'myth-rifle');
        this.text(owner, f.x, f.y - 60, 'CHAIN — RIFLE READY', MYTH.gold);
      } else {
        s.rifleChain = false;
      }
    }
    this.fx(owner).tracer(f.x + Math.cos(ang) * 24, f.y + Math.sin(ang) * 24, x1, y1);
    this.fx(owner).muzzle(f.x, f.y, ang, 12);
    this.shake(100, 0.003);
    Sfx.playAt('air-snipe', f.x, { rate: 0.8, volume: 1 });
  }

  doRocket(owner: Owner, tx: number, ty: number): void {
    const f = this.gunReady(owner, 'rocket', 'myth-rocket');
    if (!f) return;
    const ang = this.aimOf(owner, f, tx, ty);
    const r: Rocket = {
      owner, x: f.x + Math.cos(ang) * 26, y: f.y + Math.sin(ang) * 26,
      vx: Math.cos(ang) * ROCKET_SPEED, vy: Math.sin(ang) * ROCKET_SPEED, reg: null, seed: Math.random() * 999,
    };
    const reg: RegisteredProjectile = {
      owner, getX: () => r.x, getY: () => r.y, damage: ROCKET_DAMAGE,
      steal: () => { const i = this.rockets.indexOf(r); if (i >= 0) this.rockets.splice(i, 1); },
    };
    r.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.rockets.push(r);
    this.fx(owner).muzzle(f.x, f.y, ang, 18);
    this.shake(160, 0.004);
    Sfx.playAt('mortar-launch', f.x, { rate: 0.7, volume: 1 });
  }

  // ── Q+ Slayer: the guns' second acts ───────────────────────────────────────
  //
  // Each is a press on a gun that is cooling down (right-click for the pistol), costs a shard,
  // and touches no cooldown of its own. All refuse outside Final Destiny.

  private slayerReady(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (!this.alive(f) || !s.destinyLive || !this.up(owner, 'q')) return null;
    return f;
  }

  /** Right-click: a shard for five seconds of the pistol at double rate. */
  doRapid(owner: Owner): boolean {
    const f = this.slayerReady(owner);
    const s = this.side(owner);
    if (!f) return false;
    if (this.now < s.rapidUntil) { this.deny(owner, null, 'ALREADY RAPID'); return false; }
    if (!this.spend(owner)) return false;
    s.rapidUntil = this.now + RAPID_MS;
    this.relay(owner, 'myth-rapid');
    this.text(owner, f.x, f.y - 50, 'RAPID FIRE', MYTH.gold);
    Sfx.playAt('reload', f.x, { rate: 1.5, volume: 0.8 });
    return true;
  }

  /** The salvo still waiting for a second blast — landed, inside its window, with Slayer. */
  private liveSpent(owner: Owner): SpentSalvo | null {
    const s = this.side(owner);
    if (!s.spent || this.now >= s.spent.until || !s.destinyLive || !this.up(owner, 'q')) return null;
    if (this.grenades.some((g) => g.owner === owner)) return null;
    return s.spent;
  }

  /** E on cooldown: a shard to drive the shotgun's butt into whoever is in front — 8 and a 3s stun. */
  doButt(owner: Owner): boolean {
    const f = this.slayerReady(owner);
    if (!f) return false;
    if (!this.spend(owner)) return false;
    const s = this.side(owner);
    const ang = Math.atan2(s.aimY - f.y, s.aimX - f.x);
    s.gun = 'shotgun';
    s.buttAt = this.now;
    this.relay(owner, 'myth-butt');
    const fx = this.fx(owner);
    fx.slash(f.x, f.y, ang, BUTT_R, BUTT_HALF, 10);
    let any = false;
    for (const t of this.foes(owner)) {
      const r = FIGHTER_R * (t.sizeMult || 1);
      const d = Math.hypot(t.x - f.x, t.y - f.y);
      if (d > BUTT_R + r) continue;
      const da = Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - ang);
      if (Math.abs(da) > BUTT_HALF + r / Math.max(1, d)) continue;
      this.hit(owner, t, BUTT_DAMAGE);
      this.stun(owner, t, BUTT_STUN_MS);
      s.hitMark = 1;
      fx.tipHit(t.x, t.y);
      this.text(owner, t.x, t.y - 44, 'STUNNED 3s', MYTH.red);
      this.fpsBursts.push({ kind: 'butt', x: t.x, y: t.y, at: this.now, t });
      any = true;
    }
    if (!any) this.text(owner, f.x, f.y - 44, 'GUN BUTT — MISSED', MYTH.haze);
    this.avatar(owner)?.play('punch', ang, 220);
    Sfx.playAt(any ? 'hit-heavy' : 'slash', f.x, { rate: 0.7, volume: 0.9 });
    this.shake(120, any ? 0.006 : 0.002);
    return true;
  }

  /** R on cooldown: a shard to set the last salvo off again where it lies — bigger, and red. */
  doRegrenade(owner: Owner): boolean {
    const f = this.slayerReady(owner);
    const s = this.side(owner);
    if (!f) return false;
    const sp = s.spent;
    if (!sp || this.now >= sp.until || this.grenades.some((g) => g.owner === owner)) {
      this.deny(owner, null, 'NO SPENT GRENADES');
      return false;
    }
    if (!this.spend(owner)) return false;
    s.spent = null;
    s.blastAt = this.now;
    this.relay(owner, 'myth-regrenade');
    this.text(owner, f.x, f.y - 50, 'DETONATED AGAIN', MYTH.red);
    const fx = this.fx(owner);
    for (const pt of sp.points) {
      fx.redExplosion(pt.x, pt.y, REGREN_R);
      this.fpsBursts.push({ kind: 'blast', x: pt.x, y: pt.y, at: this.now, t: null });
      for (const t of this.foes(owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - pt.x, t.y - pt.y) > REGREN_R + r) continue;
        this.hit(owner, t, REGREN_DAMAGE, { aoe: true });
        s.hitMark = 1;
      }
    }
    this.shake(260, 0.007);
    Sfx.playAt('explosion-large', f.x, { rate: 1.1, volume: 0.9 });
    return true;
  }

  /** F on cooldown: a shard for the rifle back now — and every headshot after refunds it again. */
  doRifleRefresh(owner: Owner): boolean {
    const f = this.slayerReady(owner);
    if (!f) return false;
    if (!this.spend(owner)) return false;
    this.refund(f, 'myth-rifle');
    this.side(owner).rifleChain = true;
    this.relay(owner, 'myth-rifle-refresh');
    this.text(owner, f.x, f.y - 50, 'RIFLE READY — HEADSHOTS CHAIN', MYTH.gold);
    Sfx.playAt('reload', f.x, { rate: 1.2, volume: 0.9 });
    return true;
  }

  /** Q on cooldown: a shard to turn every rocket in the air onto the aim, flying twice as fast. */
  doReaim(owner: Owner, tx: number, ty: number): boolean {
    const f = this.slayerReady(owner);
    if (!f) return false;
    const mine = this.rockets.filter((r) => r.owner === owner);
    if (mine.length === 0) { this.deny(owner, null, 'NO ROCKET IN THE AIR'); return false; }
    if (!this.spend(owner)) return false;
    this.relay(owner, 'myth-reaim');
    // The point the crosshair is on: down the aim from the caster, out to the wall.
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const b = this.api.bounds;
    const reach = (lim: number, p: number, d: number): number => (d === 0 ? Infinity : (lim - p) / d);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const k = Math.max(0, Math.min(
      ca > 0 ? reach(b.right - 8, f.x, ca) : reach(b.x + 8, f.x, ca),
      sa > 0 ? reach(b.bottom - 8, f.y, sa) : reach(b.y + 8, f.y, sa),
    ));
    const ax = f.x + ca * k;
    const ay = f.y + sa * k;
    for (const r of mine) {
      const a = Math.atan2(ay - r.y, ax - r.x);
      r.vx = Math.cos(a) * ROCKET_SPEED * REAIM_SPEED_MULT;
      r.vy = Math.sin(a) * ROCKET_SPEED * REAIM_SPEED_MULT;
      this.fx(owner).ring(r.x, r.y, 6, 34, 300, MYTH.red, 2.5, 10);
    }
    this.text(owner, f.x, f.y - 50, 'RE-AIMED', MYTH.red);
    Sfx.playAt('mortar-launch', f.x, { rate: 1.3, volume: 0.6 });
    return true;
  }

  // ── Online replay ──────────────────────────────────────────────────────────

  /** The opponent pressed one of the shard recasts; the replica follows. */
  replayNet(id: string, tx: number, ty: number): void {
    // The replica's shards are its own tally and may lag; a relayed press is the truth.
    const s = this.sides.npc;
    if (id === 'myth-parry-hit') {
      // The parry landed on their machine: the replica turns Indomitable. The stun on us
      // arrives through the status mirror.
      if (s.parryUntil <= 0) s.parryUntil = this.now + 1;
      this.landParry('npc', this.api.player);
      return;
    }
    if (s.shards <= 0) s.shards = 1;
    switch (id) {
      case 'myth-whip-plus': this.doWhipPlus('npc'); break;
      case 'myth-truth-plus': s.truthWindowUntil = Math.max(s.truthWindowUntil, this.now + 1); this.doTruthPlus('npc', tx, ty); break;
      case 'myth-beast-recall': this.doBeastRecall('npc'); break;
      case 'myth-riposte':
        if (!this.alive(s.parriedFoe)) s.parriedFoe = this.api.player;
        s.riposteUntil = Math.max(s.riposteUntil, this.now + 1);
        this.doRiposte('npc');
        break;
      case 'myth-reparry': s.reparryUntil = Math.max(s.reparryUntil, this.now + 1); this.doReparry('npc'); break;
      case 'myth-barrage': {
        const f = this.api.npc;
        if (!s.beyonder && f) s.beyonder = { x: f.x, y: f.y, until: this.now + 1 };
        else if (s.beyonder) s.beyonder.until = Math.max(s.beyonder.until, this.now + 1);
        this.doBarrage('npc', tx, ty);
        break;
      }
      case 'myth-rapid': this.doRapid('npc'); break;
      case 'myth-butt': s.aimX = tx; s.aimY = ty; this.doButt('npc'); break;
      case 'myth-regrenade': this.doRegrenade('npc'); break;
      case 'myth-rifle-refresh': this.doRifleRefresh('npc'); break;
      case 'myth-reaim': this.doReaim('npc', tx, ty); break;
      default: break;
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.is('player');
    const npcIs = this.is('npc');
    if (!playerIs && !npcIs && !this.hasLiveState()) return;
    this.vizT += delta / 1000;
    this.matchT += delta;
    this.ensureLayers();

    this.updateCrowd(delta);
    this.updateWhips();
    this.updateMaces(delta);
    this.updateDashes(delta);
    this.updateParry();
    this.updateRifts();
    this.updateBeasts(delta);
    this.updateSpears(delta);
    this.updateBarrages();
    this.updateCrowdStars(delta);
    this.updateFlips();
    this.updateStuns();
    this.updateBullets(delta);
    this.updateGrenades();
    this.updateRockets(delta);
    this.updateClouds();
    this.updateDestiny(delta);
    this.updateBotRecasts();
    this.updateAvatars(delta, playerIs, npcIs);
    this.updateBanter(delta, playerIs, npcIs);

    this.paintCrowd();
    this.paintGround();
    this.paintAir();
    this.paintHeads(playerIs, npcIs);
    this.paintView(delta);
    this.pushStatuses(playerIs);
  }

  private hasLiveState(): boolean {
    return this.maces.length > 0 || this.beasts.length > 0 || this.bullets.length > 0 || this.grenades.length > 0
      || this.rockets.length > 0 || this.clouds.length > 0 || this.bubble !== null
      || this.crowdStars.length > 0 || this.rifts.length > 0 || this.spears.length > 0 || this.barrages.length > 0
      || BOTH.some((o) => this.sides[o].indomLive || this.sides[o].parryUntil > 0 || this.sides[o].destinyLive || this.sides[o].stunHeld.size > 0);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // The crowd sits on the border under everything; fighters are depth 5; beasts and maces
    // ride just over them; shards and bubbles over the heads.
    if (!this.crowdGfx) this.crowdGfx = scene.add.graphics().setDepth(2);
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.headGfx) this.headGfx = scene.add.graphics().setDepth(12);
  }

  private ensureView(): MythView {
    if (!this.view) this.view = new MythView(this.api.scene, this.pcol, this.api.width, this.api.height);
    return this.view;
  }

  private masteryOn(owner: Owner): boolean {
    return owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive;
  }

  // ── The crowd ──────────────────────────────────────────────────────────────

  private updateCrowd(delta: number): void {
    void delta;
    const now = this.now;
    for (const owner of BOTH) {
      if (!this.is(owner)) continue;
      const f = this.fighter(owner);
      const s = this.side(owner);
      if (!f || !f.active) continue;
      // Damage taken, read off the fighter's raw tally (pre-mitigation, like "aimed at you").
      if (Number.isNaN(s.lastRawTaken)) s.lastRawTaken = f.rawDamageTaken;
      const dTaken = f.rawDamageTaken - s.lastRawTaken;
      s.lastRawTaken = f.rawDamageTaken;
      if (dTaken > 0) { s.taken.push({ at: now, amount: dTaken }); s.hurt = 1; }
      s.dealt = s.dealt.filter((t) => now - t.at <= CROWD_WINDOW_MS);
      s.taken = s.taken.filter((t) => now - t.at <= CROWD_WINDOW_MS);
      const dealt = s.dealt.reduce((a, t) => a + t.amount, 0);
      const taken = s.taken.reduce((a, t) => a + t.amount, 0);
      if (dealt >= CHEER_DEALT && now >= s.cheerSleepUntil) {
        s.dealt = [];
        s.cheerSleepUntil = now + CHEER_SLEEP_MS;
        this.cheerUntil = now + CHEER_MS;
        // Click+ Unquenched: two cheers inside ten seconds and the crowd loses its mind.
        if (this.up(owner, 'click') && now - s.lastCheerAt <= FRENZY_CHAIN_MS) {
          if (now >= s.frenzyUntil) this.text(owner, f.x, f.y - 78, 'THE CROWD GOES WILD', MYTH.gold);
          s.frenzyUntil = now + FRENZY_MS;
          this.frenzyUntil = Math.max(this.frenzyUntil, s.frenzyUntil);
          Sfx.playAt('reward-big', f.x, { rate: 0.9, volume: 0.6 });
        }
        s.lastCheerAt = now;
        if (s.shards < this.shardMax(owner)) {
          s.shards += 1;
          if (this.alive(f)) {
            this.fx(owner).shardGain(f.x, f.y);
            this.text(owner, f.x, f.y - 62, 'ECHO SHARD', MYTH.shard);
          }
        } else {
          this.text(owner, f.x, f.y - 62, 'SHARDS FULL', MYTH.shard);
        }
        Sfx.playAt('reward-big', f.x, { rate: 1.2, volume: owner === 'player' ? 0.7 : 0.4 });
      }
      if (taken >= BOO_TAKEN && now >= s.booSleepUntil) {
        s.taken = [];
        s.booSleepUntil = now + BOO_SLEEP_MS;
        this.booUntil = now + BOO_MS;
        f.mythJeeredUntil = Date.now() + JEER_MS;
        this.text(owner, f.x, f.y - 62, 'JEERED', MYTH.red);
        Sfx.playAt('status-debuff', f.x, { rate: 0.7, volume: 0.7 });
      }
    }
  }

  private ensureSpectators(): void {
    if (this.spectators.length > 0) return;
    const b = this.api.bounds;
    const W = this.api.width;
    const H = this.api.height;
    const seat = (x: number, y: number, i: number, s: number): void => {
      this.spectators.push({ x, y, s, seed: i, lit: jitter(17, i) > 0.55 });
    };
    let i = 0;
    // Two rows a side: an inner row of bigger figures and an outer row of smaller ones peering over.
    for (let x = b.x + 10; x < b.right - 6; x += 21) { seat(x + jitter(1, i) * 4, b.y - 9, i++, 7); seat(x + 10, b.y - 20, i++, 5.5); }
    for (let x = b.x + 10; x < b.right - 6; x += 21) { seat(x + jitter(2, i) * 4, b.bottom + 16, i++, 7); seat(x + 10, b.bottom + 26, i++, 5.5); }
    for (let y = b.y + 12; y < b.bottom - 8; y += 21) { seat(b.x - 12, y + jitter(3, i) * 4, i++, 6.5); seat(b.x - 24, y + 10, i++, 5); }
    for (let y = b.y + 12; y < b.bottom - 8; y += 21) { seat(b.right + 12, y + jitter(4, i) * 4, i++, 6.5); seat(b.right + 24, y + 10, i++, 5); }
    void W; void H;
  }

  private paintCrowd(): void {
    const g = this.crowdGfx;
    if (!g) return;
    g.clear();
    if (!this.is('player') && !this.is('npc')) return;
    this.ensureSpectators();
    const frenzy = this.now < this.frenzyUntil;
    const cheer = this.now < this.cheerUntil || frenzy;
    const boo = this.now < this.booUntil && !frenzy;
    const t = this.vizT;
    for (const sp of this.spectators) {
      const j = jitter(23, sp.seed);
      let bounce = 0.08 + 0.06 * Math.sin(t * 1.3 + j * 6);
      let arms = 0;
      let x = sp.x;
      let color = sp.lit ? MYTH.crowdLit : MYTH.crowdDark;
      let lit = 0;
      if (frenzy) {
        // Click+ Unquenched: on their feet, leaping twice as high and twice as fast, lit up.
        bounce = Math.abs(Math.sin(t * 15 + j * 6.28)) * 2.2;
        arms = 1;
        lit = 0.7 + 0.3 * Math.sin(t * 18 + j * 9);
        x += Math.sin(t * 7 + j * 5) * 1.5;
      } else if (cheer) {
        bounce = Math.max(0, Math.sin(t * 9 + j * 6.28)) * 1;
        arms = 1;
        lit = 0.5 + 0.5 * Math.sin(t * 12 + j * 9);
      } else if (boo) {
        x += Math.sin(t * 18 + j * 6) * 1.6;
        color = 0x4a1c2a;
        arms = 0.15;
      }
      crowdFigure(g, x, sp.y, sp.s, color, lit, bounce, arms, 0.95);
    }
    if (cheer) {
      // Confetti of stars thrown over the edge.
      for (let i = 0; i < (frenzy ? 30 : 14); i++) {
        const k = (t * 0.9 + jitter(29, i)) % 1;
        const b = this.api.bounds;
        const side = i % 4;
        const u = jitter(31, i);
        const x = side < 2 ? b.x + u * b.width : (side === 2 ? b.x + 20 + k * 40 : b.right - 20 - k * 40);
        const y = side === 0 ? b.y + 10 + k * 50 : side === 1 ? b.bottom - 10 - k * 50 : b.y + u * b.height;
        star(g, x, y, 2.6, i % 3 === 0 ? MYTH.shard : MYTH.star, 1 - k, { points: 4, rot: k * 6 });
      }
    }
  }

  // ── Whip, maces ────────────────────────────────────────────────────────────

  private updateWhips(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.whip && this.now - s.whip.start > WHIP_ANIM_MS) s.whip = null;
    }
  }

  private updateMaces(delta: number): void {
    void delta;
    for (let i = this.maces.length - 1; i >= 0; i--) {
      const m = this.maces[i];
      if (this.now >= m.until) { this.maces.splice(i, 1); continue; }
      const age = (this.now - m.born) / 1000;
      const mx = m.cx + Math.cos(age * MACE_SPIN) * MACE_ORBIT_R;
      const my = m.cy + Math.sin(age * MACE_SPIN) * MACE_ORBIT_R;
      for (const t of this.foes(m.owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - mx, t.y - my) > 11 + r) continue;
        if (this.now < (m.hitAt.get(t) ?? 0)) continue;
        m.hitAt.set(t, this.now + MACE_GATE_MS);
        this.hit(m.owner, t, MACE_DAMAGE);
        this.fx(m.owner).graze(t.x, t.y);
      }
    }
  }

  // ── Truth Breaker's dash ───────────────────────────────────────────────────

  private updateDashes(delta: number): void {
    void delta;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.dashUntil <= 0) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.now >= s.dashUntil) {
        if (s.dashUntil > 0 && f && f.active) {
          this.fx(owner).dashTrail(s.dashX0, s.dashY0, f.x, f.y);
          if (this.up(owner, 'e') && Math.hypot(f.x - s.dashX0, f.y - s.dashY0) > 30) this.addRift(owner, s.dashX0, s.dashY0, f.x, f.y);
          this.body(f).setVelocity(0, 0);
          const av = this.avatar(owner);
          av?.setBlade(false);
          av?.setEye(this.masteryOn(owner));
        }
        s.dashUntil = 0;
        continue;
      }
      if (this.isReplica(owner)) {
        // The replica's own position comes down the wire; its dash is a drawing, not a move.
      } else if (this.now < f.highGravityUntil) {
        s.dashUntil = 0;
        continue;
      } else {
        this.body(f).setVelocity(s.dashVx, s.dashVy);
      }
      for (const t of this.foes(owner)) {
        if (s.dashHit.has(t)) continue;
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - f.x, t.y - f.y) > TRUTH_DASH_HIT_R + r) continue;
        s.dashHit.add(t);
        this.hit(owner, t, TRUTH_DASH_DAMAGE, { trueDamage: true });
        this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.gold));
        this.fx(owner).slash(t.x, t.y, Math.atan2(s.dashVy, s.dashVx), 60, Math.PI / 3, 10);
        this.text(owner, t.x, t.y - 44, 'TRUE', MYTH.gold);
        Sfx.playAt('slash', t.x, { rate: 1.1, volume: 0.8 });
      }
    }
  }

  // ── The beast ──────────────────────────────────────────────────────────────

  private updateBeasts(delta: number): void {
    const dt = delta / 1000;
    const b = this.api.bounds;
    for (let i = this.beasts.length - 1; i >= 0; i--) {
      const bst = this.beasts[i];
      if (bst.doneAt > 0) {
        if (this.now - bst.doneAt >= BEAST_FADE_MS) this.beasts.splice(i, 1);
        continue;
      }
      const owner = bst.owner;
      const f = this.fighter(owner);
      if (!f || !f.active) { this.finishBeast(bst); continue; }
      if (!bst.moving) {
        if (this.now - bst.born >= BEAST_DELAY_MS) {
          bst.moving = true;
          Sfx.playAt('roar', bst.x, { rate: 0.9, volume: 0.9 });
        }
        continue;
      }
      const vx = Math.cos(bst.ang) * BEAST_SPEED;
      const vy = Math.sin(bst.ang) * BEAST_SPEED;
      bst.x += vx * dt;
      bst.y += vy * dt;
      const last = bst.trail[0];
      if (!last || Math.hypot(last.x - bst.x, last.y - bst.y) >= BEAST_SEG_GAP) {
        bst.trail.unshift({ x: bst.x, y: bst.y });
        if (bst.trail.length > BEAST_SEGMENTS + 2) bst.trail.pop();
      }
      // The catch: anyone the head reaches is held in front of it and chewed every half second.
      for (const t of this.foes(owner)) {
        if (bst.grabbed.has(t)) continue;
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - bst.x, t.y - bst.y) > BEAST_GRAB_R + r) continue;
        if (t.knockbackImmune || t.unstoppable) continue;
        bst.grabbed.set(t, this.now + BEAST_TICK_MS);
        this.fx(owner).starSpray(t.x, t.y, 8, 30, 400, 10, MYTH.red);
        this.text(owner, t.x, t.y - 44, 'CAUGHT', MYTH.red);
        Sfx.playAt('claw', t.x, { volume: 0.8 });
      }
      for (const [t, tickAt] of bst.grabbed) {
        if (!this.alive(t) || t.unstoppable) { bst.grabbed.delete(t); continue; }
        if (!(this.isReplica(owner) && t === this.api.player)) {
          const vb = this.body(t);
          vb.reset(bst.x + Math.cos(bst.ang) * 26, bst.y + Math.sin(bst.ang) * 26);
          vb.setVelocity(vx, vy);
        }
        if (this.now >= tickAt) {
          bst.grabbed.set(t, this.now + BEAST_TICK_MS);
          this.hit(owner, t, BEAST_TICK_DAMAGE);
          this.api.spawnHitFlash(t.x, t.y, this.col(owner)(MYTH.red));
        }
      }
      // F+ Beyonders: the rider throws at whoever is near and not already in the jaws.
      const s = this.side(owner);
      if (this.up(owner, 'f') && this.now >= s.nextSpearAt) {
        const t = this.foes(owner).filter((q) => !bst.grabbed.has(q) && Math.hypot(q.x - bst.x, q.y - bst.y) <= SPEAR_RANGE)
          .sort((a, c) => Math.hypot(a.x - bst.x, a.y - bst.y) - Math.hypot(c.x - bst.x, c.y - bst.y))[0];
        if (t) {
          s.nextSpearAt = this.now + SPEAR_GAP_MS;
          const a = Math.atan2(t.y - (bst.y - 14), t.x - bst.x);
          this.spears.push({ owner, x: bst.x, y: bst.y - 14, vx: Math.cos(a) * SPEAR_SPEED, vy: Math.sin(a) * SPEAR_SPEED, born: this.now });
          Sfx.playAt('slash', bst.x, { rate: 1.6, volume: 0.35 });
        }
      }
      // The flip: the beast runs through its own master, who vaults it for a burst of speed.
      if (this.alive(f) && this.now >= s.flipGateUntil && Math.hypot(f.x - bst.x, f.y - bst.y) <= BEAST_GRAB_R + 8) {
        s.flipGateUntil = this.now + FLIP_GATE_MS;
        s.flipUntil = this.now + FLIP_MS;
        s.flipSpeedUntil = this.now + FLIP_SPEED_MS;
        this.avatar(owner)?.flip(FLIP_MS);
        this.fx(owner).flip(f.x, f.y);
        this.text(owner, f.x, f.y - 56, 'FLIP  +20% SPEED', MYTH.starBlue);
        Sfx.playAt('jump', f.x, { rate: 1.1, volume: 0.8 });
      }
      // Home, or a wall.
      if (bst.returning) {
        if (Math.hypot(bst.x - bst.portalX, bst.y - bst.portalY) <= 18) {
          this.finishBeast(bst);
          this.fx(owner).ring(bst.portalX, bst.portalY, 50, 6, 400, MYTH.iris, 3, 9);
        }
      } else if (bst.x <= b.x + BEAST_HEAD_R * 0.6 || bst.x >= b.right - BEAST_HEAD_R * 0.6 || bst.y <= b.y + BEAST_HEAD_R * 0.6 || bst.y >= b.bottom - BEAST_HEAD_R * 0.6) {
        this.finishBeast(bst);
        this.fx(owner).explosion(bst.x, bst.y, 60, 9);
        this.shake(200, 0.004);
      }
    }
  }

  private finishBeast(bst: Beast): void {
    if (bst.doneAt > 0) return;
    bst.doneAt = this.now;
    // F+ Beyonders: a recalled beast drops its rider at the portal, waiting for a shard.
    if (bst.returning && this.up(bst.owner, 'f')) {
      this.side(bst.owner).beyonder = { x: bst.portalX, y: bst.portalY, until: this.now + BEYONDER_WAIT_MS };
      this.text(bst.owner, bst.portalX, bst.portalY - 50, 'F + SHARD: BARRAGE', MYTH.red);
    }
    for (const t of bst.grabbed.keys()) {
      if (this.alive(t) && !(this.isReplica(bst.owner) && t === this.api.player)) this.body(t).setVelocity(0, 0);
    }
    bst.grabbed.clear();
    Sfx.playAt('ghost-wail', bst.x, { rate: 0.8, volume: 0.6 });
  }

  private updateFlips(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.flipUntil > 0 && this.now >= s.flipUntil) s.flipUntil = 0;
    }
  }

  /** Bodies this kit stunned stay put until the clock runs out (after movement, so it wins). */
  private updateStuns(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      for (const [t, until] of s.stunHeld) {
        if (!this.alive(t) || this.now >= until || t.unstoppable) { s.stunHeld.delete(t); continue; }
        this.body(t).setVelocity(0, 0);
      }
    }
  }

  // ── Shop-upgrade world objects ─────────────────────────────────────────────

  /** E+: stepping on one of your own ready rifts — 3s of speed and Indomitable, then 8s to mend. */
  private updateRifts(): void {
    for (const r of this.rifts) {
      if (this.now < r.readyAt) continue;
      const f = this.fighter(r.owner);
      if (!this.alive(f) || !this.is(r.owner)) continue;
      const rad = FIGHTER_R * (f.sizeMult || 1);
      if (segDist(f.x, f.y, r.x0, r.y0, r.x1, r.y1).d > RIFT_TOUCH + rad * 0.5) continue;
      r.readyAt = this.now + RIFT_RECHARGE_MS;
      const s = this.side(r.owner);
      s.riftSpeedUntil = Math.max(s.riftSpeedUntil, this.now + RIFT_BUFF_MS);
      s.indomitableUntil = Math.max(s.indomitableUntil, this.now + RIFT_BUFF_MS);
      this.fx(r.owner).ring(f.x, f.y, 8, 44, 360, MYTH.gold, 2.5, 9);
      this.fx(r.owner).starSpray((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 8, 36, 420, 9, MYTH.gold);
      this.text(r.owner, f.x, f.y - 56, 'RIFT  +30% SPEED  INDOMITABLE', MYTH.gold);
      Sfx.playAt('status-haste', f.x, { rate: 1.1, volume: 0.6 });
    }
  }

  private updateSpears(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.spears.length - 1; i >= 0; i--) {
      const sp = this.spears[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      let gone = this.now - sp.born > SPEAR_LIFE_MS || this.offArena(sp.x, sp.y);
      if (!gone) {
        for (const t of this.foes(sp.owner)) {
          const r = FIGHTER_R * (t.sizeMult || 1);
          if (Math.hypot(t.x - sp.x, t.y - sp.y) > r + 6) continue;
          this.hit(sp.owner, t, SPEAR_DAMAGE);
          this.api.spawnHitFlash(t.x, t.y, this.col(sp.owner)(MYTH.violet));
          gone = true;
          break;
        }
      }
      if (gone) this.spears.splice(i, 1);
    }
  }

  private updateBarrages(): void {
    for (let i = this.barrages.length - 1; i >= 0; i--) {
      const br = this.barrages[i];
      if (this.now >= br.until) { this.barrages.splice(i, 1); continue; }
      if (this.now < br.nextTickAt) continue;
      br.nextTickAt = this.now + BARRAGE_TICK_MS;
      // A spear lands somewhere in the patch every tick: the art. Everyone in it is hurt: the sim.
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * BARRAGE_R * 0.9;
      this.fx(br.owner).spearLand(br.x + Math.cos(a) * d, br.y + Math.sin(a) * d);
      for (const t of this.foes(br.owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - br.x, t.y - br.y) > BARRAGE_R + r * 0.5) continue;
        this.hit(br.owner, t, BARRAGE_TICK_DAMAGE, { aoe: true });
      }
    }
  }

  /** Click+: in a frenzy the crowd throws stars over the wall at the foe. */
  private updateCrowdStars(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (this.now >= s.frenzyUntil || this.now < s.nextThrowAt || !this.is(owner)) continue;
      s.nextThrowAt = this.now + FRENZY_THROW_MS;
      const foes = this.foes(owner);
      if (foes.length === 0) continue;
      this.ensureSpectators();
      const t = foes[Math.floor(Math.random() * foes.length)];
      // The thrower: a spectator on the near side of the ring.
      let from = this.spectators[0];
      let best = Infinity;
      for (let k = 0; k < 6; k++) {
        const sp = this.spectators[Math.floor(Math.random() * this.spectators.length)];
        const d = Math.hypot(sp.x - t.x, sp.y - t.y);
        if (d < best) { best = d; from = sp; }
      }
      if (!from) continue;
      const a = Math.atan2(t.y - from.y, t.x - from.x);
      this.crowdStars.push({ owner, x: from.x, y: from.y, vx: Math.cos(a) * CROWD_STAR_SPEED, vy: Math.sin(a) * CROWD_STAR_SPEED, born: this.now, seed: Math.random() * 9 });
    }
    for (let i = this.crowdStars.length - 1; i >= 0; i--) {
      const cs = this.crowdStars[i];
      cs.x += cs.vx * dt;
      cs.y += cs.vy * dt;
      let gone = this.now - cs.born > CROWD_STAR_LIFE_MS;
      if (!gone) {
        for (const t of this.foes(cs.owner)) {
          const r = FIGHTER_R * (t.sizeMult || 1);
          if (Math.hypot(t.x - cs.x, t.y - cs.y) > r + 5) continue;
          this.hit(cs.owner, t, CROWD_STAR_DAMAGE, { noTally: true });
          this.fx(cs.owner).graze(cs.x, cs.y);
          gone = true;
          break;
        }
      }
      if (gone) this.crowdStars.splice(i, 1);
    }
  }

  // ── Guns ───────────────────────────────────────────────────────────────────

  private offArena(x: number, y: number): boolean {
    const b = this.api.bounds;
    return x < b.x || x > b.right || y < b.y || y > b.bottom;
  }

  private updateBullets(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bl = this.bullets[i];
      bl.x += bl.vx * dt;
      bl.y += bl.vy * dt;
      let gone = this.now - bl.born > PISTOL_LIFE_MS || this.offArena(bl.x, bl.y);
      if (!gone) {
        for (const t of this.foes(bl.owner)) {
          const r = FIGHTER_R * (t.sizeMult || 1);
          if (Math.hypot(t.x - bl.x, t.y - bl.y) > PISTOL_HIT_R + r - 8) continue;
          this.hit(bl.owner, t, PISTOL_DAMAGE);
          this.side(bl.owner).hitMark = 1;
          if (!(t.unstoppable)) {
            const live = Date.now() < t.mythVulnUntil ? t.mythVulnStacks : 0;
            t.mythVulnStacks = Math.min(VULN_MAX, live + 1);
            t.mythVulnUntil = Date.now() + VULN_MS;
          }
          this.api.spawnHitFlash(t.x, t.y, this.col(bl.owner)(MYTH.star));
          this.fx(bl.owner).graze(bl.x, bl.y);
          gone = true;
          break;
        }
      }
      if (gone) {
        if (bl.reg) this.api.projectileRegistry.remove(bl.reg);
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateGrenades(): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const gr = this.grenades[i];
      if (this.now < gr.until) continue;
      this.grenades.splice(i, 1);
      this.fx(gr.owner).explosion(gr.tx, gr.ty, GREN_R, 9);
      this.shake(90, 0.003);
      Sfx.playAt('explosion-small', gr.tx, { volume: 0.8 });
      for (const t of this.foes(gr.owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - gr.tx, t.y - gr.ty) > GREN_R + r) continue;
        // The salvo counts its hits on each body: the second and third grenades hit harder.
        const key = `myth-salvo-${gr.salvo}`;
        const hits = (t.getData(key) as number | undefined) ?? 0;
        t.setData(key, hits + 1);
        const mult = GREN_STACK[Math.min(GREN_STACK.length - 1, hits)];
        this.hit(gr.owner, t, GREN_DAMAGE * mult, { aoe: true });
        if (hits > 0) this.text(gr.owner, t.x, t.y - 44, `×${mult.toFixed(2)}`, MYTH.gold);
      }
    }
  }

  private updateRockets(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      let direct: Fighter | null = null;
      for (const t of this.foes(r.owner)) {
        const rr = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - r.x, t.y - r.y) <= ROCKET_HIT_R + rr - 6) { direct = t; break; }
      }
      const b = this.api.bounds;
      const wall = r.x < b.x + 6 || r.x > b.right - 6 || r.y < b.y + 6 || r.y > b.bottom - 6;
      if (!direct && !wall) continue;
      if (r.reg) this.api.projectileRegistry.remove(r.reg);
      this.rockets.splice(i, 1);
      const x = Phaser.Math.Clamp(r.x, b.x + 6, b.right - 6);
      const y = Phaser.Math.Clamp(r.y, b.y + 6, b.bottom - 6);
      this.fx(r.owner).explosion(x, y, ROCKET_R, 10);
      this.shake(320, 0.008);
      Sfx.playAt('explosion-large', x, { volume: 1 });
      for (const t of this.foes(r.owner)) {
        const rr = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - x, t.y - y) > ROCKET_R + rr) continue;
        const dmg = ROCKET_DAMAGE + (t === direct ? ROCKET_DIRECT : 0);
        this.hit(r.owner, t, dmg, { aoe: true });
        if (t === direct) this.text(r.owner, t.x, t.y - 48, 'DIRECT HIT', MYTH.gold);
      }
      this.clouds.push({ owner: r.owner, x, y, until: this.now + CLOUD_MS, nextTickAt: this.now + CLOUD_TICK_MS, seed: Math.random() * 999 });
    }
  }

  private updateClouds(): void {
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      if (this.now >= c.until) { this.clouds.splice(i, 1); continue; }
      if (this.now < c.nextTickAt) continue;
      c.nextTickAt = this.now + CLOUD_TICK_MS;
      for (const t of this.foes(c.owner)) {
        const r = FIGHTER_R * (t.sizeMult || 1);
        if (Math.hypot(t.x - c.x, t.y - c.y) > CLOUD_R + r * 0.5) continue;
        if (t.airborne) continue;
        this.hit(c.owner, t, CLOUD_TICK_DAMAGE, { aoe: true });
      }
    }
  }

  // ── Final Destiny ──────────────────────────────────────────────────────────

  private updateDestiny(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (!s.destinyLive) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || this.now >= s.destinyUntil) { this.endDestiny(owner); continue; }
      s.gunRecoil = Math.max(0, s.gunRecoil - dt * 6);
      s.hurt = Math.max(0, s.hurt - dt * 2.5);
      s.hitMark = Math.max(0, s.hitMark - dt * 5);
      s.headMark = Math.max(0, s.headMark - dt * 1.4);
      if (owner === 'player') {
        // The turn: the mouse's own travel, captured or not. With the cursor free (no pointer
        // lock), parking it at an edge of the screen keeps turning that way too.
        s.yaw += this.lookDX * LOOK_SENS;
        s.pitch -= this.lookDY * PITCH_SENS;
        this.lookDX = 0;
        this.lookDY = 0;
        if (!this.lookLocked()) {
          const k = this.cursorK();
          if (Math.abs(k) > EDGE_K) s.yaw += Math.sign(k) * ((Math.abs(k) - EDGE_K) / (1 - EDGE_K)) * TURN_RATE * dt;
          const ky = this.cursorKY();
          if (Math.abs(ky) > EDGE_K) s.pitch -= Math.sign(ky) * ((Math.abs(ky) - EDGE_K) / (1 - EDGE_K)) * EDGE_PITCH_RATE * dt;
        }
        s.pitch = Phaser.Math.Clamp(s.pitch, -MythView.PITCH_DOWN, MythView.PITCH_UP);
        const v = this.body(f).velocity;
        const moving = Math.hypot(v.x, v.y) > 20;
        s.bob += dt * (moving ? 9 : 2.5);
      } else {
        // The bot looks straight at whoever it is shooting.
        const t = this.foes(owner)[0];
        if (t) s.yaw = Math.atan2(t.y - f.y, t.x - f.x);
      }
    }
  }

  /** The cursor, as `handleInput` last saw it (world == screen in the arena). */
  private lastMouseX = 0;
  private lastMouseY = 0;

  /** The cursor's screen offset, −1 at the left edge to +1 at the right. */
  private cursorK(): number {
    const W = this.api.width;
    return Phaser.Math.Clamp((this.lastMouseX - W / 2) / (W / 2), -1, 1);
  }

  /** The cursor's screen offset, −1 at the top edge to +1 at the bottom. */
  private cursorKY(): number {
    const H = this.api.height;
    return Phaser.Math.Clamp((this.lastMouseY - H / 2) / (H / 2), -1, 1);
  }

  private relabelBars(fps: boolean): void {
    const bars = this.api.abilityBars;
    if (fps) {
      const guns: [string, string][] = [
        ['Click  Pistol', '8 damage, stacks 5% vulnerability'],
        ['E  Shotgun', '7 × 6 close; doubles vulnerability'],
        ['R  Grenade Barrage', '3 × 14 in a cone, stack ×1.25 / ×1.5'],
        ['F  Hunter Rifle', '26 piercing; centre hit = 39'],
        ['Q  Shadow Rocket', '30 in 150px, +20 direct, cloud 5/s'],
      ];
      bars.forEach((bar, i) => {
        if (i >= guns.length) return;
        bar.lbl?.setText(guns[i][0]);
        bar.desc?.setText(guns[i][1]);
      });
      return;
    }
    const abs = this.api.playerAbilities;
    bars.forEach((bar, i) => {
      if (i >= abs.length || i >= 5) return;
      const ab = abs[i];
      bar.lbl?.setText(`${ab.displayKey}  ${ab.name}`);
      bar.desc?.setText(ab.description);
    });
  }

  private paintView(delta: number): void {
    const s = this.sides.player;
    if (!this.view || !this.view.isOpen()) return;
    const p = this.api.player;
    if (!s.destinyLive || !this.alive(p)) { this.view.hide(); return; }
    const entities: ViewEntity[] = [];
    const seen = new Set<Fighter>();
    const bodies = [this.api.npc, ...this.api.enemies];
    for (const f of bodies) {
      if (!f || seen.has(f) || f === p || !this.alive(f)) continue;
      seen.add(f);
      const size = 48 * (f.sizeMult || 1);
      entities.push({
        kind: 'sprite', x: f.x, y: f.y, texture: f.texture.key, height: size, width: size,
        hpRatio: f.hp / Math.max(1, f.maxHp), alpha: Math.max(0.35, f.alpha), label: f.element?.name,
      });
    }
    // Everyone's shots in the shared group.
    const group = this.api.projectiles;
    for (const child of group.getChildren()) {
      const pr = child as Phaser.Physics.Arcade.Image;
      if (!pr.active) continue;
      entities.push({ kind: 'sprite', x: pr.x, y: pr.y, texture: pr.texture.key, height: Math.max(10, pr.displayHeight), width: Math.max(10, pr.displayWidth) });
    }
    const tint = this.pcol;
    const t = this.vizT;
    for (const bl of this.bullets) {
      entities.push({ kind: 'draw', x: bl.x, y: bl.y, height: 8, draw: (g, sx, sy, sc) => star(g, sx, sy - 30 * sc, Math.max(2, 4 * sc), tint(MYTH.star), 1, { points: 4, rot: t * 9 }) });
    }
    for (const r of this.rockets) {
      entities.push({ kind: 'draw', x: r.x, y: r.y, height: 20, draw: (g, sx, sy, sc) => {
        voidDisc(g, tint, sx, sy - 26 * sc, Math.max(4, 11 * sc), 1, r.seed, t, 5);
        star(g, sx, sy - 26 * sc, Math.max(3, 6 * sc), tint(MYTH.red), 0.9, { points: 4, rot: t * 6 });
      } });
    }
    for (const gr of this.grenades) {
      const k = Phaser.Math.Clamp((this.now - gr.start) / GREN_FLIGHT_MS, 0, 1);
      const gx = gr.x0 + (gr.tx - gr.x0) * k;
      const gy = gr.y0 + (gr.ty - gr.y0) * k;
      const lift = Math.sin(k * Math.PI) * 60;
      entities.push({ kind: 'draw', x: gx, y: gy, height: 10, draw: (g, sx, sy, sc) => voidDisc(g, tint, sx, sy - lift * sc, Math.max(3, 6 * sc), 1, gr.salvo, t, 3) });
    }
    for (const c of this.clouds) {
      entities.push({ kind: 'draw', x: c.x, y: c.y, height: 60, draw: (g, sx, sy, sc) => paintCloud(g, tint, sx, sy - 30 * sc, Math.max(10, CLOUD_R * 0.55 * sc), t, c.seed, 0.55 * Phaser.Math.Clamp((c.until - this.now) / 800, 0, 1)) });
    }
    for (const m of this.maces) {
      const age = (this.now - m.born) / 1000;
      const mx = m.cx + Math.cos(age * MACE_SPIN) * MACE_ORBIT_R;
      const my = m.cy + Math.sin(age * MACE_SPIN) * MACE_ORBIT_R;
      entities.push({ kind: 'draw', x: mx, y: my, height: 20, draw: (g, sx, sy, sc) => starMace(g, tint, sx, sy - 20 * sc, Math.max(3, 9 * sc), 1, m.seed, age * 4) });
    }
    for (const bst of this.beasts) {
      const fade = bst.doneAt > 0 ? 1 - (this.now - bst.doneAt) / BEAST_FADE_MS : 1;
      entities.push({ kind: 'draw', x: bst.portalX, y: bst.portalY, height: 60, draw: (g, sx, sy, sc) => paintPortal(g, tint, sx, sy - 30 * sc, Math.PI / 2, Math.min(1, (this.now - bst.born) / 300) * fade, t, bst.seed, fade) });
      const pts = [{ x: bst.x, y: bst.y }, ...bst.trail].slice(0, BEAST_SEGMENTS);
      pts.forEach((pt, i) => {
        const r = i === 0 ? BEAST_HEAD_R : BEAST_HEAD_R * (0.35 + 0.55 * (1 - i / pts.length));
        entities.push({ kind: 'draw', x: pt.x, y: pt.y, height: r * 2, draw: (g, sx, sy, sc) => {
          voidDisc(g, tint, sx, sy - r * sc, Math.max(4, r * sc), fade, bst.seed + i, t, i === 0 ? 7 : 3);
          if (i === 0) {
            for (const side of [-1, 1]) star(g, sx + side * r * 0.45 * sc, sy - r * 1.15 * sc, Math.max(2, 5 * sc), tint(MYTH.gold), fade, { points: 4, rot: t });
          }
        } });
      });
    }
    for (const sp of this.spears) {
      const a = Math.atan2(sp.vy, sp.vx);
      entities.push({ kind: 'draw', x: sp.x, y: sp.y, height: 10, draw: (g, sx, sy, sc) => spear(g, tint, sx, sy - 30 * sc, a - s.yaw, Math.max(8, 26 * sc), 1) });
    }
    for (const cs of this.crowdStars) {
      entities.push({ kind: 'draw', x: cs.x, y: cs.y, height: 10, draw: (g, sx, sy, sc) => star(g, sx, sy - 34 * sc, Math.max(2.5, 6 * sc), tint(MYTH.gold), 1, { points: 5, rot: t * 10 }) });
    }
    for (const r of this.rifts) {
      const ready = this.now >= r.readyAt;
      entities.push({ kind: 'draw', x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, height: 6, draw: (g, sx, sy, sc) => {
        g.fillStyle(tint(ready ? MYTH.gold : MYTH.violet), ready ? 0.55 : 0.3);
        g.fillEllipse(sx, sy, Math.max(8, 60 * sc), Math.max(2, 8 * sc));
        if (ready) star(g, sx, sy - 6 * sc, Math.max(2, 7 * sc), tint(MYTH.star), 0.8 + 0.2 * Math.sin(t * 6), { points: 4, rot: t * 2 });
      } });
    }
    const spent = this.liveSpent('player');
    if (spent) {
      const a = Phaser.Math.Clamp((spent.until - this.now) / 600, 0, 1);
      spent.points.forEach((pt, i) => entities.push({ kind: 'draw', x: pt.x, y: pt.y, height: 14, draw: (g, sx, sy, sc) => spentGrenade(g, tint, sx, sy, t, a, i * 7 + 1, Math.max(0.4, sc * 1.6)) }));
    }
    this.fpsBursts = this.fpsBursts.filter((b) => this.now - b.at < (b.kind === 'butt' ? BUTT_STUN_MS : BLAST_FPS_MS));
    for (const b of this.fpsBursts) {
      const age = this.now - b.at;
      if (b.kind === 'blast') {
        entities.push({ kind: 'draw', x: b.x, y: b.y, height: REGREN_R, draw: (g, sx, sy, sc) => redBlast(g, tint, sx, sy - REGREN_R * 0.45 * sc, Math.max(8, REGREN_R * 0.75 * sc), age / BLAST_FPS_MS) });
        continue;
      }
      const tgt = b.t && this.alive(b.t) ? b.t : null;
      const x = tgt ? tgt.x : b.x;
      const y = tgt ? tgt.y : b.y;
      const crown = tgt ? Phaser.Math.Clamp((tgt.stunnedUntil - Date.now()) / 300, 0, 1) : 0;
      entities.push({ kind: 'draw', x, y, height: 60, draw: (g, sx, sy, sc) => {
        if (age < BUTT_FX_MS) buttImpact(g, tint, sx, sy - 26 * sc, Math.max(10, 34 * sc), age / BUTT_FX_MS);
        if (crown > 0) stunCrown(g, tint, sx, sy - 62 * sc, Math.max(6, 20 * sc), t, crown);
      } });
    }
    for (const br of this.barrages) {
      entities.push({ kind: 'draw', x: br.x, y: br.y, height: 40, draw: (g, sx, sy, sc) => {
        g.lineStyle(Math.max(1, 2 * sc), tint(MYTH.red), 0.6);
        g.strokeEllipse(sx, sy, Math.max(10, BARRAGE_R * 2 * sc), Math.max(3, BARRAGE_R * 0.5 * sc));
        for (let i = 0; i < 4; i++) {
          const k = ((this.now - br.born) / 420 + jitter(br.seed, i)) % 1;
          const ox = (jitter(br.seed, i + 3) - 0.5) * BARRAGE_R * 1.6 * sc;
          spear(g, tint, sx + ox, sy - (1 - k) * 160 * sc, Math.PI / 2, Math.max(8, 24 * sc), Math.min(1, k * 3));
        }
      } });
    }
    const cheering = this.now < this.cheerUntil || this.now < this.frenzyUntil;
    this.view.render(delta, {
      x: p.x, y: p.y, yaw: s.yaw, pitch: s.pitch, bob: s.bob, bounds: this.api.bounds,
    }, entities, {
      gun: s.gun, recoil: s.gunRecoil,
      secondsLeft: Math.max(0, (s.destinyUntil - this.now) / 1000),
      crowdBounce: this.now < this.frenzyUntil ? 2 : cheering ? 1 : 0, crowdArms: cheering ? 1 : 0, hurt: s.hurt,
      hitMark: s.hitMark, headMark: s.headMark, locked: this.lookLocked(),
      rapid: this.now < s.rapidUntil, chain: s.rifleChain,
      shards: s.shards, shardMax: this.shardMax('player'),
      butt: Phaser.Math.Clamp(1 - (this.now - s.buttAt) / BUTT_ANIM_MS, 0, 1),
      blast: Phaser.Math.Clamp(1 - (this.now - s.blastAt) / BLAST_FPS_MS, 0, 1),
      toast: this.fpsToast && this.now - this.fpsToast.at < TOAST_MS
        ? { text: this.fpsToast.text, color: this.fpsToast.color, a: 1 - Math.max(0, (this.now - this.fpsToast.at - TOAST_MS * 0.6) / (TOAST_MS * 0.4)) }
        : null,
    });
  }

  // ── Bot recasts ────────────────────────────────────────────────────────────

  /**
   * The bot spends its own shards. A recast is a press that never touches a cooldown, so it
   * never reaches `castAbility` and the AI routine cannot make it; the kit decides here, off
   * the same opportunities it publishes to the routine, on a human-ish beat.
   */
  private updateBotRecasts(): void {
    if (!this.is('npc') || this.api.isOnline) return;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f)) return;
    // Slayer's rapid fire for the bot: the pistol's cooldown counts as done at half way.
    if (s.destinyLive && this.now < s.rapidUntil && f.getCooldownRatio('myth-pistol') >= 0.5) f.resetCooldown('myth-pistol');
    if (s.shards <= 0 || this.now < s.nextRecastAt) return;
    const t = this.foes('npc')[0];
    if (!t) return;
    const dist = Math.hypot(t.x - f.x, t.y - f.y);
    const decide = (): boolean => {
      if (s.destinyLive) {
        // Q+ Slayer, off cooldown-bound guns.
        if (!this.up('npc', 'q')) return false;
        const cd = (id: string): boolean => f.getCooldownRatio(id) < 1;
        s.aimX = t.x; s.aimY = t.y;
        if (dist < BUTT_R + 10 && cd('myth-shotgun')) return this.doButt('npc');
        const mine = this.rockets.find((r) => r.owner === 'npc');
        if (mine && cd('myth-rocket')) {
          // The rocket is going wide of them: turn it.
          const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - mine.y, t.x - mine.x) - Math.atan2(mine.vy, mine.vx)));
          if (off > 0.5) return this.doReaim('npc', t.x, t.y);
        }
        if (s.spent && this.now < s.spent.until && cd('myth-grenades')
          && s.spent.points.some((pt) => Math.hypot(pt.x - t.x, pt.y - t.y) < REGREN_R)) return this.doRegrenade('npc');
        if (dist > 220 && cd('myth-rifle') && !s.rifleChain && s.shards >= 2) return this.doRifleRefresh('npc');
        if (dist < 320 && this.now >= s.rapidUntil && s.shards >= 2) return this.doRapid('npc');
        return false;
      }
      // The riposte: a parry landed — 35 true on a stunned foe is never a waste.
      if (this.riposteReady('npc')) { this.doRiposte('npc'); return true; }
      // Outskilled: the swing it braced for is still coming.
      if (this.reparryReady('npc') && this.parryCue('npc')) { this.doReparry('npc'); return true; }
      // The dash: the window is open and they are inside its reach — a true-damage 32.
      if (this.now < s.truthWindowUntil && dist < TRUTH_DASH + 40 && s.dashUntil <= 0) { this.doTruthPlus('npc', t.x, t.y); return true; }
      // The recall: the beast has them and is carrying them away from the bot.
      const bst = this.beastOf('npc');
      if (bst && !bst.returning && bst.grabbed.size > 0 && Math.hypot(bst.x - f.x, bst.y - f.y) > 200) { this.doBeastRecall('npc'); return true; }
      // Beyonders: with the rider waiting, recall a beast that caught nothing too — the barrage pays for it.
      if (bst && !bst.returning && this.up('npc', 'f') && s.shards >= 2 && this.now - bst.born > 1400) { this.doBeastRecall('npc'); return true; }
      if (this.beyonderReady('npc')) { this.doBarrage('npc', t.x, t.y); return true; }
      // The maces: in whip range with a spare shard.
      if (this.now >= s.whipPlusUntil && dist < WHIP_LEN + 60 && s.shards >= 2) { this.doWhipPlus('npc'); return true; }
      return false;
    };
    if (decide()) s.nextRecastAt = this.now + 420;
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

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
        av = new MythAvatar(this.api.scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
        av.setEye(this.masteryOn(owner));
      }
      const s = this.side(owner);
      const aim = owner === 'player' ? { x: s.aimX, y: s.aimY } : (this.foes(owner)[0] ?? { x: s.aimX, y: s.aimY });
      av.setFacing(s.destinyLive && owner === 'player' ? s.yaw : Math.atan2(aim.y - f.y, aim.x - f.x));
      av.setMastered(this.masteryOn(owner));
      const lift = av.flipLift();
      av.update(delta, f.x, f.y - lift, f.alpha);
    }
  }

  // ── Banter ─────────────────────────────────────────────────────────────────

  private banterSpeaker(who: 'myth' | 'foe', playerIs: boolean): Fighter | null {
    const mythOwner: Owner = playerIs ? 'player' : 'npc';
    const foeOwner: Owner = playerIs ? 'npc' : 'player';
    const f = this.fighter(who === 'myth' ? mythOwner : foeOwner);
    return f && f.active ? f : null;
  }

  private updateBanter(delta: number, playerIs: boolean, npcIs: boolean): void {
    void delta;
    if (!playerIs && !npcIs) return;
    if (this.api.isInvasion) return;
    const p = this.api.player;
    const n = this.api.npc;
    if (!p || !n || !p.active || !n.active) return;
    if (!this.banter) {
      const foeId = playerIs ? this.api.npcElementId : this.api.elementId;
      this.banter = banterFor(playerIs && npcIs ? 'myth' : foeId);
    }
    // The three beats.
    const both = this.alive(p) && this.alive(n);
    const lowest = Math.min(p.hp / Math.max(1, p.maxHp), n.hp / Math.max(1, n.maxHp));
    if (this.banterStage === 0 && this.matchT > 2500 && both) { this.banterQueue = [...this.banter.opener]; this.banterStage = 1; this.banterNextAt = this.now; }
    else if (this.banterStage === 1 && this.banterQueue.length === 0 && !this.bubble && this.matchT > 14000 && lowest < 0.68 && both) { this.banterQueue = [...this.banter.mid]; this.banterStage = 2; this.banterNextAt = this.now; }
    else if (this.banterStage === 2 && this.banterQueue.length === 0 && !this.bubble && lowest < 0.3 && both) { this.banterQueue = [...this.banter.closer]; this.banterStage = 3; this.banterNextAt = this.now; }

    if (this.bubble && this.now >= this.bubble.until) { this.bubble = null; this.banterNextAt = this.now + 350; }
    if (!this.bubble && this.banterQueue.length > 0 && this.now >= this.banterNextAt) {
      const line = this.banterQueue.shift()!;
      const speaker = this.banterSpeaker(line.who, playerIs);
      if (!speaker || speaker.hp <= 0) { this.banterQueue = []; return; }
      this.bubble = { who: line.who, text: line.text, until: this.now + Math.min(4600, 1500 + line.text.length * 42) };
      Sfx.playAt('ui-type', speaker.x, { rate: line.who === 'myth' ? 0.8 : 1.1, volume: 0.35 });
    }
    this.paintBubble(playerIs);
  }

  private paintBubble(playerIs: boolean): void {
    const { scene } = this.api;
    if (!this.bubble) {
      this.bubbleGfx?.clear();
      this.bubbleText?.setVisible(false);
      return;
    }
    if (!this.bubbleGfx) this.bubbleGfx = scene.add.graphics().setDepth(19.92);
    if (!this.bubbleText) {
      this.bubbleText = scene.add.text(0, 0, '', {
        fontSize: '11px', fontFamily: FONT_UI, color: '#fff6d5', wordWrap: { width: 212 }, align: 'center',
      }).setOrigin(0.5).setDepth(19.93);
    }
    const speaker = this.banterSpeaker(this.bubble.who, playerIs);
    if (!speaker) return;
    const txt = this.bubbleText;
    txt.setText(this.bubble.text).setVisible(true);
    const w = Math.min(228, txt.width + 18);
    const h = txt.height + 14;
    const W = this.api.width;
    const H = this.api.height;
    let bx: number;
    let by: number;
    let tx: number;
    let ty: number;
    if (this.sides.player.destinyLive) {
      // In first person the heads are not where the screen says they are: pin the bubbles.
      const mine = this.bubble.who === (playerIs ? 'myth' : 'foe');
      bx = mine ? 150 : W - 150;
      by = mine ? H - 150 : 110;
      tx = mine ? 150 : W - 150;
      ty = mine ? H - 150 + h / 2 + 10 : 110 - h / 2 - 10;
    } else {
      bx = Phaser.Math.Clamp(speaker.x, w / 2 + 8, W - w / 2 - 8);
      by = Math.max(h / 2 + 40, speaker.y - 62 - h / 2);
      tx = speaker.x;
      ty = speaker.y - 34;
    }
    const isMyth = this.bubble.who === 'myth';
    const fill = isMyth ? MYTH.deep : 0x1a1a24;
    const stroke = isMyth ? MYTH.iris : 0xb9b9cc;
    const g = this.bubbleGfx;
    g.clear();
    paintBubble(g, bx, by, w, h, tx, ty, fill, stroke, 1);
    if (isMyth) pinpricks(g, this.pcol, bx, by, w / 2.4, 41, 5, this.vizT, 0.5);
    txt.setPosition(bx, by);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const c of this.clouds) {
      const a = Phaser.Math.Clamp((c.until - this.now) / 800, 0, 1) * 0.85;
      paintCloud(g, this.col(c.owner), c.x, c.y, CLOUD_R, t, c.seed, a);
    }
    for (const bst of this.beasts) {
      const fade = bst.doneAt > 0 ? 1 - (this.now - bst.doneAt) / BEAST_FADE_MS : 1;
      const open = Math.min(1, (this.now - bst.born) / 300) * (bst.doneAt > 0 ? fade : 1);
      paintPortal(g, this.col(bst.owner), bst.portalX, bst.portalY, bst.ang, open, t, bst.seed, fade);
    }
    // Q+ Slayer: the salvo's spent casings, smoking where they burst, for as long as they can go again.
    for (const owner of BOTH) {
      const sp = this.liveSpent(owner);
      if (!sp) continue;
      const a = Phaser.Math.Clamp((sp.until - this.now) / 600, 0, 1);
      sp.points.forEach((pt, i) => spentGrenade(g, this.col(owner), pt.x, pt.y, t, a, i * 7 + 1));
    }
    // E+ rifts: a jagged crack of starlight in the floor; gold and pulsing when ready, a dim
    // scar with a mending arc while it recharges.
    for (const r of this.rifts) {
      const ready = this.now >= r.readyAt;
      const k = ready ? 1 : 1 - (r.readyAt - this.now) / RIFT_RECHARGE_MS;
      paintRift(g, this.col(r.owner), r.x0, r.y0, r.x1, r.y1, r.seed, t, ready ? 1 : 0.35, ready, Math.min(1, (this.now - r.born) / 220));
      if (!ready) {
        const mx = (r.x0 + r.x1) / 2;
        const my = (r.y0 + r.y1) / 2;
        g.lineStyle(2, this.col(r.owner)(MYTH.gold), 0.6);
        g.beginPath();
        g.arc(mx, my, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false);
        g.strokePath();
      }
    }
    // F+ barrage: the patch the spears are raining on.
    for (const br of this.barrages) {
      const a = Phaser.Math.Clamp((br.until - this.now) / 400, 0, 1) * Math.min(1, (this.now - br.born) / 200);
      g.fillStyle(this.col(br.owner)(MYTH.red), 0.08 * a);
      g.fillCircle(br.x, br.y, BARRAGE_R);
      g.lineStyle(2, this.col(br.owner)(MYTH.red), 0.55 * a);
      g.strokeCircle(br.x, br.y, BARRAGE_R);
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + t * 0.6;
        g.lineBetween(br.x + Math.cos(ang) * (BARRAGE_R - 8), br.y + Math.sin(ang) * (BARRAGE_R - 8), br.x + Math.cos(ang) * BARRAGE_R, br.y + Math.sin(ang) * BARRAGE_R);
      }
    }
    // Q+ spent grenades, still smoking where they lie, while the red second blast is on offer.
    for (const owner of BOTH) {
      const sp = this.side(owner).spent;
      if (!sp || this.now >= sp.until || !this.up(owner, 'q') || this.grenades.some((q) => q.owner === owner)) continue;
      for (const pt of sp.points) {
        g.fillStyle(this.col(owner)(MYTH.void), 0.8);
        g.fillCircle(pt.x, pt.y, 6);
        g.lineStyle(1.5, this.col(owner)(MYTH.red), 0.5 + 0.4 * Math.sin(t * 8 + pt.x));
        g.strokeCircle(pt.x, pt.y, 8);
      }
    }
    // The grenades' landing marks.
    for (const gr of this.grenades) {
      const k = Phaser.Math.Clamp((this.now - gr.start) / GREN_FLIGHT_MS, 0, 1);
      g.lineStyle(1.5, this.col(gr.owner)(MYTH.red), 0.3 + 0.5 * k);
      g.strokeCircle(gr.tx, gr.ty, GREN_R * (0.4 + 0.6 * k));
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const bst of this.beasts) {
      const fade = bst.doneAt > 0 ? 1 - (this.now - bst.doneAt) / BEAST_FADE_MS : 1;
      const pts = [{ x: bst.x, y: bst.y }, ...bst.trail].slice(0, BEAST_SEGMENTS);
      if (!bst.moving) {
        // Still in the doorway: just the head, pushing out.
        const k = Math.min(1, (this.now - bst.born) / BEAST_DELAY_MS);
        paintBeast(g, this.col(bst.owner), [{ x: bst.portalX + Math.cos(bst.ang) * 20 * k, y: bst.portalY + Math.sin(bst.ang) * 20 * k }], bst.ang, t, k, bst.seed, BEAST_HEAD_R * (0.5 + 0.5 * k));
      } else {
        paintBeast(g, this.col(bst.owner), pts, bst.ang, t, fade, bst.seed);
      }
      // F+ Beyonders: the rider on the head, spear raised.
      if (this.up(bst.owner, 'f') && bst.moving) {
        const throwK = Phaser.Math.Clamp(1 - (this.side(bst.owner).nextSpearAt - this.now) / 260, 0, 1);
        beyonder(g, this.col(bst.owner), bst.x, bst.y - BEAST_HEAD_R * 0.55, bst.ang, fade, t, throwK);
      }
    }
    // F+ the rider left at the portal after a recall, waiting for the word.
    for (const owner of BOTH) {
      const by = this.side(owner).beyonder;
      if (!by || this.now >= by.until || !this.up(owner, 'f')) continue;
      const a = Math.min(1, (by.until - this.now) / 500);
      const foe = this.foes(owner)[0];
      paintPortal(g, this.col(owner), by.x, by.y, -Math.PI / 2, 0.5 * a, t, 7, a);
      beyonder(g, this.col(owner), by.x, by.y - 6, foe ? Math.atan2(foe.y - by.y, foe.x - by.x) : 0, a, t, 0.5 + 0.5 * Math.sin(t * 3));
    }
    for (const sp of this.spears) {
      const a = Math.atan2(sp.vy, sp.vx);
      spear(g, this.col(sp.owner), sp.x, sp.y, a, 26, 1);
    }
    for (const br of this.barrages) {
      // Spears still falling into the patch: a few in the air at any moment.
      for (let i = 0; i < 5; i++) {
        const k = ((this.now - br.born) / 420 + jitter(br.seed, i)) % 1;
        const a = jitter(br.seed, i + 9) * Math.PI * 2 + Math.floor((this.now - br.born) / 420 + jitter(br.seed, i)) * 2.4;
        const d = Math.sqrt(jitter(br.seed, i + 19)) * BARRAGE_R * 0.85;
        const x = br.x + Math.cos(a) * d;
        const y = br.y + Math.sin(a) * d;
        spear(g, this.col(br.owner), x + 30 * (1 - k), y - 120 * (1 - k), Math.PI / 2 + 0.24, 24, Math.min(1, k * 3) * Phaser.Math.Clamp((br.until - this.now) / 300, 0, 1));
      }
    }
    for (const cs of this.crowdStars) {
      star(g, cs.x, cs.y, 5, this.col(cs.owner)(MYTH.gold), 0.95, { points: 5, rot: t * 10 + cs.seed });
      star(g, cs.x, cs.y, 2.5, this.col(cs.owner)(MYTH.white), 1, { points: 4, rot: -t * 6 });
    }
    for (const m of this.maces) {
      const age = (this.now - m.born) / 1000;
      const life = Phaser.Math.Clamp((m.until - this.now) / 500, 0, 1);
      const mx = m.cx + Math.cos(age * MACE_SPIN) * MACE_ORBIT_R;
      const my = m.cy + Math.sin(age * MACE_SPIN) * MACE_ORBIT_R;
      g.lineStyle(1, this.col(m.owner)(MYTH.haze), 0.3 * life);
      g.strokeCircle(m.cx, m.cy, MACE_ORBIT_R);
      starMace(g, this.col(m.owner), mx, my, 9, life, m.seed, age * 4);
    }
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.whip) {
        const k = Phaser.Math.Clamp((this.now - s.whip.start) / WHIP_ANIM_MS, 0, 1);
        const f = this.fighter(owner);
        const ang = Math.atan2(s.whip.y1 - s.whip.y0, s.whip.x1 - s.whip.x0);
        const x0 = f && f.active ? f.x + Math.cos(ang) * 14 : s.whip.x0;
        const y0 = f && f.active ? f.y + Math.sin(ang) * 14 : s.whip.y0;
        paintWhip(g, this.col(owner), x0, y0, s.whip.x1, s.whip.y1, k, s.whip.seed, 1 - k * 0.4);
      }
      if (s.dashUntil > 0) {
        const f = this.fighter(owner);
        if (f && f.active) {
          g.lineStyle(6, this.col(owner)(MYTH.iris), 0.35);
          g.lineBetween(s.dashX0, s.dashY0, f.x, f.y);
          g.lineStyle(2, this.col(owner)(MYTH.star), 0.8);
          g.lineBetween(s.dashX0, s.dashY0, f.x, f.y);
        }
      }
    }
    for (const bl of this.bullets) {
      const a = Math.atan2(bl.vy, bl.vx);
      g.lineStyle(2, this.col(bl.owner)(MYTH.star), 0.9);
      g.lineBetween(bl.x - Math.cos(a) * 12, bl.y - Math.sin(a) * 12, bl.x, bl.y);
      star(g, bl.x, bl.y, 4, this.col(bl.owner)(MYTH.star), 1, { points: 4, rot: t * 9 });
    }
    for (const gr of this.grenades) {
      const k = Phaser.Math.Clamp((this.now - gr.start) / GREN_FLIGHT_MS, 0, 1);
      const gx = gr.x0 + (gr.tx - gr.x0) * k;
      const gy = gr.y0 + (gr.ty - gr.y0) * k - Math.sin(k * Math.PI) * 60;
      voidDisc(g, this.col(gr.owner), gx, gy, 6, 1, gr.salvo + k, t, 3);
    }
    for (const r of this.rockets) {
      const a = Math.atan2(r.vy, r.vx);
      // A fat void shell with a red star nose and a trail of stars behind it.
      for (let i = 1; i <= 4; i++) {
        const k = i / 4;
        star(g, r.x - Math.cos(a) * 16 * i, r.y - Math.sin(a) * 16 * i, 4 * (1 - k) + 1, this.col(r.owner)(MYTH.haze), 0.8 - k * 0.6, { points: 4, rot: t * 5 + i });
      }
      voidDisc(g, this.col(r.owner), r.x, r.y, 11, 1, r.seed, t, 5);
      star(g, r.x + Math.cos(a) * 10, r.y + Math.sin(a) * 10, 6, this.col(r.owner)(MYTH.red), 0.95, { points: 4, rot: a });
    }
  }

  /** Shards over the heads, and the open window's hint. */
  private paintHeads(playerIs: boolean, npcIs: boolean): void {
    const g = this.headGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const f = this.fighter(owner);
      if (!is || !this.alive(f)) continue;
      const s = this.side(owner);
      const lift = this.avatar(owner)?.flipLift() ?? 0;
      const y = f.y - 46 - lift;
      const max = this.shardMax(owner);
      if (s.shards > 0) {
        // The crowd's gift, hung over the head as a little constellation: the full set of
        // sockets as faint star outlines, the shards held glowing in them, joined by threads
        // of starlight.
        const tint = this.col(owner);
        const slotX = (i: number) => f.x + (i - (max - 1) / 2) * 15;
        const slotY = (i: number) => y + Math.sin(t * 3 + i) * 2 - (i === Math.floor(max / 2) ? 3 : 0);
        g.fillStyle(tint(MYTH.void), 0.45);
        g.fillEllipse(f.x, y - 1, max * 15 + 14, 20);
        g.lineStyle(1, tint(this.now < s.frenzyUntil ? MYTH.gold : MYTH.haze), 0.35);
        g.strokeEllipse(f.x, y - 1, max * 15 + 14, 20);
        for (let i = 0; i < max - 1; i++) {
          const lit = i + 1 < s.shards;
          g.lineStyle(1, tint(lit ? MYTH.shard : MYTH.violet), lit ? 0.7 : 0.4);
          g.lineBetween(slotX(i), slotY(i), slotX(i + 1), slotY(i + 1));
        }
        for (let i = 0; i < max; i++) {
          if (i < s.shards) {
            paintShard(g, tint, slotX(i), slotY(i), 6, t * 2.4 + i * 1.2, 0.95);
          } else {
            star(g, slotX(i), slotY(i), 3, tint(MYTH.violet), 0.7, { points: 4, rot: t * 0.5 });
            g.fillStyle(tint(MYTH.void), 1);
            g.fillCircle(slotX(i), slotY(i), 1);
          }
        }
      }
      if (this.now < s.whipPlusUntil) {
        star(g, f.x + 18 + Math.max(0, max - SHARD_MAX) * 7.5, y - 4, 4, this.col(owner)(MYTH.mace), 0.6 + 0.4 * Math.sin(t * 8), { points: 4, rot: t * 3 });
      }
      // The parry: a guard of gold in front of the body, along the aim, for the half second.
      if (s.parryUntil > 0) {
        const tint = this.col(owner);
        const aim = owner === 'player' ? Math.atan2(s.aimY - f.y, s.aimX - f.x) : (() => { const q = this.foes(owner)[0]; return q ? Math.atan2(q.y - f.y, q.x - f.x) : 0; })();
        const k = Phaser.Math.Clamp((s.parryUntil - this.now) / PARRY_MS, 0, 1);
        g.lineStyle(7, tint(MYTH.gold), 0.18 + 0.12 * Math.sin(t * 30));
        g.beginPath(); g.arc(f.x, f.y, 34, aim - 1.1, aim + 1.1, false); g.strokePath();
        g.lineStyle(2.5, tint(MYTH.star), 0.85);
        g.beginPath(); g.arc(f.x, f.y, 34, aim - 1.1 * k, aim + 1.1 * k, false); g.strokePath();
        star(g, f.x + Math.cos(aim) * 34, f.y + Math.sin(aim) * 34, 6, tint(MYTH.white), 0.9, { points: 4, rot: t * 8 });
      }
      // A landed parry with a shard to spend: the riposte's mark over the caught foe.
      if (this.riposteReady(owner) && s.shards > 0 && s.parriedFoe) {
        const q = s.parriedFoe;
        const k = (s.riposteUntil - this.now) / RIPOSTE_WINDOW_MS;
        const tint = this.col(owner);
        g.lineStyle(2, tint(MYTH.gold), 0.4 + 0.5 * k);
        g.lineBetween(q.x - 12, q.y - 12, q.x + 12, q.y + 12);
        g.lineBetween(q.x + 12, q.y - 12, q.x - 12, q.y + 12);
        g.lineStyle(1.5, tint(MYTH.gold), 0.6);
        g.beginPath(); g.arc(q.x, q.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      }
      if (this.now < s.truthWindowUntil && s.shards > 0 && !s.destinyLive) {
        const k = (s.truthWindowUntil - this.now) / TRUTH_WINDOW_MS;
        const tint = this.col(owner);
        // A dim violet track, the window burning down round it in gold, rune-ticks on the
        // track and a little star riding the burning end.
        g.lineStyle(4, tint(MYTH.void), 0.5);
        g.strokeCircle(f.x, f.y, 30);
        g.lineStyle(1, tint(MYTH.violet), 0.7);
        g.strokeCircle(f.x, f.y, 30);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.lineStyle(1, tint(MYTH.haze), 0.45);
          g.lineBetween(f.x + Math.cos(a) * 27.5, f.y + Math.sin(a) * 27.5, f.x + Math.cos(a) * 32.5, f.y + Math.sin(a) * 32.5);
        }
        const end = -Math.PI / 2 + Math.PI * 2 * Math.min(1, k);
        g.lineStyle(4, tint(MYTH.gold), 0.25);
        g.beginPath();
        g.arc(f.x, f.y, 30, -Math.PI / 2, end, false);
        g.strokePath();
        g.lineStyle(2, tint(MYTH.gold), 0.85);
        g.beginPath();
        g.arc(f.x, f.y, 30, -Math.PI / 2, end, false);
        g.strokePath();
        star(g, f.x + Math.cos(end) * 30, f.y + Math.sin(end) * 30, 4.2, tint(MYTH.star), 0.95, { points: 4, rot: t * 4 });
      }
    }
  }

  // ── Statuses ───────────────────────────────────────────────────────────────

  private pushStatuses(playerIs: boolean): void {
    const set = (id: string, st: CustomStatus | null): void => this.api.setStatusIndicator(id, st);
    const s = this.sides.player;
    set('myth-shards', playerIs && s.shards > 0 ? {
      name: 'Echo Shards', emoji: '💠', color: MYTH.shard,
      description: `The crowd's gift. Right-click enhances the whip; E again dashes, R again ripostes a landed parry, F again recalls the beast. ${this.shardMax('player')} at most.`,
      count: s.shards, priority: 150,
    } : null);
    set('myth-whip-plus', playerIs && this.now < s.whipPlusUntil ? {
      name: 'Phantom Maces', emoji: '🔮', color: MYTH.mace,
      description: `Every lash leaves a mace circling where the tip landed: ${MACE_DAMAGE} per touch for 3s.`,
      until: s.whipPlusUntil,
    } : null);
    set('myth-truth-window', playerIs && this.now < s.truthWindowUntil && !s.destinyLive ? {
      name: 'Truth Breaker', emoji: '⚔️', color: MYTH.gold,
      description: `Press E again with an Echo Shard: a ${TRUTH_DASH}px dash for ${TRUTH_DASH_DAMAGE} true damage to everyone you pass.`,
      until: s.truthWindowUntil,
    } : null);
    set('myth-parry', playerIs && s.parryUntil > 0 ? {
      name: 'Parrying', emoji: '⚔️', color: MYTH.gold,
      description: 'The sword is out. The next hit is turned aside: its owner is stunned 2s and you turn Indomitable for 8s.',
      until: s.parryUntil,
    } : null);
    set('myth-indomitable', playerIs && s.indomLive ? {
      name: 'Indomitable', emoji: '🛡️', color: MYTH.gold,
      description: 'Stuns and slows do not work on you.',
      until: s.indomitableUntil,
    } : null);
    set('myth-riposte', playerIs && this.riposteReady('player') ? {
      name: 'Riposte Open', emoji: '🗡️', color: MYTH.gold,
      description: `R again with an Echo Shard: cut the foe you parried for ${RIPOSTE_DAMAGE} true damage.`,
      until: s.riposteUntil,
    } : null);
    set('myth-reparry', playerIs && this.reparryReady('player') && s.shards > 0 ? {
      name: 'Outskilled', emoji: '🔁', color: MYTH.haze,
      description: 'The parry missed. R again with an Echo Shard to parry again at once.',
      until: s.reparryUntil,
    } : null);
    set('myth-rift', playerIs && this.now < s.riftSpeedUntil ? {
      name: 'World Shatter', emoji: '🌌', color: MYTH.gold,
      description: 'Stepped through your own rift: 30% faster and Indomitable.',
      until: s.riftSpeedUntil,
    } : null);
    set('myth-frenzy', playerIs && this.now < s.frenzyUntil ? {
      name: 'The Crowd Goes Wild', emoji: '🎉', color: MYTH.gold,
      description: `The crowd is throwing stars at your foe: ${CROWD_STAR_DAMAGE} each.`,
      until: s.frenzyUntil,
    } : null);
    set('myth-beyonder', playerIs && this.beyonderReady('player') && s.beyonder ? {
      name: 'Beyonder Waiting', emoji: '🔱', color: MYTH.red,
      description: 'The rider stands at the portal. F again with an Echo Shard: a barrage of spears on the foe nearest your cursor.',
      until: s.beyonder.until,
    } : null);
    set('myth-rapid', playerIs && s.destinyLive && this.now < s.rapidUntil ? {
      name: 'Rapid Fire', emoji: '⚡', color: MYTH.gold,
      description: 'The pistol fires twice as fast.',
      until: s.rapidUntil,
    } : null);
    set('myth-chain', playerIs && s.destinyLive && s.rifleChain ? {
      name: 'Headshot Chain', emoji: '🎯', color: MYTH.gold,
      description: 'Every rifle headshot refreshes the rifle. Miss the head and the chain ends.',
    } : null);
    set('myth-flip', playerIs && this.now < s.flipSpeedUntil ? {
      name: 'Vaulted the Beast', emoji: '🌠', color: MYTH.starBlue,
      description: '20% faster for flipping over your own beast.',
      until: s.flipSpeedUntil,
    } : null);
    const myBeast = playerIs ? this.beastOf('player') : null;
    set('myth-beast', myBeast ? {
      name: myBeast.returning ? 'Beast — Coming Home' : 'Beast of Myth', emoji: '🐉', color: MYTH.iris,
      description: myBeast.returning
        ? 'Dragging its catch back to the portal. Get in its way to flip again.'
        : `Grabs everyone in its path for ${BEAST_TICK_DAMAGE} every half second until it hits a wall. F again with a shard calls it back.`,
      count: myBeast.grabbed.size || undefined,
    } : null);
    set('myth-destiny', playerIs && s.destinyLive ? {
      name: 'Final Destiny', emoji: '🔫', color: MYTH.gold,
      description: 'First person. WASD walks where you look, the cursor turns you, and the five keys are five guns.',
      until: s.destinyUntil,
    } : null);
    // The player on the receiving end of a beast.
    const held = this.beasts.some((b) => b.doneAt === 0 && b.grabbed.has(this.api.player));
    set('myth-caught', held ? {
      name: 'Caught by the Beast', emoji: '🐉', color: MYTH.red,
      description: `In its jaws: ${BEAST_TICK_DAMAGE} every half second, dragged until it hits a wall or goes home.`,
      priority: 30,
    } : null);
  }

  // ── Readers for ArenaScene ─────────────────────────────────────────────────

  getPlayerSpeedMult(): number { return this.speedMult('player'); }
  getNpcSpeedMult(): number { return this.speedMult('npc'); }

  private speedMult(owner: Owner): number {
    const s = this.side(owner);
    let m = 1;
    if (this.now < s.flipSpeedUntil) m *= FLIP_SPEED;
    if (this.now < s.riftSpeedUntil) m *= RIFT_SPEED;
    return m;
  }

  getBarRatio(abilityId: string, time: number): number {
    void time;
    const p = this.api.player;
    const s = this.sides.player;
    if (s.destinyLive) {
      const gun: Record<string, string> = {
        'myth-whip': 'myth-pistol', 'myth-truth': 'myth-shotgun', 'myth-determination': 'myth-grenades',
        'myth-beast': 'myth-rifle', 'myth-destiny': 'myth-rocket',
      };
      return p.getCooldownRatio(gun[abilityId] ?? abilityId);
    }
    if (abilityId === 'myth-truth' && this.now < s.truthWindowUntil && s.shards > 0) {
      return Phaser.Math.Clamp((s.truthWindowUntil - this.now) / TRUTH_WINDOW_MS, 0, 1);
    }
    if (abilityId === 'myth-beast' && this.beastOf('player')) return 1;
    if (abilityId === 'myth-determination' && s.parryUntil > 0) return Phaser.Math.Clamp((s.parryUntil - this.now) / PARRY_MS, 0, 1);
    if (abilityId === 'myth-determination' && this.riposteReady('player') && s.shards > 0) {
      return Phaser.Math.Clamp((s.riposteUntil - this.now) / RIPOSTE_WINDOW_MS, 0, 1);
    }
    if (abilityId === 'myth-beast' && this.beyonderReady('player') && s.beyonder && s.shards > 0) {
      return Phaser.Math.Clamp((s.beyonder.until - this.now) / BEYONDER_WAIT_MS, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }

  // ── Readers for the bot ────────────────────────────────────────────────────

  shardsOf(owner: Owner): number { return this.side(owner).shards; }

  /** A foe this side's star mace has stunned, still stunned: the dash lands for certain. */
  tipStunLive(owner: Owner): boolean {
    const s = this.side(owner);
    return [...s.stunHeld.values()].some((u) => u > this.now);
  }

  truthWindowOpen(owner: Owner): boolean { return this.now < this.side(owner).truthWindowUntil; }
  indomitable(owner: Owner): boolean { return this.side(owner).indomLive; }
  parrying(owner: Owner): boolean { return this.side(owner).parryUntil > 0; }

  /**
   * Something is about to land on this side: a foe in arm's reach, or a hostile shot close and
   * closing. The bot's cue to raise the sword. Read-only.
   */
  parryCue(owner: Owner): boolean {
    const f = this.fighter(owner);
    if (!this.alive(f)) return false;
    for (const t of this.foes(owner)) if (Math.hypot(t.x - f.x, t.y - f.y) <= PARRY_CUE_MELEE) return true;
    for (const child of this.api.projectiles.getChildren()) {
      const pr = child as Phaser.Physics.Arcade.Image & { isFromPlayer?: boolean };
      if (!pr.active || (owner === 'npc' ? !pr.isFromPlayer : pr.isFromPlayer)) continue;
      const dx = f.x - pr.x;
      const dy = f.y - pr.y;
      const d = Math.hypot(dx, dy);
      if (d > PARRY_CUE_SHOT) continue;
      const v = pr.body ? (pr.body as Phaser.Physics.Arcade.Body).velocity : null;
      if (!v || (v.x * dx + v.y * dy) > 0) return true;
    }
    return false;
  }
  destinyLive(owner: Owner): boolean { return this.side(owner).destinyLive; }
  beastLive(owner: Owner): boolean { return this.beastOf(owner) !== null; }

  /** Damage taken by this side in the last 1.5s — the cue to press R. */
  takenRecent(owner: Owner): number {
    return this.side(owner).taken.filter((t) => this.now - t.at <= 1500).reduce((a, t) => a + t.amount, 0);
  }

  /** The crowd is close to cheering: a committed burst of damage now is a shard. */
  cheerClose(owner: Owner): boolean {
    const s = this.side(owner);
    if (this.now < s.cheerSleepUntil || s.shards >= SHARD_MAX) return false;
    return s.dealt.reduce((a, t) => a + t.amount, 0) >= CHEER_DEALT * 0.5;
  }

  /** Pistol stacks on this side's target, 0–4. */
  vulnStacksOn(t: Fighter): number { return Date.now() < t.mythVulnUntil ? t.mythVulnStacks : 0; }

  /**
   * Where the bot should stand to be run over by its own beast — the nearest point on the
   * beast's forward path, offered only while a flip is possible. Null otherwise.
   */
  flipPoint(owner: Owner): { x: number; y: number } | null {
    const bst = this.beastOf(owner);
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!bst || !bst.moving || !f || !f.active || this.now < s.flipGateUntil) return null;
    const ahead = 400;
    const ex = bst.x + Math.cos(bst.ang) * ahead;
    const ey = bst.y + Math.sin(bst.ang) * ahead;
    const { d, k } = segDist(f.x, f.y, bst.x, bst.y, ex, ey);
    if (d > 150 || k <= 0.05) return null;
    return { x: bst.x + (ex - bst.x) * Math.min(1, k + 0.1), y: bst.y + (ey - bst.y) * Math.min(1, k + 0.1) };
  }
}
