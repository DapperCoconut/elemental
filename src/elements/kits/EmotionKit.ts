import Phaser from 'phaser';
import { Fighter, DamageOpts } from '../../entities/Fighter';
import { TroopBody } from '../../entities/TroopBody';
import { Projectile } from '../../combat/Projectile';
import { CastContext } from '../Ability';
import { Sfx } from '../../audio';
import { BaseAvatar } from './ElementVisuals';
import { makeSkinAvatar } from './skins/SkinAvatars';
import { WW2_CONQUEST_ART } from './skins/WarTwoFx';
import {
  EMO, EmotionAvatar, EmotionColorFn, EmotionFx, TroopKind, TROOP_SCALE,
  drawArrow, drawEuphoriaCharge, drawGrandStandard, drawMusterSeals, drawOrderLine, drawPickRing, drawRallyRing,
  drawTears, drawTroop, drawTroopHp, sideColor,
} from './EmotionVisuals';

type Owner = 'player' | 'npc';
type Body = Phaser.Physics.Arcade.Body;
interface Pt { x: number; y: number }
const BOTH: Owner[] = ['player', 'npc'];

/** Emotion keeps Conquest's element id — saves, recipes, courts and campaign tables all know it by that name. */
export const EMOTION_ELEMENT_ID = 'conquest';

export const EMOTION_ID = {
  stab: 'emotion-stab',
  rile: 'emotion-rile',
  depress: 'emotion-depress',
  euphoria: 'emotion-euphoria',
  nationalism: 'emotion-nationalism',
} as const;

// ── Tuning ───────────────────────────────────────────────────────────────────

// Click — Stab
const STAB_REACH = 210;
const STAB_W = 9;
const STAB_DMG = 14;
const STAB_MS = 260;

// E — Rile
const RILE_COUNT = 3;
const RILE_WAVE_MS = 450;
const RILE_RING = 52;
const RISE_MS = 520;
/** Every soldier a side may have standing at once; a new one past it retires the oldest knight. */
const TROOP_CAP = 12;

// R — Depress
const DEPRESS_LEN = 250;
const DEPRESS_HALF = 0.52;
const DEPRESS_DMG = 8;
export const DEPRESS_MS = 8000;
/** Extra damage taken per point of health-fraction the Emotion has over them (up to +50% at a full bar against an empty one). */
const DEPRESS_AMP = 0.5;
/** How long a depressed shooter's projectile lasts before it gives up. */
const DEPRESS_SHOT_MS = 650;
const SHOOTER_NEAR = 80;

// F — Euphoria
const EUPHORIA_CHARGE_MS = 1000;
const EUPHORIA_LEN = 320;
const EUPHORIA_DASH_MS = 240;
const EUPHORIA_W = 24;
const EUPHORIA_DMG = 38;
const EUPHORIA_CHARGE_SPEED = 0.15;
const ECSTASY_R = 220;
const ECSTASY_MS = 4000;
const ECSTASY_HP = 10;
const ECSTASY_SPEED = 0.8;
const ECSTASY_HASTE = 0.8;

// Q — Maximum Nationalism
const STANCE_MAX_MS = 10000;
const STANCE_MIN_MS = 350;
const STANCE_TAKEN = 0.65;
const STANCE_SPEED = 1.3;
const RALLY_R = 230;
const RALLY_DMG = 0.5;
const RALLY_GUARD = 0.35;
const SLAM_R = 170;
const SLAM_DMG = 45;
const MUSTER: TroopKind[] = ['knight', 'knight', 'knight', 'archer', 'archer', 'barbarian'];
const MUSTER_EVERY_MS = 1000;
const MUSTER_LINGER_MS = 1500;
const MUSTER_RING = 44;

// Troops
interface TroopStats { hp: number; speed: number; dmg: number; atkMs: number; reach: number; aggro: number; r: number }
const TROOP: Record<TroopKind, TroopStats> = {
  knight:    { hp: 30, speed: 105, dmg: 4, atkMs: 800,  reach: 12,  aggro: 190, r: 10 },
  archer:    { hp: 8,  speed: 62,  dmg: 5, atkMs: 1500, reach: 290, aggro: 330, r: 9 },
  barbarian: { hp: 60, speed: 48,  dmg: 8, atkMs: 550,  reach: 14,  aggro: 230, r: 16 },
};
const SWING_MS = 260;
const SWING_HIT_MS = 110;
const ARCHER_DRAW_MS = 450;
const ARROW_SPEED = 560;
const ARROW_LIFE_MS = 700;
const LEASH_EXTRA = 50;
/** The barbarian doubles whatever it is given. */
const BARBARIAN_BUFF = 2;
const RAGE_AT = 0.25;
const RAGE_DRINK_MS = 600;
const RAGE_HASTE = 0.6;
const RAGE_REGEN = 3;
const PICK_PAD = 13;
/** Soldiers standing this close to one another are one squad: an order to any of them is an order to all. */
const SQUAD_LINK = 70;
const ORDER_SNAP = 20;

const NET_SNAP_MS = 120;
const BOT_ORDER_MS = 900;

// ── State ────────────────────────────────────────────────────────────────────

interface Troop {
  id: number;
  owner: Owner;
  kind: TroopKind;
  body: TroopBody;
  x: number; y: number;
  /** Where it stands when there is nobody to fight. */
  postX: number; postY: number;
  /** Somebody it was sent at; it follows them wherever they go. */
  quarry: Fighter | null;
  foe: Fighter | null;
  facing: number;
  march: number;
  bornAt: number;
  nextAtkAt: number;
  /** A swing (or a draw) in progress: when it started and whether it has landed yet. */
  swingAt: number;
  swingLanded: boolean;
  ecstaticUntil: number;
  raged: boolean;
  drinkAt: number;
  regenCarry: number;
  rallied: boolean;
  /** Replica only: the owner's attack counter, and when its last snapshot arrived. */
  netShots: number;
  netSeenAt: number;
  netX: number; netY: number;
}

interface Arrow { x: number; y: number; vx: number; vy: number; owner: Owner; dmg: number; until: number; live: boolean }

interface Side {
  troops: Troop[];
  nextId: number;
  aimX: number; aimY: number;
  wasLeft: boolean;
  drag: Troop | null;
  stab: { at: number; ang: number } | null;
  rile: { at: number; done: boolean } | null;
  charge: { at: number; ang: number } | null;
  dash: { at: number; ang: number; fromX: number; fromY: number; lastX: number; lastY: number; struck: Set<Fighter> } | null;
  stance: { since: number } | null;
  planted: { x: number; y: number; at: number; called: number; seed: number } | null;
  botOrderAt: number;
  snapAt: number;
  snapHadTroops: boolean;
}

function makeSide(): Side {
  return {
    troops: [], nextId: 1, aimX: 0, aimY: 0, wasLeft: false, drag: null, stab: null, rile: null,
    charge: null, dash: null, stance: null, planted: null, botOrderAt: 0, snapAt: 0, snapHadTroops: false,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface EmotionArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /** The player's live element as this kit sees it (Quantum reports a carried Emotion as itself). */
  get elementId(): string;
  get npcElementId(): string;
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  get width(): number;
  /** 0 (flawless) … ~0.5 (easy): the bot's `castSkipChance`. */
  get npcSlack(): number;
  isTargetable(f: Fighter): boolean;
  emotionColor(owner: Owner, base: number): number;
  skinId(owner: Owner): string | null;
  buildPlayerContext(x: number, y: number): CastContext;
  /** While in the future, WASD is blocked and whatever velocity the kit set stands. */
  setPlayerYankUntil(t: number): void;
  /** Put an npc-owned soldier's body where the player's attacks look for targets, and take it out again. */
  addEnemyBody(f: Fighter): void;
  removeEnemyBody(f: Fighter): void;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
}

// ── EmotionKit ───────────────────────────────────────────────────────────────

/**
 * Emotion — a commander with a flag, and the army that feels what he tells it to.
 *
 * - **Stab** (click) — a pike thrust with the flag on it, through everything on the line.
 * - **Rile** (E) — wave the flag and three knights climb out of the floor: 30 HP, red eyes, swords.
 *   A soldier holds its post and cuts down whoever comes near; **click one and drag** to move the
 *   post, or drop it on an enemy to send it after them.
 * - **Depress** (R) — the cape throws a cone of cold. Whoever it catches cries for eight seconds:
 *   slower, their shots give up early, and they take more the healthier you are than they are.
 * - **Euphoria** (F) — a second's wind-up, then a charge with the pike out, through everything.
 *   Soldiers near you when you go turn ecstatic for four seconds: a yellow outline, health over
 *   their maximum, and much faster feet and blades.
 * - **Maximum Nationalism** (Q) — the grand standard, held overhead: no attacking, but you take less
 *   and move faster and the soldiers round you hit harder and take less. Q again drives it into
 *   the floor — a big blast — and it stays there calling six more over six seconds: three knights,
 *   two archers, and the barbarian.
 *
 * A soldier is a real body (`TroopBody`): registered where its owner's enemies look for targets,
 * so every element's attacks reach it without knowing soldiers exist. This kit walks them, swings
 * for them, draws them and buries them.
 *
 * Each side has its own state. Online the owner's sim decides every soldier's move and every hit;
 * the other machine gets the army as a snapshot and bills what it does to it (`emx-*` pseudo-casts,
 * see `replayNet`).
 */
export class EmotionKit {
  private api: EmotionArenaApi;
  private readonly pcol: EmotionColorFn;
  private readonly ncol: EmotionColorFn;
  private readonly pfx: EmotionFx;
  private readonly nfx: EmotionFx;
  private playerAvatar: BaseAvatar | null = null;
  private npcAvatar: BaseAvatar | null = null;

  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private unitGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private arrows: Arrow[] = [];
  /** Who made each body cry. */
  private depressedBy = new Map<Fighter, Owner>();
  /** Bodies whose `conquestIncomingMult` this kit wrote last frame. */
  private weighed = new Set<Fighter>();
  /** Shots in the air: when each will give up, if its shooter was crying when it left. */
  private shots = new Map<Projectile, number>();
  private npcYankUntil = 0;
  private vizT = 0;
  /** OnlineKit drops a cast id it has just sent; every relay carries a number so no two are alike. */
  private netSeq = 0;
  /** The squad in the player's hand this frame (empty when nothing is held). */
  private heldSquad: Troop[] = [];

  constructor(api: EmotionArenaApi) {
    this.api = api;
    this.pcol = (base) => api.emotionColor('player', base);
    this.ncol = (base) => api.emotionColor('npc', base);
    this.pfx = new EmotionFx(api.scene, this.pcol);
    this.nfx = new EmotionFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): EmotionFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): EmotionColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): BaseAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private bodyR(f: Fighter): number { return (f.body as Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }
  private dist(ax: number, ay: number, bx: number, by: number): number { return Math.hypot(ax - bx, ay - by); }
  private mirrorX(x: number): number { return this.api.width - x; }

  private isEmotion(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === EMOTION_ELEMENT_ID : this.api.npcElementId === EMOTION_ELEMENT_ID;
  }

  /**
   * Whether this sim decides what this side's kit does. An online opponent (or a co-op ally in the
   * npc slot of an Invasion) is simulated on its own machine: here it is drawn, nothing more.
   */
  private simulates(owner: Owner): boolean {
    return owner === 'player' || (!this.api.isOnline && !this.api.isInvasion);
  }

  /** Another machine is on the other end of a one-on-one bout. */
  private get duelOnline(): boolean { return this.api.isOnline && !this.api.isInvasion; }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private nearestTarget(owner: Owner, x: number, y: number, max = Infinity): Fighter | null {
    let best: Fighter | null = null;
    let bestD = max;
    for (const t of this.targetsOf(owner)) {
      const d = this.dist(x, y, t.x, t.y) - this.bodyR(t);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  /** The other duellist (or the nearest thing to fight): where a bot's aim goes. */
  private mainTarget(owner: Owner): Fighter | null {
    const f = this.fighter(owner);
    const main = owner === 'npc' ? this.api.player : null;
    if (main && this.alive(main)) return main;
    return this.nearestTarget(owner, f.x, f.y);
  }

  private relay(owner: Owner, id: string): void {
    if (owner === 'player' && this.api.isOnline) this.api.broadcast(id);
  }

  private refund(owner: Owner, id: string): void {
    if (this.simulates(owner)) this.fighter(owner).resetCooldown(id);
  }

  private sfx(owner: Owner, name: string, x: number, rate = 1, volume = 0.7): void {
    Sfx.playAt(name, x, { rate, volume: owner === 'player' ? volume : volume * 0.7 });
  }

  /** Every Emotion hit goes through here — and only on the sim that decides it. */
  private hit(owner: Owner, t: Fighter, dmg: number, opts?: DamageOpts): void {
    if (!this.simulates(owner) || dmg <= 0) return;
    const f = this.fighter(owner);
    t.takeDamage(Math.max(1, Math.round(dmg)), { source: f, sourceX: f.x, sourceY: f.y, ...opts });
  }

  private segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const k = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
    return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
  }

  private inCone(ax: number, ay: number, ang: number, half: number, len: number, t: Fighter): boolean {
    const dx = t.x - ax, dy = t.y - ay;
    const d = Math.hypot(dx, dy);
    const r = this.bodyR(t);
    if (d > len + r) return false;
    if (d < r) return true;
    const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - ang));
    return off <= half + Math.asin(Math.min(1, r / d)) * 0.6;
  }

  private clampToArena(p: Pt, pad = 16): Pt {
    const b = this.api.bounds;
    return { x: Phaser.Math.Clamp(p.x, b.left + pad, b.right - pad), y: Phaser.Math.Clamp(p.y, b.top + pad, b.bottom - pad) };
  }

  /** Holding the standard, winding up or mid-charge: nothing else may be cast. */
  private busy(owner: Owner): boolean {
    const s = this.side(owner);
    return !!(s.stance || s.charge || s.dash);
  }

  /**
   * Take a body's legs for a moment and move it ourselves. Never on a replica: its position is
   * somebody else's stream.
   */
  private drive(owner: Owner, vx: number, vy: number, ms: number): void {
    const f = this.fighter(owner);
    if (f.netGhost) return;
    const body = f.body as Body | null;
    if (!body) return;
    if (owner === 'player') this.api.setPlayerYankUntil(this.now + ms);
    else this.npcYankUntil = Math.max(this.npcYankUntil, this.now + ms);
    body.setVelocity(vx, vy);
  }

  // ── Troops ─────────────────────────────────────────────────────────────────

  private stats(tr: Troop): TroopStats { return TROOP[tr.kind]; }
  private buffScale(tr: Troop): number { return tr.kind === 'barbarian' ? BARBARIAN_BUFF : 1; }
  private ecstatic(tr: Troop): boolean { return this.now < tr.ecstaticUntil; }
  private rising(tr: Troop): boolean { return this.now < tr.bornAt + RISE_MS; }

  /** True for a soldier's body: ArenaScene asks before deciding what a shot that touched it does. */
  ownsBody(f: Fighter): boolean { return f instanceof TroopBody; }

  private spawn(owner: Owner, kind: TroopKind, x: number, y: number, id?: number): Troop {
    const s = this.side(owner);
    const st = TROOP[kind];
    const at = this.clampToArena({ x, y });
    const body = new TroopBody(this.api.scene, at.x, at.y, kind, sideColor(owner), st.hp, st.r);
    // Online our own soldiers only lose what the other machine says it took from them — its
    // attacks are replayed here too, and without this every blow would land twice.
    body.netAuthoritativeDamage = owner === 'player' && this.duelOnline;
    const tr: Troop = {
      id: id ?? s.nextId++, owner, kind, body, x: at.x, y: at.y, postX: at.x, postY: at.y,
      quarry: null, foe: null, facing: owner === 'player' ? 0 : Math.PI, march: Math.random() * 6,
      bornAt: this.now, nextAtkAt: this.now + RISE_MS, swingAt: 0, swingLanded: true,
      ecstaticUntil: 0, raged: false, drinkAt: 0, regenCarry: 0, rallied: false,
      netShots: 0, netSeenAt: this.now, netX: at.x, netY: at.y,
    };
    body.onStruck = (lost) => this.onTroopStruck(tr, lost);
    if (owner === 'npc') this.api.addEnemyBody(body);
    else this.api.player.bodySections.push(body);
    s.troops.push(tr);
    this.fx(owner).rise(at.x, at.y, st.r * 1.4);
    // Over the cap: the oldest knight stands down for the newcomer.
    if (this.simulates(owner) && s.troops.length > TROOP_CAP) {
      const old = s.troops.find((o) => o.kind === 'knight' && o !== tr) ?? s.troops[0];
      if (old !== tr) this.removeTroop(old, true);
    }
    return tr;
  }

  private onTroopStruck(tr: Troop, lost: number): void {
    this.fx(tr.owner).spark(tr.x, tr.y - 6, this.col(tr.owner)(EMO.steel), 3);
    // The other machine owns this soldier: tell it what we just took off it.
    if (tr.owner === 'npc' && this.duelOnline) this.api.broadcast(`emx-hit:${tr.id}:${Math.round(lost)}:${this.netSeq++}`);
  }

  private removeTroop(tr: Troop, loud: boolean): void {
    const s = this.side(tr.owner);
    const i = s.troops.indexOf(tr);
    if (i < 0) return;
    s.troops.splice(i, 1);
    if (s.drag === tr) s.drag = null;
    if (tr.owner === 'npc') this.api.removeEnemyBody(tr.body);
    else {
      const p = this.api.player;
      if (p) p.bodySections = p.bodySections.filter((b) => b !== tr.body);
    }
    if (loud) {
      this.fx(tr.owner).fall(tr.x, tr.y, sideColor(tr.owner), this.stats(tr).r);
      this.sfx(tr.owner, 'clang', tr.x, tr.kind === 'barbarian' ? 0.7 : 1.3, 0.45);
    }
    if (tr.body.active) tr.body.destroy();
  }

  private clearTroops(owner: Owner): void {
    for (const tr of [...this.side(owner).troops]) this.removeTroop(tr, false);
  }

  private makeEcstatic(tr: Troop): void {
    const k = this.buffScale(tr);
    const was = this.ecstatic(tr);
    tr.ecstaticUntil = this.now + ECSTASY_MS;
    const cap = tr.body.maxHp + ECSTASY_HP * k;
    tr.body.hp = Math.max(tr.body.hp, Math.min(cap, tr.body.hp + ECSTASY_HP * k));
    if (!was) this.fx(tr.owner).joy(tr.x, tr.y - 4, this.stats(tr).r);
  }

  private troopSpeed(tr: Troop): number {
    let v = this.stats(tr).speed * tr.body.emotionSlowMult();
    if (this.ecstatic(tr)) v *= 1 + ECSTASY_SPEED * this.buffScale(tr);
    return v;
  }

  private troopAtkMs(tr: Troop): number {
    let haste = 1;
    if (this.ecstatic(tr)) haste *= 1 + ECSTASY_HASTE * this.buffScale(tr);
    if (tr.raged) haste *= 1 + RAGE_HASTE;
    return this.stats(tr).atkMs / haste;
  }

  private troopDmg(tr: Troop): number {
    return this.stats(tr).dmg * (tr.rallied ? 1 + RALLY_DMG * this.buffScale(tr) : 1);
  }

  /** Who this soldier should be fighting: whoever it was sent at, else whoever wanders near its post. */
  private pickFoe(tr: Troop): Fighter | null {
    if (tr.quarry) {
      if (this.alive(tr.quarry) && this.api.isTargetable(tr.quarry)) return tr.quarry;
      // Its quarry is gone: where it stands now is its new post.
      tr.quarry = null;
      tr.postX = tr.x;
      tr.postY = tr.y;
    }
    const st = this.stats(tr);
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(tr.owner)) {
      const fromPost = this.dist(tr.postX, tr.postY, t.x, t.y) - this.bodyR(t);
      if (fromPost > st.aggro + (t === tr.foe ? LEASH_EXTRA : 0)) continue;
      const d = this.dist(tr.x, tr.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private tickTroop(tr: Troop, dt: number): void {
    const st = this.stats(tr);
    const now = this.now;
    const s = this.side(tr.owner);
    const f = this.fighter(tr.owner);

    // Under the grand standard?
    tr.rallied = !!s.stance && this.alive(f) && this.dist(f.x, f.y, tr.x, tr.y) <= RALLY_R;
    tr.body.takenMult = tr.rallied ? Math.max(0.1, 1 - RALLY_GUARD * this.buffScale(tr)) : 1;

    // Ecstasy wearing off takes the borrowed health with it.
    if (tr.ecstaticUntil && now >= tr.ecstaticUntil) {
      tr.ecstaticUntil = 0;
      tr.body.hp = Math.min(tr.body.hp, tr.body.maxHp);
    }
    // The barbarian's potion.
    if (tr.kind === 'barbarian' && !tr.raged && !tr.drinkAt && tr.body.hp <= tr.body.maxHp * RAGE_AT) {
      tr.drinkAt = now;
      this.sfx(tr.owner, 'potion-drink', tr.x, 0.9, 0.8);
    }
    if (tr.drinkAt && !tr.raged && now - tr.drinkAt >= RAGE_DRINK_MS) {
      tr.raged = true;
      this.fx(tr.owner).rage(tr.x, tr.y, st.r);
      this.sfx(tr.owner, 'roar', tr.x, 1.1, 0.8);
    }
    if (tr.raged && tr.body.hp < tr.body.maxHp) {
      tr.regenCarry += RAGE_REGEN * dt;
      const whole = Math.floor(tr.regenCarry);
      if (whole > 0) { tr.regenCarry -= whole; tr.body.hp = Math.min(tr.body.maxHp, tr.body.hp + whole); }
    }

    if (this.rising(tr)) return;
    const drinking = tr.drinkAt > 0 && !tr.raged;
    const foe = drinking ? null : this.pickFoe(tr);
    tr.foe = foe;

    // A blow already on its way lands (or misses) whatever else happens.
    if (!tr.swingLanded && tr.swingAt && now - tr.swingAt >= (tr.kind === 'archer' ? ARCHER_DRAW_MS : SWING_HIT_MS)) {
      tr.swingLanded = true;
      this.landBlow(tr);
    }

    let destX = tr.postX, destY = tr.postY;
    let stop = 3;
    if (foe) {
      const d = this.dist(tr.x, tr.y, foe.x, foe.y);
      const gap = this.bodyR(foe) + st.r;
      tr.facing = Math.atan2(foe.y - tr.y, foe.x - tr.x);
      const inReach = d <= gap + st.reach;
      destX = foe.x; destY = foe.y;
      stop = tr.kind === 'archer' ? st.reach * 0.86 + gap : gap + st.reach * 0.5;
      if (inReach && now >= tr.nextAtkAt && tr.swingLanded) {
        tr.swingAt = now;
        tr.swingLanded = false;
        tr.nextAtkAt = now + this.troopAtkMs(tr);
        tr.netShots = (tr.netShots + 1) % 100;
      }
    }
    // An archer plants its feet to draw.
    const rooted = drinking || (tr.kind === 'archer' && !tr.swingLanded);
    const dd = this.dist(tr.x, tr.y, destX, destY);
    if (!rooted && dd > stop) {
      const step = Math.min(dd - stop, this.troopSpeed(tr) * dt);
      const a = Math.atan2(destY - tr.y, destX - tr.x);
      tr.x += Math.cos(a) * step;
      tr.y += Math.sin(a) * step;
      tr.march += dt * (7 + this.troopSpeed(tr) * 0.05);
      if (!foe) tr.facing = a;
    }
  }

  /** The moment a swing connects, or an arrow leaves the string. */
  private landBlow(tr: Troop): void {
    const st = this.stats(tr);
    if (tr.kind === 'archer') {
      const a = tr.foe && this.alive(tr.foe) ? Math.atan2(tr.foe.y - tr.y, tr.foe.x - tr.x) : tr.facing;
      this.loose(tr, a, true);
      return;
    }
    this.sfx(tr.owner, tr.kind === 'barbarian' ? 'flail-swing' : 'slash', tr.x, tr.kind === 'barbarian' ? 0.8 : 1.35, 0.3);
    // "They slash nearby enemies": the cut takes everybody inside its arc, not just the one it chose.
    const reach = st.r + st.reach + 8;
    for (const t of this.targetsOf(tr.owner)) {
      const d = this.dist(tr.x, tr.y, t.x, t.y) - this.bodyR(t);
      if (d > reach) continue;
      const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - tr.y, t.x - tr.x) - tr.facing));
      if (d > 2 && off > 1.25) continue;
      this.hit(tr.owner, t, this.troopDmg(tr));
    }
  }

  private loose(tr: Troop, ang: number, live: boolean): void {
    const r = this.stats(tr).r;
    this.arrows.push({
      x: tr.x + Math.cos(ang) * (r + 6), y: tr.y + Math.sin(ang) * (r + 6) - 2,
      vx: Math.cos(ang) * ARROW_SPEED, vy: Math.sin(ang) * ARROW_SPEED,
      owner: tr.owner, dmg: this.troopDmg(tr), until: this.now + ARROW_LIFE_MS, live,
    });
    this.sfx(tr.owner, 'crossbow', tr.x, 1.5, 0.3);
  }

  private tickArrows(dt: number): void {
    if (!this.arrows.length) return;
    const b = this.api.bounds;
    this.arrows = this.arrows.filter((a) => {
      const px = a.x, py = a.y;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (this.now >= a.until || !b.contains(a.x, a.y)) return false;
      for (const t of this.targetsOf(a.owner)) {
        if (this.segDist(px, py, a.x, a.y, t.x, t.y) > this.bodyR(t) + 4) continue;
        if (a.live) this.hit(a.owner, t, a.dmg);
        this.fx(a.owner).spark(a.x, a.y, this.col(a.owner)(EMO.parchment), 3);
        return false;
      }
      return true;
    });
  }

  /** Keep a rank from standing in one spot, and everybody on the floor. */
  private separate(owner: Owner): void {
    const list = this.side(owner).troops;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const want = this.stats(a).r + this.stats(b).r + 2;
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= want) continue;
        if (d < 0.01) { dx = Math.cos(i * 2.4 + j); dy = Math.sin(i * 2.4 + j); d = 1; }
        const push = (want - d) / 2;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push;
        b.x += (dx / d) * push; b.y += (dy / d) * push;
      }
    }
    for (const tr of list) {
      const p = this.clampToArena(tr, this.stats(tr).r + 4);
      tr.x = p.x; tr.y = p.y;
    }
  }

  /** The other side's shots, against the player's soldiers (the npc's are in the arena's own enemy group). */
  private tickIncomingShots(): void {
    const mine = this.sides.player.troops;
    if (!mine.length) return;
    for (const obj of this.api.projectiles?.getChildren?.() ?? []) {
      const p = obj as Projectile;
      if (!p.active || p.isFromPlayer || p.isHeal) continue;
      for (const tr of mine) {
        if (!this.alive(tr.body) || this.dist(p.x, p.y, tr.x, tr.y) > this.stats(tr).r + 8) continue;
        tr.body.lastDamageOwner = 'npc';
        tr.body.takeDamage(Math.max(1, p.damage));
        p.setActive(false).setVisible(false);
        (p.body as Body | null)?.stop();
        break;
      }
    }
  }

  private updateTroops(owner: Owner, dt: number): void {
    const s = this.side(owner);
    const sim = this.simulates(owner);
    for (const tr of [...s.troops]) {
      if (sim) {
        if (!this.alive(tr.body)) { this.removeTroop(tr, true); continue; }
        this.tickTroop(tr, dt);
      } else {
        // A replica: glide to where its owner last said it was. Struck down here, it stays down
        // out of sight until the owner agrees.
        const k = Math.min(1, dt * 14);
        if (this.dist(tr.x, tr.y, tr.netX, tr.netY) > 0.5) tr.march += dt * 9;
        tr.x += (tr.netX - tr.x) * k;
        tr.y += (tr.netY - tr.y) * k;
        if (this.now - tr.netSeenAt > 2500) { this.removeTroop(tr, false); continue; }
      }
    }
    if (sim) this.separate(owner);
    for (const tr of s.troops) {
      if (tr.body.active) tr.body.place(tr.x, tr.y);
      // String (or anything else) may have rewritten the list: a living soldier is always on it.
      if (owner === 'player' && tr.body.active && !this.api.player.bodySections.includes(tr.body)) {
        this.api.player.bodySections.push(tr.body);
      }
    }
  }

  // ── Click — Stab ───────────────────────────────────────────────────────────

  doStab(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    if (this.busy(owner)) { this.refund(owner, EMOTION_ID.stab); return; }
    const f = this.fighter(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    s.stab = { at: this.now, ang };
    this.fx(owner).thrust(f.x, f.y, ang, STAB_REACH, s.nextId * 7.3 + this.now * 0.001);
    const av = this.avatar(owner);
    if (av instanceof EmotionAvatar) av.hidePike(STAB_MS);
    av?.play('punch', ang);
    this.sfx(owner, 'stab', f.x, 1.05, 0.6);
    const ex = f.x + Math.cos(ang) * STAB_REACH, ey = f.y + Math.sin(ang) * STAB_REACH;
    for (const t of this.targetsOf(owner)) {
      if (this.segDist(f.x, f.y, ex, ey, t.x, t.y) > this.bodyR(t) + STAB_W) continue;
      this.hit(owner, t, STAB_DMG);
    }
  }

  // ── E — Rile ───────────────────────────────────────────────────────────────

  doRile(owner: Owner): void {
    const s = this.side(owner);
    if (this.busy(owner)) { this.refund(owner, EMOTION_ID.rile); return; }
    const f = this.fighter(owner);
    s.rile = { at: this.now, done: false };
    this.avatar(owner)?.play('raise');
    this.fx(owner).call(f.x, f.y, RILE_RING + 34);
    this.sfx(owner, 'whoosh', f.x, 0.8, 0.6);
    this.sfx(owner, 'train-horn', f.x, 1.5, 0.35);
  }

  private updateRile(owner: Owner): void {
    const s = this.side(owner);
    const r = s.rile;
    if (!r) return;
    if (!r.done && this.now - r.at >= RILE_WAVE_MS) {
      r.done = true;
      // Replicas get their knights from the owner's snapshot.
      if (this.simulates(owner)) {
        const f = this.fighter(owner);
        const t = this.mainTarget(owner);
        const toward = t ? Math.atan2(t.y - f.y, t.x - f.x) : (owner === 'player' ? 0 : Math.PI);
        for (let i = 0; i < RILE_COUNT; i++) {
          const a = toward + (i - (RILE_COUNT - 1) / 2) * 0.95;
          this.spawn(owner, 'knight', f.x + Math.cos(a) * RILE_RING, f.y + Math.sin(a) * RILE_RING);
        }
        this.sfx(owner, 'stone-rise', f.x, 1.2, 0.6);
      }
    }
    if (this.now - r.at > RILE_WAVE_MS + 200) s.rile = null;
  }

  // ── R — Depress ────────────────────────────────────────────────────────────

  doDepress(owner: Owner, tx: number, ty: number): void {
    if (this.busy(owner)) { this.refund(owner, EMOTION_ID.depress); return; }
    const f = this.fighter(owner);
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.fx(owner).coldBlast(f.x, f.y, ang, DEPRESS_HALF, DEPRESS_LEN);
    const av = this.avatar(owner);
    if (av instanceof EmotionAvatar) av.flareCape();
    av?.play('sweep', ang);
    this.sfx(owner, 'gust', f.x, 0.75, 0.7);
    this.sfx(owner, 'rain', f.x, 1.2, 0.35);
    if (!this.simulates(owner)) return;
    for (const t of this.targetsOf(owner)) {
      if (!this.inCone(f.x, f.y, ang, DEPRESS_HALF, DEPRESS_LEN, t)) continue;
      this.hit(owner, t, DEPRESS_DMG);
      this.depress(owner, t);
    }
  }

  private depress(owner: Owner, t: Fighter): void {
    if (!this.alive(t) || t.unstoppable) return;
    t.emotionDepressedUntil = Math.max(t.emotionDepressedUntil, Date.now() + DEPRESS_MS);
    this.depressedBy.set(t, owner);
    this.fx(owner).gloom(t.x, t.y);
    this.sfx(owner, 'status-debuff', t.x, 0.8, 0.5);
  }

  /** Every body in play that could be crying. */
  private everyone(): Fighter[] {
    const out: Fighter[] = [];
    const add = (f: Fighter | null | undefined): void => { if (f && f.active && !out.includes(f)) out.push(f); };
    add(this.api.player);
    add(this.api.npc);
    for (const f of this.api.enemies) add(f);
    for (const o of BOTH) for (const tr of this.side(o).troops) add(tr.body);
    return out;
  }

  /**
   * What the kit does to incoming damage, rewritten from scratch each frame: less for whoever is
   * holding the standard, more for whoever is crying in front of a healthier Emotion.
   */
  private updateWeights(): void {
    for (const f of this.weighed) if (f.active) f.conquestIncomingMult = 1;
    this.weighed.clear();
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (this.isEmotion(owner) && this.alive(f) && this.side(owner).stance) {
        f.conquestIncomingMult = STANCE_TAKEN;
        this.weighed.add(f);
      }
    }
    const wall = Date.now();
    for (const t of this.everyone()) {
      if (wall >= t.emotionDepressedUntil) { this.depressedBy.delete(t); continue; }
      // A status that arrived over the wire has no author on this machine: it is the other side's.
      let by = this.depressedBy.get(t);
      if (!by) {
        by = t === this.api.player || this.api.player.bodySections.includes(t) ? 'npc' : 'player';
        this.depressedBy.set(t, by);
      }
      const src = this.fighter(by);
      if (!this.isEmotion(by) || !this.alive(src) || t.maxHp <= 0 || src.maxHp <= 0) continue;
      const edge = Phaser.Math.Clamp(src.hp / src.maxHp - Math.min(1, t.hp / t.maxHp), 0, 1);
      if (edge <= 0) continue;
      t.conquestIncomingMult *= 1 + DEPRESS_AMP * edge;
      this.weighed.add(t);
    }
  }

  /** A crying shooter's shots give up early. */
  private updateShots(): void {
    const wall = Date.now();
    const anyone = this.everyone().some((f) => wall < f.emotionDepressedUntil);
    if (!anyone && !this.shots.size) return;
    const kids = (this.api.projectiles?.getChildren?.() ?? []) as Projectile[];
    for (const p of kids) {
      if (!p.active) { this.shots.delete(p); continue; }
      let dies = this.shots.get(p);
      if (dies === undefined) {
        // First sight of it: whoever on its side is standing where it left from fired it.
        const pool = p.isFromPlayer ? [this.api.player] : [this.api.npc, ...this.api.enemies];
        let shooter: Fighter | null = null;
        let best = SHOOTER_NEAR;
        for (const f of pool) {
          if (!this.alive(f) || f instanceof TroopBody) continue;
          const d = this.dist(p.x, p.y, f.x, f.y);
          if (d < best) { best = d; shooter = f; }
        }
        dies = shooter && wall < shooter.emotionDepressedUntil && !p.isHeal ? this.now + DEPRESS_SHOT_MS : 0;
        this.shots.set(p, dies);
      }
      if (dies > 0 && this.now >= dies) {
        this.pfx.fizzle(p.x, p.y);
        p.setActive(false).setVisible(false);
        (p.body as Body | null)?.stop();
        this.shots.delete(p);
      }
    }
    if (this.shots.size > 400) this.shots.clear();
  }

  // ── F — Euphoria ───────────────────────────────────────────────────────────

  doEuphoria(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    if (this.busy(owner)) { this.refund(owner, EMOTION_ID.euphoria); return; }
    const f = this.fighter(owner);
    s.charge = { at: this.now, ang: Math.atan2(ty - f.y, tx - f.x) };
    this.sfx(owner, 'beam-charge', f.x, 1.2, 0.6);
  }

  private updateEuphoria(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const c = s.charge;
    if (c) {
      // The aim follows until the moment it goes.
      if (owner === 'player') c.ang = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      else if (this.simulates(owner)) {
        const t = this.mainTarget(owner);
        if (t) c.ang = Math.atan2(t.y - f.y, t.x - f.x);
      }
      if (this.now - c.at >= EUPHORIA_CHARGE_MS) {
        s.charge = null;
        s.dash = { at: this.now, ang: c.ang, fromX: f.x, fromY: f.y, lastX: f.x, lastY: f.y, struck: new Set() };
        const v = (EUPHORIA_LEN / EUPHORIA_DASH_MS) * 1000;
        this.drive(owner, Math.cos(c.ang) * v, Math.sin(c.ang) * v, EUPHORIA_DASH_MS);
        this.avatar(owner)?.play('dash', c.ang);
        this.sfx(owner, 'dash', f.x, 0.9, 0.8);
        this.sfx(owner, 'holy-chord', f.x, 1.5, 0.4);
        // The army feels it.
        if (this.simulates(owner)) {
          for (const tr of s.troops) {
            if (this.dist(f.x, f.y, tr.x, tr.y) <= ECSTASY_R && !this.rising(tr)) this.makeEcstatic(tr);
          }
        }
      }
    }
    const d = s.dash;
    if (!d) return;
    for (const t of this.targetsOf(owner)) {
      if (d.struck.has(t)) continue;
      if (this.segDist(d.lastX, d.lastY, f.x, f.y, t.x, t.y) > this.bodyR(t) + EUPHORIA_W) continue;
      d.struck.add(t);
      this.hit(owner, t, EUPHORIA_DMG);
      this.fx(owner).spark(t.x, t.y, EMO.joy, 7);
      if (this.simulates(owner)) this.sfx(owner, 'stab', t.x, 0.8, 0.8);
    }
    d.lastX = f.x;
    d.lastY = f.y;
    if (this.now - d.at >= EUPHORIA_DASH_MS) {
      s.dash = null;
      this.fx(owner).dashTrail(d.fromX, d.fromY, f.x, f.y);
      if (!f.netGhost) (f.body as Body | null)?.setVelocity(0, 0);
    }
  }

  // ── Q — Maximum Nationalism ────────────────────────────────────────────────

  doNationalism(owner: Owner): void {
    const s = this.side(owner);
    if (this.busy(owner)) { this.refund(owner, EMOTION_ID.nationalism); return; }
    const f = this.fighter(owner);
    s.stance = { since: this.now };
    this.avatar(owner)?.play('raise');
    this.fx(owner).call(f.x, f.y, RALLY_R);
    this.sfx(owner, 'holy-chord', f.x, 0.8, 0.8);
    this.sfx(owner, 'train-horn', f.x, 1.1, 0.4);
  }

  /** The recast: the standard goes into the floor. */
  private slam(owner: Owner, at?: Pt): void {
    const s = this.side(owner);
    if (!s.stance) return;
    const f = this.fighter(owner);
    const x = at?.x ?? f.x, y = at?.y ?? f.y;
    s.stance = null;
    this.finishMuster(owner);
    s.planted = { x, y: y + 14, at: this.now, called: 0, seed: Math.random() * 99 };
    this.avatar(owner)?.play('slam');
    this.fx(owner).slam(x, y + 14, SLAM_R);
    this.sfx(owner, 'stone-slam', x, 0.8, 1);
    this.sfx(owner, 'quake', x, 1, 0.7);
    this.api.scene.cameras?.main?.shake(180, 0.006);
    for (const t of this.targetsOf(owner)) {
      if (this.dist(x, y, t.x, t.y) - this.bodyR(t) <= SLAM_R) this.hit(owner, t, SLAM_DMG, { aoe: true });
    }
    this.relay(owner, `emx-slam:${Math.round(x)}:${Math.round(y)}:${this.netSeq++}`);
  }

  /** A standard already in the floor hands over whoever it still owed before a new one goes in. */
  private finishMuster(owner: Owner): void {
    const s = this.side(owner);
    const p = s.planted;
    if (!p) return;
    if (this.simulates(owner)) while (p.called < MUSTER.length) this.muster(owner);
    s.planted = null;
  }

  private muster(owner: Owner): void {
    const p = this.side(owner).planted;
    if (!p) return;
    const i = p.called++;
    if (!this.simulates(owner)) return;
    const a = -Math.PI / 2 + (i / MUSTER.length) * Math.PI * 2;
    this.spawn(owner, MUSTER[i], p.x + Math.cos(a) * MUSTER_RING, p.y - 8 + Math.sin(a) * MUSTER_RING * 0.7);
    this.sfx(owner, MUSTER[i] === 'barbarian' ? 'roar' : 'stone-rise', p.x, MUSTER[i] === 'barbarian' ? 0.8 : 1.3, 0.5);
  }

  private updateNationalism(owner: Owner): void {
    const s = this.side(owner);
    if (s.stance && this.simulates(owner) && this.now - s.stance.since >= STANCE_MAX_MS) this.slam(owner);
    const p = s.planted;
    if (!p) return;
    while (p.called < MUSTER.length && this.now - p.at >= (p.called + 1) * MUSTER_EVERY_MS) this.muster(owner);
    if (this.now - p.at >= MUSTER.length * MUSTER_EVERY_MS + MUSTER_LINGER_MS) s.planted = null;
  }

  // ── Online ─────────────────────────────────────────────────────────────────

  /** Our army, for the machine that only draws it: `emx-t:seq:id,kind,x,y,hp,flags,shots,facing;…`. */
  private relayTroops(): void {
    const s = this.sides.player;
    if (!this.duelOnline || this.now < s.snapAt) return;
    if (!s.troops.length && !s.snapHadTroops) return;
    s.snapAt = this.now + NET_SNAP_MS;
    s.snapHadTroops = s.troops.length > 0;
    const rows = s.troops.map((tr) => {
      const flags = (this.ecstatic(tr) ? 1 : 0) | (tr.raged ? 2 : 0) | (tr.drinkAt && !tr.raged ? 4 : 0) | (tr.rallied ? 8 : 0);
      const k = tr.kind === 'knight' ? 0 : tr.kind === 'archer' ? 1 : 2;
      return [tr.id, k, Math.round(tr.x), Math.round(tr.y), Math.max(0, Math.round(tr.body.hp)), flags, tr.netShots, Math.round(tr.facing * 100)].join(',');
    });
    this.api.broadcast(`emx-t:${this.netSeq++}:${rows.join(';')}`);
  }

  private applyTroopSnapshot(body: string): void {
    const s = this.sides.npc;
    const seen = new Set<number>();
    for (const row of body ? body.split(';') : []) {
      const v = row.split(',').map(Number);
      if (v.length < 8 || v.some((n) => !Number.isFinite(n))) continue;
      const [id, k, rx, y, hp, flags, shots, facing100] = v;
      const x = this.mirrorX(rx);
      const facing = Math.PI - facing100 / 100;
      const kind: TroopKind = k === 0 ? 'knight' : k === 1 ? 'archer' : 'barbarian';
      seen.add(id);
      let tr = s.troops.find((o) => o.id === id);
      if (!tr) {
        if (hp <= 0) continue;
        tr = this.spawn('npc', kind, x, y, id);
        tr.netShots = shots;
      }
      tr.netX = x; tr.netY = y;
      tr.netSeenAt = this.now;
      tr.facing = facing;
      // Their word on its health is final — except that one we have just cut down stays down.
      if (tr.body.active && tr.body.hp > 0) tr.body.hp = Math.max(1, hp);
      const wasEcstatic = this.ecstatic(tr);
      tr.ecstaticUntil = flags & 1 ? this.now + 400 : 0;
      if (flags & 1 && !wasEcstatic) this.fx('npc').joy(tr.x, tr.y - 4, this.stats(tr).r);
      if (flags & 2 && !tr.raged) this.fx('npc').rage(tr.x, tr.y, this.stats(tr).r);
      tr.raged = !!(flags & 2);
      if (flags & 4) { if (!tr.drinkAt) tr.drinkAt = this.now; } else if (!tr.raged) tr.drinkAt = 0;
      tr.rallied = !!(flags & 8);
      if (shots !== tr.netShots) {
        tr.netShots = shots;
        tr.swingAt = this.now;
        if (kind === 'archer') this.loose(tr, facing, false);
      }
    }
    for (const tr of [...s.troops]) if (!seen.has(tr.id)) this.removeTroop(tr, true);
  }

  /** Something the other machine decided. */
  replayNet(id: string): void {
    const parts = id.split(':');
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    switch (parts[0]) {
      case 'emx-t':
        if (this.isEmotion('npc')) this.applyTroopSnapshot(parts[2] ?? '');
        break;
      case 'emx-hit': {
        // They hit one of ours: the damage is theirs to decide.
        const tr = this.sides.player.troops.find((o) => o.id === n(1));
        if (tr && this.alive(tr.body)) {
          tr.body.lastDamageOwner = 'npc';
          tr.body.takeDamage(Math.max(1, n(2)), { netApplied: true });
        }
        break;
      }
      case 'emx-slam':
        if (this.isEmotion('npc')) {
          if (!this.sides.npc.stance) this.sides.npc.stance = { since: this.now };
          this.slam('npc', { x: this.mirrorX(n(1)), y: n(2) });
        }
        break;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /** One of the player's own soldiers under the cursor. */
  private troopAt(x: number, y: number): Troop | null {
    let best: Troop | null = null;
    let bestD = Infinity;
    for (const tr of this.sides.player.troops) {
      const d = this.dist(x, y, tr.x, tr.y - 4);
      if (d <= this.stats(tr).r + PICK_PAD && d < bestD) { bestD = d; best = tr; }
    }
    return best;
  }

  /**
   * Everybody who takes an order given to `tr`: the soldiers standing close to it, and the ones
   * close to those, and so on down the rank. `tr` is always first.
   */
  private squadOf(tr: Troop): Troop[] {
    const all = this.side(tr.owner).troops;
    const squad = [tr];
    for (let i = 0; i < squad.length; i++) {
      for (const o of all) {
        if (squad.includes(o) || this.dist(squad[i].x, squad[i].y, o.x, o.y) > SQUAD_LINK) continue;
        squad.push(o);
      }
    }
    return squad;
  }

  /**
   * Let go of a soldier — and its squad with it. On an enemy they are all sent after them;
   * anywhere else each gets a new post, keeping the formation they were standing in.
   */
  private dropTroop(lead: Troop, x: number, y: number): void {
    const squad = this.squadOf(lead);
    const ox = lead.x, oy = lead.y;
    for (const tr of squad) this.orderTroop(tr, x + (tr.x - ox), y + (tr.y - oy), x, y);
    Sfx.play(lead.quarry ? 'ui-drop' : 'ui-drag');
  }

  /** One soldier's share of an order dropped at (dropX, dropY): its own post is (x, y). */
  private orderTroop(tr: Troop, x: number, y: number, dropX: number, dropY: number): void {
    let quarry: Fighter | null = null;
    let best = Infinity;
    for (const t of this.targetsOf('player')) {
      const d = this.dist(dropX, dropY, t.x, t.y) - this.bodyR(t);
      if (d <= ORDER_SNAP && d < best) { best = d; quarry = t; }
    }
    tr.quarry = quarry;
    if (!quarry) {
      const p = this.clampToArena({ x, y }, this.stats(tr).r + 4);
      tr.postX = p.x;
      tr.postY = p.y;
    }
  }

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== EMOTION_ELEMENT_ID) return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    const p = this.api.player;
    const left = pointer.leftButtonDown();
    const leftJust = left && !s.wasLeft;
    s.wasLeft = left;
    if (!this.alive(p)) { s.drag = null; return; }

    // The drag: a press on a soldier picks it up, and the release is the order. The button
    // belongs to the soldier for as long as it is held.
    if (s.drag) {
      if (!left) { this.dropTroop(s.drag, mouseX, mouseY); s.drag = null; }
    } else if (leftJust) {
      const tr = this.troopAt(mouseX, mouseY);
      if (tr) { s.drag = tr; Sfx.play('ui-drag'); }
    }

    const ctx = (): CastContext => this.api.buildPlayerContext(mouseX, mouseY);
    const { eKey, rKey, fKey, qKey } = this.api;
    const just = (k: Phaser.Input.Keyboard.Key): boolean => Phaser.Input.Keyboard.JustDown(k);
    const e = just(eKey), r = just(rKey), f = just(fKey), q = just(qKey);
    if (s.charge || s.dash) return;
    if (s.stance) {
      if (q && this.now - s.stance.since >= STANCE_MIN_MS) this.slam('player');
      return;
    }
    if (left && !s.drag) p.castAbility(EMOTION_ID.stab, ctx());
    if (e) p.castAbility(EMOTION_ID.rile, ctx());
    if (r) p.castAbility(EMOTION_ID.depress, ctx());
    if (f) p.castAbility(EMOTION_ID.euphoria, ctx());
    if (q) p.castAbility(EMOTION_ID.nationalism, ctx());
  }

  // ── What ArenaScene asks ───────────────────────────────────────────────────

  private speedFor(owner: Owner): number {
    if (!this.isEmotion(owner)) return 1;
    const s = this.side(owner);
    if (s.charge) return EUPHORIA_CHARGE_SPEED;
    if (s.stance) return STANCE_SPEED;
    return 1;
  }

  getPlayerSpeedMult(): number { return this.speedFor('player'); }
  getNpcSpeedMult(): number { return this.speedFor('npc'); }
  getNpcYankUntil(): number { return this.npcYankUntil; }

  getBarRatio(abilityId: string): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === EMOTION_ID.nationalism && s.stance) {
      return Phaser.Math.Clamp(1 - (this.now - s.stance.since) / STANCE_MAX_MS, 0, 1);
    }
    if (abilityId === EMOTION_ID.euphoria && s.charge) {
      return Phaser.Math.Clamp((this.now - s.charge.at) / EUPHORIA_CHARGE_MS, 0, 1);
    }
    // Holding the standard: every other card is dark.
    if (s.stance && abilityId !== EMOTION_ID.nationalism) return 0;
    return p.getCooldownRatio(abilityId);
  }

  /** Ruin's Spikes of Ruin (see `combat/SummonPurge.ts`): soldiers are summons, the commander is not. */
  purgeSummons(
    x: number, y: number, radius: number, exceptOwner: Owner,
    report?: (px: number, py: number) => void,
  ): number {
    let razed = 0;
    for (const owner of BOTH) {
      if (owner === exceptOwner || !this.simulates(owner)) continue;
      for (const tr of [...this.side(owner).troops]) {
        if (this.dist(x, y, tr.x, tr.y) > radius) continue;
        report?.(tr.x, tr.y);
        this.removeTroop(tr, true);
        razed++;
      }
    }
    return razed;
  }

  /** Memory's Rebirth: the struck side loses part of what it has built up. Returns a label, or null. */
  rebirthDrain(owner: Owner): string | null {
    const s = this.side(owner);
    if (!this.simulates(owner) || !s.troops.length) return null;
    const take = Math.ceil(s.troops.length * 0.4);
    for (const tr of s.troops.slice(0, take)) this.removeTroop(tr, true);
    return `−${take}⚔️`;
  }

  // ── The bot ────────────────────────────────────────────────────────────────
  //
  // The army is board state the AI routine has no view of, so the kit plays it: every soldier
  // without a quarry is sent at whoever is nearest, and the standard goes into the floor when
  // somebody is standing where it will land. What `doEmotionAbilities` needs to decide its own
  // casts is published below; all of it is read-only.

  /** Winding up, charging or holding the standard: the bot may not cast (the kit would refuse it). */
  npcEmotionBusy(): boolean { return this.isEmotion('npc') && this.busy('npc'); }

  /** Holding the grand standard: walk it to them — the kit slams it when they are inside the blast. */
  npcEmotionStance(): boolean { return this.isEmotion('npc') && !!this.sides.npc.stance; }

  /** Rile → everything: how many soldiers the bot has standing. */
  npcEmotionTroops(): number { return this.isEmotion('npc') ? this.sides.npc.troops.length : 0; }

  /** Troops → Euphoria: how many would turn ecstatic if it charged right now. */
  npcEmotionEcstasyCount(): number {
    if (!this.isEmotion('npc')) return 0;
    const f = this.api.npc;
    return this.sides.npc.troops.filter((tr) => !this.rising(tr) && !this.ecstatic(tr) && this.dist(f.x, f.y, tr.x, tr.y) <= ECSTASY_R).length;
  }

  /** Troops → Maximum Nationalism: how many are close enough to fight under the standard. */
  npcEmotionRallyCount(): number {
    if (!this.isEmotion('npc')) return 0;
    const f = this.api.npc;
    return this.sides.npc.troops.filter((tr) => this.dist(f.x, f.y, tr.x, tr.y) <= RALLY_R).length;
  }

  /** Health lead → Depress: the bot is the healthier one, so a crying target takes more from everything. */
  npcEmotionDepressEdge(): boolean {
    if (!this.isEmotion('npc')) return false;
    const f = this.api.npc;
    const t = this.mainTarget('npc');
    if (!this.alive(f) || !t || Date.now() < t.emotionDepressedUntil - 1500) return false;
    return f.hp / f.maxHp > t.hp / t.maxHp + 0.08 && this.dist(f.x, f.y, t.x, t.y) <= DEPRESS_LEN;
  }

  private updateBot(): void {
    if (!this.isEmotion('npc') || !this.simulates('npc')) return;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f)) return;
    // The drag, as a bot does it: everybody without a quarry is sent at whoever is nearest them.
    if (this.now >= s.botOrderAt) {
      s.botOrderAt = this.now + BOT_ORDER_MS + this.api.npcSlack * 1200;
      for (const tr of s.troops) {
        if (tr.quarry || this.rising(tr)) continue;
        tr.quarry = this.nearestTarget('npc', tr.x, tr.y);
      }
    }
    // Slam where it will land on somebody — or before the standard is knocked out of its hands.
    if (s.stance && this.now - s.stance.since >= STANCE_MIN_MS + 500) {
      const t = this.nearestTarget('npc', f.x, f.y);
      const d = t ? this.dist(f.x, f.y, t.x, t.y) - this.bodyR(t) : Infinity;
      const held = this.now - s.stance.since;
      if (d <= SLAM_R * 0.6 || (d <= SLAM_R * 0.92 && held > 2500) || f.hp / f.maxHp < 0.2 || held > STANCE_MAX_MS - 400) {
        this.slam('npc');
      }
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // `reset()` runs before the new fighters exist: the old bodies went down with the old scene.
    for (const owner of BOTH) {
      for (const tr of this.side(owner).troops) if (tr.body.active) tr.body.destroy();
    }
    this.sides = { player: makeSide(), npc: makeSide() };
    this.arrows = [];
    this.depressedBy.clear();
    this.weighed.clear();
    this.shots.clear();
    this.npcYankUntil = 0;
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.groundGfx, this.unitGfx, this.airGfx]) g?.destroy();
    this.groundGfx = this.unitGfx = this.airGfx = null;
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3.3);
    if (!this.unitGfx) this.unitGfx = scene.add.graphics().setDepth(5.4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9.2);
  }

  private makeAvatar(owner: Owner): BaseAvatar {
    return makeSkinAvatar(this.api.skinId(owner), this.api.scene)
      ?? new EmotionAvatar(this.api.scene, this.col(owner));
  }

  private ensureAvatars(): void {
    if (this.isEmotion('player') && !this.playerAvatar) this.playerAvatar = this.makeAvatar('player');
    if (!this.isEmotion('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isEmotion('npc') && !this.npcAvatar) this.npcAvatar = this.makeAvatar('npc');
    if (!this.isEmotion('npc') && this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
  }

  private idle(): boolean {
    if (this.isEmotion('player') || this.isEmotion('npc')) return false;
    if (this.playerAvatar || this.npcAvatar || this.arrows.length || this.weighed.size || this.shots.size) return false;
    if (BOTH.some((o) => this.side(o).troops.length)) return false;
    const wall = Date.now();
    return !this.depressedBy.size && !(wall < this.api.player?.emotionDepressedUntil);
  }

  update(time: number, delta: number): void {
    void time;
    if (this.idle()) {
      if (this.groundGfx) { this.groundGfx.clear(); this.unitGfx?.clear(); this.airGfx?.clear(); }
      return;
    }
    this.ensureLayers();
    this.ensureAvatars();
    const dt = delta / 1000;
    this.vizT += dt;

    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.isEmotion(owner) || !this.alive(f)) {
        // The commander is gone, and the army with him.
        s.stance = null; s.charge = null; s.dash = null; s.rile = null; s.planted = null; s.drag = null;
        if (s.troops.length) this.clearTroops(owner);
        continue;
      }
      this.updateRile(owner);
      this.updateEuphoria(owner);
      this.updateNationalism(owner);
      if (s.stab && this.now - s.stab.at > STAB_MS) s.stab = null;
    }
    this.updateBot();
    for (const owner of BOTH) this.updateTroops(owner, dt);
    this.tickIncomingShots();
    this.tickArrows(dt);
    this.updateWeights();
    this.updateShots();
    this.relayTroops();
    this.paint();
    this.updateAvatars(delta);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintTroop(g: Phaser.GameObjects.Graphics, tr: Troop): void {
    const now = this.now;
    const col = this.col(tr.owner);
    const side = sideColor(tr.owner);
    const birth = Phaser.Math.Clamp((now - tr.bornAt) / RISE_MS, 0, 1);
    const swingMs = tr.kind === 'archer' ? ARCHER_DRAW_MS : SWING_MS;
    const swing = tr.swingAt && now - tr.swingAt < swingMs ? Math.max(0.01, (now - tr.swingAt) / swingMs) : 0;
    const depressed = Date.now() < tr.body.emotionDepressedUntil;
    const held = this.heldSquad.includes(tr);
    const drinking = tr.drinkAt && !tr.raged ? Phaser.Math.Clamp((now - tr.drinkAt) / RAGE_DRINK_MS, 0.01, 0.99) : 0;
    if (this.api.skinId(tr.owner) === 'ww2') {
      // The WW2 skin's own soldiers (and a Sherman for the barbarian); the feelings are painted over them.
      const s = TROOP_SCALE[tr.kind] * (0.45 + 0.55 * birth);
      if (this.ecstatic(tr)) {
        g.lineStyle(2, EMO.joy, 0.95);
        g.strokeCircle(tr.x, tr.y - 2, this.stats(tr).r * 1.25);
      }
      if (tr.kind === 'barbarian') WW2_CONQUEST_ART.barbarianKing(g, col, tr.x, tr.y, side, tr.facing, tr.march, tr.raged, birth);
      else WW2_CONQUEST_ART.soldier(g, col, tr.x, tr.y, side, tr.facing, tr.march, s, birth);
      if (depressed) drawTears(g, tr.x, tr.y - 2, this.stats(tr).r, this.vizT, 1);
      return;
    }
    drawTroop(g, col, tr.kind, tr.x, tr.y, side, {
      ang: tr.facing, march: tr.march, swing, birth, alpha: 1, t: this.vizT,
      ecstatic: this.ecstatic(tr), enraged: tr.raged, depressed, rallied: tr.rallied, drinking, held,
    });
  }

  private paint(): void {
    const lead = this.sides.player.drag;
    this.heldSquad = lead ? this.squadOf(lead) : [];
    const ground = this.groundGfx!;
    const unit = this.unitGfx!;
    const air = this.airGfx!;
    ground.clear();
    unit.clear();
    air.clear();
    const t = this.vizT;

    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      const col = this.col(owner);
      if (this.isEmotion(owner) && this.alive(f)) {
        if (s.charge) {
          drawEuphoriaCharge(ground, f.x, f.y, s.charge.ang, EUPHORIA_LEN, Phaser.Math.Clamp((this.now - s.charge.at) / EUPHORIA_CHARGE_MS, 0, 1), t);
        }
        if (s.stance) drawRallyRing(ground, col, f.x, f.y, RALLY_R, t, 1);
      }
      const p = s.planted;
      if (p) {
        const since = this.now - p.at;
        const k = Phaser.Math.Clamp((since - p.called * MUSTER_EVERY_MS) / MUSTER_EVERY_MS, 0, 1);
        const out = Phaser.Math.Clamp(1 - (since - MUSTER.length * MUSTER_EVERY_MS) / MUSTER_LINGER_MS, 0, 1);
        if (p.called < MUSTER.length) drawMusterSeals(ground, col, p.x, p.y, p.called, MUSTER.length, k, t);
        drawGrandStandard(unit, col, p.x, p.y, 72, t, p.seed, 1, out, true);
      }
    }

    // Soldiers, back to front.
    const all = [...this.sides.player.troops, ...this.sides.npc.troops].sort((a, b) => a.y - b.y);
    for (const tr of all) {
      if (!tr.body.active || tr.body.hp <= 0) continue;
      this.paintTroop(unit, tr);
      const st = this.stats(tr);
      const max = tr.body.maxHp;
      const w = tr.kind === 'barbarian' ? 30 : 18;
      if (this.now - tr.bornAt > RISE_MS * 0.6) {
        drawTroopHp(air, tr.x, tr.y - st.r * 2 - (tr.kind === 'knight' ? 16 : 12), w,
          Math.min(tr.body.hp, max) / max, Math.max(0, tr.body.hp - max) / max, sideColor(tr.owner), 0.95);
      }
    }

    for (const a of this.arrows) drawArrow(air, this.col(a.owner), a.x, a.y, Math.atan2(a.vy, a.vx), 1);

    // The order in the player's hand, and which soldier the cursor could pick up.
    const me = this.sides.player;
    if (this.isEmotion('player')) {
      if (me.drag) {
        // One line per soldier in the squad: to the enemy they are all being sent at, or each to its own new post.
        const lead = me.drag;
        const onEnemy = this.targetsOf('player').some((e) => this.dist(me.aimX, me.aimY, e.x, e.y) - this.bodyR(e) <= ORDER_SNAP);
        for (const tr of this.heldSquad) {
          const ex = onEnemy ? me.aimX : me.aimX + (tr.x - lead.x);
          const ey = onEnemy ? me.aimY : me.aimY + (tr.y - lead.y);
          drawOrderLine(air, tr.x, tr.y, ex, ey, t, onEnemy);
        }
      } else {
        const hover = this.troopAt(me.aimX, me.aimY);
        if (hover) for (const tr of this.squadOf(hover)) drawPickRing(ground, tr.x, tr.y, this.stats(tr).r, t);
      }
    }

    // Everybody who is crying.
    const wall = Date.now();
    for (const f of this.everyone()) {
      if (f instanceof TroopBody || wall >= f.emotionDepressedUntil || !this.alive(f) || f.forceInvisible) continue;
      drawTears(air, f.x, f.y - 2, this.bodyR(f) * 0.95, t, 0.95);
    }
  }

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const av = this.avatar(owner);
      if (!av) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { av.update(delta, f?.x ?? 0, f?.y ?? 0, 0); continue; }
      const s = this.side(owner);
      let ang: number;
      if (s.charge) ang = s.charge.ang;
      else if (s.dash) ang = s.dash.ang;
      else if (owner === 'player') {
        const ptr = this.api.scene.input.activePointer;
        ang = Math.atan2(ptr.worldY - f.y, ptr.worldX - f.x);
      } else {
        const t = this.mainTarget('npc') ?? this.api.player;
        ang = t ? Math.atan2(t.y - f.y, t.x - f.x) : Math.PI;
      }
      av.setFacing(ang);
      av.setMastered(false);
      av.setIntensity(s.stance ? 1.25 : 1);
      if (av instanceof EmotionAvatar) {
        av.setStandard(!!s.stance);
        av.setCharge(s.charge ? (this.now - s.charge.at) / EUPHORIA_CHARGE_MS : s.dash ? 1 : 0);
      }
      av.setHold(s.stance ? 'ride' : s.charge ? 'brace' : s.dash ? 'reach' : null, ang);
      av.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
    }
  }
}
