import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import { chessPiece, crystalBall, eye, spiralDisc, strokeText, type PieceKind } from './art';
import {
  CANDLE, CARD_RED, CRYSTAL, CRYSTAL_DEEP, CRYSTAL_LIT, EBONY, EBONY_LIT, GAMBIT, GAMBIT_DARK, GAMBIT_LIT, GILT,
  GILT_DARK, GILT_LIT, IVORY, IVORY_DARK, LAMP_GREEN, MIND, MIND_DARK, MIND_LIT, VELVET, VELVET_DARK, WOOD, WOOD_DARK,
  WOOD_LIT,
} from './palette';
import { clamp, dist, newMotion, track } from './util';

/**
 * Prince Gambit, the Move Ahead — the Croupier-King's third lucky child, governor of the Mind
 * Court.
 *
 * Gambit was the cleverest child in the House, and Lucan taught him that a clever man never has
 * to gamble, because he already knows. So Gambit reads people. He reads the gamblers at the
 * Exchange, the readers who read them, and his father, whom he has never once beaten at chess.
 *
 * • **Foresight** (orbiting): he reads you — every shot goes where you are *going*, shown first
 *   as a faint arc; ghosts of you a moment from now are marked on the floor and burst in turn; a
 *   third eye opens on the wall and stares through the place you are about to be. Change course.
 * • **Checkmate** (anchored, the gold tint): the floor becomes a chessboard and his pieces move by
 *   the rules — rooks sweep whole ranks and files, bishops the diagonals, a knight leaps in L's
 *   threatening its eight squares, and a rank of pawns marches on you striking diagonally. A
 *   pawn never captures straight ahead: stand in front of one.
 * • **Sacrifice** (hard, blinking, the void tint): he topples his own reserve pieces — each one
 *   bursts in a ring — and every sacrifice doubles the threat of his next move. But a man who
 *   gives up his pieces leaves himself open: for a few seconds after, he takes half again.
 */

const TOP = 96;
const SQ = 60;
const COLS = 16;
const ROWS = 9;
const Y0 = 100;

// ── Shared state ─────────────────────────────────────────────────────

/** The phase the rig last drew, read by every move (the board shows from Checkmate on). */
let phase = 0;
/** The next move's threat is doubled: set by Sacrifice, spent by the next piece. */
let doubled = false;
/** Gambit's guard is down after a sacrifice until this time. */
let exposedUntil = 0;
/** Where the player is heading: the read. */
const motion = newMotion();
let trackedAt = -1;

function read(tk: BossToolkit, time: number, dt: number): void {
  if (time === trackedAt) return;
  trackedAt = time;
  track(motion, tk.player.x, tk.player.y, dt);
}

/** Where the player will be in `lead` seconds, at their current heading (clamped to the arena). */
function foresee(tk: BossToolkit, lead: number): Pt {
  const p = tk.player;
  let vx = motion.vx, vy = motion.vy;
  const sp = Math.hypot(vx, vy);
  if (sp > 240) { vx *= 240 / sp; vy *= 240 / sp; }
  return { x: clamp(p.x + vx * lead, 50, tk.W - 50), y: clamp(p.y + vy * lead, TOP + 40, tk.H - 40) };
}

function spendDouble(): boolean {
  const d = doubled;
  doubled = false;
  return d;
}

// ── The board ────────────────────────────────────────────────────────

const colOf = (x: number) => clamp(Math.floor(x / SQ), 0, COLS - 1);
const rowOf = (y: number) => clamp(Math.floor((y - Y0) / SQ), 0, ROWS - 1);
const cx = (c: number) => c * SQ + SQ / 2;
const cy = (r: number) => Y0 + r * SQ + SQ / 2;
const onBoard = (c: number, r: number) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
/** True if (x, y) is inside square (c, r) — with a little give so the edge of a body counts. */
const inSquare = (x: number, y: number, c: number, r: number, give = 8) =>
  x > c * SQ - give && x < (c + 1) * SQ + give && y > Y0 + r * SQ - give && y < Y0 + (r + 1) * SQ + give;

function drawBoard(g: Phaser.GameObjects.Graphics, a: number): void {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = (r + c) % 2;
      g.fillStyle(k ? EBONY : IVORY, a * (k ? 0.5 : 0.32));
      g.fillRect(c * SQ, Y0 + r * SQ, SQ, Math.min(SQ, 640 - (Y0 + r * SQ)));
    }
  }
  g.lineStyle(1, GILT_DARK, a * 0.5);
  for (let c = 0; c <= COLS; c++) g.lineBetween(c * SQ, Y0, c * SQ, 640);
  for (let r = 0; r <= ROWS; r++) g.lineBetween(0, Y0 + r * SQ, 960, Y0 + r * SQ);
}

/** A threatened square: a red wash and four corner brackets that close in as `k` → 1. */
function threatSquare(g: Phaser.GameObjects.Graphics, c: number, r: number, k: number, color = CARD_RED): void {
  const x = c * SQ, y = Y0 + r * SQ;
  g.fillStyle(color, 0.12 + k * 0.3); g.fillRect(x + 2, y + 2, SQ - 4, SQ - 4);
  const m = 4 + (1 - k) * 10, l = 12;
  g.lineStyle(2.5, lit(color, 0.3), 0.5 + k * 0.5);
  for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as [number, number][]) {
    const px = x + (sx ? SQ - m : m), py = y + (sy ? SQ - m : m);
    const dx = sx ? -1 : 1, dy = sy ? -1 : 1;
    g.lineBetween(px, py, px + dx * l, py); g.lineBetween(px, py, px, py + dy * l);
  }
}

// ── Signature: Foreseen ──────────────────────────────────────────────
// Two volleys, each aimed where you will be: a faint arc runs from him to the read point first,
// then three bolts follow it. Keep going the same way and they meet you; turn and they miss.

interface Volley { showAt: number; fireAt: number; aim: Pt | null; fired: boolean }

const foreseen = (tk: BossToolkit): SignatureMove => {
  let volleys: Volley[] = [];
  const LEAD = 0.85;
  return {
    durationMs: 2100,
    windupMs: 550,
    gesture: 'point',
    tell: 'FORESEEN',
    cast(time) {
      const warn = tk.warn(650);
      volleys = [0, 1].map((i) => ({ showAt: time + i * 750, fireAt: time + i * 750 + warn, aim: null, fired: false }));
      tk.sfx('crystal-chime');
    },
    update(time, dt) {
      read(tk, time, dt);
      for (const v of volleys) {
        if (!v.aim && time >= v.showAt) v.aim = foresee(tk, LEAD + (v.fireAt - v.showAt) / 1000 * 0.5);
        if (v.aim && !v.fired && time >= v.fireAt) {
          v.fired = true;
          const a = Math.atan2(v.aim.y - tk.bossY, v.aim.x - tk.bossX);
          for (const k of [-1, 0, 1]) tk.spawnBullet({ x: tk.bossX, y: tk.bossY, angle: a + k * 0.11, speed: 300, damage: 9, r: 6, lifeMs: 3500, color: MIND });
          tk.sfx('zap');
        }
      }
      volleys = volleys.filter((v) => !v.fired || time < v.fireAt + 300);
    },
    drawGround(g, time) {
      for (const v of volleys) {
        if (!v.aim || v.fired) continue;
        const k = clamp((time - v.showAt) / Math.max(1, v.fireAt - v.showAt), 0, 1);
        // The arc: a bowed line of beads from him to the read point, filling in.
        const mx = (tk.bossX + v.aim.x) / 2, my = (tk.bossY + v.aim.y) / 2 - 60;
        const n = 18;
        for (let i = 0; i <= n * k; i++) {
          const t = i / n;
          const x = (1 - t) * (1 - t) * tk.bossX + 2 * (1 - t) * t * mx + t * t * v.aim.x;
          const y = (1 - t) * (1 - t) * tk.bossY + 2 * (1 - t) * t * my + t * t * v.aim.y;
          g.fillStyle(MIND_LIT, 0.25 + k * 0.4); g.fillCircle(x, y, 2.2);
        }
        g.lineStyle(2, MIND, 0.3 + k * 0.5); g.strokeCircle(v.aim.x, v.aim.y, 26 - k * 10);
        g.lineBetween(v.aim.x - 8, v.aim.y, v.aim.x + 8, v.aim.y); g.lineBetween(v.aim.x, v.aim.y - 8, v.aim.x, v.aim.y + 8);
      }
    },
    onPhaseEnd() { volleys = []; },
  };
};

// ── Signature: Premonition ───────────────────────────────────────────
// Four ghosts of you are set down along the way you are walking, a half-second apart, and burst
// in order. Standing still puts them round you instead, so he reads you either way.

interface Ghost { x: number; y: number; at: number; fireAt: number }

const premonition = (tk: BossToolkit): SignatureMove => {
  let ghosts: Ghost[] = [];
  return {
    durationMs: 2300,
    windupMs: 500,
    gesture: 'raise',
    tell: 'PREMONITION',
    cast(time) {
      ghosts = [];
      const sp = Math.hypot(motion.vx, motion.vy);
      const p = tk.player;
      for (let i = 0; i < (tk.hard ? 5 : 4); i++) {
        let pt: Pt;
        if (sp > 50) pt = foresee(tk, 0.5 + i * 0.5);
        else {
          const a = tk.angleToPlayer() + (i - 1.5) * 0.9;
          pt = { x: clamp(p.x + Math.cos(a) * 70, 50, tk.W - 50), y: clamp(p.y + Math.sin(a) * 70, TOP + 40, tk.H - 40) };
        }
        const warnMs = tk.warn(750 + i * 380);
        tk.spawnZone({ x: pt.x, y: pt.y, radius: 50, warnMs, damage: 10 });
        ghosts.push({ x: pt.x, y: pt.y, at: time, fireAt: time + warnMs });
      }
      tk.sfx('hush');
    },
    update(time, dt) {
      read(tk, time, dt);
      ghosts = ghosts.filter((gh) => time < gh.fireAt + 200);
    },
    drawAir(g, time) {
      // Each ghost: a pale figure of the player, the way a reader sees you before you arrive.
      for (const gh of ghosts) {
        const k = clamp((time - gh.at) / Math.max(1, gh.fireAt - gh.at), 0, 1);
        const a = 0.15 + k * 0.4;
        g.fillStyle(MIND_LIT, a); g.fillEllipse(gh.x, gh.y - 6, 26, 30); g.fillCircle(gh.x, gh.y - 28, 9);
        g.lineStyle(1.5, 0xffffff, a); g.strokeEllipse(gh.x, gh.y - 6, 26, 30);
        for (const s of [-1, 1]) { g.fillStyle(MIND, a); g.fillCircle(gh.x + s * 16, gh.y - 6, 5); }
      }
    },
    onPhaseEnd() { ghosts = []; },
  };
};

// ── Signature: Second Sight ──────────────────────────────────────────
// Three great eyes open on the walls, one after another. Each stares through the place you are
// about to be — its gaze drawn as a widening line — and then the stare burns along it.

interface Stare { x: number; y: number; openAt: number; aimed: boolean; fireAt: number; angle: number }

const secondSight = (tk: BossToolkit): SignatureMove => {
  let eyes: Stare[] = [];
  const spots: Pt[] = [{ x: 40, y: 200 }, { x: 920, y: 200 }, { x: 40, y: 520 }, { x: 920, y: 520 }, { x: 300, y: 112 }, { x: 660, y: 112 }];
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'flex',
    tell: 'SECOND SIGHT',
    cast(time) {
      const pool = [...spots].sort(() => Math.random() - 0.5).slice(0, tk.hard ? 4 : 3);
      eyes = pool.map((s, i) => ({ x: s.x, y: s.y, openAt: time + i * 480, aimed: false, fireAt: 0, angle: 0 }));
      tk.sfx('beam-charge');
    },
    update(time, dt) {
      read(tk, time, dt);
      for (const e of eyes) {
        if (e.aimed || time < e.openAt) continue;
        e.aimed = true;
        const t = foresee(tk, 0.8);
        e.angle = Math.atan2(t.y - e.y, t.x - e.x);
        const warnMs = tk.warn(900);
        e.fireAt = time + warnMs;
        tk.spawnLane({ x: e.x, y: e.y, angle: e.angle, halfW: 22, warnMs, damage: 11 });
      }
      eyes = eyes.filter((e) => !e.aimed || time < e.fireAt + 500);
    },
    drawAir(g, time) {
      for (const e of eyes) {
        if (time < e.openAt) continue;
        const open = clamp((time - e.openAt) / 300, 0, 1);
        glow(g, e.x, e.y, 40, MIND, 0.06, 3);
        g.fillStyle(VELVET_DARK, 1); g.fillEllipse(e.x, e.y, 56, 34);
        eye(g, e.x, e.y, 22, GILT, MIND, 1, open);
        if (e.aimed && time < e.fireAt) {
          // The pupil turns to the read point.
          g.fillStyle(0xffffff, 0.8); g.fillCircle(e.x + Math.cos(e.angle) * 6, e.y + Math.sin(e.angle) * 4, 3);
        }
      }
    },
    onPhaseEnd() { eyes = []; },
  };
};

// ── Signature: Rook ──────────────────────────────────────────────────
// Rooks stand at the ends of your rank and your file; every square along both lights up, and
// then the rooks sweep them. Doubled, the neighbouring rank and file go too. This move also
// draws the board for the whole of Checkmate and Sacrifice.

interface RookRun { horiz: boolean; line: number; warnAt: number; fireAt: number; fromEnd: boolean }

const rook = (tk: BossToolkit): SignatureMove => {
  let runs: RookRun[] = [];
  return {
    durationMs: 2000,
    windupMs: 500,
    gesture: 'slam',
    tell: 'ROOK',
    cast(time) {
      const p = tk.player;
      const c = colOf(p.x), r = rowOf(p.y);
      const two = spendDouble();
      const warnMs = tk.warn(1100);
      const rows = two ? [r, r + (r < ROWS - 1 ? 1 : -1)] : [r];
      const cols = two ? [c, c + (c < COLS - 1 ? 1 : -1)] : [c];
      runs = [];
      for (const rr of rows) {
        runs.push({ horiz: true, line: rr, warnAt: time, fireAt: time + warnMs, fromEnd: p.x < 480 });
        tk.spawnLane({ x: 480, y: cy(rr), angle: 0, halfW: 22, warnMs, damage: 11 });
      }
      for (const cc of cols) {
        runs.push({ horiz: false, line: cc, warnAt: time, fireAt: time + warnMs + 220, fromEnd: p.y < 370 });
        tk.spawnLane({ x: cx(cc), y: 370, angle: Math.PI / 2, halfW: 22, warnMs: warnMs + 220, damage: 11 });
      }
      tk.sfx('stone-slam');
    },
    update(time, dt) {
      read(tk, time, dt);
      runs = runs.filter((rr) => time < rr.fireAt + 600);
    },
    drawGround(g, time) {
      if (phase >= 1) drawBoard(g, 1);
      for (const rr of runs) {
        const k = clamp((time - rr.warnAt) / Math.max(1, rr.fireAt - rr.warnAt), 0, 1);
        if (time >= rr.fireAt) continue;
        const n = rr.horiz ? COLS : ROWS;
        for (let i = 0; i < n; i++) {
          // The squares light from the rook's end toward the far one.
          const j = rr.fromEnd ? n - 1 - i : i;
          if (k * n * 1.4 < i) continue;
          if (rr.horiz) threatSquare(g, j, rr.line, k); else threatSquare(g, rr.line, j, k);
        }
      }
    },
    drawAir(g, time) {
      for (const rr of runs) {
        // The rook: waiting at its end, then sliding the length of its line.
        const n = rr.horiz ? COLS : ROWS;
        const slide = clamp((time - rr.fireAt) / 400, 0, 1);
        const i = rr.fromEnd ? (n - 1) * (1 - slide) : (n - 1) * slide;
        const x = rr.horiz ? cx(0) + i * SQ : cx(rr.line);
        const y = rr.horiz ? cy(rr.line) : cy(0) + i * SQ;
        chessPiece(g, x, y + 18, 'rook', false, 1.05);
      }
    },
    onPhaseEnd() { runs = []; },
  };
};

// ── Signature: Bishop ────────────────────────────────────────────────
// Bishops at the board's edge along both diagonals through your square; the diagonals light,
// then burn. Doubled, a second cross two squares over.

interface Diag { c: number; r: number; warnAt: number; fireAt: number }

const bishop = (tk: BossToolkit): SignatureMove => {
  let diags: Diag[] = [];
  return {
    durationMs: 1900,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'BISHOP',
    cast(time) {
      const p = tk.player;
      const c = colOf(p.x), r = rowOf(p.y);
      const two = spendDouble();
      const warnMs = tk.warn(1050);
      const centres: [number, number][] = [[c, r]];
      if (two) centres.push([c + (c < COLS - 3 ? 2 : -2), r]);
      diags = [];
      for (const [dc, dr] of centres) {
        diags.push({ c: dc, r: dr, warnAt: time, fireAt: time + warnMs });
        for (const a of [Math.PI / 4, -Math.PI / 4]) tk.spawnLane({ x: cx(dc), y: cy(dr), angle: a, halfW: 20, warnMs, damage: 11 });
      }
      tk.sfx('holy-chord');
    },
    update(time, dt) {
      read(tk, time, dt);
      diags = diags.filter((d) => time < d.fireAt + 500);
    },
    drawGround(g, time) {
      for (const d of diags) {
        if (time >= d.fireAt) continue;
        const k = clamp((time - d.warnAt) / Math.max(1, d.fireAt - d.warnAt), 0, 1);
        for (let s = -16; s <= 16; s++) {
          for (const sg of [1, -1]) {
            const c = d.c + s, r = d.r + s * sg;
            if (onBoard(c, r) && Math.abs(s) <= k * 18) threatSquare(g, c, r, k, VELVET);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const d of diags) {
        // A bishop at each end of each diagonal (where it leaves the board).
        for (const [dx, dy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]] as [number, number][]) {
          let c = d.c, r = d.r;
          while (onBoard(c + dx, r + dy)) { c += dx; r += dy; }
          const slide = clamp((time - d.fireAt) / 380, 0, 1);
          const x = cx(c) + (cx(d.c) - cx(c)) * slide, y = cy(r) + (cy(d.r) - cy(r)) * slide;
          chessPiece(g, x, y + 18, 'bishop', true, 0.95);
        }
      }
    },
    onPhaseEnd() { diags = []; },
  };
};

// ── Signature: Knight ────────────────────────────────────────────────
// A knight lands near you and threatens its eight L-squares; they strike; it leaps to the one
// nearest you and threatens again — three leaps (four on hard). Doubled, two knights.

interface Knight { c: number; r: number; leaps: number; warnAt: number; fireAt: number; landFrom: Pt | null; landAt: number }
const L: [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

const knight = (tk: BossToolkit): SignatureMove => {
  let knights: Knight[] = [];
  const beat = () => tk.warn(820);
  const threatened = (n: Knight) => L.map(([dc, dr]) => [n.c + dc, n.r + dr] as [number, number]).filter(([c, r]) => onBoard(c, r));
  return {
    durationMs: 3600,
    windupMs: 450,
    gesture: 'punch',
    tell: 'KNIGHT',
    cast(time) {
      const p = tk.player;
      const two = spendDouble();
      knights = [];
      const pc = colOf(p.x), pr = rowOf(p.y);
      for (let i = 0; i < (two ? 2 : 1); i++) {
        // Land a knight's move or two away, on the board.
        let c = pc, r = pr;
        for (let tries = 0; tries < 20; tries++) {
          const [dc, dr] = L[Math.floor(Math.random() * 8)];
          const nc = pc + dc * (i ? -1 : 1) + (i ? 1 : 0), nr = pr + dr;
          if (onBoard(nc, nr) && !(nc === pc && nr === pr)) { c = nc; r = nr; break; }
        }
        knights.push({ c, r, leaps: tk.hard ? 4 : 3, warnAt: time, fireAt: time + beat(), landFrom: { x: tk.bossX, y: tk.bossY }, landAt: time });
      }
      tk.sfx('land');
    },
    update(time, dt) {
      read(tk, time, dt);
      const p = tk.player;
      for (const n of knights) {
        if (n.leaps <= 0 || time < n.fireAt) continue;
        // Strike the eight squares.
        if (p.active && p.hp > 0 && threatened(n).some(([c, r]) => inSquare(p.x, p.y, c, r))) tk.hitPlayer(10, p.x, p.y);
        tk.sfx('clang');
        n.leaps--;
        if (n.leaps <= 0) { n.fireAt = time + 400; continue; }
        // Leap to the threatened square nearest you.
        const opts = threatened(n);
        opts.sort((a, b) => dist(cx(a[0]), cy(a[1]), p.x, p.y) - dist(cx(b[0]), cy(b[1]), p.x, p.y));
        const [nc, nr] = opts[0] ?? [n.c, n.r];
        n.landFrom = { x: cx(n.c), y: cy(n.r) };
        n.landAt = time;
        n.c = nc; n.r = nr;
        n.warnAt = time; n.fireAt = time + beat();
      }
      knights = knights.filter((n) => n.leaps > 0 || time < n.fireAt);
    },
    drawGround(g, time) {
      for (const n of knights) {
        if (n.leaps <= 0) continue;
        const k = clamp((time - n.warnAt) / Math.max(1, n.fireAt - n.warnAt), 0, 1);
        for (const [c, r] of threatened(n)) threatSquare(g, c, r, k, GAMBIT);
        // The knight's own square, ringed.
        g.lineStyle(2, GILT, 0.7); g.strokeRect(n.c * SQ + 3, Y0 + n.r * SQ + 3, SQ - 6, SQ - 6);
      }
    },
    drawAir(g, time) {
      for (const n of knights) {
        const k = clamp((time - n.landAt) / 260, 0, 1);
        const from = n.landFrom ?? { x: cx(n.c), y: cy(n.r) };
        const x = from.x + (cx(n.c) - from.x) * k, y = from.y + (cy(n.r) - from.y) * k - Math.sin(k * Math.PI) * 50;
        chessPiece(g, x, y + 18, 'knight', false, 1.15, n.leaps > 0 ? 1 : 1 - clamp((time - n.fireAt + 400) / 400, 0, 1));
      }
    },
    onPhaseEnd() { knights = []; },
  };
};

// ── Signature: Pawn Storm ────────────────────────────────────────────
// A rank of pawns, one on every other file, appears on the far side of the board from you and
// marches a rank at a time. After each step each pawn threatens its two forward diagonals —
// every square in front of the rank except the ones straight ahead of a pawn. Doubled, a second
// rank marches from the other side to meet it.

interface PawnRank { dir: 1 | -1; row: number; cols: number[]; stepAt: number; warnAt: number; fireAt: number; done: boolean }

const pawns = (tk: BossToolkit): SignatureMove => {
  let ranks: PawnRank[] = [];
  const STEP = () => tk.warn(760);
  const targets = (pr: PawnRank) => {
    const out: [number, number][] = [];
    const r = pr.row + pr.dir;
    if (r < 0 || r >= ROWS) return out;
    for (const c of pr.cols) for (const dc of [-1, 1]) if (onBoard(c + dc, r)) out.push([c + dc, r]);
    return out;
  };
  return {
    durationMs: 4200,
    windupMs: 500,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'PAWN STORM',
    cast(time) {
      const p = tk.player;
      const two = spendDouble();
      const pr = rowOf(p.y);
      const fromTop = pr >= ROWS / 2;
      const offset = Math.random() < 0.5 ? 0 : 1;
      const cols = Array.from({ length: COLS }, (_, i) => i).filter((c) => (c + offset) % 2 === 0);
      ranks = [{ dir: fromTop ? 1 : -1, row: fromTop ? 0 : ROWS - 1, cols, stepAt: time, warnAt: time, fireAt: time + STEP(), done: false }];
      if (two) ranks.push({ dir: fromTop ? -1 : 1, row: fromTop ? ROWS - 1 : 0, cols: cols.map((c) => (c + 1) % COLS), stepAt: time, warnAt: time, fireAt: time + STEP() + 380, done: false });
      tk.sfx('drum-hit');
    },
    update(time, dt) {
      read(tk, time, dt);
      const p = tk.player;
      for (const pr of ranks) {
        if (pr.done || time < pr.fireAt) continue;
        if (p.active && p.hp > 0 && targets(pr).some(([c, r]) => inSquare(p.x, p.y, c, r, 4))) tk.hitPlayer(9, p.x, p.y);
        tk.sfx('stab');
        pr.row += pr.dir;
        pr.stepAt = time;
        if (pr.row + pr.dir < 0 || pr.row + pr.dir >= ROWS) { pr.done = true; pr.fireAt = time + 500; continue; }
        pr.warnAt = time; pr.fireAt = time + STEP();
      }
      ranks = ranks.filter((pr) => !pr.done || time < pr.fireAt);
    },
    drawGround(g, time) {
      for (const pr of ranks) {
        if (pr.done) continue;
        const k = clamp((time - pr.warnAt) / Math.max(1, pr.fireAt - pr.warnAt), 0, 1);
        for (const [c, r] of targets(pr)) threatSquare(g, c, r, k);
        // Straight ahead is safe: a faint gilt arrow in front of each pawn.
        const r = pr.row + pr.dir;
        if (r >= 0 && r < ROWS) for (const c of pr.cols) {
          g.fillStyle(GILT_LIT, 0.25); g.fillTriangle(cx(c) - 8, cy(r) - pr.dir * 6, cx(c) + 8, cy(r) - pr.dir * 6, cx(c), cy(r) + pr.dir * 10);
        }
      }
    },
    drawAir(g, time) {
      for (const pr of ranks) {
        const k = clamp((time - pr.stepAt) / 220, 0, 1);
        const fade = pr.done ? 1 - clamp((time - pr.fireAt + 500) / 500, 0, 1) : 1;
        for (const c of pr.cols) {
          const y = cy(pr.row - pr.dir * (1 - k)) + 18 - Math.sin(k * Math.PI) * 8;
          chessPiece(g, cx(c), y, 'pawn', pr.dir > 0, 0.95, fade);
        }
      }
    },
    onPhaseEnd() { ranks = []; },
  };
};

// ── Signature: Sacrifice ─────────────────────────────────────────────
// His reserve stands along the top rank. He knocks one over: it bursts in a ring (with one gap,
// toward you), his next move's threat is doubled — and his guard is down for a few seconds.

const RESERVE: PieceKind[] = ['queen', 'rook', 'bishop', 'knight', 'rook', 'bishop', 'knight'];

interface Fallen { kind: PieceKind; x: number; y: number; at: number }

const sacrifice = (tk: BossToolkit): SignatureMove => {
  let left = RESERVE.length;
  let fallen: Fallen[] = [];
  const reserveX = (i: number) => cx(4 + i);
  const reserveY = cy(0);
  return {
    durationMs: 1500,
    windupMs: 700,
    gesture: 'recoil',
    tell: 'SACRIFICE',
    cast(time) {
      if (left <= 0) left = RESERVE.length;
      left--;
      const kind = RESERVE[left];
      const x = reserveX(left), y = reserveY;
      fallen.push({ kind, x, y, at: time });
      tk.spawnRing({ cx: x, cy: y, delayMs: 350, speed: 260, gapCentre: tk.angleToPlayer(x, y), gapHalf: 0.5, band: 18, damage: 10 });
      doubled = true;
      exposedUntil = time + 4500;
      tk.boom(x, y, 60, GAMBIT_LIT);
      tk.sfx('crystal-shatter');
    },
    update(time, dt) {
      read(tk, time, dt);
      fallen = fallen.filter((f) => time - f.at < 900);
    },
    takenMult() { return tk.now < exposedUntil ? 1.5 : 1; },
    drawGround(g, time) {
      if (phase < 2) return;
      // The reserve, standing on the top rank; the empty squares of the given-up pieces.
      for (let i = 0; i < RESERVE.length; i++) {
        if (i < left) continue;
        g.lineStyle(1.5, VELVET, 0.5); g.strokeRect(reserveX(i) - SQ / 2 + 6, reserveY - SQ / 2 + 6, SQ - 12, SQ - 12);
      }
      if (time < exposedUntil) {
        // His guard down: a cracked violet ring at his feet.
        const k = (exposedUntil - time) / 4500;
        g.lineStyle(3, MIND, 0.3 + k * 0.4); g.strokeCircle(tk.bossX, tk.bossY + 10, 52);
        for (let i = 0; i < 6; i++) { const a = i * 1.05; g.lineBetween(tk.bossX + Math.cos(a) * 44, tk.bossY + 10 + Math.sin(a) * 44, tk.bossX + Math.cos(a) * 60, tk.bossY + 10 + Math.sin(a) * 60); }
      }
    },
    drawAir(g, time) {
      if (phase < 2) return;
      for (let i = 0; i < left; i++) chessPiece(g, reserveX(i), reserveY + 18, RESERVE[i], false, 1, 0.95);
      for (const f of fallen) {
        // Toppling: the piece tips over and splits.
        const k = clamp((time - f.at) / 900, 0, 1);
        for (const s of [-1, 1]) chessPiece(g, f.x + s * k * 26, f.y + 18 + k * k * 30, f.kind, false, 1, 1 - k);
      }
      if (doubled) strokeText(g, 'X2', tk.bossX, tk.bossY - 92, 16, MIND_LIT, 0.6 + Math.sin(time / 90) * 0.3, 3);
    },
    onPhaseEnd() { fallen = []; doubled = false; exposedUntil = 0; left = RESERVE.length; },
  };
};

// ── Signature: Queen ─────────────────────────────────────────────────
// A queen lands three squares off you, along your rank, file or a diagonal — so you are on one
// of her lines — and threatens all eight directions from her square. Step off every line.

interface Queen { c: number; r: number; warnAt: number; fireAt: number }

const queen = (tk: BossToolkit): SignatureMove => {
  let queens: Queen[] = [];
  const dirs: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];
  return {
    durationMs: 2000,
    windupMs: 550,
    gesture: 'point',
    tell: 'QUEEN',
    cast(time) {
      const p = tk.player;
      const pc = colOf(p.x), pr = rowOf(p.y);
      const two = spendDouble();
      queens = [];
      const warnMs = tk.warn(1150);
      for (let i = 0; i < (two ? 2 : 1); i++) {
        let c = pc, r = pr;
        for (let tries = 0; tries < 16; tries++) {
          const [dc, dr] = dirs[Math.floor(Math.random() * 4)];
          const s = (Math.random() < 0.5 ? -1 : 1) * 3;
          if (onBoard(pc + dc * s, pr + dr * s) && !queens.some((q) => q.c === pc + dc * s && q.r === pr + dr * s)) { c = pc + dc * s; r = pr + dr * s; break; }
        }
        queens.push({ c, r, warnAt: time, fireAt: time + warnMs + i * 300 });
        for (const [dc, dr] of dirs) tk.spawnLane({ x: cx(c), y: cy(r), angle: Math.atan2(dr, dc), halfW: 20, warnMs: warnMs + i * 300, damage: 12 });
      }
      tk.sfx('judgement');
    },
    update(time, dt) {
      read(tk, time, dt);
      queens = queens.filter((q) => time < q.fireAt + 500);
    },
    drawGround(g, time) {
      for (const q of queens) {
        if (time >= q.fireAt) continue;
        const k = clamp((time - q.warnAt) / Math.max(1, q.fireAt - q.warnAt), 0, 1);
        for (const [dc, dr] of dirs) {
          for (const s of [-1, 1]) {
            for (let i = 1; i < 16; i++) {
              const c = q.c + dc * s * i, r = q.r + dr * s * i;
              if (!onBoard(c, r)) break;
              if (i <= k * 18) threatSquare(g, c, r, k, GAMBIT_LIT);
            }
          }
        }
      }
    },
    drawAir(g, time) {
      for (const q of queens) {
        const k = clamp((time - q.warnAt) / 300, 0, 1);
        glow(g, cx(q.c), cy(q.r), 40, GAMBIT_LIT, 0.06, 3);
        chessPiece(g, cx(q.c), cy(q.r) + 18 - (1 - k) * 60, 'queen', false, 1.3, k);
      }
    },
    onPhaseEnd() { queens = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const GAMBIT_BOSS: WorldBossDef = {
  worldId: 'isle:gambit',
  name: 'Prince Gambit',
  title: 'the Move Ahead',
  color: GAMBIT,
  colorLit: GAMBIT_LIT,
  colorDark: GAMBIT_DARK,
  accent: GILT,
  // Tier 3 of the eighth isle.
  damageMult: 1.4,

  intro: [
    'You were going to come in through that door, stand there, and say something brave. Go on.',
    'I have read every gambler on this isle. I read Father\'s readers. I have never been surprised. Try.',
  ],
  banter: [
    'Left. You were going left. Everyone goes left when they are frightened.',
    'Father says a clever man never gambles, because he already knows. I know.',
    'The Exchange will buy this fight from me tonight. Every move of it. You will be a cheap lot.',
    'A pawn never takes straight ahead. Remember that. It is the only kind thing on the board.',
    'I have never beaten Father at chess. Not once. You will do instead.',
  ],
  defeatLine: 'RESIGNS',
  resumeLine: 'You came back. I knew you would. I did not know you would come back better. That is new.',

  phases: [
    {
      name: 'Foresight',
      line: 'I will tell you where you are going. Then I will be there first.',
      hp: 560,
      cycle: [
        'sig:foreseen', 'volley', 'sig:premonition', 'homing', 'sig:sight',
        'sig:foreseen', 'radial', 'sig:premonition', 'sig:sight',
      ],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Checkmate',
      line: 'Enough reading. Let us play properly. Father\'s rules. The board does not lie.',
      hp: 650,
      cycle: [
        'sig:rook', 'sig:knight', 'lanes', 'sig:bishop', 'sig:pawns',
        'sweep', 'sig:rook', 'sig:knight', 'sig:bishop',
      ],
      harass: ['h-lane', 'h-rune'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'A GAMBIT IS A SACRIFICE',
    extraPhase: {
      name: 'Sacrifice',
      line: 'Do you know what a gambit is? You give something up to win. Watch me give everything up.',
      hp: 480,
      cycle: [
        'sig:sacrifice', 'sig:queen', 'sig:knight', 'sig:sacrifice', 'sig:rook',
        'sig:pawns', 'sig:sacrifice', 'sig:bishop', 'homing', 'sig:queen',
      ],
      harass: ['h-mines', 'h-flak'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.45 },
    radial: { count: 16, speed: 185 },
    lanes: { halfW: 22 },
    sweep: { halfW: 18 },
  },

  signatures: {
    foreseen,
    premonition,
    sight: secondSight,
    rook,
    bishop,
    knight,
    pawns,
    sacrifice,
    queen,
  },

  look: {
    crest: 'none', pattern: 'grid', aura: 'none', hands: 'orb',
    torsoR: 34, mouth: 'line', eyes: 3, eyeColor: MIND,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'gold', look: { pattern: 'plates', mouth: 'grin' } },
    { movement: 'blink', gimmick: 'none', tint: 'void', look: { pattern: 'cracks', hands: 'wisp', aura: 'glitch' } },
  ],

  /**
   * The Move Ahead's tells. A chequered ruff at the throat; a crystal ball circling his head,
   * a violet eye in it that turns to look where you are about to be; a gilt crown topped with
   * the chess king's cross; an ivory king in his second hand. In Checkmate the ball sinks into
   * the crown and the cross grows tall — he is the king on the board. In Sacrifice the cross is
   * snapped off, the crown cracked, and the piece in his hand is a black queen.
   */
  drawDecor(g, s) {
    phase = s.phaseIdx;
    const R = s.radius;
    const sac = s.hard && s.phaseIdx >= 2;
    const mate = s.phaseIdx === 1;
    // The chequered ruff.
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * 0.15 + (i / n) * Math.PI * 0.7, a1 = Math.PI * 0.15 + ((i + 1) / n) * Math.PI * 0.7;
      g.fillStyle(i % 2 ? EBONY : IVORY, 1);
      g.fillTriangle(s.x + Math.cos(a0) * R * 0.75, s.y + Math.sin(a0) * R * 0.75, s.x + Math.cos(a1) * R * 0.75, s.y + Math.sin(a1) * R * 0.75, s.x + Math.cos((a0 + a1) / 2) * R * 1.18, s.y + Math.sin((a0 + a1) / 2) * R * 1.18);
    }
    // The crown: a gilt band with points, and the king's cross.
    const by = s.y - R * 0.86;
    g.fillStyle(GILT_DARK, 1); g.fillRect(s.x - R * 0.6, by - 2, R * 1.2, 9);
    g.fillStyle(GILT, 1); g.fillRect(s.x - R * 0.58, by - 4, R * 1.16, 7);
    for (let k = -2; k <= 2; k++) {
      if (sac && k === 1) continue;
      g.fillStyle(GILT, 1); g.fillTriangle(s.x + k * R * 0.26 - 5, by - 4, s.x + k * R * 0.26 + 5, by - 4, s.x + k * R * 0.26, by - 14);
      g.fillStyle(k % 2 ? CARD_RED : MIND, 1); g.fillCircle(s.x + k * R * 0.26, by, 2);
    }
    if (sac) {
      // Cracked, the cross snapped to a stub.
      g.lineStyle(1.5, EBONY, 1); g.lineBetween(s.x + 6, by - 4, s.x + 2, by + 4); g.lineBetween(s.x + 2, by + 4, s.x + 8, by + 6);
      g.fillStyle(GILT_DARK, 1); g.fillRect(s.x - 2, by - 14, 4, 10);
    } else {
      const ch = mate ? 34 : 20;
      g.fillStyle(GILT_DARK, 1); g.fillRect(s.x - 3, by - 4 - ch, 6, ch);
      g.fillRect(s.x - ch * 0.32, by - 4 - ch * 0.72, ch * 0.64, 5);
      g.fillStyle(GILT_LIT, 1); g.fillRect(s.x - 1.5, by - 4 - ch, 3, ch);
    }
    // The crystal ball orbiting his head; the eye inside looks where you are going.
    if (!mate) {
      const a = s.t / 900;
      const bx = s.x + Math.cos(a) * R * 1.35, byy = s.y - R * 0.9 + Math.sin(a) * R * 0.4;
      glow(g, bx, byy, 22, MIND, 0.06, 3);
      g.fillStyle(CRYSTAL_DEEP, 1); g.fillCircle(bx, byy, 11);
      g.fillStyle(CRYSTAL, 0.55); g.fillCircle(bx, byy, 10);
      const la = Math.atan2(motion.y + motion.vy * 0.8 - byy, motion.x + motion.vx * 0.8 - bx);
      g.fillStyle(MIND, 1); g.fillCircle(bx + Math.cos(la) * 3, byy + Math.sin(la) * 3, 4);
      g.fillStyle(0x0c0a10, 1); g.fillCircle(bx + Math.cos(la) * 4, byy + Math.sin(la) * 4, 1.6);
      g.fillStyle(CRYSTAL_LIT, 0.9); g.fillEllipse(bx - 4, byy - 4, 4, 2.5);
    }
    // The piece in his second hand.
    const hand = s.hands[1];
    if (hand) chessPiece(g, hand.x + 2, hand.y + 8 - s.castGlow * 4, sac ? 'queen' : 'king', !sac, 0.62);
    // His third eye blazes on the cast.
    if (s.castGlow > 0.2) glow(g, s.x, s.y - R * 0.35, 18, MIND_LIT, 0.08 * s.castGlow, 2);
    if (s.enraged) { g.lineStyle(1.5, GAMBIT_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The study of the Deep Think: dark walnut parquet laid in herringbone, a great inlaid eye
   * rosette at the heart, bookcases and velvet curtains along the back wall under the HUD, a
   * crystal ball on a plinth at each corner and little card tables under green lamps between
   * them — where the Prince sits with his readers' notes until the small hours.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x6a3b17);
    // Herringbone parquet.
    g.fillStyle(WOOD_DARK, 1); g.fillRect(0, 0, W, H);
    for (let y = 96; y < H + 40; y += 20) {
      for (let x = -40; x < W + 40; x += 40) {
        const off = ((y / 20) % 2) * 20;
        const c = [WOOD, dim(WOOD, 0.12), lit(WOOD, 0.06)][Math.floor(rng() * 3)];
        g.fillStyle(c, 1);
        g.fillTriangle(x + off, y, x + off + 20, y - 20, x + off + 26, y - 14);
        g.fillTriangle(x + off, y, x + off + 26, y - 14, x + off + 6, y + 6);
        g.lineStyle(1, WOOD_DARK, 0.6); g.lineBetween(x + off, y, x + off + 20, y - 20);
      }
    }
    // The back wall: bookcases between velvet curtains.
    g.fillStyle(WOOD_DARK, 1); g.fillRect(0, 0, W, 104);
    for (let bx = 0; bx < W; bx += 120) {
      g.fillStyle(dim(WOOD, 0.3), 1); g.fillRect(bx + 18, 8, 84, 90);
      for (let sy = 0; sy < 3; sy++) {
        const shelfY = 14 + sy * 30;
        let x = bx + 20;
        while (x < bx + 98) {
          const w = 4 + rng() * 6;
          g.fillStyle([VELVET, CARD_RED, LAMP_GREEN, GILT_DARK, EBONY_LIT][Math.floor(rng() * 5)], 1);
          g.fillRect(x, shelfY + 26 - (18 + rng() * 6), w, 18 + rng() * 6);
          x += w + 1;
        }
        g.fillStyle(WOOD_LIT, 1); g.fillRect(bx + 18, shelfY + 26, 84, 3);
      }
      g.fillStyle(VELVET_DARK, 1); g.fillRect(bx, 0, 18, 104);
      g.fillStyle(VELVET, 1); g.fillRect(bx + 2, 0, 12, 104);
      g.fillStyle(GILT, 1); g.fillCircle(bx + 9, 70, 2.5);
    }
    g.fillStyle(GILT_DARK, 1); g.fillRect(0, 100, W, 6);
    g.fillStyle(GILT, 1); g.fillRect(0, 100, W, 2);
    // The eye rosette at the heart: rings of inlaid ivory and ebony round a gilt eye.
    const cxm = W / 2, cym = (H + 106) / 2;
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2;
      g.fillStyle(i % 2 ? EBONY : IVORY_DARK, 0.85);
      g.fillTriangle(cxm, cym, cxm + Math.cos(a0) * 170, cym + Math.sin(a0) * 120, cxm + Math.cos(a1) * 170, cym + Math.sin(a1) * 120);
    }
    g.fillStyle(WOOD_DARK, 1); g.fillEllipse(cxm, cym, 250, 176);
    g.lineStyle(3, GILT, 0.8); g.strokeEllipse(cxm, cym, 344, 244); g.strokeEllipse(cxm, cym, 250, 176);
    eye(g, cxm, cym, 70, GILT, MIND, 0.85);
    // Corner plinths with crystal balls; card tables under green lamps between.
    for (const [x, y] of [[60, 170], [W - 60, 170], [60, H - 50], [W - 60, H - 50]] as [number, number][]) {
      g.fillStyle(EBONY, 1); g.fillRect(x - 20, y - 12, 40, 14);
      crystalBall(g, x, y - 12, 13, x * 0.01);
    }
    for (const [x, y] of [[W / 2, H - 34], [40, (H + 100) / 2], [W - 40, (H + 100) / 2]] as [number, number][]) {
      glow(g, x, y, 40, CANDLE, 0.05, 3);
      g.fillStyle(LAMP_GREEN, 1); g.fillEllipse(x, y, 44, 22);
      g.lineStyle(2, GILT_DARK, 1); g.strokeEllipse(x, y, 44, 22);
      g.fillStyle(IVORY, 1); g.fillRect(x - 10, y - 4, 7, 9); g.fillRect(x + 2, y - 2, 7, 9);
    }
    // A spiral and a planchette left on a side table — the Mind Court's tools, put away.
    spiralDisc(g, W - 150, H - 40, 14, 0.4, 0.8);
    g.fillStyle(MIND_DARK, 0.12); g.fillRect(0, 106, W, H - 106);
  },
};
