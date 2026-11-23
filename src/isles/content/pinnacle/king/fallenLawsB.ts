import type Phaser from 'phaser';
import type { SignatureMove } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../art/IsleArt';
import { LAWS } from './fallenArt';
import {
  FIELD, FS, PLAYER_R, type Pt, at, cite, clampN, dist, release, segDist, shake, strike, wrap,
} from './fallenState';

/**
 * Act IV — the last five laws the Fallen King cites.
 *
 *  THE DRAW (`p4-draw`)            — four lightning rods driven in round you; the current is drawn
 *                                    between them, side by side, then corner to corner, then every rod
 *                                    discharges into him.
 *  THE MARK (`p4-mark`)            — a venom mark set on you: you leave a poisoned trail while you
 *                                    wear it, then it drops at your feet, swells and bursts.
 *  THE LOT (`p4-lot`)              — the floor is a board of six; he rolls, and the face that comes up
 *                                    is condemned. The first roll is rigged — it is always yours.
 *  THE PART (`p4-part`)            — a choir's rings, each with one rest in it, your part, shown on
 *                                    the floor before the ring is sung; it moves a little each bar.
 *  THE ENDLESS NOON (`p4-noon`)    — he holds the case-book up as the gnomon of a sundial and the hour
 *                                    lines nearest you blaze; the sun does not move, so you must. It
 *                                    ends with noon itself: every hour at once.
 */

type G = Phaser.GameObjects.Graphics;
const TAU = Math.PI * 2;

/** A jagged bolt from a to b, fresh each call (seeded so a frame's layers agree). */
function bolt(a: Pt, b: Pt, seed: number, jag: number): Pt[] {
  const rng = mulberry(seed);
  const n = Math.max(3, Math.round(dist(a.x, a.y, b.x, b.y) / 26));
  const nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1;
  const pts: Pt[] = [a];
  for (let i = 1; i < n; i++) {
    const k = i / n, o = (rng() - 0.5) * jag;
    pts.push({ x: a.x + (b.x - a.x) * k + (nx / l) * o, y: a.y + (b.y - a.y) * k + (ny / l) * o });
  }
  pts.push(b);
  return pts;
}

// ── THE DRAW ─────────────────────────────────────────────────────────

/** One discharge: segments between points, telegraphed then struck. */
interface Arc { segs: [Pt, Pt][]; from: number; fireAt: number; fired: boolean }

export const theDraw = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[5];
  const HALF = 14;
  let on = false, t0 = 0, step = 0, endAt = 0;
  let rods: (Pt & { at: number })[] = [];
  let arcs: Arc[] = [];

  const rod = (g: G, x: number, y: number, k: number, time: number, hot: number): void => {
    const h = 44 * k;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, 16, 5);
    g.fillStyle(0x7a4a24, 1); g.fillRect(x - 2.5, y - h, 5, h);
    g.fillStyle(0xc87a3a, 1); g.fillRect(x - 1, y - h, 1.5, h);
    for (const q of [0.3, 0.55]) { g.fillStyle(0xe8e0d0, 1); g.fillEllipse(x, y - h * q, 12, 4); g.fillStyle(0xa09a8a, 1); g.fillEllipse(x, y - h * q + 1.5, 12, 2.5); }
    g.fillStyle(L.color, 0.15 + 0.3 * hot); g.fillCircle(x, y - h, 9 + hot * 6);
    g.fillStyle(L.light, 1); g.fillCircle(x, y - h, 3.5);
    if (Math.floor(time / 90 + x) % 3 === 0) {
      g.lineStyle(1, L.light, 0.8);
      g.lineBetween(x, y - h, x + 6 * Math.sin(time + x), y - h - 7);
    }
  };

  const queue = (time: number): void => {
    const R = rods;
    const at2 = at(tk);
    const plans: [Pt, Pt][][] = [
      [[R[0], R[1]], [R[2], R[3]]],
      [[R[1], R[2]], [R[3], R[0]]],
      [[R[0], R[2]], [R[1], R[3]]],
      R.map((r) => [r, { x: at2.x, y: at2.y - 4 }] as [Pt, Pt]),
    ];
    arcs.push({ segs: plans[step], from: time, fireAt: time + tk.warn(step === 3 ? 900 : 780), fired: false });
    step++;
  };

  return {
    durationMs: 5600,
    windupMs: 500,
    gesture: 'raise',
    tell: 'THE DRAW',
    cast(time) {
      on = true; t0 = time; step = 0; arcs = [];
      cite(tk, 5);
      const p = tk.player;
      const c = { x: clampN(p.x, FIELD.x0 + 130, FIELD.x1 - 130), y: clampN(p.y, FIELD.y0 + 110, FIELD.y1 - 110) };
      rods = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => ({ x: c.x + sx * 130, y: c.y + sy * 110, at: time + i * 130 }));
      endAt = time + 600 + 4 * 1350;
      tk.sfx('electric-charge');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      if (step < 4 && time >= t0 + 650 && arcs.every((a) => a.fired && time > a.fireAt + 300)) queue(time);
      for (const a of arcs) {
        if (a.fired || time < a.fireAt) continue;
        a.fired = true;
        tk.sfx(a.segs.length === 4 ? 'thunder' : 'zap');
        if (a.segs.length === 4) shake(tk, 280, 0.007);
        if (a.segs.some(([u, v]) => segDist(p.x, p.y, u.x, u.y, v.x, v.y) < HALF + PLAYER_R - 2)) strike(tk, 11);
      }
      arcs = arcs.filter((a) => !a.fired || time < a.fireAt + 420);
      if (time > endAt || (step >= 4 && !arcs.length)) { on = false; rods = []; arcs = []; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      for (const a of arcs) {
        const k = clampN((time - a.from) / Math.max(1, a.fireAt - a.from), 0, 1);
        for (const [u, v] of a.segs) {
          if (!a.fired) {
            g.lineStyle(HALF * 2, L.color, 0.05 + 0.08 * k); g.lineBetween(u.x, u.y, v.x, v.y);
            // A thin flicker along the path, more and more often as it fills.
            if (Math.random() < 0.25 + 0.6 * k) { g.lineStyle(1.2, L.light, 0.3 + 0.4 * k); g.strokePoints(bolt(u, v, Math.floor(time / 50) + u.x, 10)); }
          } else {
            const f = 1 - clampN((time - a.fireAt) / 420, 0, 1);
            const seed = Math.floor(time / 40) + Math.floor(u.x * 3 + v.y);
            const pts = bolt(u, v, seed, 26);
            g.lineStyle(10, L.color, 0.25 * f); g.strokePoints(pts);
            g.lineStyle(4, L.light, 0.8 * f); g.strokePoints(pts);
            g.lineStyle(1.5, 0xffffff, f); g.strokePoints(bolt(u, v, seed + 9, 18));
          }
        }
      }
    },
    drawAir(g, time) {
      if (!on) return;
      const hot = arcs.some((a) => a.fired) ? 1 : 0;
      for (const r of rods) {
        const k = clampN((time - r.at) / 160, 0, 1);
        if (k > 0) rod(g, r.x, r.y, k, time, hot);
      }
    },
    onPhaseEnd() { on = false; rods = []; arcs = []; release(); },
  };
};

// ── THE MARK ─────────────────────────────────────────────────────────

/** A drop of the trail the mark leaves behind you. */
interface Drip { x: number; y: number; born: number; r: number }

export const theMark = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[6];
  const PURPLE = 0x7a3a9a;
  const ARM = 650, LIFE = 3800, BURST = 115;
  let on = false, t0 = 0, endAt = 0, lastDrip = 0, lastTouch = -1e9, spits = 0;
  let drips: Drip[] = [];
  let drop: { x: number; y: number; from: number; fireAt: number; fired: boolean } | null = null;
  const MARK_MS = 2600;

  return {
    durationMs: 5200,
    windupMs: 500,
    gesture: 'point',
    tell: 'THE MARK',
    cast(time) {
      on = true; t0 = time; drips = []; drop = null; spits = 0; lastDrip = time;
      cite(tk, 6);
      endAt = time + MARK_MS + tk.warn(850) + 2600;
      tk.sfx('curse-cast');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      const marked = time < t0 + MARK_MS;
      // While you wear it you leave poison behind you.
      if (marked && time - lastDrip > 200) { lastDrip = time; drips.push({ x: p.x, y: p.y + 8, born: time, r: 15 + Math.random() * 5 }); }
      if (time - lastTouch > 650 && drips.some((d) => time - d.born > ARM && dist(p.x, p.y + 8, d.x, d.y) < d.r + PLAYER_R - 6)) {
        lastTouch = time; strike(tk, 5); tk.slowPlayer(0.7, 600); tk.sfx('slime-splat');
      }
      // He spits at you while it works.
      while (spits < 3 && time >= t0 + 500 + spits * 600) {
        spits++;
        const o = at(tk);
        tk.spawnBullet({ x: o.x, y: o.y - 6, angle: Math.atan2(p.y - o.y, p.x - o.x), speed: 250, damage: 6, r: 7, color: L.color });
        tk.sfx('slime-splat');
      }
      if (!marked && !drop) {
        drop = { x: p.x, y: p.y, from: time, fireAt: time + tk.warn(850), fired: false };
        tk.sfx('status-poison');
      }
      if (drop && !drop.fired && time >= drop.fireAt) {
        drop.fired = true;
        tk.sfx('explosion-medium');
        if (dist(p.x, p.y, drop.x, drop.y) < BURST + PLAYER_R - 6) strike(tk, 13);
        // What it splashes stays a while.
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + Math.random() * 0.4;
          drips.push({ x: drop.x + Math.cos(a) * 60, y: drop.y + Math.sin(a) * 44, born: time - ARM, r: 20 });
        }
      }
      drips = drips.filter((d) => time - d.born < LIFE);
      if (time > endAt) { on = false; drips = []; drop = null; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      for (const d of drips) {
        const age = time - d.born;
        const armed = age > ARM;
        const f = clampN((LIFE - age) / 600, 0, 1);
        const grow = clampN(age / 200, 0, 1);
        g.fillStyle(armed ? PURPLE : dim(L.color, 0.4), (armed ? 0.55 : 0.25) * f); g.fillEllipse(d.x, d.y, d.r * 2.2 * grow, d.r * 1.5 * grow);
        g.fillStyle(L.color, (armed ? 0.75 : 0.3) * f); g.fillEllipse(d.x - 2, d.y - 1, d.r * 1.6 * grow, d.r * 1.05 * grow);
        if (armed) {
          const ph = ((time + d.born) / 700) % 1;
          g.lineStyle(1, L.light, (1 - ph) * 0.8 * f); g.strokeCircle(d.x + Math.sin(d.born) * 5, d.y - 1, 2 + ph * 4);
          g.fillStyle(0xffffff, 0.5 * f); g.fillCircle(d.x - d.r * 0.4, d.y - d.r * 0.25, 1.6);
        }
      }
      if (drop) {
        const k = drop.fired ? 1 : clampN((time - drop.from) / (drop.fireAt - drop.from), 0, 1);
        if (!drop.fired) {
          g.fillStyle(PURPLE, 0.1 + 0.12 * k); g.fillCircle(drop.x, drop.y, BURST);
          g.lineStyle(k > 0.78 && Math.floor(time / 80) % 2 === 0 ? 3 : 2, L.light, 0.5 + 0.4 * k); g.strokeCircle(drop.x, drop.y, BURST);
          g.lineStyle(3, L.color, 0.8); g.beginPath(); g.arc(drop.x, drop.y, BURST - 8, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k), false); g.strokePath();
          // The swelling bulb.
          const s = 10 + 18 * k + Math.sin(time / 50) * 2 * k;
          g.fillStyle(PURPLE, 0.9); g.fillCircle(drop.x, drop.y, s);
          g.fillStyle(L.color, 0.9); g.fillCircle(drop.x - s * 0.2, drop.y - s * 0.2, s * 0.7);
          g.fillStyle(0xffffff, 0.6); g.fillCircle(drop.x - s * 0.4, drop.y - s * 0.45, s * 0.18);
        } else {
          const f = 1 - clampN((time - drop.fireAt) / 500, 0, 1);
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * TAU;
            const r = BURST * (1.1 - f * 0.6);
            g.fillStyle(i % 2 ? L.color : PURPLE, f); g.fillCircle(drop.x + Math.cos(a) * r, drop.y + Math.sin(a) * r * 0.8, 6 * f + 1);
          }
        }
      }
    },
    drawAir(g, time) {
      if (!on || time >= t0 + MARK_MS) return;
      // The mark itself, riding on you: a ring of venom with three drips and a draining countdown.
      const p = tk.player;
      const k = clampN((time - t0) / MARK_MS, 0, 1);
      const x = p.x, y = p.y - 40;
      g.fillStyle(PURPLE, 0.85); g.fillCircle(x, y, 10);
      g.lineStyle(3, L.color, 1); g.strokeCircle(x, y, 10);
      g.lineStyle(2, L.light, 0.9); g.beginPath(); g.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k), false); g.strokePath();
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * 6, dl = 4 + ((time / 200 + i) % 1) * 6;
        g.fillStyle(L.color, 1); g.fillCircle(x + dx, y + 10 + dl, 2);
      }
      g.fillStyle(L.light, 1); g.fillCircle(x, y, 3);
    },
    onPhaseEnd() { on = false; drips = []; drop = null; release(); },
  };
};

// ── THE LOT ──────────────────────────────────────────────────────────

/** Pips of a die face `n` (1–6) as unit offsets. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

/** A die face drawn at (x, y), half-size `s`. */
function die(g: G, x: number, y: number, s: number, n: number, a: number, face: number, pip: number): void {
  g.fillStyle(0x000000, 0.3 * a); g.fillRoundedRect(x - s + 2, y - s + 3, s * 2, s * 2, s * 0.3);
  g.fillStyle(face, a); g.fillRoundedRect(x - s, y - s, s * 2, s * 2, s * 0.3);
  g.fillStyle(pip, a);
  for (const [dx, dy] of PIPS[n]) g.fillCircle(x + dx * s * 0.5, y + dy * s * 0.5, s * 0.16);
}

/** One roll: a die tumbling over his head, then the face it lands on condemned. */
interface Roll { faces: number[]; from: number; landAt: number; fireAt: number; fired: boolean }

export const theLot = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[7];
  const TW = (FIELD.x1 - FIELD.x0 + 40) / 3, TH = (FIELD.y1 - FIELD.y0 + 40) / 2;
  const tile = (n: number): { x: number; y: number; w: number; h: number } =>
    ({ x: FIELD.x0 - 20 + (n % 3) * TW, y: FIELD.y0 - 20 + Math.floor(n / 3) * TH, w: TW, h: TH });
  const tileOf = (x: number, y: number): number =>
    clampN(Math.floor((x - FIELD.x0 + 20) / TW), 0, 2) + 3 * clampN(Math.floor((y - FIELD.y0 + 20) / TH), 0, 1);
  let on = false, t0 = 0, rolled = 0, endAt = 0;
  let rolls: Roll[] = [];

  return {
    durationMs: 5800,
    windupMs: 500,
    gesture: 'flex',
    tell: 'THE LOT',
    cast(time) {
      on = true; t0 = time; rolled = 0; rolls = [];
      cite(tk, 7);
      endAt = time + 4 * 1150 + tk.warn(900) + 900;
      tk.sfx('dice');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      while (rolled < 4 && time >= t0 + rolled * 1150) {
        const busy = new Set(rolls.filter((r) => !r.fired).flatMap((r) => r.faces));
        let faces: number[];
        // The first roll is rigged: it always comes up yours. The last is a double.
        if (rolled === 0) faces = [tileOf(p.x, p.y)];
        else {
          const free = [0, 1, 2, 3, 4, 5].filter((n) => !busy.has(n)).sort(() => Math.random() - 0.5);
          faces = free.slice(0, rolled === 3 ? 2 : 1);
        }
        rolls.push({ faces, from: time, landAt: time + 450, fireAt: time + 450 + tk.warn(900), fired: false });
        rolled++;
        tk.sfx('dice');
      }
      for (const r of rolls) {
        if (r.fired || time < r.fireAt) continue;
        r.fired = true;
        tk.sfx('jackpot'); shake(tk, 160, 0.004);
        if (r.faces.includes(tileOf(p.x, p.y))) strike(tk, 12);
      }
      rolls = rolls.filter((r) => !r.fired || time < r.fireAt + 600);
      if (time > endAt) { on = false; rolls = []; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      // The board.
      g.lineStyle(2, L.color, 0.3);
      for (let n = 0; n < 6; n++) { const t = tile(n); g.strokeRect(t.x + 3, t.y + 3, t.w - 6, t.h - 6); }
      for (const r of rolls) {
        if (time < r.landAt) continue;
        for (const n of r.faces) {
          const t = tile(n);
          const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
          if (!r.fired) {
            const k = clampN((time - r.landAt) / (r.fireAt - r.landAt), 0, 1);
            const blink = k > 0.78 && Math.floor(time / 80) % 2 === 0;
            g.fillStyle(L.deep, 0.35 + 0.2 * k); g.fillRect(t.x + 4, t.y + 4, t.w - 8, t.h - 8);
            // The card-back hatching of the Lot.
            g.lineStyle(1, L.color, 0.18);
            for (let d = 0; d < t.w + t.h; d += 22) g.lineBetween(t.x + 4 + Math.max(0, d - t.h), t.y + 4 + Math.min(d, t.h - 8), t.x + 4 + Math.min(d, t.w - 8), t.y + 4 + Math.max(0, d - t.w));
            g.lineStyle(blink ? 4 : 3, blink ? 0xffffff : L.color, 0.6 + 0.35 * k); g.strokeRect(t.x + 4, t.y + 4, t.w - 8, t.h - 8);
            for (const [dx, dy] of PIPS[n + 1]) { g.fillStyle(L.light, 0.35 + 0.5 * k); g.fillCircle(cx + dx * 44, cy + dy * 40, 12); }
          } else {
            const f = 1 - clampN((time - r.fireAt) / 600, 0, 1);
            g.fillStyle(L.light, 0.35 * f); g.fillRect(t.x + 4, t.y + 4, t.w - 8, t.h - 8);
            // Coins and cards coming down on it.
            const rng = mulberry(n * 31 + Math.floor(r.fireAt));
            for (let i = 0; i < 18; i++) {
              const x = t.x + 10 + rng() * (t.w - 20), y = t.y + 10 + rng() * (t.h - 20) - (1 - f) * -10;
              if (i % 3) { g.fillStyle(L.color, f); g.fillEllipse(x, y, 10, 6); g.fillStyle(L.light, f); g.fillEllipse(x - 1, y - 1, 5, 2.5); }
              else { g.fillStyle(0xf4ecd8, f); g.fillRect(x - 5, y - 7, 10, 14); g.fillStyle(L.deep, f); g.fillRect(x - 3, y - 5, 6, 10); }
            }
          }
        }
      }
    },
    drawAir(g, time) {
      if (!on) return;
      const o = at(tk);
      for (const r of rolls) {
        if (time > r.fireAt) continue;
        const k = clampN((time - r.from) / (r.landAt - r.from), 0, 1);
        r.faces.forEach((n, i) => {
          const x = o.x + (i - (r.faces.length - 1) / 2) * 30, y = o.y - 56 - Math.sin(k * Math.PI) * 24;
          // Tumbling: the face flickers until it lands.
          const face = k < 1 ? 1 + (Math.floor(time / 60) + i) % 6 : n + 1;
          die(g, x, y, 11, face, 1, 0xf4ecd8, L.deep);
          if (k >= 1) { g.lineStyle(2, L.color, 0.8); g.strokeRoundedRect(x - 13, y - 13, 26, 26, 4); }
        });
      }
    },
    onPhaseEnd() { on = false; rolls = []; release(); },
  };
};

// ── THE PART ─────────────────────────────────────────────────────────

/** One sung ring: its rest (`gap`) shown before it is sung, then the ring going out. */
interface Ring { gap: number; showAt: number; emitAt: number; r: number; hit: boolean }

export const thePart = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[8];
  const GAP_HALF = 0.5, SPEED = 300, BAND = 12, BAR = 640, N = 6;
  let on = false, c: Pt = { x: 480, y: 320 }, endAt = 0;
  let rings: Ring[] = [];

  return {
    durationMs: 6000,
    windupMs: 500,
    gesture: 'raise',
    locksBody: true,
    tell: 'THE PART',
    cast(time) {
      on = true;
      cite(tk, 8);
      FS.drive = true;
      c = at(tk);
      const p = tk.player;
      const sense = Math.random() < 0.5 ? -1 : 1;
      let gap = Math.atan2(p.y - c.y, p.x - c.x) + sense * 0.9;
      const lead = tk.warn(700);
      rings = [];
      for (let i = 0; i < N; i++) {
        const emitAt = time + lead + i * BAR;
        rings.push({ gap, showAt: emitAt - lead, emitAt, r: 0, hit: false });
        gap += sense * 0.32;
      }
      endAt = time + lead + N * BAR + 2600;
      tk.sfx('holy-chord');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      for (const r of rings) {
        if (time < r.emitAt) continue;
        if (r.r === 0) tk.sfx(rings.indexOf(r) % 2 ? 'drum-hit' : 'sonic-pulse');
        r.r = ((time - r.emitAt) / 1000) * SPEED + 1;
        const d = dist(p.x, p.y, c.x, c.y);
        if (!r.hit && Math.abs(d - r.r) < BAND + PLAYER_R * 0.6 && Math.abs(wrap(Math.atan2(p.y - c.y, p.x - c.x) - r.gap)) > GAP_HALF) {
          r.hit = true; strike(tk, 10);
        }
      }
      if (time > rings[rings.length - 1].emitAt + 200) { FS.drive = false; FS.pose = 'rest'; }
      rings = rings.filter((r) => r.r < 1100);
      if (time > endAt || !rings.length) { on = false; rings = []; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      for (const r of rings) {
        if (time < r.showAt) continue;
        if (time < r.emitAt) {
          // Your part, marked before it is sung: a lit wedge with a rest drawn in it.
          const k = clampN((time - r.showAt) / (r.emitAt - r.showAt), 0, 1);
          g.fillStyle(L.light, 0.05 + 0.07 * k); g.slice(c.x, c.y, 700, r.gap - GAP_HALF, r.gap + GAP_HALF, false); g.fillPath();
          g.lineStyle(1.5, L.color, 0.3 + 0.4 * k);
          for (const s of [-1, 1]) g.lineBetween(c.x, c.y, c.x + Math.cos(r.gap + s * GAP_HALF) * 700, c.y + Math.sin(r.gap + s * GAP_HALF) * 700);
          const rx = c.x + Math.cos(r.gap) * 170, ry = c.y + Math.sin(r.gap) * 170;
          g.fillStyle(L.color, 0.5 + 0.4 * k); g.fillRect(rx - 7, ry - 2, 14, 4);
          g.fillRect(rx - 7, ry - 7, 14, 3);
          continue;
        }
        // The ring: a stave of five lines, notes on it, bar lines either side of the rest.
        const a0 = r.gap + GAP_HALF, a1 = r.gap - GAP_HALF + TAU;
        for (let l = -2; l <= 2; l++) {
          g.lineStyle(l === 0 ? 2 : 1, l === 0 ? L.light : L.color, 0.75);
          g.beginPath(); g.arc(c.x, c.y, Math.max(1, r.r + l * 4), a0, a1, false); g.strokePath();
        }
        const step = Math.max(0.12, 34 / Math.max(r.r, 1));
        let i = 0;
        for (let a = a0 + step / 2; a < a1; a += step, i++) {
          const rr = r.r + ((i * 3) % 5 - 2) * 4;
          const x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
          g.fillStyle(0x2a1a08, 0.95); g.fillEllipse(x, y, 7, 5);
          g.lineStyle(1.2, 0x2a1a08, 0.95); g.lineBetween(x + 3, y, x + 3, y - 12);
        }
        for (const a of [a0, a1]) {
          g.lineStyle(3, L.light, 0.9);
          g.lineBetween(c.x + Math.cos(a) * (r.r - 10), c.y + Math.sin(a) * (r.r - 10), c.x + Math.cos(a) * (r.r + 10), c.y + Math.sin(a) * (r.r + 10));
        }
      }
    },
    onPhaseEnd() { on = false; rings = []; release(); },
  };
};

// ── THE ENDLESS NOON ─────────────────────────────────────────────────

/** One beat of the dial: these hour lines blaze. */
interface Beat { hours: number[]; from: number; fireAt: number; fired: boolean; noon: boolean }

export const theEndlessNoon = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[9];
  const HALF = 20, LEN = 1000, DIAL = 120, SUN = 110, BEATS = 6, BEAT = 600;
  let on = false, t0 = 0, c: Pt = { x: 480, y: 320 }, issued = 0, endAt = 0;
  let beats: Beat[] = [];
  const hourA = (h: number): number => -Math.PI / 2 + (h / 12) * TAU;

  return {
    durationMs: 6800,
    windupMs: 500,
    gesture: 'raise',
    locksBody: true,
    tell: 'THE ENDLESS NOON',
    cast(time) {
      on = true; t0 = time; issued = 0; beats = [];
      cite(tk, 9);
      FS.drive = true; FS.pose = 'gnomon';
      c = at(tk);
      endAt = time + 400 + BEATS * BEAT + tk.warn(1100) + 1400;
      tk.sfx('light-beam');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      while (issued < BEATS && time >= t0 + 400 + issued * BEAT) {
        // The hour nearest you, and the two a third of the dial either side of it.
        const pa = Math.atan2(p.y - c.y, p.x - c.x) + Math.PI / 2;
        const h0 = ((Math.round((pa / TAU) * 12) % 12) + 12) % 12;
        beats.push({ hours: [h0, (h0 + 4) % 12, (h0 + 8) % 12], from: time, fireAt: time + tk.warn(750), fired: false, noon: false });
        issued++;
        tk.sfx('clock-tick');
      }
      if (issued === BEATS && !beats.some((b) => b.noon) && time >= t0 + 400 + BEATS * BEAT) {
        beats.push({ hours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], from: time, fireAt: time + tk.warn(1100), fired: false, noon: true });
        tk.sfx('beam-charge');
      }
      for (const b of beats) {
        if (b.fired || time < b.fireAt) continue;
        b.fired = true;
        tk.sfx(b.noon ? 'judgement' : 'beam-fire');
        if (b.noon) { shake(tk, 400, 0.008); tk.scene.cameras.main.flash(200, 255, 244, 200); }
        const hitRay = b.hours.some((h) => { const a = hourA(h); return segDist(p.x, p.y, c.x, c.y, c.x + Math.cos(a) * LEN, c.y + Math.sin(a) * LEN) < HALF + PLAYER_R - 4; });
        if (hitRay || (b.noon && dist(p.x, p.y, c.x, c.y) < SUN + PLAYER_R * 0.5)) strike(tk, b.noon ? 14 : 10);
      }
      beats = beats.filter((b) => !b.fired || time < b.fireAt + 380);
      if (time > endAt || (issued === BEATS && !beats.length)) { on = false; beats = []; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      // The dial: a gold ring round his feet, twelve hour lines running off to the edges.
      g.fillStyle(L.deep, 0.18); g.fillCircle(c.x, c.y, DIAL);
      g.lineStyle(3, L.color, 0.7); g.strokeCircle(c.x, c.y, DIAL);
      g.lineStyle(1, L.color, 0.5); g.strokeCircle(c.x, c.y, DIAL - 10);
      for (let h = 0; h < 12; h++) {
        const a = hourA(h), ca = Math.cos(a), sa = Math.sin(a);
        g.lineStyle(1, L.color, 0.18); g.lineBetween(c.x + ca * DIAL, c.y + sa * DIAL, c.x + ca * LEN, c.y + sa * LEN);
        g.lineStyle(h % 3 ? 2 : 4, L.light, 0.8); g.lineBetween(c.x + ca * (DIAL - 10), c.y + sa * (DIAL - 10), c.x + ca * (DIAL + 2), c.y + sa * (DIAL + 2));
        if (h === 0) { g.fillStyle(L.light, 0.9); g.fillCircle(c.x + ca * (DIAL + 14), c.y + sa * (DIAL + 14), 5); }
      }
      for (const b of beats) {
        const k = clampN((time - b.from) / Math.max(1, b.fireAt - b.from), 0, 1);
        const f = b.fired ? 1 - clampN((time - b.fireAt) / 380, 0, 1) : 1;
        for (const h of b.hours) {
          const a = hourA(h), ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
          const ex = c.x + ca * LEN, ey = c.y + sa * LEN;
          if (!b.fired) {
            const blink = k > 0.78 && Math.floor(time / 80) % 2 === 0;
            g.fillStyle(L.color, 0.06 + 0.1 * k);
            g.fillPoints([{ x: c.x + px * HALF, y: c.y + py * HALF }, { x: ex + px * HALF, y: ey + py * HALF }, { x: ex - px * HALF, y: ey - py * HALF }, { x: c.x - px * HALF, y: c.y - py * HALF }], true);
            g.lineStyle(blink ? 3 : 2, blink ? 0xffffff : L.light, 0.5 + 0.4 * k); g.lineBetween(c.x, c.y, c.x + ca * LEN * k, c.y + sa * LEN * k);
          } else {
            g.lineStyle(HALF * 2.4, L.color, 0.3 * f); g.lineBetween(c.x, c.y, ex, ey);
            g.lineStyle(HALF * 1.2, L.light, 0.75 * f); g.lineBetween(c.x, c.y, ex, ey);
            g.lineStyle(3, 0xffffff, f); g.lineBetween(c.x, c.y, ex, ey);
          }
        }
        if (b.noon) {
          // Noon itself: the sun come down on the dial.
          const r = b.fired ? SUN * (1 + (1 - f) * 0.2) : SUN * k;
          g.fillStyle(L.light, (b.fired ? 0.6 : 0.15 + 0.2 * k) * f); g.fillCircle(c.x, c.y, r);
          g.lineStyle(3, 0xffffff, 0.8 * f); g.strokeCircle(c.x, c.y, b.fired ? r : SUN);
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TAU + time / 900;
            g.lineStyle(2, lit(L.color, 0.5), 0.6 * f);
            g.lineBetween(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, c.x + Math.cos(a) * (r + 12), c.y + Math.sin(a) * (r + 12));
          }
        }
      }
    },
    onPhaseEnd() { on = false; beats = []; release(); },
  };
};
