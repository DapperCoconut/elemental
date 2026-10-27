import Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { lit, mulberry, type G } from '../../../../art/IsleArt';
import {
  CLOTH_BLUE, CLOTH_PLUM, CLOTH_RED, GILT, GILT_DARK, GILT_LIT, INK, INK_SOFT, IRON_LIT, MYTH, MYTH_LIT, NIGHT,
  PAGE, PARCH_DARK, POISON, SEAL, STAR, angDiff, apple, bookmark, clamp, closedBook, dist, inkCircle, inkRect,
  inked, noise, openBook, quill, scribble,
} from './util';

/**
 * Prince Legend, Hero of Every Tale — King Aerion's third child, who governs the Fable Court. On
 * Highspire a story told aloud is the longest breath there is, and Legend decided long ago which
 * stories were worth the breath: his own. He licenses the tales, casts the town to play them, has
 * the rest burned on the square — and in every licensed tale, the Prince saves the day.
 *
 * His body is Myth: a dark pricked with stars, a sword held behind his back he never needs to draw.
 *
 * Phase one, *Once Upon a Time*: he hovers beside a great open storybook, reading aloud, and every
 * page he turns comes true — the giant's footsteps walk across the yard, a quill the size of a
 * lance writes "once upon a time" in wet ink across the floor after you, and a whole page turns
 * over the arena, safe only through the die-cut windows in it.
 *
 * Phase two, *The Moral*: the book slams shut — literally, on the yard, both covers at once, safe
 * only in the gutter under the bookmark — and its cast leaps out as paper standees (the wolf, the
 * witch, the knight) to act their parts at you; then the moral closes round you as a ring of words
 * with one word missing.
 *
 * Hard mode adds *Happily Never After*: the story rewrites itself mid-fight. Pools marked HAPPILY
 * and NEVER are struck through and swapped before they come true, and the page turns back on itself.
 */

const MAIN = 0x2a2050;
const LITC = 0xffd27a;
const DARK = 0x0e0a1e;
const ACCENT = MYTH;

const TOP = 96;

/** The phase the body is in, kept by the decor painter so signatures can dress for it. */
const fight = { phaseIdx: 0 };

// ── Shared drawing ──────────────────────────────────────────────────

/** A giant's hobnailed sole seen from above, toe along `a`. */
function sole(g: G, x: number, y: number, a: number, s: number, fill: number, alpha: number, nails = true): void {
  const ux = Math.cos(a), uy = Math.sin(a);
  const fx = x + ux * 22 * s, fy = y + uy * 22 * s;
  const hx = x - ux * 40 * s, hy = y - uy * 40 * s;
  g.fillStyle(fill, alpha);
  // Forefoot and heel as rotated ellipses: approximate with polygons for the rotation.
  const ell = (cx: number, cy: number, rx: number, ry: number): Phaser.Geom.Point[] => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2;
      const ex = Math.cos(t) * rx, ey = Math.sin(t) * ry;
      pts.push(new Phaser.Geom.Point(cx + ex * ux - ey * uy, cy + ex * uy + ey * ux));
    }
    return pts;
  };
  g.fillPoints(ell(fx, fy, 42 * s, 28 * s), true);
  g.fillPoints(ell(hx, hy, 20 * s, 22 * s), true);
  g.fillPoints(ell((fx + hx) / 2, (fy + hy) / 2, 26 * s, 17 * s), true);
  if (nails) {
    g.fillStyle(IRON_LIT, alpha * 0.8);
    for (let k = 0; k < 7; k++) {
      const t = (k / 7) * Math.PI * 2;
      g.fillCircle(fx + Math.cos(t) * 34 * s * ux - Math.sin(t) * 20 * s * uy, fy + Math.cos(t) * 34 * s * uy + Math.sin(t) * 20 * s * ux, 2.4 * s);
    }
    for (let k = 0; k < 4; k++) {
      const t = (k / 4) * Math.PI * 2;
      g.fillCircle(hx + Math.cos(t) * 13 * s * ux - Math.sin(t) * 14 * s * uy, hy + Math.cos(t) * 13 * s * uy + Math.sin(t) * 14 * s * ux, 2.2 * s);
    }
  }
}

type Character = 'wolf' | 'witch' | 'knight';

/** A paper standee of one of the book's cast: a flat card cut-out on a fold-out stand. */
function standee(g: G, kind: Character, x: number, y: number, s: number, pop: number, alpha = 1): void {
  const h = 70 * s * clamp(pop, 0.05, 1);
  g.fillStyle(0x000000, 0.25 * alpha); g.fillEllipse(x, y + 2, 50 * s, 12 * s);
  // The stand tab.
  inked(g, [{ x: x - 16 * s, y: y + 2 }, { x: x + 16 * s, y: y + 2 }, { x: x + 10 * s, y: y - 6 * s }, { x: x - 10 * s, y: y - 6 * s }], PARCH_DARK, alpha, 1.2);
  const k = h / (70 * s);
  const Y = (v: number): number => y - 4 * s - v * s * k;
  if (kind === 'wolf') {
    inked(g, [
      { x: x - 22 * s, y: Y(0) }, { x: x + 18 * s, y: Y(0) }, { x: x + 20 * s, y: Y(30) }, { x: x + 30 * s, y: Y(38) }, { x: x + 20 * s, y: Y(46) },
      { x: x + 14 * s, y: Y(62) }, { x: x + 8 * s, y: Y(50) }, { x: x - 4 * s, y: Y(52) }, { x: x - 10 * s, y: Y(64) }, { x: x - 14 * s, y: Y(46) }, { x: x - 24 * s, y: Y(30) },
    ], 0x7a7688, alpha, 1.8);
    g.fillStyle(0xffd84a, alpha); g.fillCircle(x + 8 * s, Y(44), 2.6 * s);
    g.fillStyle(PAGE, alpha); for (let i = 0; i < 3; i++) g.fillTriangle(x + (18 + i * 3) * s, Y(36), x + (20 + i * 3) * s, Y(36), x + (19 + i * 3) * s, Y(32));
  } else if (kind === 'witch') {
    inked(g, [{ x: x - 18 * s, y: Y(0) }, { x: x + 18 * s, y: Y(0) }, { x: x + 10 * s, y: Y(40) }, { x: x - 10 * s, y: Y(40) }], 0x2a2236, alpha, 1.8);
    inkCircle(g, x, Y(48), 9 * s * Math.max(0.3, k), 0x8ad85a, alpha, 1.4);
    inked(g, [{ x: x - 20 * s, y: Y(54) }, { x: x + 20 * s, y: Y(54) }, { x: x + 4 * s, y: Y(60) }, { x: x + 8 * s, y: Y(82) }, { x: x - 6 * s, y: Y(60) }], 0x2a2236, alpha, 1.6);
    apple(g, x + 18 * s, Y(28), 6 * s, true, 0, alpha);
  } else {
    inked(g, [{ x: x - 16 * s, y: Y(0) }, { x: x + 16 * s, y: Y(0) }, { x: x + 14 * s, y: Y(44) }, { x: x - 14 * s, y: Y(44) }], 0x9a9aaa, alpha, 1.8);
    inked(g, [{ x: x - 12 * s, y: Y(44) }, { x: x + 12 * s, y: Y(44) }, { x: x + 12 * s, y: Y(62) }, { x, y: Y(70) }, { x: x - 12 * s, y: Y(62) }], 0xb8b8c8, alpha, 1.6);
    g.fillStyle(INK, alpha); g.fillRect(x - 8 * s, Y(56), 16 * s, 3 * s);
    g.fillStyle(SEAL, alpha); g.fillTriangle(x, Y(70), x - 4 * s, Y(80), x + 6 * s, Y(78));
    g.lineStyle(3 * s, PAGE, alpha); g.lineBetween(x + 18 * s, Y(10), x + 18 * s, Y(56));
    g.lineStyle(3 * s, GILT, alpha); g.lineBetween(x + 12 * s, Y(14), x + 24 * s, Y(14));
  }
}

// ── Signature: Fee-Fi-Fo-Fum ────────────────────────────────────────
// The page with the giant on it turns, and his footsteps walk across the yard: sole-shaped
// shadows laid out left-right along a line through you, stamped down one after another.

const giantSteps = (tk: BossToolkit): SignatureMove => {
  interface Step { x: number; y: number; a: number; showAt: number; landAt: number; dealt: boolean }
  let steps: Step[] = [];
  const R = 54;
  return {
    durationMs: 3200,
    windupMs: 650,
    gesture: 'raise',
    tell: 'FEE-FI-FO-FUM',
    cast(time) {
      const p = tk.player;
      const n = tk.hard ? 6 : 5;
      const a = tk.angleToPlayer() + (Math.random() - 0.5) * 1.2;
      const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      const span = 150;
      steps = [];
      for (let i = 0; i < n; i++) {
        const along = (i - 2) * span;
        const side = i % 2 ? 1 : -1;
        const x = tk.clampX(p.x + ux * along + nx * side * 38), y = tk.clampY(p.y + uy * along + ny * side * 38);
        const landAt = time + tk.warn(950) + i * 360;
        steps.push({ x, y, a, showAt: time + i * 120, landAt, dealt: false });
      }
      tk.sfx('quake');
    },
    update(time) {
      const p = tk.player;
      for (const s of steps) {
        if (s.dealt || time < s.landAt) continue;
        s.dealt = true;
        if (dist(p.x, p.y, s.x, s.y) < R + 12) tk.hitPlayer(15, p.x, p.y);
        tk.boom(s.x, s.y, R + 10, 0x6a4228);
        tk.sfx('gravity-slam');
      }
      steps = steps.filter((s) => time < s.landAt + 1100);
    },
    drawGround(g, time) {
      for (const s of steps) {
        if (time < s.showAt) continue;
        if (time < s.landAt) {
          const c = clamp((time - s.showAt) / (s.landAt - s.showAt), 0, 1);
          sole(g, s.x, s.y, s.a, 0.5 + c * 0.5, 0x000000, 0.1 + c * 0.25, false);
          g.lineStyle(2, 0xff9a5a, 0.3 + c * 0.6); g.strokeCircle(s.x, s.y, R);
          if (c > 0.85 && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.4); g.strokeCircle(s.x, s.y, R + 4); }
        } else {
          // The dent it leaves: a print pressed into the page, cracks round it.
          const k = (time - s.landAt) / 1100;
          sole(g, s.x, s.y, s.a, 1, 0x3a2a1e, 0.6 * (1 - k), true);
          g.lineStyle(2, INK, 0.5 * (1 - k));
          for (let j = 0; j < 6; j++) { const a = (j / 6) * Math.PI * 2 + s.a; g.lineBetween(s.x + Math.cos(a) * R * 0.9, s.y + Math.sin(a) * R * 0.9, s.x + Math.cos(a) * R * 1.3, s.y + Math.sin(a) * R * 1.3); }
        }
      }
    },
    drawAir(g, time) {
      // The sole coming down the last instant before each stamp.
      for (const s of steps) {
        const k = (s.landAt - time) / 260;
        if (k < 0 || k > 1) continue;
        sole(g, s.x, s.y - k * 160, s.a, 1.05, 0x5a3a24, 0.9 * (1 - k * 0.5), true);
      }
    },
    onPhaseEnd() { steps = []; },
  };
};

// ── Signature: Once Upon a Time (the quill) ─────────────────────────
// A quill as long as a lance writes the opening line across the floor after you, in wet ink. The
// nib cuts; the fresh ink burns and drags. It turns slowly — out-walk its curve.

const onceUpon = (tk: BossToolkit): SignatureMove => {
  interface Pen { x: number; y: number; a: number; startAt: number; endAt: number; trail: { x: number; y: number; at: number }[]; nibHit: boolean }
  let pens: Pen[] = [];
  let lastInkHit = 0;
  const SPD = 250, TURN = 1.5, WRITE = 2600, INK_LIFE = 2400, INK_R = 20;
  const spawn = (time: number, fromLeft: boolean): void => {
    const p = tk.player;
    const x = fromLeft ? 60 : tk.W - 60, y = tk.clampY(p.y + (Math.random() - 0.5) * 200, 120);
    pens.push({ x, y, a: Math.atan2(p.y - y, p.x - x), startAt: time + tk.warn(800), endAt: time + tk.warn(800) + WRITE, trail: [], nibHit: false });
  };
  return {
    durationMs: 3600,
    windupMs: 600,
    gesture: 'point',
    tell: 'ONCE UPON A TIME',
    cast(time) {
      pens = [];
      const left = tk.player.x > tk.W / 2;
      spawn(time, left);
      if (tk.hard || fight.phaseIdx >= 2) spawn(time + 200, !left);
      tk.sfx('beam-charge');
    },
    update(time, dt) {
      const p = tk.player;
      for (const pen of pens) {
        if (time < pen.startAt || time > pen.endAt) continue;
        const want = Math.atan2(p.y - pen.y, p.x - pen.x);
        pen.a += clamp(angDiff(want, pen.a), -TURN * dt, TURN * dt);
        pen.x = clamp(pen.x + Math.cos(pen.a) * SPD * dt, 30, tk.W - 30);
        pen.y = clamp(pen.y + Math.sin(pen.a) * SPD * dt, TOP + 20, tk.H - 30);
        const last = pen.trail[pen.trail.length - 1];
        if (!last || dist(last.x, last.y, pen.x, pen.y) > 10) pen.trail.push({ x: pen.x, y: pen.y, at: time });
        if (!pen.nibHit && dist(p.x, p.y, pen.x, pen.y) < 26) { pen.nibHit = true; tk.hitPlayer(12, p.x, p.y); tk.sfx('stab'); }
      }
      // Wet ink.
      if (time - lastInkHit > 500) {
        for (const pen of pens) {
          if (pen.trail.some((q) => time - q.at < INK_LIFE && dist(p.x, p.y, q.x, q.y) < INK_R + 10)) {
            lastInkHit = time; tk.hitPlayer(6, p.x, p.y); tk.slowPlayer(0.72, 600); tk.sfx('slime-splat');
            break;
          }
        }
      }
      for (const pen of pens) pen.trail = pen.trail.filter((q) => time - q.at < INK_LIFE);
      pens = pens.filter((pen) => time < pen.endAt + INK_LIFE);
    },
    drawGround(g, time) {
      for (const pen of pens) {
        // The ink drop that marks where it will start writing.
        if (time < pen.startAt) {
          const c = clamp(1 - (pen.startAt - time) / tk.warn(800), 0, 1);
          g.fillStyle(INK, 0.3 + c * 0.5); g.fillCircle(pen.x, pen.y, 6 + c * 14);
          g.lineStyle(2, MYTH_LIT, 0.4 + c * 0.4); g.strokeCircle(pen.x, pen.y, 30);
        }
        // Handwriting: the wet line, looping, glossy where it is freshest.
        for (let i = 1; i < pen.trail.length; i++) {
          const a = pen.trail[i - 1], b = pen.trail[i];
          const age = (time - b.at) / INK_LIFE;
          const loop = Math.sin(i * 1.3) * 6;
          g.lineStyle(INK_R * 1.6 * (1 - age * 0.3), INK, 0.65 * (1 - age));
          g.lineBetween(a.x, a.y + loop, b.x, b.y - loop);
          g.lineStyle(3, MYTH_LIT, 0.35 * (1 - age)); g.lineBetween(a.x, a.y + loop - 4, b.x, b.y - loop - 4);
        }
      }
    },
    drawAir(g, time) {
      for (const pen of pens) {
        if (time > pen.endAt) continue;
        const lift = time < pen.startAt ? 20 : 0;
        quill(g, pen.x, pen.y - lift, pen.a + Math.PI * 0.75, 110, PAGE, 1);
      }
    },
    onPhaseEnd() { pens = []; },
  };
};

// ── Signature: Turn the Page ────────────────────────────────────────
// A whole page turns over the yard, its edge sweeping side to side faster than anyone can run.
// It has die-cut windows (the pop-up holes): stand in a window's row as the edge goes by.

const turnPage = (tk: BossToolkit): SignatureMove => {
  let showAt = 0, goAt = 0, endAt = 0, back = false, active = false, fromLeft = true;
  let windows: { y0: number; y1: number }[] = [];
  let dealtA = false, dealtB = false;
  const SWEEP = 1300, BAND = 26;
  const edgeX = (time: number): number | null => {
    if (time < goAt) return null;
    const k = (time - goAt) / SWEEP;
    if (k <= 1) return fromLeft ? -20 + k * (tk.W + 40) : tk.W + 20 - k * (tk.W + 40);
    if (back && k <= 2.2 && k >= 1.2) { const k2 = k - 1.2; return fromLeft ? tk.W + 20 - k2 * (tk.W + 40) : -20 + k2 * (tk.W + 40); }
    return null;
  };
  const safe = (y: number): boolean => windows.some((w) => y > w.y0 + 8 && y < w.y1 - 8);
  return {
    durationMs: 3400,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'TURN THE PAGE',
    cast(time) {
      const p = tk.player;
      fromLeft = p.x > tk.W / 2;
      back = fight.phaseIdx >= 2;
      showAt = time; goAt = time + tk.warn(1300); endAt = goAt + SWEEP * (back ? 2.2 : 1);
      // Two windows: one within reach of you, one elsewhere.
      const h = tk.hard ? 96 : 116;
      const near = clamp(p.y + (Math.random() - 0.5) * 160, TOP + 40 + h / 2, tk.H - 40 - h / 2);
      let far = near > (TOP + tk.H) / 2 ? TOP + 60 + h / 2 + Math.random() * 60 : tk.H - 60 - h / 2 - Math.random() * 60;
      if (Math.abs(far - near) < h * 1.3) far = clamp(near + (near > (TOP + tk.H) / 2 ? -1 : 1) * h * 1.6, TOP + 40 + h / 2, tk.H - 40 - h / 2);
      windows = [near, far].map((c) => ({ y0: c - h / 2, y1: c + h / 2 }));
      dealtA = false; dealtB = false; active = true;
      tk.sfx('whoosh');
    },
    update(time) {
      if (!active) return;
      const p = tk.player;
      const x = edgeX(time);
      if (x !== null && Math.abs(p.x - x) < BAND + 16 && !safe(p.y)) {
        const second = (time - goAt) / SWEEP > 1;
        if (second ? !dealtB : !dealtA) {
          if (second) dealtB = true; else dealtA = true;
          tk.hitPlayer(18, p.x, p.y); tk.sfx('slash');
        }
      }
      if (time > endAt + 200) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const c = clamp((time - showAt) / (goAt - showAt), 0, 1);
      // The windows: lit rows the whole width of the yard, dotted like a die-cut line.
      for (const w of windows) {
        g.fillStyle(GILT_LIT, 0.06 + c * 0.12); g.fillRect(0, w.y0, tk.W, w.y1 - w.y0);
        g.lineStyle(2, GILT, 0.35 + c * 0.5);
        for (let x = (time / 20) % 24; x < tk.W; x += 24) { g.lineBetween(x, w.y0, x + 12, w.y0); g.lineBetween(x, w.y1, x + 12, w.y1); }
      }
      // The page already turned: a pale sheet of text over the swept side.
      const x = edgeX(time);
      if (x !== null) {
        const k = (time - goAt) / SWEEP;
        const coveredFromLeft = (fromLeft && k <= 1) || (!fromLeft && k > 1);
        const x0 = coveredFromLeft ? 0 : x, x1 = coveredFromLeft ? x : tk.W;
        if (x1 > x0) {
          g.fillStyle(PAGE, 0.32); g.fillRect(x0, TOP, x1 - x0, tk.H - TOP);
          for (const w of windows) { g.fillStyle(0x000000, 0.18); g.fillRect(x0, w.y0, x1 - x0, w.y1 - w.y0); }
        }
      } else if (time < goAt) {
        // The spine it hinges on, glowing at the start edge.
        const sx = fromLeft ? 8 : tk.W - 8;
        g.fillStyle(GILT, 0.3 + c * 0.5); g.fillRect(sx - 6, TOP, 12, tk.H - TOP);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const x = edgeX(time);
      if (x === null) return;
      // The page edge: a tall curled sheet seen edge-on, shaded, with the windows cut out of it.
      const dirSign = ((fromLeft ? 1 : -1) * ((time - goAt) / SWEEP > 1 ? -1 : 1));
      let y = TOP;
      const cuts = [...windows].sort((a, b) => a.y0 - b.y0);
      const seg = (y0: number, y1: number): void => {
        if (y1 <= y0) return;
        g.fillStyle(PARCH_DARK, 0.95); g.fillRect(x - BAND - dirSign * 10, y0, BAND * 2, y1 - y0);
        g.fillStyle(PAGE, 1); g.fillRect(x - BAND + dirSign * 4, y0, BAND * 1.6, y1 - y0);
        g.lineStyle(2, INK, 0.85); g.strokeRect(x - BAND - dirSign * 10, y0, BAND * 2, y1 - y0);
        scribble(g, x - BAND + 8, y0 + 8, BAND * 1.2, Math.max(1, Math.floor((y1 - y0 - 12) / 12)), 12, INK_SOFT, 0.5, Math.floor(y0), 1);
      };
      for (const w of cuts) { seg(y, w.y0); y = w.y1; }
      seg(y, tk.H);
      for (const w of cuts) { g.lineStyle(2, GILT, 0.9); g.strokeRect(x - BAND - 4, w.y0, BAND * 2 + 8, w.y1 - w.y0); }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Cast ─────────────────────────────────────────────
// The book slams shut and its characters leap out as paper standees round you, each acting its
// part in turn: the wolf dashes through, the witch lobs a poisoned apple, the knight swings round.

const theCast = (tk: BossToolkit): SignatureMove => {
  interface Actor { kind: Character; x: number; y: number; popAt: number; actAt: number; done: boolean; aim: number; tx: number; ty: number; gone: number }
  let cast: Actor[] = [];
  const KNIGHT_R = 120, KNIGHT_HALF = Math.PI * 0.7;
  return {
    durationMs: 3600,
    windupMs: 700,
    gesture: 'clap',
    tell: 'ENTER THE CAST',
    cast(time) {
      const p = tk.player;
      const kinds: Character[] = ['wolf', 'witch', 'knight'];
      const a0 = Math.random() * Math.PI * 2;
      cast = kinds.map((kind, i) => {
        const a = a0 + (i / 3) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 190, 70), y = tk.clampY(p.y + Math.sin(a) * 150, 70);
        return { kind, x, y, popAt: time + i * 160, actAt: time + tk.warn(1000) + i * 420, done: false, aim: 0, tx: 0, ty: 0, gone: 0 };
      });
      tk.sfx('boss-phase');
    },
    update(time) {
      const p = tk.player;
      for (const c of cast) {
        // Aim locks a beat before each actor plays its part.
        if (!c.done && time < c.actAt - 300) { c.aim = Math.atan2(p.y - c.y, p.x - c.x); c.tx = p.x; c.ty = p.y; }
        if (c.done || time < c.actAt) continue;
        c.done = true; c.gone = time;
        if (c.kind === 'wolf') {
          tk.spawnLane({ x: c.x, y: c.y, angle: c.aim, halfW: 26, warnMs: 0, fireMs: 260, damage: 13 });
          tk.sfx('dash');
        } else if (c.kind === 'witch') {
          tk.spawnZone({ x: c.tx, y: c.ty, radius: 64, warnMs: 520, damage: 10, slowMult: 0.7, slowMs: 1200, poolMs: 2600, poolDamage: 4 });
          tk.sfx('grenade-throw');
        } else {
          let da = Math.atan2(p.y - c.y, p.x - c.x) - c.aim;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (dist(p.x, p.y, c.x, c.y) < KNIGHT_R + 14 && Math.abs(da) < KNIGHT_HALF) tk.hitPlayer(14, p.x, p.y);
          tk.sfx('slash');
        }
      }
      cast = cast.filter((c) => !c.done || time - c.gone < 700);
    },
    drawGround(g, time) {
      for (const c of cast) {
        if (time < c.popAt) continue;
        const pre = !c.done;
        const k = pre ? clamp(1 - (c.actAt - time) / tk.warn(1000), 0, 1) : 1;
        if (c.kind === 'wolf' && pre) {
          // His dash line: paw-marks in ink along it.
          const ux = Math.cos(c.aim), uy = Math.sin(c.aim);
          g.lineStyle(52, 0x7a7688, 0.06 + k * 0.12); g.lineBetween(c.x, c.y, c.x + ux * 1100, c.y + uy * 1100);
          for (let d = 40; d < 1100 * k; d += 40) { g.fillStyle(INK, 0.4); g.fillCircle(c.x + ux * d - uy * ((d / 40) % 2 ? 7 : -7), c.y + uy * d + ux * ((d / 40) % 2 ? 7 : -7), 4); }
        } else if (c.kind === 'witch' && pre) {
          // The apple's landing spot.
          g.lineStyle(2, POISON, 0.3 + k * 0.5); g.strokeCircle(c.tx, c.ty, 64);
          g.lineStyle(1.4, POISON, 0.3 + k * 0.3); g.lineBetween(c.x, c.y - 30, c.tx, c.ty);
        } else if (c.kind === 'knight') {
          // The swing: a sector of his reach, everything but his back.
          const col = pre ? 0xffc070 : 0xffffff;
          const a0 = c.aim - KNIGHT_HALF, a1 = c.aim + KNIGHT_HALF;
          g.fillStyle(col, pre ? 0.06 + k * 0.14 : 0.35 * (1 - (time - c.gone) / 700));
          g.slice(c.x, c.y, KNIGHT_R, a0, a1, false); g.fillPath();
          g.lineStyle(2, col, pre ? 0.4 + k * 0.5 : 0.6); g.beginPath(); g.arc(c.x, c.y, KNIGHT_R, a0, a1, false); g.strokePath();
        }
      }
    },
    drawAir(g, time) {
      for (const c of cast) {
        if (time < c.popAt) continue;
        const pop = clamp((time - c.popAt) / 260, 0, 1);
        const fade = c.done ? clamp(1 - (time - c.gone) / 700, 0, 1) : 1;
        if (c.kind === 'wolf' && c.done) {
          // Gone down the lane: a grey streak.
          const k = clamp((time - c.gone) / 260, 0, 1);
          standee(g, 'wolf', c.x + Math.cos(c.aim) * 1000 * k, c.y + Math.sin(c.aim) * 1000 * k, 1, 1, fade);
          continue;
        }
        standee(g, c.kind, c.x, c.y, 1.05, pop, fade);
        if (c.kind === 'witch' && c.done) {
          const k = clamp((time - c.gone) / 520, 0, 1);
          apple(g, c.x + (c.tx - c.x) * k, c.y - 30 + (c.ty - c.y + 30) * k - Math.sin(k * Math.PI) * 80, 9, true, k * 10);
        }
        if (c.kind === 'knight' && c.done && time - c.gone < 300) {
          const k = (time - c.gone) / 300;
          g.lineStyle(5, PAGE, 1 - k); g.beginPath(); g.arc(c.x, c.y - 30, KNIGHT_R * 0.8, c.aim - KNIGHT_HALF, c.aim - KNIGHT_HALF + KNIGHT_HALF * 2 * k, false); g.strokePath();
        }
      }
    },
    onPhaseEnd() { cast = []; },
  };
};

// ── Signature: The Book Slams Shut ──────────────────────────────────
// Both covers swing in from the sides and clap together over the yard. Only the gutter is safe —
// the strip under the bookmark ribbon, which drops near you.

const slamShut = (tk: BossToolkit): SignatureMove => {
  let gx = 0, showAt = 0, slamAt = 0, active = false, dealt = false, half = 40;
  const CLOSE = 420;
  return {
    durationMs: 2900,
    windupMs: 650,
    hold: 'brace',
    tell: 'THE BOOK SLAMS SHUT',
    cast(time) {
      const p = tk.player;
      half = tk.hard ? 34 : 42;
      gx = clamp(p.x + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 90), 160, tk.W - 160);
      showAt = time; slamAt = time + tk.warn(1350); active = true; dealt = false;
      tk.sfx('beam-charge');
    },
    update(time) {
      if (!active) return;
      if (!dealt && time >= slamAt + CLOSE) {
        dealt = true;
        const p = tk.player;
        if (Math.abs(p.x - gx) > half - 6) { tk.hitPlayer(20, p.x, p.y); tk.slowPlayer(0.6, 700); }
        tk.sfx('anvil');
      }
      if (time > slamAt + CLOSE + 700) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const c = clamp((time - showAt) / (slamAt - showAt), 0, 1);
      // The covers' shadows on both sides, deepening; the gutter left bright.
      g.fillStyle(0x000000, 0.08 + c * 0.22);
      g.fillRect(0, TOP, gx - half, tk.H - TOP); g.fillRect(gx + half, TOP, tk.W - gx - half, tk.H - TOP);
      g.fillStyle(GILT_LIT, 0.08 + c * 0.1); g.fillRect(gx - half, TOP, half * 2, tk.H - TOP);
      g.lineStyle(2, GILT, 0.4 + c * 0.5); g.lineBetween(gx - half, TOP, gx - half, tk.H); g.lineBetween(gx + half, TOP, gx + half, tk.H);
      if (c > 0.85 && time < slamAt && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.35); g.strokeRect(gx - half, TOP, half * 2, tk.H - TOP); }
    },
    drawAir(g, time) {
      if (!active) return;
      // The ribbon bookmark hangs down the gutter from the top.
      const c = clamp((time - showAt) / 400, 0, 1);
      bookmark(g, gx, TOP, (tk.H - TOP - 20) * c, 22, SEAL, 0.9, Math.sin(time / 300) * 4);
      if (time < slamAt) return;
      // The covers swinging in: book-cloth boards with gilt rules, sliding to the gutter edges.
      const k = clamp((time - slamAt) / CLOSE, 0, 1);
      const e = k * k;
      const fade = time > slamAt + CLOSE ? clamp(1 - (time - slamAt - CLOSE) / 700, 0, 1) : 1;
      const lw = (gx - half) * e, rw = (tk.W - gx - half) * e;
      const lx1 = gx - half, lx0 = lx1 - lw;
      const rx0 = gx + half;
      inkRect(g, lx0, TOP, lw, tk.H - TOP, CLOTH_RED, 0.95 * fade, 3);
      inkRect(g, rx0 + ((tk.W - gx - half) - rw), TOP, rw, tk.H - TOP, CLOTH_RED, 0.95 * fade, 3);
      if (lw > 30) { g.lineStyle(2, GILT, fade); g.strokeRect(lx0 + 14, TOP + 14, lw - 28, tk.H - TOP - 28); }
      if (rw > 30) { g.lineStyle(2, GILT, fade); g.strokeRect(tk.W - rw + 14, TOP + 14, rw - 28, tk.H - TOP - 28); }
      if (k >= 1 && time - slamAt - CLOSE < 200) {
        const f = (time - slamAt - CLOSE) / 200;
        g.lineStyle(8, PAGE, 1 - f); g.lineBetween(gx - half, TOP, gx - half, tk.H); g.lineBetween(gx + half, TOP, gx + half, tk.H);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: And the Moral Is… ────────────────────────────────────
// The moral closes round you as a ring of words, tightening. One word is missing: step out
// through the gap before the ring reaches you.

const theMoral = (tk: BossToolkit): SignatureMove => {
  interface Ring { cx: number; cy: number; formAt: number; closeAt: number; gap: number; dealt: boolean; seed: number }
  let rings: Ring[] = [];
  const R0 = 270, SPD = 170, BAND = 22, GAP = 0.48;
  const radius = (r: Ring, time: number): number => (time < r.closeAt ? R0 : R0 - ((time - r.closeAt) / 1000) * SPD);
  return {
    durationMs: 3400,
    windupMs: 700,
    hold: 'conduct',
    tell: 'AND THE MORAL IS…',
    cast(time) {
      const p = tk.player;
      const gap = Math.random() * Math.PI * 2;
      rings = [{ cx: p.x, cy: p.y, formAt: time, closeAt: time + tk.warn(800), gap, dealt: false, seed: 1 }];
      if (tk.hard) rings.push({ cx: p.x, cy: p.y, formAt: time + 500, closeAt: time + tk.warn(800) + 700, gap: gap + (Math.random() < 0.5 ? 1 : -1) * GAP * 0.8, dealt: false, seed: 2 });
      tk.sfx('holy-chord');
    },
    update(time) {
      const p = tk.player;
      for (const r of rings) {
        if (r.dealt || time < r.closeAt) continue;
        const rad = radius(r, time);
        if (rad < 0) { r.dealt = true; continue; }
        const d = dist(p.x, p.y, r.cx, r.cy);
        if (Math.abs(d - rad) < BAND / 2 + 14 && Math.abs(angDiff(Math.atan2(p.y - r.cy, p.x - r.cx), r.gap)) > GAP) {
          r.dealt = true; tk.hitPlayer(16, p.x, p.y); tk.sfx('judgement');
        }
      }
      rings = rings.filter((r) => radius(r, time) > -20);
    },
    drawGround(g, time) {
      for (const r of rings) {
        if (time < r.formAt) continue;
        const rad = Math.max(2, radius(r, time));
        const form = clamp((time - r.formAt) / tk.warn(800), 0, 1);
        // The gap: a dotted blank where the missing word goes, lit gold.
        g.lineStyle(BAND, GILT_LIT, 0.12 + form * 0.12);
        g.beginPath(); g.arc(r.cx, r.cy, rad, r.gap - GAP, r.gap + GAP, false); g.strokePath();
        const gx = r.cx + Math.cos(r.gap) * rad, gy = r.cy + Math.sin(r.gap) * rad;
        g.fillStyle(GILT, 0.6 + form * 0.3); g.fillTriangle(gx + Math.cos(r.gap) * 18, gy + Math.sin(r.gap) * 18, gx + Math.cos(r.gap + 0.3) * 6, gy + Math.sin(r.gap + 0.3) * 6, gx + Math.cos(r.gap - 0.3) * 6, gy + Math.sin(r.gap - 0.3) * 6);
      }
    },
    drawAir(g, time) {
      for (const r of rings) {
        if (time < r.formAt) continue;
        const rad = Math.max(2, radius(r, time));
        const form = clamp((time - r.formAt) / tk.warn(800), 0, 1);
        // Word-tiles: little parchment blocks round the ring, each with an ink squiggle on it.
        const span = Math.PI * 2 - GAP * 2;
        const n = Math.max(6, Math.floor((rad * span) / 26));
        for (let i = 0; i < n * form; i++) {
          const a = r.gap + GAP + ((i + 0.5) / n) * span;
          const x = r.cx + Math.cos(a) * rad, y = r.cy + Math.sin(a) * rad;
          inkRect(g, x - 10, y - 8, 20, 16, i % 5 === 0 ? GILT_LIT : PAGE, 0.95, 1.2);
          g.lineStyle(1.4, INK, 0.85);
          const s = noise(i * 3.7 + r.seed);
          if (s < 0.33) { g.lineBetween(x - 5, y + 4, x, y - 5); g.lineBetween(x, y - 5, x + 5, y + 4); }
          else if (s < 0.66) { g.strokeCircle(x, y, 4); }
          else { g.lineBetween(x - 4, y - 5, x - 4, y + 5); g.lineBetween(x - 4, y, x + 4, y - 5); g.lineBetween(x - 4, y, x + 4, y + 5); }
        }
      }
    },
    onPhaseEnd() { rings = []; },
  };
};

// ── Signature: The Story Rewrites Itself (hard) ─────────────────────
// Six pools are written on the floor, three HAPPILY (gold, safe) and three NEVER (red, harm). Then a
// red quill strikes some through and swaps them. Whatever reads NEVER when the ink dries comes true.

const rewrite = (tk: BossToolkit): SignatureMove => {
  interface Pool { x: number; y: number; never: boolean; flips: boolean; flipAt: number; flipped: boolean }
  let pools: Pool[] = [];
  let showAt = 0, fireAt = 0, active = false, dealt = false;
  const R = 74;
  return {
    durationMs: 3600,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'THE STORY REWRITES ITSELF',
    cast(time) {
      showAt = time;
      const flipStart = time + tk.warn(1100);
      fireAt = flipStart + tk.warn(1150);
      const cols = 3, xs = [tk.W * 0.2, tk.W * 0.5, tk.W * 0.8], ys = [TOP + 150, tk.H - 130];
      const nevers = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, 3);
      pools = [];
      for (let i = 0; i < 6; i++) {
        pools.push({
          x: xs[i % cols] + (Math.random() - 0.5) * 60, y: ys[Math.floor(i / cols)] + (Math.random() - 0.5) * 40,
          never: nevers.includes(i), flips: Math.random() < 0.6, flipAt: flipStart + i * 110, flipped: false,
        });
      }
      if (!pools.some((p) => p.flips)) pools[0].flips = true;
      active = true; dealt = false;
      tk.sfx('glitch');
    },
    update(time) {
      if (!active) return;
      for (const p of pools) if (p.flips && !p.flipped && time >= p.flipAt) { p.never = !p.never; p.flipped = true; tk.sfx('curse-cast'); }
      if (!dealt && time >= fireAt) {
        dealt = true;
        const pl = tk.player;
        for (const p of pools) {
          if (!p.never) continue;
          tk.boom(p.x, p.y, R, SEAL);
          if (dist(pl.x, pl.y, p.x, p.y) < R + 12) { tk.hitPlayer(20, pl.x, pl.y); break; }
        }
        tk.sfx('explosion-medium');
      }
      if (time > fireAt + 700) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const c = clamp((time - showAt) / (fireAt - showAt), 0, 1);
      for (const p of pools) {
        const col = p.never ? 0xd8303a : GILT;
        const live = time < fireAt;
        g.fillStyle(col, live ? 0.12 + c * 0.14 : p.never ? 0.4 * (1 - (time - fireAt) / 700) : 0);
        g.fillCircle(p.x, p.y, R);
        g.lineStyle(3, col, live ? 0.5 + c * 0.4 : 0); g.strokeCircle(p.x, p.y, R);
        if (!live) continue;
        // The word written in it: a scrawl, gold or red.
        scribble(g, p.x - 34, p.y - 4, 68, 1, 10, p.never ? 0x6a0a12 : GILT_DARK, 0.9, p.never ? 7 : 3, 2.4);
        if (c > 0.9 && p.never && Math.floor(time / 70) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.4); g.strokeCircle(p.x, p.y, R + 3); }
      }
    },
    drawAir(g, time) {
      if (!active) return;
      for (const p of pools) {
        // The strike-through: a red quill slashing across just as the word flips.
        if (!p.flips) continue;
        const k = (time - (p.flipAt - 350)) / 550;
        if (k < 0 || k > 1) continue;
        const x0 = p.x - 50, x1 = p.x + 50;
        const x = x0 + (x1 - x0) * Math.min(1, k * 1.6);
        g.lineStyle(5, 0xd8303a, 1 - Math.max(0, k - 0.6) * 2.5); g.lineBetween(x0, p.y + 6, x, p.y - 6);
        quill(g, x, p.y - 6, -2.6, 46, 0xd86a6a, 1 - Math.max(0, k - 0.6) * 2.5);
      }
    },
    onPhaseEnd() { active = false; pools = []; },
  };
};

// ── Look ─────────────────────────────────────────────────────────────

/** Legend's decor: the open storybook at his side (one), the shut book and its cast (two), torn pages and a red quill (three). */
function drawLegendDecor(g: Phaser.GameObjects.Graphics, s: BossBodyState): void {
  fight.phaseIdx = s.phaseIdx;
  const R = s.radius;
  const ts = s.t / 1000;
  const dir = Math.cos(s.facing) >= 0 ? 1 : -1;
  // Myth: the dark of his body is pricked with stars.
  for (let i = 0; i < 9; i++) {
    const a = noise(i * 1.7) * Math.PI * 2, r = noise(i * 3.3) * R * 0.8;
    const tw = (Math.sin(ts * 2 + i * 1.9) + 1) / 2;
    g.fillStyle(STAR, 0.35 + tw * 0.6); g.fillCircle(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 0.8 + tw * 1.3);
  }
  // Excalibur behind his back: the hilt over the shoulder he never reaches for.
  const hx = s.x - dir * R * 0.75, hy = s.y - R * 0.7;
  g.lineStyle(5, INK, 0.9); g.lineBetween(hx, hy, hx - dir * 14, hy - 26);
  g.lineStyle(3, GILT, 1); g.lineBetween(hx, hy, hx - dir * 14, hy - 26);
  g.lineStyle(4, GILT_DARK, 1); g.lineBetween(hx - 9, hy - 2, hx + 9, hy + 4);
  g.fillStyle(MYTH_LIT, 1); g.fillCircle(hx - dir * 15, hy - 28, 3);

  if (s.phaseIdx === 0) {
    // The great open storybook hovering at his side, a page turning every so often.
    const bx = s.x + dir * R * 1.9, by = s.y + R * 0.35 + Math.sin(ts * 1.5) * 4;
    openBook(g, bx, by, 86, 44, CLOTH_BLUE, 1, true, 5);
    const flip = (ts * 0.8) % 1;
    if (flip < 0.35) {
      const k = flip / 0.35;
      const px = bx + (1 - 2 * k) * 38;
      inked(g, [{ x: bx, y: by - 4 }, { x: px, y: by - 4 - Math.sin(k * Math.PI) * 30 }, { x: px, y: by - 40 - Math.sin(k * Math.PI) * 30 }, { x: bx, y: by - 42 }], PAGE, 1, 1.2);
    }
    // Letters lifting off the page as he reads.
    for (let i = 0; i < 4; i++) {
      const ph = (ts * 0.5 + i / 4) % 1;
      g.fillStyle(GILT_LIT, 0.8 * (1 - ph)); g.fillRect(bx - 20 + i * 12 + Math.sin(ts + i) * 4, by - 46 - ph * 50, 4, 5);
    }
  } else if (s.phaseIdx === 1) {
    // The book shut, clasped and chained across his front like a shield.
    closedBook(g, s.x + dir * R * 0.4, s.y + R * 0.6, 54, 40, CLOTH_RED, 1, GILT);
    g.lineStyle(2, IRON_LIT, 0.9); g.lineBetween(s.x - R * 0.6, s.y + R * 0.3, s.x + R * 0.9, s.y + R * 0.1);
    // His cast, orbiting on their stands — small, waiting for their cue.
    const kinds: Character[] = ['wolf', 'witch', 'knight'];
    kinds.forEach((k, i) => {
      const a = ts * 0.9 + (i / 3) * Math.PI * 2;
      standee(g, k, s.x + Math.cos(a) * R * 2, s.y + R * 0.9 + Math.sin(a) * R * 0.6, 0.45, 1, 0.85);
    });
    if (s.enraged) { g.fillStyle(SEAL, 0.25); g.fillCircle(s.x, s.y, R * 1.2); }
  } else {
    // Torn pages spiralling round him, red scribble crossing him out, a red quill rewriting.
    for (let i = 0; i < 8; i++) {
      const a = ts * 1.6 + (i / 8) * Math.PI * 2;
      const r = R * (1.4 + 0.3 * Math.sin(ts * 2 + i));
      const px = s.x + Math.cos(a) * r, py = s.y + Math.sin(a) * r * 0.8;
      g.fillStyle(PAGE, 0.85); g.fillTriangle(px - 7, py - 5, px + 8, py - 3, px - 2, py + 7);
      g.lineStyle(1, INK_SOFT, 0.6); g.lineBetween(px - 4, py - 1, px + 4, py);
    }
    g.lineStyle(3, 0xd8303a, 0.7);
    g.lineBetween(s.x - R * 0.8, s.y - R * 0.4, s.x + R * 0.8, s.y + R * 0.1);
    g.lineBetween(s.x - R * 0.7, s.y + R * 0.3, s.x + R * 0.75, s.y - R * 0.2);
    const qa = ts * 2.2;
    quill(g, s.x + Math.cos(qa) * R * 1.6, s.y + Math.sin(qa) * R * 1.1, qa + Math.PI * 0.6, 40, 0xd86a6a, 0.95);
  }
  if (s.hurt) { g.lineStyle(2, 0xffffff, 0.6); g.strokeCircle(s.x, s.y, R + 3); }
}

/**
 * The Great Book in Castle Evermore: the hall floor is a storybook lying open — two pages of
 * licensed text either side of a gilt spine, a drop-cap on each page, its red cloth cover showing
 * as the border, and the starry dark of Myth beyond the cover's corners.
 */
function drawLegendArena(g: Phaser.GameObjects.Graphics, W: number, H: number): void {
  const rng = mulberry(5113);
  g.fillStyle(NIGHT, 1); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { g.fillStyle(STAR, 0.3 + rng() * 0.6); g.fillCircle(rng() * W, TOP + rng() * (H - TOP), 0.6 + rng() * 1.2); }
  // The cover: red book-cloth with a gilt rule.
  const cx0 = 14, cy0 = TOP + 8, cw = W - 28, ch = H - TOP - 16;
  inkRect(g, cx0, cy0, cw, ch, CLOTH_RED, 1, 3);
  g.lineStyle(2, GILT, 1); g.strokeRect(cx0 + 6, cy0 + 6, cw - 12, ch - 12);
  // The two pages.
  const px0 = cx0 + 16, py0 = cy0 + 14, pw = (cw - 32) / 2, ph = ch - 28;
  for (const side of [0, 1]) {
    const x = px0 + side * pw;
    g.fillStyle(PAGE, 1); g.fillRect(x, py0, pw, ph);
    // Page-block edges and the curl near the gutter.
    for (let k = 0; k < 4; k++) { g.lineStyle(1, PARCH_DARK, 0.7); g.lineBetween(side ? x + pw - 2 - k * 2 : x + 2 + k * 2, py0 + 2, side ? x + pw - 2 - k * 2 : x + 2 + k * 2, py0 + ph - 2); }
    const gutterX = side ? x : x + pw;
    for (let k = 0; k < 6; k++) { g.fillStyle(PARCH_DARK, 0.12); g.fillRect(side ? gutterX : gutterX - 30 + k * 5, py0, 30 - k * 5, ph); }
    // Drop-cap in an illuminated square, then lines of licensed text.
    const dx = x + 26, dy = py0 + 24;
    inkRect(g, dx, dy, 52, 52, side ? CLOTH_BLUE : CLOTH_PLUM, 1, 2);
    g.lineStyle(5, GILT_LIT, 1); g.strokeCircle(dx + 26, dy + 26, 15);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.fillStyle(GILT, 1); g.fillCircle(dx + 26 + Math.cos(a) * 22, dy + 26 + Math.sin(a) * 22, 2); }
    scribble(g, dx + 64, dy + 8, pw - 116, 4, 13, INK_SOFT, 0.5, 11 + side * 7, 1.3);
    scribble(g, x + 26, dy + 70, pw - 60, Math.floor((ph - 130) / 15), 15, INK_SOFT, 0.42, 23 + side * 5, 1.3);
    // A little margin illustration on each page: a crown on the left, a sword on the right.
    if (!side) {
      const mx = x + pw - 60, my = py0 + ph - 50;
      g.fillStyle(GILT, 0.5); g.fillRect(mx - 18, my, 36, 10);
      for (let k = 0; k < 3; k++) g.fillTriangle(mx - 18 + k * 12, my, mx - 6 + k * 12, my, mx - 12 + k * 12, my - 14);
    } else {
      const mx = x + 60, my = py0 + ph - 46;
      g.lineStyle(3, INK_SOFT, 0.5); g.lineBetween(mx - 26, my + 10, mx + 26, my - 10);
      g.lineStyle(3, GILT, 0.5); g.lineBetween(mx - 18, my + 2, mx - 12, my + 18);
    }
  }
  // The spine down the middle: a gilt-stitched gutter, the ribbon bookmark lying across it.
  const sx = W / 2;
  g.fillStyle(PARCH_DARK, 0.6); g.fillRect(sx - 6, py0, 12, ph);
  g.lineStyle(1.4, GILT_DARK, 0.9);
  for (let y = py0 + 10; y < py0 + ph; y += 22) g.lineBetween(sx - 3, y, sx + 3, y + 10);
  bookmark(g, sx + 4, py0, ph * 0.8, 18, SEAL, 0.9, 30);
  // The censors' seal stamped on the left page's foot: every word here is licensed.
  g.fillStyle(SEAL, 0.5); g.fillCircle(px0 + 70, py0 + ph - 40, 16);
  g.lineStyle(2, lit(SEAL, 0.3), 0.6); g.strokeCircle(px0 + 70, py0 + ph - 40, 10);
  // Faint wash of stars over the page, Myth seeping through the paper.
  for (let i = 0; i < 40; i++) { g.fillStyle(MYTH_LIT, 0.08); g.fillCircle(px0 + rng() * pw * 2, py0 + rng() * ph, 2 + rng() * 6); }
}

// ── The def ──────────────────────────────────────────────────────────

export const LEGEND_BOSS: WorldBossDef = {
  worldId: 'isle:legend',
  name: 'Prince Legend',
  title: 'Hero of Every Tale',
  color: MAIN,
  colorLit: LITC,
  colorDark: DARK,
  accent: ACCENT,
  damageMult: 1.1,

  intro: [
    'Once upon a time, a stranger came to Fable.',
    'And the Prince saved the day. It always ends that way. I wrote it so. Shall we begin?',
  ],
  banter: [
    'Every word you breathe out here is metered. I\'d keep the grunting to a minimum.',
    'You\'re a minor character. Minor characters don\'t get endings. They get a line, and then a page-turn.',
    'Father gave me the pen when I was six. I wrote myself a sword the same afternoon.',
    'The censors burn the stories where I lose. You\'d be amazed how few there are left.',
    'Applause! Where is the applause? Somebody has been paid to clap at this bit.',
    'I never draw the sword. A hero who has to draw his sword is in the wrong story.',
  ],
  defeatLine: 'THE END',
  resumeLine: 'Ah — a new chapter, with a new stranger. Let\'s pick up where the last one fell.',

  phases: [
    {
      name: 'Once Upon a Time',
      line: 'Chapter one. In which the giant walks, and the quill writes, and the page turns. On you.',
      hp: 440,
      cycle: ['sig:giant', 'volley', 'sig:quill', 'lanes', 'sig:page', 'homing', 'sig:giant', 'sig:quill'],
      harass: ['h-snipe', 'h-flak', 'h-rune'],
      restMs: 1100,
      harassMs: 3000,
    },
    {
      name: 'The Moral',
      line: 'Enough reading. CLOSE THE BOOK. Places, everyone — and the moral of the story is YOU LOSE.',
      hp: 520,
      cycle: ['sig:cast', 'sig:shut', 'radial', 'sig:moral', 'sig:cast', 'slamchain', 'sig:shut', 'barrage'],
      harass: ['h-orbs', 'h-lane', 'h-mines'],
      restMs: 1000,
      harassMs: 2700,
    },
  ],

  hard: {
    introLine: 'EVERY TALE ENDS WITH THE PRINCE',
    extraPhase: {
      name: 'Happily Never After',
      line: 'No. No, that\'s not how it goes. Strike that. Strike ALL of that. I\'ll write it again.',
      hp: 380,
      cycle: ['sig:rewrite', 'sig:page', 'sig:cast', 'spiral', 'sig:rewrite', 'sig:moral', 'sig:quill', 'quake'],
      harass: ['h-lane', 'h-snipe', 'h-orbs'],
      restMs: 850,
      harassMs: 2300,
    },
  },

  tuning: {
    lanes: { halfW: 28, warnMs: 900 },
    volley: { count: 5, spreadRad: 0.45 },
  },

  signatures: {
    giant: giantSteps,
    quill: onceUpon,
    page: turnPage,
    cast: theCast,
    shut: slamShut,
    moral: theMoral,
    rewrite,
  },

  look: {
    crest: 'plume', pattern: 'smooth', aura: 'none', hands: 'gauntlet',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: GILT_LIT,
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'none', tint: 'gold', look: { crest: 'crown', pattern: 'runes', aura: 'chains', hands: 'blade', mouth: 'grin' } },
    { movement: 'blink', gimmick: 'none', tint: 'void', look: { crest: 'veil', pattern: 'static', aura: 'glitch', hands: 'wisp', mouth: 'stitch', eyeColor: 0xd8303a } },
  ],

  drawDecor: drawLegendDecor,
  drawArena: drawLegendArena,
};

