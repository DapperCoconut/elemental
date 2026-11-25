import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mulberry, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { burierSeal, dustPuff, shard } from '../art';
import {
  CHALK, DUST, GRANITE, GRANITE_DARK, GRANITE_DEEP, GRANITE_LIT, LICHEN, REGENT, REGENT_DARK, REGENT_LIT, TIMBER, TIMBER_DARK,
} from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Course by Course — Ebba Drystane, the Regent's waller.
 *
 * When a Stonehold household came up short, Ebba was sent with a barrow of stone to wall them up
 * in their own front door before the cart came, course by course, no mortar, every stone
 * through-bonded. In the star's telling she was proud of the work. Nobody ever got out of an Ebba
 * wall.
 *
 * She strings a chalk line across the yard — square across the ground between the two of you,
 * so each of you starts on a side — and walls it, course by course, from one end. The wall stops
 * bodies and shots. The two sides are not the same size, and when the last stone goes in, the
 * *smaller* side is interred: the lid comes down on whoever is in it. The small side is shaded and
 * sealed in violet so you know; get through the open stretch before it closes.
 *
 * The head stone — the newest, at the end she is laying from — can be struck: struck from the big
 * side it is knocked home and the wall hurries; struck from the small side it is knocked out and
 * the wall falls back. So: knock it back while you run, and hurry it while she is the one in the
 * small side. Halfway down she lays from both ends and the gap closes in the middle. The bot runs
 * for the gap when it is shut in, and stands at the head to hurry it when you are.
 */

const ID = fallenId('stonehold', 'course');
const CHALK_MS = 1250;
const BUILD_S = 4.8;
const KNOCK = 72;
const HALF_T = 15;

interface Line { m: Pt; n: Pt; u: Pt; a: Pt; L: number; small: number; smallPoly: Pt[] }
interface Puff { x: number; y: number; at: number }
interface Chip { x: number; y: number; vx: number; vy: number; at: number; spin: number }

/** Clip a convex polygon to the half-plane s·(n·(p−m)) ≥ 0. */
function clipHalf(poly: Pt[], m: Pt, n: Pt, s: number): Pt[] {
  const out: Pt[] = [];
  const f = (p: Pt) => s * ((p.x - m.x) * n.x + (p.y - m.y) * n.y);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
  }
  return out;
}

const area = (p: Pt[]): number => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a.x * b.y - b.x * a.y; }, 0)) / 2;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const rect: Pt[] = [{ x: 40, y: top + 10 }, { x: W - 40, y: top + 10 }, { x: W - 40, y: H - 30 }, { x: 40, y: H - 30 }];
  let line: Line | null = null;
  let state: 'idle' | 'chalk' | 'build' | 'stand' = 'idle';
  let stateAt = 0;
  let next = 0;
  let lenA = 0, lenB = 0;
  let late = false;
  let sealedPoly: Pt[] = [];
  const heads: StrikeTarget[] = [];
  const headHit = [0, 0];
  const prevSide = new Map<Fighter, number>();
  const puffs: Puff[] = [];
  const chips: Chip[] = [];

  const sd = (l: Line, x: number, y: number) => (x - l.m.x) * l.n.x + (y - l.m.y) * l.n.y;
  const along = (l: Line, x: number, y: number) => (x - l.a.x) * l.u.x + (y - l.a.y) * l.u.y;
  const at = (l: Line, t: number): Pt => ({ x: l.a.x + l.u.x * t, y: l.a.y + l.u.y * t });
  const built = (l: Line, t: number) => t >= -10 && t <= l.L + 10 && (t <= lenA + 10 || t >= l.L - lenB - 10);
  const sideOf = (l: Line, f: Fighter) => (sd(l, f.x, f.y) >= 0 ? 1 : -1);

  function lay(time: number): void {
    const mx = (player.x + npc.x) / 2, my = (player.y + npc.y) / 2;
    let dx = npc.x - player.x, dy = npc.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < 80) { dx = 1; dy = 0; } else { dx /= d; dy /= d; }
    const m = { x: clamp(mx, 160, W - 160), y: clamp(my, top + 120, H - 110) };
    const n = { x: dx, y: dy }, u = { x: -dy, y: dx };
    // Clip the infinite line to the yard.
    let t0 = -1e9, t1 = 1e9;
    for (const [p, v, lo, hi] of [[m.x, u.x, 40, W - 40], [m.y, u.y, top + 10, H - 30]] as [number, number, number, number][]) {
      if (Math.abs(v) < 1e-6) continue;
      const ta = (lo - p) / v, tb = (hi - p) / v;
      t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
    }
    const a = { x: m.x + u.x * t0, y: m.y + u.y * t0 };
    const pos = clipHalf(rect, m, n, 1), neg = clipHalf(rect, m, n, -1);
    const small = area(pos) < area(neg) ? 1 : -1;
    line = { m, n, u, a, L: t1 - t0, small, smallPoly: small > 0 ? pos : neg };
    lenA = 0; lenB = 0;
    state = 'chalk'; stateAt = time;
    for (const f of [player, npc]) prevSide.set(f, sideOf(line, f));
    ctx.sfx('trap-set');
  }

  function strikeHead(i: number, by: 'player' | 'npc'): void {
    if (!line || state !== 'build' || tk.now - headHit[i] < 340) return;
    headHit[i] = tk.now;
    const f = by === 'player' ? player : npc;
    const fromSmall = sideOf(line, f) === line.small;
    const delta = fromSmall ? -KNOCK : KNOCK;
    if (i === 0) lenA = clamp(lenA + delta, 0, line.L - lenB); else lenB = clamp(lenB + delta, 0, line.L - lenA);
    const p = at(line, i === 0 ? lenA : line.L - lenB);
    if (fromSmall) for (let k = 0; k < 6; k++) { const a = rng() * Math.PI * 2; chips.push({ x: p.x, y: p.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, at: tk.now, spin: a }); }
    puffs.push({ x: p.x, y: p.y, at: tk.now });
    ctx.sfx(fromSmall ? 'stone-slam' : 'hammer-forge');
  }

  function seal(l: Line): void {
    sealedPoly = l.smallPoly;
    ctx.sfx('gravity-slam');
    for (const f of [player, npc]) {
      if (!alive(f) || sideOf(l, f) !== l.small) continue;
      if (f === player) tk.hitPlayer(28, f.x, f.y);
      else { ctx.hit(npc, 46, f.x, f.y); ctx.float(f.x, f.y - 54, 'INTERRED', '#c9b0e8'); }
      ctx.stun(f, 1000);
      ctx.flash(f.x, f.y, REGENT_LIT);
    }
    for (let i = 0; i < 6; i++) { const p = sealedPoly[i % sealedPoly.length]; puffs.push({ x: (p.x + l.m.x) / 2, y: (p.y + l.m.y) / 2, at: tk.now }); }
  }

  function placeHeads(l: Line): void {
    const want = late ? 2 : 1;
    while (heads.length < want) { const i = heads.length; heads.push(ctx.target({ x: -100, y: -100, r: 22, onStruck: (by) => strikeHead(i, by) })); }
    const pa = at(l, lenA); heads[0].moveTo(pa.x, pa.y - 10);
    if (late) { const pb = at(l, l.L - lenB); heads[1].moveTo(pb.x, pb.y - 10); }
  }
  const parkHeads = () => { for (const h of heads) h.moveTo(-200, -200); };

  return {
    update(time, rawDt) {
      const dt = stepDt(rawDt);
      if (!next) next = time + 2600;
      if (!late && npc.hp < npc.maxHp * 0.5) { late = true; ctx.banner('FROM BOTH ENDS', '#c9b0e8'); ctx.sfx('anvil'); }
      if (state === 'idle' && time >= next && alive(player) && alive(npc)) lay(time);
      const l = line;
      if (l && state === 'chalk' && time >= stateAt + tk.warn(CHALK_MS)) { state = 'build'; stateAt = time; }
      if (l && state === 'build') {
        const rate = l.L / BUILD_S;
        if (late) { lenA += rate * 0.5 * dt; lenB += rate * 0.5 * dt; } else lenA += rate * dt;
        if (lenA + lenB >= l.L) { lenA = l.L - lenB; seal(l); state = 'stand'; stateAt = time; parkHeads(); }
        else { placeHeads(l); if (Math.floor(time / 260) !== Math.floor((time - dt * 1000) / 260)) ctx.sfx('rock-throw'); }
      }
      if (l && state === 'stand' && time >= stateAt + 1500) { state = 'idle'; line = null; sealedPoly = []; next = time + (late ? 1700 : 2300); ctx.sfx('crystal-shatter'); }
      // The built wall stops bodies and shots.
      if (l && (state === 'build' || state === 'stand')) {
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const s = sd(l, f.x, f.y), t = along(l, f.x, f.y);
          const prev = prevSide.get(f) ?? 1;
          if (built(l, t) && (Math.abs(s) < HALF_T || Math.sign(s) !== prev)) ctx.nudge(f, l.n.x * (prev * HALF_T - s), l.n.y * (prev * HALF_T - s));
          else if (Math.abs(s) >= HALF_T || !built(l, t)) prevSide.set(f, s >= 0 ? 1 : -1);
        }
        for (let t = 0; t <= l.L; t += 26) {
          if (!built(l, t)) continue;
          const p = at(l, t);
          for (const sh of ctx.shotsNear(p.x, p.y, 18)) sh.block();
        }
      }
      for (let i = chips.length - 1; i >= 0; i--) { const c = chips[i]; c.x += c.vx * dt; c.y += c.vy * dt; c.spin += dt * 8; if (time - c.at > 500) chips.splice(i, 1); }
      while (puffs.length && time - puffs[0].at > 800) puffs.shift();
    },

    npcSeek() {
      const l = line;
      if (!l || !alive(npc) || state === 'stand' || state === 'idle') return null;
      const big = -l.small;
      if (sideOf(l, npc) === l.small) {
        // Shut in: for the open stretch, and through it.
        const t = late ? (lenA + l.L - lenB) / 2 : clamp(lenA + 90, 0, l.L);
        const p = at(l, t);
        return { x: tk.clampX(p.x + l.n.x * big * 50), y: tk.clampY(p.y + l.n.y * big * 50) };
      }
      if (state === 'build' && sideOf(l, player) === l.small) {
        // You are shut in: stand at the head, on the big side, and knock it home.
        const p = at(l, lenA);
        return { x: tk.clampX(p.x + l.n.x * big * 46), y: tk.clampY(p.y + l.n.y * big * 46) };
      }
      return null;
    },

    drawGround(g, time) {
      const l = line;
      if (l) {
        const k = state === 'chalk' ? clamp((time - stateAt) / tk.warn(CHALK_MS), 0, 1) * 0.3 : state === 'build' ? 0.3 + ((lenA + lenB) / l.L) * 0.5 : 0.8;
        drawSmallSide(g, l.smallPoly, k, time);
        drawString(g, l, state === 'chalk' ? clamp((time - stateAt) / tk.warn(CHALK_MS), 0, 1) : 1);
      }
      for (const p of puffs) dustPuff(g, p.x, p.y, (time - p.at) / 800, 30, DUST);
    },

    drawAir(g, time) {
      const l = line;
      if (l && (state === 'build' || state === 'stand')) {
        drawWall(g, l, 0, lenA, l.n);
        if (lenB > 0) drawWall(g, l, l.L - lenB, l.L, l.n);
        if (state === 'build') {
          drawHead(g, at(l, lenA), l.u, time, time - headHit[0] < 200);
          if (late) drawHead(g, at(l, l.L - lenB), l.u, time, time - headHit[1] < 200);
        }
      }
      if (sealedPoly.length && state === 'stand') drawLid(g, sealedPoly, clamp((time - stateAt) / 300, 0, 1));
      for (const c of chips) shard(g, c.x, c.y, 4, c.spin, GRANITE);
    },

    drawHud(g) {
      // The course count: a row of stones, laid as the wall goes in.
      const n = 16, x = W / 2 - n * 7, y = top + 10;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 6, y - 6, n * 14 + 12, 20, 5);
      const l = line;
      const k = l ? (lenA + lenB) / l.L : 0;
      for (let i = 0; i < n; i++) {
        const laid = l && state !== 'chalk' ? (late ? i < (lenA / l.L) * n || i >= n - (lenB / l.L) * n : i < k * n) : false;
        g.fillStyle(laid ? GRANITE_LIT : 0x3a3430, 1); g.fillRoundedRect(x + i * 14, y + (i % 2) * 1.5, 12, 7, 2);
        if (laid) { g.lineStyle(1, GRANITE_DEEP, 1); g.strokeRoundedRect(x + i * 14, y + (i % 2) * 1.5, 12, 7, 2); }
      }
      if (l && k > 0.75) { g.fillStyle(REGENT_LIT, 1); g.fillCircle(x + n * 14 + 2, y + 4, 3); }
    },

    destroy() { for (const h of heads) h.remove(); },
  };
}

/** The doomed side: violet wash that deepens course by course, the Burier's seal daubed in its middle. */
function drawSmallSide(g: G, poly: Pt[], k: number, time: number): void {
  if (poly.length < 3) return;
  g.fillStyle(REGENT_DARK, 0.1 + k * 0.25); g.fillPoints(poly, true);
  const c = poly.reduce((s, p) => ({ x: s.x + p.x / poly.length, y: s.y + p.y / poly.length }), { x: 0, y: 0 });
  burierSeal(g, c.x, c.y, 22 + k * 10, REGENT_LIT, 0.3 + k * 0.5 + Math.sin(time / 200) * 0.05 * k);
}

/** The mason's string, pegged at both ends, and the chalk line under it. */
function drawString(g: G, l: Line, k: number): void {
  const a = l.a, b = at2(l, l.L * k);
  g.lineStyle(26, GRANITE_DARK, 0.12); g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(2, CHALK, 0.8); g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(1, 0xd8c8a0, 0.9); g.lineBetween(a.x + 2, a.y - 10, b.x + 2, b.y - 10);
  for (const p of [a, b]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 2, p.y - 14, 4, 16);
    g.fillStyle(TIMBER, 1); g.fillRect(p.x - 1, p.y - 14, 2, 14);
  }
}
const at2 = (l: Line, t: number): Pt => ({ x: l.a.x + l.u.x * t, y: l.a.y + l.u.y * t });

/** Dry-stone wall: three courses of flat stones, staggered, and a coping of stones set on edge. */
function drawWall(g: G, l: Line, t0: number, t1: number, n: Pt): void {
  if (t1 - t0 < 2) return;
  const rng = mulberry(Math.round(l.a.x * 7 + l.a.y));
  const quad = (t: number, w: number, across: number, lift: number): Pt[] => {
    const p = at2(l, t), q = at2(l, t + w);
    return [
      { x: p.x - n.x * across, y: p.y - n.y * across - lift }, { x: q.x - n.x * across, y: q.y - n.y * across - lift },
      { x: q.x + n.x * across, y: q.y + n.y * across - lift }, { x: p.x + n.x * across, y: p.y + n.y * across - lift },
    ];
  };
  const a = at2(l, t0), b = at2(l, t1);
  g.lineStyle(HALF_T * 2 + 8, 0x000000, 0.22); g.lineBetween(a.x + 4, a.y + 6, b.x + 4, b.y + 6);
  for (let c = 0; c < 3; c++) {
    const across = HALF_T - c * 2, lift = c * 7;
    for (let t = t0 + (c % 2) * 8; t < t1; t += 16) {
      const w = Math.min(14 + rng() * 2, t1 - t);
      if (w < 3) continue;
      const shade = c === 2 ? GRANITE_LIT : rng() < 0.3 ? GRANITE_DARK : GRANITE;
      g.fillStyle(GRANITE_DEEP, 1); g.fillPoints(quad(t, w, across, lift - 2), true);
      g.fillStyle(shade, 1); g.fillPoints(quad(t + 0.5, w - 1, across - 1, lift), true);
    }
  }
  // Coping stones on edge, and a little lichen already, because she builds like the old wallers.
  for (let t = t0 + 4; t < t1; t += 7) {
    const p = at2(l, t);
    g.lineStyle(3, GRANITE_DEEP, 1); g.lineBetween(p.x - n.x * 9, p.y - n.y * 9 - 22, p.x + n.x * 9, p.y + n.y * 9 - 22);
    g.lineStyle(1.5, GRANITE_LIT, 0.8); g.lineBetween(p.x - n.x * 8, p.y - n.y * 8 - 23, p.x + n.x * 8, p.y + n.y * 8 - 23);
    if (rng() < 0.12) { g.fillStyle(LICHEN, 0.8); g.fillCircle(p.x + n.x * 6, p.y + n.y * 6 - 12, 2); }
  }
}

/** The head stone: a long through-stone waiting to go in, chalk-ringed — the one you can strike. */
function drawHead(g: G, p: Pt, u: Pt, time: number, hit: boolean): void {
  const pulse = 0.5 + Math.sin(time / 130) * 0.3;
  glow(g, p.x, p.y - 10, 30, CHALK, 0.04 * pulse, 2);
  const nx = -u.y, ny = u.x;
  const pts = [
    { x: p.x - nx * 24 - u.x * 9, y: p.y - ny * 24 - u.y * 9 - 26 }, { x: p.x - nx * 24 + u.x * 9, y: p.y - ny * 24 + u.y * 9 - 26 },
    { x: p.x + nx * 24 + u.x * 9, y: p.y + ny * 24 + u.y * 9 - 26 }, { x: p.x + nx * 24 - u.x * 9, y: p.y + ny * 24 - u.y * 9 - 26 },
  ];
  g.fillStyle(GRANITE_DEEP, 1); g.fillPoints(pts.map((q) => ({ x: q.x + 2, y: q.y + 3 })), true);
  g.fillStyle(hit ? 0xffffff : GRANITE_LIT, 1); g.fillPoints(pts, true);
  g.lineStyle(2, CHALK, pulse); g.strokeCircle(p.x, p.y - 22, 26);
  g.fillStyle(REGENT, 0.8); g.fillCircle(p.x, p.y - 26, 3);
}

/** The lid coming down on the small side: a shadow that falls, then grey dust over all of it. */
function drawLid(g: G, poly: Pt[], k: number): void {
  g.fillStyle(0x1a1620, 0.25 + k * 0.35); g.fillPoints(poly, true);
  g.lineStyle(4, REGENT, 0.6 * k); g.strokePoints(poly, true);
  g.fillStyle(DUST, 0.18 * (1 - k * 0.5)); g.fillPoints(poly, true);
}

export const FALLEN_COURSE: GimmickDef = {
  id: ID,
  rules: 'She walls the yard on a chalk line; shut, the smaller side is interred. Strike the head stone: from the big side it hurries, from the small it falls.',
  make,
};
