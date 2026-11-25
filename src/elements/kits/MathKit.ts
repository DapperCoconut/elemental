import Phaser from 'phaser';
import { Fighter, DamageOpts } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Sfx } from '../../audio';
import { FONT_DISPLAY, FONT_MONO } from '../../ui/Theme';
import { CUTSCENE_EQUATIONS, EXAM_LENGTH, MathProblem, crunchProblem, examProblems } from './MathProblems';
import {
  MATHC, MathAvatar, MathColorFn, MathFx,
  drawAxes, drawCineBoard, drawFuse, drawGraph, drawPainRegion, drawPillar,
} from './MathVisuals';

type Owner = 'player' | 'npc';
const BOTH: Owner[] = ['player', 'npc'];
const TAU = Math.PI * 2;

/** The element keeps Magic's id — saves, tables and courts all know it by that name. */
export const MATH_ELEMENT_ID = 'magic';

export const MATH_ID = {
  click: 'math-crunch',
  e: 'math-integrate',
  r: 'math-rate',
  f: 'math-derive',
  q: 'math-42',
} as const;

// ── Tuning ───────────────────────────────────────────────────────────────────

/** Crunch the Numbers */
const PILLAR_CAP = 5;
const ORBIT_R = 46;
const ORBIT_SPEED = 2.6;
const PILLAR_WINDUP_MS = 140;
const PILLAR_SPEED = 1000;
const PILLAR_RANGE = 540;
const PILLAR_DMG = 16;
const PILLAR_HIT_R = 22;
const PILLAR_KNOCK = 640;
const PILLAR_KNOCK_MS = 240;
/** A bot's sum takes this long, plus up to `BOT_SOLVE_SLACK_MS` at the lowest difficulty. */
const BOT_SOLVE_MS = 1500;
const BOT_SOLVE_SLACK_MS = 2600;
/** How fast a bot's "cursor" closes on its target, per second. Slow enough to walk out of. */
const BOT_CURSOR_RATE = 2.4;
const CURSOR_RELAY_MS = 120;

/** The graph */
const MAX_DEGREE = 4;
/** Where the flat line `y = 1` sits, as a fraction of the half-height. */
const FLAT_LEVEL = 0.45;
const CURVE_SCALE = 0.86;
const CURVE_SAMPLES = 48;
const MORPH_MS = 420;
/** Every integration past `y = x` sinks the whole graph this far (curve units: 1 = the top edge's reach). */
const INTEGRAL_DROP = 0.16;
export const GRAPH_LABELS = ['y = 1', 'y = x', 'y = x²/2 − 1', 'y = x³/6 − 2', 'y = x⁴/24 − 3'];

/** Rate of Pain */
const RATE_MS = 3500;
const RATE_TICK_MS = 250;
/**
 * Damage per tick by the graph's rung (`y = 1` … `y = x⁴/24`). Every integration sinks the graph, so the
 * burning area shrinks — and what is left of it burns far hotter.
 */
const RATE_TICK_DMG = [3, 3, 6, 9, 13];

/** Derivitize */
const BOMB_COUNT = 9;
const BOMB_FUSE_MS = 560;
const BOMB_R = 87;
const BOMB_DMG = 24;
const BOMBLET_COUNT = 3;
const BOMBLET_FUSE_MS = 380;
const BOMBLET_R = 54;
const BOMBLET_DMG = 10;
const BOMBLET_THROW = 93;

/** 42 */
const CINE_MS = 2000;
const EXAM_MS = 7000;
/** A bot (or a husk pack) settles each problem somewhere inside this window. */
const EXAM_ROLL_MS = 4200;
const EXAM_GAP_MS = 700;
const EXAM_FAIL_BASE = 10;
const EXAM_FAIL_STEP = 5;
/** Chance a bot gets problem 1…5 right. The last one is not meant to be done. */
const EXAM_BOT_PASS = [0.9, 0.62, 0.34, 0.12, 0];
/** Online: how long the caster's sim waits past the clock for the victim's answer before failing it. */
const EXAM_NET_GRACE_MS = 2500;

// ── Types ────────────────────────────────────────────────────────────────────

interface Side {
  /** The cursor the pillars circle: the real one, a bot's creeping one, or the one a peer relays. */
  aimX: number; aimY: number;
  hasAim: boolean;
  problem: MathProblem | null;
  typed: string;
  pillars: number;
  orbit: number;
  nextSolveAt: number;
  degree: number;
  morphFrom: number;
  morphAt: number;
  rateUntil: number;
  rateTick: number;
  lastCursorRelay: number;
  wasLeft: boolean;
  /** Online: the seed the caster relayed for its next exam. */
  examSeed: number;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, hasAim: false, problem: null, typed: '', pillars: 0, orbit: 0, nextSolveAt: 0,
    degree: 1, morphFrom: 1, morphAt: -99999, rateUntil: 0, rateTick: 0, lastCursorRelay: 0, wasLeft: false,
    examSeed: 0,
  };
}

interface Flight {
  owner: Owner;
  x: number; y: number;
  ang: number;
  launchAt: number;
  launched: boolean;
  travelled: number;
  seed: number;
  hit: Set<Fighter>;
}

interface Bomb {
  owner: Owner;
  x: number; y: number;
  r: number;
  dmg: number;
  start: number;
  at: number;
  /** A primary throws bomblets; a bomblet does not. */
  big: boolean;
  seed: number;
}

/**
 * - `interactive`: the local human is sitting it.
 * - `roll`: a bot or a husk pack is, on dice.
 * - `display`: an online opponent is, on their own machine; we show the clock and wait.
 */
type ExamMode = 'interactive' | 'roll' | 'display';

interface Exam {
  /** Who cast 42 — the side setting the problems. */
  owner: Owner;
  mode: ExamMode;
  problems: MathProblem[];
  index: number;
  /** When the current problem went up; 0 while between problems. */
  askedAt: number;
  nextAt: number;
  typed: string;
  rollAt: number;
  rollPass: boolean;
  fails: number;
  results: (boolean | null)[];
  /** The last verdict, for the panel's flash. */
  flashAt: number;
  flashPass: boolean;
}

interface Cine {
  owner: Owner;
  start: number;
  board: Phaser.GameObjects.Graphics;
  texts: Phaser.GameObjects.Text[];
  title: Phaser.GameObjects.Text;
  shielded: Fighter[];
  burst: boolean;
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface MathArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** The player's enemies: `[npc]` in a duel, the husks in an Invasion. */
  get enemies(): Fighter[];
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /** The player's live element as this kit sees it (Quantum reports a carried Math as itself). */
  get elementId(): string;
  get npcElementId(): string;
  get bounds(): Phaser.Geom.Rectangle;
  get isOnline(): boolean;
  /** Invasion: the npc slot is a placeholder or a co-op *ally*, never an enemy. */
  get isInvasion(): boolean;
  get worldW(): number;
  /** 0 (flawless) … ~0.5 (easy): the bot's `castSkipChance`, read as how slow it is at sums. */
  get npcSlack(): number;
  isTargetable(f: Fighter): boolean;
  mathColor(owner: Owner, base: number): number;
  buildPlayerContext(x: number, y: number): CastContext;
  /** Online: relay something only the owner's sim decides as a pseudo-cast. */
  broadcast(id: string): void;
}

// ── MathKit ──────────────────────────────────────────────────────────────────

/**
 * Math — the scholar with a stick of chalk and a blackboard the size of the arena.
 *
 * - **Crunch the Numbers** — a sum is always up on the slate over your head; type the answer and a
 *   pillar of math joins the ring circling your cursor (five at most). Click and every pillar stops
 *   where it is and launches through the point you clicked, with heavy knockback.
 * - **Integrate** — the graph `y = x` is drawn across the arena, harmless. E integrates it one step
 *   up the ladder `1 → x → x²/2 → x³/6 → x⁴/24`.
 * - **Rate of Pain** — everything between the graph and the floor burns for a few seconds, harder
 *   the further up the ladder the graph has been integrated.
 * - **Derivitize** — the graph steps back down the ladder and the *old* curve goes off as a line of
 *   cluster bombs. Differentiating the flat line resets the board to `y = x`.
 * - **42** — a two-second cutscene, then the enemy sits a five-problem exam while the fight goes
 *   on: typed answers, Enter to submit, seven seconds each. Every failure hurts more than the last.
 *
 * Each side has its own graph. Online the owner's sim decides every hit; pillar counts, the cursor
 * the ring circles, the exam's seed and each of the victim's answers travel as `math-*`
 * pseudo-casts (the answers come back from whatever the victim is playing).
 */
export class MathKit {
  private api: MathArenaApi;
  private readonly pcol: MathColorFn;
  private readonly ncol: MathColorFn;
  private readonly pfx: MathFx;
  private readonly nfx: MathFx;
  private playerAvatar: MathAvatar | null = null;
  private npcAvatar: MathAvatar | null = null;
  /** Axes, graphs, the pain region, fuses — under the bodies. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Pillars and the slate — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The exam panels, pinned to the screen. */
  private hudGfx: Phaser.GameObjects.Graphics | null = null;
  private slateText: Phaser.GameObjects.Text | null = null;
  private graphLabels: Record<Owner, Phaser.GameObjects.Text | null> = { player: null, npc: null };
  private examTexts: Record<Owner, { head: Phaser.GameObjects.Text; body: Phaser.GameObjects.Text; input: Phaser.GameObjects.Text } | null> = { player: null, npc: null };
  private vizT = 0;

  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private flights: Flight[] = [];
  private bombs: Bomb[] = [];
  private exams: Record<Owner, Exam | null> = { player: null, npc: null };
  private knocks = new Map<Fighter, { vx: number; vy: number; until: number }>();
  private cine: Cine | null = null;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  constructor(api: MathArenaApi) {
    this.api = api;
    this.pcol = (base) => api.mathColor('player', base);
    this.ncol = (base) => api.mathColor('npc', base);
    this.pfx = new MathFx(api.scene, this.pcol);
    this.nfx = new MathFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): MathFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): MathColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): MathAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private bodyR(f: Fighter): number { return (f.body as Phaser.Physics.Arcade.Body | null)?.radius || 20; }
  private alive(f: Fighter | null | undefined): boolean { return !!f && f.active && f.hp > 0; }
  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }

  private isMath(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === MATH_ELEMENT_ID : this.api.npcElementId === MATH_ELEMENT_ID;
  }

  /**
   * Whether this sim decides what this side's attacks do. An online opponent (or a co-op ally in
   * the npc slot of an Invasion) is simulated on its own machine: here it is drawn, nothing more.
   */
  private simulates(owner: Owner): boolean {
    return owner === 'player' || (!this.api.isOnline && !this.api.isInvasion);
  }

  /** Positions online are seen from the other side, so a remote scholar's graph is mirrored too. */
  private mirrored(owner: Owner): boolean {
    return owner === 'npc' && this.api.isOnline && !this.api.isInvasion;
  }

  private targetsOf(owner: Owner): Fighter[] {
    if (owner === 'npc' && this.api.isInvasion) return [];
    const list = owner === 'player' ? this.api.enemies : this.api.player.bodies();
    return list.filter((f) => this.alive(f) && this.api.isTargetable(f));
  }

  private nearestTarget(owner: Owner, x?: number, y?: number): Fighter | null {
    const f = this.fighter(owner);
    const ox = x ?? f.x;
    const oy = y ?? f.y;
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(ox, oy, t.x, t.y);
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

  private canAct(f: Fighter, slot: 'click' | 'other'): boolean {
    const wall = Date.now();
    if (wall < f.disarmedUntil || wall < f.stunnedUntil || wall < f.chickenUntil) return false;
    if (slot !== 'click' && wall < f.silencedUntil) return false;
    return true;
  }

  private stun(f: Fighter, ms: number): void {
    if (ms <= 0) return;
    f.applyDisarm(ms);
    f.stunnedUntil = Math.max(f.stunnedUntil, Date.now() + ms);
    if (f !== this.api.player) f.earthStunnedUntil = Math.max(f.earthStunnedUntil, this.now + ms);
  }

  /** Every Math hit goes through here — and only on the sim that decides it. */
  private hit(owner: Owner, t: Fighter, dmg: number, opts?: DamageOpts): void {
    if (!this.simulates(owner)) return;
    const f = this.fighter(owner);
    t.takeDamage(Math.round(dmg), { source: f, sourceX: f.x, sourceY: f.y, ...opts });
  }

  // ── The graph ──────────────────────────────────────────────────────────────

  private rungY(owner: Owner, degree: number, x: number): number {
    const b = this.api.bounds;
    let u = (x - b.centerX) / (b.width / 2);
    if (this.mirrored(owner)) u = -u;
    const g = degree <= 0 ? FLAT_LEVEL : Math.pow(u, degree) - INTEGRAL_DROP * (degree - 1);
    return b.centerY - (b.height / 2) * CURVE_SCALE * g;
  }

  /** 0..1 through the rewrite from `morphFrom` to `degree`. */
  private morphK(owner: Owner): number {
    const k = Phaser.Math.Clamp((this.now - this.side(owner).morphAt) / MORPH_MS, 0, 1);
    return k * k * (3 - 2 * k);
  }

  /** The height of this side's graph over `x`, right now (mid-rewrite included). */
  private curveY(owner: Owner, x: number): number {
    const s = this.side(owner);
    const k = this.morphK(owner);
    const to = this.rungY(owner, s.degree, x);
    if (k >= 1) return to;
    const from = this.rungY(owner, s.morphFrom, x);
    return from + (to - from) * k;
  }

  private samples(owner: Owner, degree?: number): { x: number; y: number }[] {
    const b = this.api.bounds;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
      const x = b.left + (b.width * i) / CURVE_SAMPLES;
      const y = degree === undefined ? this.curveY(owner, x) : this.rungY(owner, degree, x);
      out.push({ x, y: Phaser.Math.Clamp(y, b.top, b.bottom) });
    }
    return out;
  }

  /** Whether `(x, y)` is in the shaded region of this side's graph: between the curve and the floor. */
  private under(owner: Owner, x: number, y: number, degree?: number): boolean {
    const cy = degree === undefined ? this.curveY(owner, x) : this.rungY(owner, degree, x);
    return y > cy;
  }

  private setDegree(owner: Owner, degree: number): void {
    const s = this.side(owner);
    s.morphFrom = s.degree;
    s.degree = degree;
    s.morphAt = this.now;
  }

  private rateActive(owner: Owner): boolean { return this.now < this.side(owner).rateUntil; }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // `reset()` runs before the new fighters exist: plain fields only on whatever is still here.
    this.endCine();
    this.sides = { player: makeSide(), npc: makeSide() };
    this.flights = [];
    this.bombs = [];
    this.exams = { player: null, npc: null };
    this.knocks.clear();
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    for (const g of [this.groundGfx, this.airGfx, this.hudGfx]) g?.destroy();
    this.groundGfx = this.airGfx = this.hudGfx = null;
    this.slateText?.destroy(); this.slateText = null;
    for (const owner of BOTH) {
      this.graphLabels[owner]?.destroy(); this.graphLabels[owner] = null;
      const t = this.examTexts[owner];
      if (t) { t.head.destroy(); t.body.destroy(); t.input.destroy(); }
      this.examTexts[owner] = null;
    }
    this.dropKeys();
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(3.3);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
    if (!this.hudGfx) this.hudGfx = scene.add.graphics().setDepth(44).setScrollFactor(0);
    if (!this.keyListener) {
      const listener = (e: KeyboardEvent): void => this.onKey(e);
      this.keyListener = listener;
      window.addEventListener('keydown', listener);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dropKeys());
    }
  }

  private dropKeys(): void {
    if (this.keyListener) window.removeEventListener('keydown', this.keyListener);
    this.keyListener = null;
  }

  private ensureAvatars(): void {
    const { scene } = this.api;
    if (this.isMath('player') && !this.playerAvatar) this.playerAvatar = new MathAvatar(scene, this.pcol);
    if (!this.isMath('player') && this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.isMath('npc') && !this.npcAvatar) this.npcAvatar = new MathAvatar(scene, this.ncol);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== MATH_ELEMENT_ID) return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;
    s.hasAim = true;
    const p = this.api.player;
    const left = pointer.leftButtonDown();
    const leftJust = left && !s.wasLeft;
    s.wasLeft = left;
    if (!this.alive(p) || this.cine) return;
    const ctx = (): CastContext => this.api.buildPlayerContext(mouseX, mouseY);

    // The volley goes on the press, never on a held button — holding would spend pillars one at a time.
    if (leftJust && s.pillars > 0 && this.canAct(p, 'click')) p.castAbility(MATH_ID.click, ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey) && s.degree < MAX_DEGREE) p.castAbility(MATH_ID.e, ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey) && !this.rateActive('player')) p.castAbility(MATH_ID.r, ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility(MATH_ID.f, ctx());
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey) && !this.exams.player) p.castAbility(MATH_ID.q, ctx());
  }

  /**
   * Digits, minus, Backspace and Enter. An exam the local human is sitting takes the keys first;
   * otherwise they go to the slate.
   */
  private onKey(e: KeyboardEvent): void {
    if (e.repeat || !this.api.scene.scene.isActive()) return;
    const exam = this.exams.npc;
    if (exam && exam.mode === 'interactive' && exam.askedAt > 0) {
      if (/^[0-9]$/.test(e.key)) { if (exam.typed.length < 9) exam.typed += e.key; }
      else if (e.key === '-') exam.typed = exam.typed.startsWith('-') ? exam.typed.slice(1) : `-${exam.typed}`;
      else if (e.key === 'Backspace') exam.typed = exam.typed.slice(0, -1);
      else if (e.key === 'Enter' && exam.typed !== '' && exam.typed !== '-') {
        this.resolveExam(exam, Number(exam.typed) === exam.problems[exam.index].answer);
      }
      return;
    }
    const s = this.sides.player;
    const p = this.api.player;
    if (!this.isMath('player') || !this.alive(p) || this.cine || !s.problem || s.pillars >= PILLAR_CAP) return;
    if (!this.canAct(p, 'click')) return;
    if (e.key === 'Backspace') { s.typed = s.typed.slice(0, -1); return; }
    if (!/^[0-9]$/.test(e.key)) return;
    s.typed += e.key;
    const want = String(s.problem.answer);
    if (s.typed === want) {
      this.solve('player');
    } else if (s.typed.length >= want.length) {
      // No penalty: the slate just wipes.
      s.typed = '';
      this.pfx.wrong(p.x, p.y - 58);
      Sfx.play('ui-denied', { volume: 0.5 });
    } else {
      Sfx.play('ui-type', { volume: 0.6 });
    }
  }

  // ── Crunch the Numbers ─────────────────────────────────────────────────────

  private solve(owner: Owner): void {
    const s = this.side(owner);
    if (s.pillars >= PILLAR_CAP) return;
    s.pillars += 1;
    s.typed = '';
    s.problem = owner === 'player' ? crunchProblem() : null;
    const i = s.pillars - 1;
    const a = s.orbit + (i / s.pillars) * TAU;
    this.fx(owner).solved(s.aimX + Math.cos(a) * ORBIT_R, s.aimY + Math.sin(a) * ORBIT_R);
    this.avatar(owner)?.solve();
    if (owner === 'player') Sfx.play('crystal-chime', { rate: 0.9 + s.pillars * 0.12, volume: 0.7 });
    this.relay(owner, `math-pil:${s.pillars}`);
  }

  /** Where pillar `i` of `n` stands in the ring right now. */
  private pillarPos(owner: Owner, i: number, n: number): { x: number; y: number } {
    const s = this.side(owner);
    const a = s.orbit + (i / n) * TAU;
    return { x: s.aimX + Math.cos(a) * ORBIT_R, y: s.aimY + Math.sin(a) * ORBIT_R };
  }

  /** The click: every pillar stops where it is and launches through `(tx, ty)`. */
  doCrunch(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.pillars <= 0) return;
    this.ensureLayers();
    // A relayed volley circles the point it was thrown through.
    if (!this.simulates(owner) || !s.hasAim) { s.aimX = tx; s.aimY = ty; s.hasAim = true; }
    const n = s.pillars;
    for (let i = 0; i < n; i++) {
      const pos = this.pillarPos(owner, i, n);
      const dx = tx - pos.x;
      const dy = ty - pos.y;
      const ang = Math.hypot(dx, dy) > 4 ? Math.atan2(dy, dx) : Math.atan2(ty - f.y, tx - f.x);
      this.flights.push({
        owner, x: pos.x, y: pos.y, ang, launchAt: this.now + PILLAR_WINDUP_MS + i * 18, launched: false,
        travelled: 0, seed: i * 3 + 1, hit: new Set(),
      });
    }
    s.pillars = 0;
    this.avatar(owner)?.play('sweep', Math.atan2(ty - f.y, tx - f.x));
    Sfx.playAt('stone-rise', f.x, { rate: 1.5, volume: owner === 'player' ? 0.7 : 0.45 });
  }

  private updateFlights(dt: number): void {
    const b = this.api.bounds;
    for (const fl of this.flights) {
      if (!fl.launched) {
        if (this.now < fl.launchAt) continue;
        fl.launched = true;
        this.fx(fl.owner).launch(fl.x, fl.y, fl.ang);
      }
      const step = PILLAR_SPEED * dt;
      const nx = fl.x + Math.cos(fl.ang) * step;
      const ny = fl.y + Math.sin(fl.ang) * step;
      for (const t of this.targetsOf(fl.owner)) {
        if (fl.hit.has(t)) continue;
        if (this.segDist(fl.x, fl.y, nx, ny, t.x, t.y) > this.bodyR(t) + PILLAR_HIT_R) continue;
        fl.hit.add(t);
        this.fx(fl.owner).pillarHit(t.x, t.y, fl.ang);
        if (this.simulates(fl.owner)) {
          this.hit(fl.owner, t, PILLAR_DMG);
          if (!t.unstoppable) {
            this.knocks.set(t, { vx: Math.cos(fl.ang) * PILLAR_KNOCK, vy: Math.sin(fl.ang) * PILLAR_KNOCK, until: this.now + PILLAR_KNOCK_MS });
          }
        }
        Sfx.playAt('stone-slam', t.x, { rate: 1.3, volume: 0.6 });
      }
      fl.x = nx;
      fl.y = ny;
      fl.travelled += step;
      if (fl.travelled >= PILLAR_RANGE || nx < b.left || nx > b.right || ny < b.top || ny > b.bottom) {
        fl.travelled = Infinity;
        this.fx(fl.owner).pillarCrumble(Phaser.Math.Clamp(nx, b.left, b.right), Phaser.Math.Clamp(ny, b.top, b.bottom));
      }
    }
    this.flights = this.flights.filter((fl) => fl.travelled !== Infinity);
  }

  private updateKnocks(): void {
    for (const [t, k] of this.knocks) {
      if (this.now >= k.until || !this.alive(t)) { this.knocks.delete(t); continue; }
      (t.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(k.vx, k.vy);
    }
  }

  private segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
    return Phaser.Math.Distance.Between(ax + dx * u, ay + dy * u, px, py);
  }

  // ── Integrate / Rate of Pain / Derivitize ──────────────────────────────────

  doIntegrate(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || s.degree >= MAX_DEGREE) return;
    this.ensureLayers();
    this.setDegree(owner, s.degree + 1);
    this.fx(owner).rewrite(this.api.bounds, true);
    this.avatar(owner)?.play('flex');
  }

  doRate(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    s.rateUntil = this.now + RATE_MS;
    s.rateTick = this.now + RATE_TICK_MS;
    this.avatar(owner)?.play('slam', Math.PI / 2);
    this.api.scene.cameras.main.shake(160, 0.004);
  }

  private updateRate(owner: Owner): void {
    const s = this.side(owner);
    if (!this.rateActive(owner) || this.now < s.rateTick) return;
    s.rateTick += RATE_TICK_MS;
    for (const t of this.targetsOf(owner)) {
      if (!this.under(owner, t.x, t.y)) continue;
      this.fx(owner).painTick(t.x, t.y);
      this.hit(owner, t, RATE_TICK_DMG[s.degree] ?? RATE_TICK_DMG[1]);
    }
  }

  doDerive(owner: Owner): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return;
    this.ensureLayers();
    const b = this.api.bounds;
    const old = this.samples(owner);
    this.fx(owner).curveShatter(old);
    for (let i = 0; i < BOMB_COUNT; i++) {
      const x = b.left + (b.width * (i + 0.5)) / BOMB_COUNT;
      const y = Phaser.Math.Clamp(this.curveY(owner, x), b.top + 20, b.bottom - 20);
      this.bombs.push({
        owner, x, y, r: BOMB_R, dmg: BOMB_DMG, start: this.now, at: this.now + BOMB_FUSE_MS + i * 28, big: true, seed: i,
      });
    }
    // Differentiating the flat line leaves nothing: the board is wiped back to y = x.
    this.setDegree(owner, s.degree > 0 ? s.degree - 1 : 1);
    this.fx(owner).rewrite(b, false);
    this.avatar(owner)?.play('clap');
  }

  private updateBombs(): void {
    const b = this.api.bounds;
    const spawned: Bomb[] = [];
    for (const bomb of this.bombs) {
      if (this.now < bomb.at) continue;
      this.fx(bomb.owner).blast(bomb.x, bomb.y, bomb.r, bomb.big);
      for (const t of this.targetsOf(bomb.owner)) {
        if (Phaser.Math.Distance.Between(bomb.x, bomb.y, t.x, t.y) <= bomb.r + this.bodyR(t) * 0.5) {
          this.hit(bomb.owner, t, bomb.dmg, { aoe: true });
        }
      }
      if (bomb.big) {
        this.api.scene.cameras.main.shake(120, 0.005);
        Sfx.playAt('explosion-medium', bomb.x, { volume: 0.5, rate: 0.9 + (bomb.seed % 3) * 0.12 });
        for (let k = 0; k < BOMBLET_COUNT; k++) {
          // Fixed scatter, so both machines of an online match see the same cluster.
          const a = bomb.seed * 2.4 + (k / BOMBLET_COUNT) * TAU;
          spawned.push({
            owner: bomb.owner,
            x: Phaser.Math.Clamp(bomb.x + Math.cos(a) * BOMBLET_THROW, b.left + 12, b.right - 12),
            y: Phaser.Math.Clamp(bomb.y + Math.sin(a) * BOMBLET_THROW, b.top + 12, b.bottom - 12),
            r: BOMBLET_R, dmg: BOMBLET_DMG, start: this.now, at: this.now + BOMBLET_FUSE_MS + k * 60, big: false, seed: bomb.seed + k,
          });
        }
      } else {
        Sfx.playAt('explosion-small', bomb.x, { volume: 0.35, rate: 1.2 });
      }
      bomb.at = Infinity;
    }
    this.bombs = this.bombs.filter((bomb) => bomb.at !== Infinity).concat(spawned);
  }

  // ── 42 ─────────────────────────────────────────────────────────────────────

  doFortyTwo(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.cine) return;
    this.ensureLayers();
    const s = this.side(owner);
    if (this.simulates(owner)) {
      s.examSeed = 1 + Math.floor(Math.random() * 0x7ffffffe);
      this.relay(owner, `math-seed:${s.examSeed}`);
    }
    this.startCine(owner);
  }

  private startCine(owner: Owner): void {
    const { scene } = this.api;
    const f = this.fighter(owner);
    const tint = this.col(owner);
    const cam = scene.cameras.main;
    const texts = CUTSCENE_EQUATIONS.map((eq, i) => scene.add.text(0, 0, eq, {
      fontSize: `${13 + (i % 4) * 3}px`, fontFamily: FONT_MONO, color: this.hex(tint(i % 3 === 0 ? MATHC.graphHot : MATHC.chalk)),
    }).setOrigin(0.5).setDepth(41).setAlpha(0));
    const title = scene.add.text(cam.scrollX + scene.scale.width / 2, cam.scrollY + scene.scale.height / 2, '42', {
      fontSize: '150px', fontFamily: FONT_DISPLAY, color: this.hex(tint(MATHC.chalk)), stroke: this.hex(tint(MATHC.ink)), strokeThickness: 12,
    }).setOrigin(0.5).setDepth(42).setAlpha(0);
    const shielded: Fighter[] = [];
    // Nobody moves and nothing lands while the board is being written.
    for (const b of this.allFighters()) {
      if (!this.alive(b)) continue;
      this.stun(b, CINE_MS);
      (b.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
      if (!b.isInvincible) { b.isInvincible = true; shielded.push(b); }
    }
    this.cine = { owner, start: this.now, board: scene.add.graphics().setDepth(40), texts, title, shielded, burst: false };
    this.avatar(owner)?.setHold('charge', -Math.PI / 2);
    Sfx.playAt('beam-charge', f.x, { rate: 0.6, volume: 1 });
  }

  private updateCine(): void {
    const c = this.cine;
    if (!c) return;
    const el = this.now - c.start;
    const f = this.fighter(c.owner);
    const cam = this.api.scene.cameras.main;
    // Not `cam.worldView`: under the supersampled renderer it is in canvas pixels, not world units.
    const v = new Phaser.Geom.Rectangle(cam.scrollX, cam.scrollY, this.api.scene.scale.width, this.api.scene.scale.height);
    const k = Phaser.Math.Clamp(el / CINE_MS, 0, 1);
    const dark = Phaser.Math.Clamp(el / 260, 0, 1) * Phaser.Math.Clamp((CINE_MS - el) / 260, 0, 1);
    const surge = Phaser.Math.Clamp((k - 0.55) / 0.3, 0, 1);
    const fx = f?.x ?? v.centerX;
    const fy = f?.y ?? v.centerY;
    c.board.clear();
    drawCineBoard(c.board, this.col(c.owner), v, fx, fy, dark, this.vizT, surge);
    // Every equation spirals in and is swallowed.
    c.texts.forEach((txt, i) => {
      const phase = (k * 2.2 + i / c.texts.length) % 1;
      const a = i * 2.399 + phase * 3.2;
      const r = (1 - phase) * (220 + (i % 5) * 44);
      txt.setPosition(fx + Math.cos(a) * r, fy + Math.sin(a) * r * 0.72);
      txt.setScale(0.35 + (1 - phase) * 0.9);
      txt.setRotation(Math.sin(a) * 0.25);
      txt.setAlpha(dark * Math.min(1, phase * 5) * Math.min(1, (1 - phase) * 3) * (k > 0.86 ? 0 : 1));
    });
    // Then the answer.
    const reveal = Phaser.Math.Clamp((k - 0.72) / 0.1, 0, 1);
    c.title.setPosition(v.centerX, v.centerY - 20);
    c.title.setAlpha(reveal * dark);
    c.title.setScale(1.6 - 0.6 * reveal + 0.04 * Math.sin(this.vizT * 22));
    if (!c.burst && k >= 0.72) {
      c.burst = true;
      cam.flash(220, 235, 255, 245);
      cam.shake(360, 0.012);
      Sfx.play('reward-big', { volume: 0.8, rate: 0.8 });
    }
    if (el >= CINE_MS) {
      const owner = c.owner;
      this.endCine();
      this.avatar(owner)?.play('raise');
      this.startExam(owner);
    }
  }

  private endCine(): void {
    const c = this.cine;
    if (!c) return;
    c.board.destroy();
    c.title.destroy();
    for (const t of c.texts) t.destroy();
    for (const f of c.shielded) if (f.active) f.isInvincible = false;
    this.avatar(c.owner)?.setHold(null);
    this.cine = null;
  }

  private startExam(owner: Owner): void {
    const s = this.side(owner);
    // The npc slot of an Invasion is an ally (or nobody): it sets no exam here.
    if (owner === 'npc' && this.api.isInvasion) return;
    let mode: ExamMode = 'roll';
    if (owner === 'npc') mode = 'interactive';
    else if (this.api.isOnline && !this.api.isInvasion) mode = 'display';
    const seed = s.examSeed || 1 + Math.floor(Math.random() * 0x7ffffffe);
    s.examSeed = 0;
    this.exams[owner] = {
      owner, mode, problems: examProblems(seed), index: 0, askedAt: 0, nextAt: this.now + 250, typed: '',
      rollAt: 0, rollPass: false, fails: 0, results: Array.from({ length: EXAM_LENGTH }, () => null),
      flashAt: -9999, flashPass: false,
    };
  }

  private updateExam(owner: Owner): void {
    const ex = this.exams[owner];
    if (!ex) return;
    // The scholar who set it has fallen, or there is nobody left to sit it: papers down.
    if (!this.alive(this.fighter(owner)) || (ex.mode !== 'display' && this.targetsOf(owner).length === 0)) {
      this.exams[owner] = null;
      return;
    }
    if (ex.askedAt === 0) {
      if (this.now < ex.nextAt) return;
      if (ex.index >= EXAM_LENGTH) { this.exams[owner] = null; return; }
      ex.askedAt = this.now;
      ex.typed = '';
      if (ex.mode === 'roll') {
        ex.rollAt = this.now + EXAM_ROLL_MS * (0.4 + Math.random() * 0.6);
        ex.rollPass = Math.random() < EXAM_BOT_PASS[ex.index];
      }
      if (ex.mode === 'interactive') Sfx.play('countdown-tick', { volume: 0.7 });
      return;
    }
    const el = this.now - ex.askedAt;
    if (ex.mode === 'roll') {
      if (this.now >= ex.rollAt) this.resolveExam(ex, ex.rollPass);
    } else if (ex.mode === 'interactive') {
      if (el >= EXAM_MS) this.resolveExam(ex, false);
    } else if (el >= EXAM_MS + EXAM_NET_GRACE_MS) {
      // No word from the other machine: an unanswered paper is a failed one.
      this.resolveExam(ex, false);
    }
  }

  private resolveExam(ex: Exam, pass: boolean): void {
    if (ex.askedAt === 0 || ex.index >= EXAM_LENGTH) return;
    const owner = ex.owner;
    const weight = ex.fails;
    ex.results[ex.index] = pass;
    ex.flashAt = this.now;
    ex.flashPass = pass;
    // Sat on this machine for a caster on another: they deal the damage, we send the verdict.
    if (ex.mode === 'interactive' && this.api.isOnline) this.api.broadcast(`math-ans:${ex.index}:${pass ? 1 : 0}`);
    const victims = this.targetsOf(owner);
    for (const t of victims) {
      if (pass) { this.fx(owner).passTick(t.x, t.y - 34); continue; }
      this.fx(owner).failStrike(t.x, t.y, weight);
      this.hit(owner, t, EXAM_FAIL_BASE + EXAM_FAIL_STEP * weight);
    }
    if (!pass) {
      ex.fails += 1;
      this.api.scene.cameras.main.shake(140 + weight * 40, 0.004 + weight * 0.002);
      Sfx.play(ex.mode === 'interactive' ? 'ui-denied' : 'hit-heavy', { volume: 0.8 });
    } else if (ex.mode === 'interactive') {
      Sfx.play('ability-ready', { volume: 0.7 });
    }
    ex.index += 1;
    ex.askedAt = 0;
    ex.nextAt = this.now + EXAM_GAP_MS;
  }

  // ── Online ─────────────────────────────────────────────────────────────────

  /** A `math-*` pseudo-cast from the other machine. */
  replayNet(id: string): void {
    const parts = id.split(':');
    const n = (i: number): number => { const v = Number(parts[i]); return Number.isFinite(v) ? v : 0; };
    const s = this.sides.npc;
    switch (parts[0]) {
      case 'math-pil': {
        const want = Phaser.Math.Clamp(n(1), 0, PILLAR_CAP);
        if (want > s.pillars) {
          this.ensureLayers();
          const a = s.orbit + ((want - 1) / want) * TAU;
          this.nfx.solved(s.aimX + Math.cos(a) * ORBIT_R, s.aimY + Math.sin(a) * ORBIT_R);
          this.npcAvatar?.solve();
        }
        s.pillars = want;
        break;
      }
      case 'math-cur':
        s.aimX = this.api.worldW - n(1);
        s.aimY = n(2);
        s.hasAim = true;
        break;
      case 'math-seed':
        s.examSeed = n(1);
        break;
      case 'math-ans': {
        // The opponent's verdict on a problem of *our* exam.
        const ex = this.exams.player;
        if (ex && ex.mode === 'display' && ex.askedAt > 0 && n(1) === ex.index) this.resolveExam(ex, n(2) === 1);
        break;
      }
    }
  }

  // ── Bot ────────────────────────────────────────────────────────────────────

  /** A bot does its sums on a clock, and its "cursor" creeps after whoever it is fighting. */
  private updateBot(dt: number): void {
    if (!this.isMath('npc') || !this.simulates('npc')) return;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f)) return;
    const t = this.nearestTarget('npc');
    if (t) {
      if (!s.hasAim) { s.aimX = f.x; s.aimY = f.y; s.hasAim = true; }
      const k = Math.min(1, BOT_CURSOR_RATE * dt);
      s.aimX += (t.x - s.aimX) * k;
      s.aimY += (t.y - s.aimY) * k;
    }
    if (this.cine || !this.canAct(f, 'click')) return;
    if (s.nextSolveAt === 0) s.nextSolveAt = this.now + BOT_SOLVE_MS;
    if (this.now >= s.nextSolveAt) {
      s.nextSolveAt = this.now + BOT_SOLVE_MS + BOT_SOLVE_SLACK_MS * Phaser.Math.Clamp(this.api.npcSlack, 0, 1) * 2;
      if (s.pillars < PILLAR_CAP) this.solve('npc');
    }
  }

  // Opportunities the kit publishes for the bot (see the bot synergy contract). All side-effect-free.

  /** Pillars the bot has circling. */
  npcMathPillars(): number { return this.sides.npc.pillars; }

  /** The volley is worth throwing: the ring has closed on the target, so every pillar crosses them. */
  npcMathVolleyAim(): { x: number; y: number } | null {
    const s = this.sides.npc;
    if (s.pillars <= 0 || !s.hasAim) return null;
    const t = this.nearestTarget('npc', s.aimX, s.aimY);
    if (!t) return null;
    const d = Phaser.Math.Distance.Between(s.aimX, s.aimY, t.x, t.y);
    // A full ring fires on a looser read; one or two pillars wait for a clean one.
    return d <= (s.pillars >= PILLAR_CAP ? 70 : s.pillars >= 3 ? 44 : 26) ? { x: s.aimX, y: s.aimY } : null;
  }

  /** Rate of Pain would burn the target right now (they stand well under the graph). */
  npcMathRateCovers(): boolean {
    const t = this.nearestTarget('npc');
    return !!t && this.under('npc', t.x, t.y - 26);
  }

  npcMathRateActive(): boolean { return this.rateActive('npc'); }

  /** Integrating would move the graph over the target: E sets up (or rescues) Rate of Pain. */
  npcMathIntegrateCovers(): boolean {
    const s = this.sides.npc;
    const t = this.nearestTarget('npc');
    if (!t || s.degree >= MAX_DEGREE) return false;
    return !this.under('npc', t.x, t.y) && this.under('npc', t.x, t.y - 26, s.degree + 1);
  }

  /** The target is standing on the graph: Derivitize's bombs land on them. */
  npcMathDeriveHits(): boolean {
    const t = this.nearestTarget('npc');
    if (!t) return false;
    const b = this.api.bounds;
    const cy = Phaser.Math.Clamp(this.curveY('npc', t.x), b.top + 20, b.bottom - 20);
    if (Math.abs(cy - t.y) <= BOMB_R * 0.7) return true;
    // A steep curve passes close beside them without being close above or below.
    return this.samples('npc').some((p) => Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= BOMB_R * 0.7);
  }

  /** Differentiating would move the graph over a target that has stepped out of Rate of Pain. */
  npcMathDeriveCovers(): boolean {
    const s = this.sides.npc;
    const t = this.nearestTarget('npc');
    if (!t) return false;
    const next = s.degree > 0 ? s.degree - 1 : 1;
    return !this.under('npc', t.x, t.y) && this.under('npc', t.x, t.y - 26, next);
  }

  npcMathBusy(): boolean { return !!this.cine; }
  npcMathExamRunning(): boolean { return !!this.exams.npc; }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.isMath('player');
    const npcIs = this.isMath('npc');
    const anyState = this.flights.length || this.bombs.length || this.exams.player || this.exams.npc
      || this.cine || this.knocks.size || this.playerAvatar || this.rateActive('player') || this.rateActive('npc');
    if (!playerIs && !npcIs && !anyState) return;
    this.ensureLayers();
    this.ensureAvatars();
    const dt = delta / 1000;
    this.vizT += dt;

    for (const owner of BOTH) {
      const s = this.side(owner);
      s.orbit += ORBIT_SPEED * dt;
      if (!this.isMath(owner) || !this.alive(this.fighter(owner))) { s.pillars = 0; s.problem = null; continue; }
      if (owner === 'player' && !s.problem) s.problem = crunchProblem();
      this.updateRate(owner);
    }
    // The ring's cursor, for the peer drawing our pillars.
    const ps = this.sides.player;
    if (playerIs && this.api.isOnline && ps.pillars > 0 && this.now - ps.lastCursorRelay >= CURSOR_RELAY_MS) {
      ps.lastCursorRelay = this.now;
      this.api.broadcast(`math-cur:${Math.round(ps.aimX)}:${Math.round(ps.aimY)}`);
    }
    this.updateBot(dt);
    this.updateFlights(dt);
    this.updateKnocks();
    this.updateBombs();
    this.updateCine();
    for (const owner of BOTH) this.updateExam(owner);
    this.paint();
    this.paintHud();
    this.updateAvatars(delta);
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paint(): void {
    const ground = this.groundGfx!;
    const air = this.airGfx!;
    ground.clear();
    air.clear();
    const b = this.api.bounds;
    const t = this.vizT;
    let axes = false;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const show = this.isMath(owner) && this.alive(this.fighter(owner));
      const label = this.graphLabels[owner];
      if (!show && !this.rateActive(owner)) { label?.setVisible(false); continue; }
      const tint = this.col(owner);
      if (!axes) { drawAxes(ground, tint, b, b.centerX, b.centerY, 0.8); axes = true; }
      const pts = this.samples(owner);
      const rewriting = 1 - this.morphK(owner);
      if (this.rateActive(owner)) {
        const left = s.rateUntil - this.now;
        const fade = Math.min(1, left / 300) * Math.min(1, (RATE_MS - left) / 180);
        drawPainRegion(ground, tint, pts, b.bottom, t, fade);
      }
      // The opponent's graph is drawn dimmer, so two boards in a mirror match stay readable.
      drawGraph(ground, tint, pts, t, owner === 'player' ? 0.85 : 0.6, rewriting);
      this.paintGraphLabel(owner, pts);
    }
    // Fuses.
    for (const bomb of this.bombs) {
      const k = Phaser.Math.Clamp((this.now - bomb.start) / Math.max(1, bomb.at - bomb.start), 0, 1);
      drawFuse(ground, this.col(bomb.owner), bomb.x, bomb.y, bomb.r, k, t + bomb.seed);
    }
    // The ring of pillars round each cursor.
    for (const owner of BOTH) {
      const s = this.side(owner);
      if (s.pillars <= 0 || !s.hasAim) continue;
      const tint = this.col(owner);
      air.lineStyle(1, tint(MATHC.graph), 0.3);
      air.strokeCircle(s.aimX, s.aimY, ORBIT_R);
      for (let i = 0; i < s.pillars; i++) {
        const p = this.pillarPos(owner, i, s.pillars);
        drawPillar(air, tint, p.x, p.y + 20, i * 3 + 1, t, 0.95, s.pillars >= PILLAR_CAP ? 0.6 : 0);
      }
    }
    // Pillars in flight: frozen and heating through the wind-up, then lying along their line.
    for (const fl of this.flights) {
      const tint = this.col(fl.owner);
      if (!fl.launched) {
        const k = 1 - Phaser.Math.Clamp((fl.launchAt - this.now) / PILLAR_WINDUP_MS, 0, 1);
        drawPillar(air, tint, fl.x, fl.y + 20, fl.seed, t, 1, k);
      } else {
        air.lineStyle(10, tint(MATHC.graph), 0.25);
        air.lineBetween(fl.x - Math.cos(fl.ang) * 60, fl.y - Math.sin(fl.ang) * 60, fl.x, fl.y);
        drawPillar(air, tint, fl.x - Math.cos(fl.ang) * 23, fl.y - Math.sin(fl.ang) * 23, fl.seed, t, 1, 1, fl.ang);
      }
    }
    this.paintSlate(air);
  }

  private paintGraphLabel(owner: Owner, pts: { x: number; y: number }[]): void {
    const s = this.side(owner);
    const b = this.api.bounds;
    let label = this.graphLabels[owner];
    if (!label) {
      label = this.api.scene.add.text(0, 0, '', { fontSize: '13px', fontFamily: FONT_MONO, color: this.hex(this.col(owner)(MATHC.graphHot)) })
        .setDepth(3.4).setAlpha(0.85);
      this.graphLabels[owner] = label;
    }
    // Pinned to the curve near one end — the far end for the opponent, so two labels never stack.
    const i = Math.round(pts.length * (owner === 'player' ? 0.86 : 0.14));
    const p = pts[Phaser.Math.Clamp(i, 0, pts.length - 1)];
    label.setText(GRAPH_LABELS[s.degree] ?? '');
    label.setOrigin(owner === 'player' ? 1 : 0, 1);
    label.setPosition(Phaser.Math.Clamp(p.x, b.left + 8, b.right - 8), Phaser.Math.Clamp(p.y - 8, b.top + 22, b.bottom - 6));
    label.setVisible(true);
  }

  /** The slate over the local scholar's head: the sum, and what has been typed. */
  private paintSlate(air: Phaser.GameObjects.Graphics): void {
    const s = this.sides.player;
    const p = this.api.player;
    const show = this.isMath('player') && this.alive(p) && !!s.problem && !this.cine;
    if (!this.slateText) {
      this.slateText = this.api.scene.add.text(0, 0, '', { fontSize: '15px', fontFamily: FONT_MONO, color: this.hex(this.pcol(MATHC.chalk)) })
        .setOrigin(0.5).setDepth(9.1);
    }
    this.slateText.setVisible(show);
    if (!show || !s.problem) return;
    const full = s.pillars >= PILLAR_CAP;
    const sitting = !!this.exams.npc && this.exams.npc.mode === 'interactive';
    this.slateText.setText(full ? 'FULL — CLICK' : `${s.problem.text} = ${s.typed || '?'}`);
    const x = p.x;
    const y = p.y - 58;
    this.slateText.setPosition(x, y);
    // An exam takes the keys: the slate goes grey so it is obvious where typing lands.
    this.slateText.setAlpha(sitting ? 0.35 : full ? 0.7 : 1);
    const w = Math.max(74, this.slateText.width + 18);
    const a = sitting ? 0.4 : 0.92;
    air.fillStyle(this.pcol(MATHC.ink), a * 0.8);
    air.fillRoundedRect(x - w / 2 - 2, y - 13, w + 4, 26, 5);
    air.fillStyle(this.pcol(MATHC.board), a);
    air.fillRoundedRect(x - w / 2, y - 11, w, 22, 4);
    air.lineStyle(1.5, this.pcol(full ? MATHC.gold : MATHC.slateLit), a);
    air.strokeRoundedRect(x - w / 2, y - 11, w, 22, 4);
    // One pip per pillar banked.
    for (let i = 0; i < PILLAR_CAP; i++) {
      air.fillStyle(this.pcol(i < s.pillars ? MATHC.graph : MATHC.slate), a);
      air.fillRect(x - 22 + i * 9.5, y + 13, 7, 3);
    }
  }

  private paintHud(): void {
    const hud = this.hudGfx!;
    hud.clear();
    const w = this.api.scene.scale.width;
    let row = 0;
    // The exam the local human sits comes first and largest.
    for (const owner of ['npc', 'player'] as Owner[]) {
      const ex = this.exams[owner];
      let texts = this.examTexts[owner];
      if (!ex) {
        if (texts) { texts.head.setVisible(false); texts.body.setVisible(false); texts.input.setVisible(false); }
        continue;
      }
      if (!texts) {
        const { scene } = this.api;
        const mk = (size: number, font: string): Phaser.GameObjects.Text =>
          scene.add.text(0, 0, '', { fontSize: `${size}px`, fontFamily: font, color: '#ffffff', align: 'center' })
            .setOrigin(0.5).setDepth(45).setScrollFactor(0);
        texts = { head: mk(11, FONT_DISPLAY), body: mk(20, FONT_MONO), input: mk(17, FONT_MONO) };
        this.examTexts[owner] = texts;
      }
      const tint = this.col(owner);
      const mine = ex.mode === 'interactive';
      const pw = mine ? 470 : 330;
      const ph = mine ? 92 : 58;
      const x = w / 2;
      const y = 74 + row;
      row += ph + 8;
      const flash = Phaser.Math.Clamp(1 - (this.now - ex.flashAt) / 500, 0, 1);
      const edge = flash > 0 ? (ex.flashPass ? MATHC.graph : MATHC.pain) : mine ? MATHC.chalk : MATHC.slateLit;
      hud.fillStyle(tint(MATHC.ink), 0.82);
      hud.fillRoundedRect(x - pw / 2 - 3, y - 3, pw + 6, ph + 6, 8);
      hud.fillStyle(tint(MATHC.board), 0.95);
      hud.fillRoundedRect(x - pw / 2, y, pw, ph, 6);
      if (flash > 0) {
        hud.fillStyle(tint(ex.flashPass ? MATHC.graph : MATHC.pain), 0.35 * flash);
        hud.fillRoundedRect(x - pw / 2, y, pw, ph, 6);
      }
      hud.lineStyle(2, tint(edge), 0.9);
      hud.strokeRoundedRect(x - pw / 2, y, pw, ph, 6);
      // Five pips: passed, failed, to come.
      for (let i = 0; i < EXAM_LENGTH; i++) {
        const r = ex.results[i];
        const px = x - (EXAM_LENGTH - 1) * 9 + i * 18;
        hud.fillStyle(tint(r === null ? MATHC.slate : r ? MATHC.graph : MATHC.pain), 1);
        hud.fillCircle(px, y + ph - 9, i === ex.index && ex.askedAt > 0 ? 5 : 3.5);
      }
      const asking = ex.askedAt > 0 && ex.index < EXAM_LENGTH;
      const span = ex.mode === 'roll' ? Math.max(1, ex.rollAt - ex.askedAt) : EXAM_MS;
      const left = asking ? Phaser.Math.Clamp(1 - (this.now - ex.askedAt) / span, 0, 1) : 0;
      if (asking && ex.mode !== 'roll') {
        hud.fillStyle(tint(MATHC.slate), 1);
        hud.fillRect(x - pw / 2 + 10, y + 4, pw - 20, 4);
        hud.fillStyle(tint(left < 0.3 ? MATHC.pain : MATHC.gold), 1);
        hud.fillRect(x - pw / 2 + 10, y + 4, (pw - 20) * left, 4);
      }
      const n = Math.min(ex.index + 1, EXAM_LENGTH);
      const who = mine ? 'ANSWER — TYPE IT, THEN ENTER' : ex.mode === 'display' ? 'THE ENEMY IS SOLVING' : 'THE ENEMY IS SOLVING';
      texts.head.setText(`PROBLEM ${n} / ${EXAM_LENGTH}   ·   ${who}`);
      texts.head.setColor(this.hex(tint(MATHC.chalkDim)));
      texts.head.setPosition(x, y + 17).setVisible(true);
      const problem = ex.problems[Math.min(ex.index, EXAM_LENGTH - 1)];
      texts.body.setText(asking ? `${problem.text} = ?` : flash > 0 ? (ex.flashPass ? 'CORRECT' : 'WRONG') : '…');
      texts.body.setFontSize(mine ? (problem.text.length > 30 ? 16 : 21) : 14);
      texts.body.setColor(this.hex(tint(!asking && flash > 0 && !ex.flashPass ? MATHC.pain : MATHC.chalk)));
      texts.body.setPosition(x, y + (mine ? 40 : 34)).setVisible(true);
      texts.input.setVisible(mine);
      if (mine) {
        const caret = Math.sin(this.vizT * 9) > 0 ? '_' : ' ';
        texts.input.setText(asking ? `> ${ex.typed.replace('-', '−')}${caret}` : '');
        texts.input.setColor(this.hex(tint(MATHC.gold)));
        texts.input.setPosition(x, y + 64);
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
      let ax = s.aimX;
      let ay = s.aimY;
      if (owner === 'npc') {
        const t = this.nearestTarget('npc') ?? this.api.player;
        if (t) { ax = t.x; ay = t.y; }
      }
      av.setFacing(Math.atan2(ay - f.y, ax - f.x));
      av.setStock(s.pillars / PILLAR_CAP);
      av.setIntensity(this.rateActive(owner) ? 1.4 : 1);
      av.setMastered(false);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }
}
