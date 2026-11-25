import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mulberry, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { dustPuff } from '../art';
import {
  CHALK, DUST, EARTH_DARK, GRANITE, GRANITE_DARK, GRANITE_DEEP, GRANITE_LIT, LICHEN, LICHEN_LIT, REGENT, REGENT_DARK,
  REGENT_LIT, TIMBER_DARK, TURF, TURF_DARK, TURF_LIT,
} from '../palette';
import { alive, clamp, dist, segDist, segNearest, stepDt } from '../util';

/**
 * Beating the Bounds — Reeve Wystan Merestone, land-reeve of the Stonehold shoulder.
 *
 * In the star's telling Wystan walked the Prince's bounds every spring with a drum and a gang of
 * boys with willow wands, and every spring the merestones stood a little further out into some
 * household's field. Five merestones stand in the yard and the ground they close in is *Crown
 * land*, ploughed in the Regent's violet: inside it you take more harm, and Wystan takes less.
 *
 * On the drum the bounds are beaten: the edges between the stones chalk up bright, then a reeve's
 * boy runs the circuit edge by edge, and whoever stands on the line he is beating is bumped — hit,
 * thrown off the land and held a moment. Step off the lines, inside or out.
 *
 * The stones are only stones. Strike one and it is knocked a step away from whoever struck it —
 * the bounds move. Knock them in round him so an edge runs under his feet when the boy comes, or
 * drag the land off him altogether (out of bounds he takes more). Halfway down the bounds begin
 * to walk on their own, creeping toward you, so the land keeps trying to claim you. The bot goes
 * home to the middle of his land, and steps clear of a line before the boy reaches it.
 */

const ID = fallenId('stonehold', 'bounds');
const STONE_R = 22;
const KNOCK = 76;
const WARN_MS = 1150;
const EDGE_GAP = 330;
const EDGE_HALF = 22;
const CREEP = 16;

interface Mere { x: number; y: number; tx: number; ty: number; hitAt: number; seed: number; n: number; target: StrikeTarget | null }
interface Puff { x: number; y: number; at: number }

/** Point-in-polygon (even-odd). */
function inside(poly: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cx0 = W / 2, cy0 = (top + H) / 2 + 10;
  const stones: Mere[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    const x = cx0 + Math.cos(a) * 200, y = cy0 + Math.sin(a) * 150;
    stones.push({ x, y, tx: x, ty: y, hitAt: -1e9, seed: i * 31 + 7, n: i + 1, target: null });
  }
  const puffs: Puff[] = [];
  let started = false;
  let late = false;
  let nextBeat = 0;
  let beatAt = 0;
  let pairs: [Mere, Mere][] = [];
  let struck: boolean[] = [];
  let bumpedAt = -1e9;

  const centroid = (): Pt => ({ x: stones.reduce((s, m) => s + m.x, 0) / 5, y: stones.reduce((s, m) => s + m.y, 0) / 5 });
  /** The stones in order round their centre: the bounds as a polygon. */
  const ring = (): Mere[] => {
    const c = centroid();
    return [...stones].sort((a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x));
  };
  const isIn = (f: Fighter): boolean => inside(ring(), f.x, f.y);
  const firstAt = (): number => beatAt + tk.warn(WARN_MS);

  function knock(m: Mere, by: 'player' | 'npc'): void {
    const now = tk.now;
    if (now - m.hitAt < 320) return;
    m.hitAt = now;
    const f = by === 'player' ? player : npc;
    let dx = m.x - f.x, dy = m.y - f.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
    let tx = tk.clampX(m.tx + dx * KNOCK, 60), ty = clamp(m.ty + dy * KNOCK, top + 50, H - 50);
    for (const o of stones) {
      if (o === m) continue;
      const od = dist(tx, ty, o.tx, o.ty);
      if (od < 70) { tx = o.tx + ((tx - o.tx) / Math.max(1, od)) * 70; ty = o.ty + ((ty - o.ty) / Math.max(1, od)) * 70; }
    }
    m.tx = tk.clampX(tx, 60); m.ty = clamp(ty, top + 50, H - 50);
    puffs.push({ x: m.x, y: m.y, at: now });
    ctx.sfx('stone-slam');
  }

  for (const m of stones) m.target = ctx.target({ x: m.x, y: m.y - 16, r: STONE_R, onStruck: (by) => knock(m, by) });

  /** The boy brings his wand down on one edge: whoever is on it is bumped off the land. */
  function beat(a: Mere, b: Mere): void {
    const c = centroid();
    ctx.sfx('whip');
    for (const f of [player, npc]) {
      if (!alive(f) || segDist(f.x, f.y, a.x, a.y, b.x, b.y) > EDGE_HALF + 12) continue;
      const p = segNearest(f.x, f.y, a.x, a.y, b.x, b.y);
      let nx = p.x - c.x, ny = p.y - c.y;
      const nd = Math.hypot(nx, ny) || 1; nx /= nd; ny /= nd;
      if (f === player) tk.hitPlayer(16, f.x, f.y); else { ctx.hit(npc, 26, f.x, f.y); ctx.float(f.x, f.y - 52, 'BUMPED', '#c9b0e8'); }
      ctx.nudge(f, nx * 64, ny * 64);
      ctx.stun(f, 480);
      ctx.flash(p.x, p.y, REGENT_LIT);
      bumpedAt = tk.now;
    }
  }

  return {
    update(time, rawDt) {
      const dt = stepDt(rawDt);
      if (!started) { started = true; nextBeat = time + 3200; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        ctx.banner('THE BOUNDS WALK', '#c9b0e8');
        ctx.sfx('stone-rise');
      }
      for (const m of stones) {
        if (late && alive(player) && dist(m.tx, m.ty, player.x, player.y) > 110) {
          const d = dist(m.tx, m.ty, player.x, player.y);
          m.tx = tk.clampX(m.tx + ((player.x - m.tx) / d) * CREEP * dt, 60);
          m.ty = clamp(m.ty + ((player.y - m.ty) / d) * CREEP * dt, top + 50, H - 50);
        }
        const k = Math.min(1, dt * 9);
        m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k;
        m.target?.moveTo(m.x, m.y - 16);
      }
      if (!beatAt && time >= nextBeat) {
        beatAt = time;
        const r = ring();
        pairs = r.map((m, i) => [m, r[(i + 1) % r.length]] as [Mere, Mere]);
        struck = pairs.map(() => false);
        ctx.sfx('drum-hit');
      }
      if (beatAt) {
        const first = firstAt();
        pairs.forEach(([a, b], i) => {
          if (!struck[i] && time >= first + i * EDGE_GAP) { struck[i] = true; beat(a, b); }
        });
        if (time >= first + pairs.length * EDGE_GAP + 300) { beatAt = 0; nextBeat = time + (late ? 4600 : 5800); }
      }
      while (puffs.length && time - puffs[0].at > 700) puffs.shift();
    },

    playerTakenMult: () => (alive(player) && isIn(player) ? 1.3 : 1),
    npcTakenMult: () => (alive(npc) && isIn(npc) ? 0.75 : 1.15),

    npcSeek() {
      if (!alive(npc)) return null;
      const c = centroid();
      if (beatAt) {
        // Off the line before the boy reaches it: toward the middle of the land.
        for (const [a, b] of pairs) {
          if (segDist(npc.x, npc.y, a.x, a.y, b.x, b.y) < EDGE_HALF + 60) return { x: tk.clampX(c.x), y: tk.clampY(c.y) };
        }
      }
      if (!isIn(npc)) return { x: tk.clampX(c.x), y: tk.clampY(c.y) };
      return null;
    },

    drawGround(g, time) {
      const r = ring();
      drawLand(g, r, top, H, time);
      const first = beatAt ? firstAt() : 0;
      r.forEach((a, i) => {
        const b = r[(i + 1) % r.length];
        const pi = pairs.findIndex(([p, q]) => p === a && q === b);
        const hot = beatAt > 0 && pi >= 0 && !struck[pi];
        const due = hot ? clamp(1 - (first + pi * EDGE_GAP - time) / (first + pi * EDGE_GAP - beatAt), 0, 1) : 0;
        drawEdge(g, a, b, hot, due, time);
      });
      for (const p of puffs) dustPuff(g, p.x, p.y, (time - p.at) / 700, 26, DUST);
    },

    drawAir(g, time) {
      for (const m of [...stones].sort((a, b) => a.y - b.y)) drawMere(g, m, time - m.hitAt < 260);
      if (beatAt) drawBoy(g, pairs, struck, firstAt(), beatAt, time);
      if (time - bumpedAt < 400) glow(g, player.x, player.y, 30, REGENT_LIT, 0.03, 2);
    },

    drawHud(g, time) {
      // A reeve's terrier-map: the bounds in violet ink, two dots for the two of you, and the drum.
      const w = 104, h = 64, x = W / 2 - w / 2, y = top + 6;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 5);
      g.fillStyle(0xe8dcbc, 0.95); g.fillRoundedRect(x, y, w, h, 3);
      g.lineStyle(1, 0xc8b890, 1); g.lineBetween(x + 4, y + h - 10, x + w - 4, y + h - 10);
      const sx = (px: number) => x + 4 + ((px - 40) / (W - 80)) * (w - 8);
      const sy = (py: number) => y + 4 + ((py - top) / (H - top)) * (h - 16);
      const poly = ring().map((m) => ({ x: sx(m.x), y: sy(m.y) }));
      g.fillStyle(REGENT, 0.22); g.fillPoints(poly, true);
      g.lineStyle(1.5, REGENT_DARK, 0.9); g.strokePoints(poly, true);
      for (const p of poly) { g.fillStyle(GRANITE_DARK, 1); g.fillCircle(p.x, p.y, 2); }
      g.fillStyle(0x3a6aa8, 1); g.fillCircle(sx(player.x), sy(player.y), 2.6);
      g.fillStyle(0xb04030, 1); g.fillCircle(sx(npc.x), sy(npc.y), 2.6);
      // The drum: a bar that fills toward the next beating.
      const k = beatAt ? 1 : clamp(1 - (nextBeat - time) / (late ? 4600 : 5800), 0, 1);
      g.fillStyle(0x5a4630, 1); g.fillRect(x + 6, y + h - 7, w - 12, 4);
      g.fillStyle(beatAt ? REGENT_LIT : 0xb89a68, 1); g.fillRect(x + 6, y + h - 7, (w - 12) * k, 4);
    },

    destroy() { for (const m of stones) m.target?.remove(); },
  };
}

/** The Crown's land: violet-washed, ploughed in furrows that only run inside the bounds. */
function drawLand(g: G, poly: Pt[], top: number, H: number, time: number): void {
  g.fillStyle(REGENT, 0.13); g.fillPoints(poly, true);
  for (let y = top + 8; y < H; y += 16) {
    const xs: number[] = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > y) !== (b.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      g.lineStyle(3, EARTH_DARK, 0.35); g.lineBetween(xs[k] + 6, y + 2, xs[k + 1] - 6, y + 2);
      g.lineStyle(1.5, TURF_DARK, 0.4); g.lineBetween(xs[k] + 6, y - 2, xs[k + 1] - 6, y - 2);
      // Little crown-stakes every so often along the furrows.
      for (let sx = xs[k] + 30; sx < xs[k + 1] - 20; sx += 90) {
        g.fillStyle(REGENT_DARK, 0.5); g.fillRect(sx, y - 6, 2, 6);
        g.fillStyle(REGENT_LIT, 0.4 + Math.sin(time / 700 + sx) * 0.1); g.fillTriangle(sx + 2, y - 6, sx + 7, y - 4.5, sx + 2, y - 3);
      }
    }
  }
}

/** A bound between two stones: a turf bank with a chalk line, burning violet as the boy comes. */
function drawEdge(g: G, a: Pt, b: Pt, hot: boolean, due: number, time: number): void {
  g.lineStyle(EDGE_HALF * 2, TURF, 0.35); g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(6, TURF_LIT, 0.4); g.lineBetween(a.x, a.y + 3, b.x, b.y + 3);
  g.lineStyle(2, CHALK, 0.75); g.lineBetween(a.x, a.y, b.x, b.y);
  // Tufts along the bank.
  const n = Math.floor(dist(a.x, a.y, b.x, b.y) / 22);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    g.lineStyle(1.2, TURF_DARK, 0.8); g.lineBetween(x - 3, y + 5, x - 1, y - 2); g.lineBetween(x + 2, y + 5, x + 3, y - 1);
  }
  if (!hot) return;
  g.lineStyle(EDGE_HALF * 2 + 6, REGENT_LIT, 0.08 + due * 0.22); g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(3, REGENT_LIT, 0.5 + due * 0.5);
  const len = dist(a.x, a.y, b.x, b.y), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
  for (let s = ((time / 20) % 24); s < len; s += 24) g.lineBetween(a.x + ux * s, a.y + uy * s, a.x + ux * Math.min(len, s + 12), a.y + uy * Math.min(len, s + 12));
}

/** A merestone: a squat dressed stone with a crown cut in its face, its tally number in chalk. */
function drawMere(g: G, m: Mere, struck: boolean): void {
  const rng = mulberry(m.seed);
  const x = m.x, y = m.y, w = 30, h = 40;
  shadow(g, x + 6, y, w * 1.8, 12, 0.34);
  g.fillStyle(EARTH_DARK, 1); g.fillEllipse(x, y - 1, w * 1.3, 10);
  g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(x - w / 2 + 3, y - h + 2, w, h, { tl: 12, tr: 12, bl: 2, br: 2 });
  g.fillStyle(struck ? GRANITE_LIT : GRANITE, 1); g.fillRoundedRect(x - w / 2, y - h, w, h, { tl: 12, tr: 12, bl: 2, br: 2 });
  g.fillStyle(GRANITE_LIT, 0.5); g.fillRoundedRect(x - w / 2 + 2, y - h + 2, 8, h - 6, { tl: 10, tr: 0, bl: 0, br: 0 });
  // Tool marks across the dressed face.
  for (let i = 0; i < 6; i++) { g.lineStyle(1, GRANITE_DEEP, 0.35); const ly = y - h + 8 + i * 5; g.lineBetween(x - 10, ly, x + 11, ly + 1); }
  // The crown, cut and inlaid in the Regent's violet.
  const cy = y - h + 15;
  g.fillStyle(REGENT_DARK, 1); g.fillRect(x - 7, cy, 14, 5);
  g.fillTriangle(x - 7, cy, x - 7, cy - 6, x - 3, cy); g.fillTriangle(x - 3, cy, x, cy - 8, x + 3, cy); g.fillTriangle(x + 3, cy, x + 7, cy - 6, x + 7, cy);
  g.fillStyle(REGENT_LIT, 0.8); g.fillCircle(x, cy - 7, 1.2);
  // Tally in chalk.
  g.lineStyle(1.6, CHALK, 0.9);
  for (let k = 0; k < m.n; k++) g.lineBetween(x - 8 + k * 4, y - 16, x - 8 + k * 4, y - 8);
  for (let i = 0; i < 4; i++) { g.fillStyle(LICHEN, 0.8); const lx = x + (rng() - 0.5) * w * 0.8, ly = y - rng() * h * 0.7 - 4; g.fillCircle(lx, ly, 1.6 + rng() * 2); g.fillStyle(LICHEN_LIT, 0.7); g.fillCircle(lx - 0.6, ly - 0.6, 0.8); }
  g.fillStyle(DUST, 0.6); g.fillEllipse(x - 6, y - 2, 18, 5);
  if (struck) { g.lineStyle(2, 0xffffff, 0.6); g.strokeRoundedRect(x - w / 2 - 3, y - h - 3, w + 6, h + 6, 12); }
}

/** The reeve's boy: smock, cap, a willow wand in leaf, running the bounds edge by edge. */
function drawBoy(g: G, pairs: [Mere, Mere][], struck: boolean[], first: number, beatAt: number, time: number): void {
  if (!pairs.length) return;
  let i = Math.floor((time - first) / EDGE_GAP);
  let k = (time - first) / EDGE_GAP - i;
  if (time < first) { i = 0; k = 0; }
  if (i >= pairs.length) return;
  const [a, b] = pairs[i];
  const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k - 6;
  const bob = Math.abs(Math.sin(time / 70)) * 3;
  const swing = time < first ? Math.sin((time - beatAt) / 120) * 0.4 - 1.2 : -2.2 + k * 2.6;
  shadow(g, x, y + 6, 22, 7, 0.3);
  // Legs mid-stride.
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - 2, y - 6, x - 5 + Math.sin(time / 70) * 4, y + 4); g.lineBetween(x + 2, y - 6, x + 5 - Math.sin(time / 70) * 4, y + 4);
  // Smock and head.
  g.fillStyle(0xd8ccb0, 1); g.fillTriangle(x - 8, y - 6 - bob, x + 8, y - 6 - bob, x, y - 24 - bob);
  g.fillRect(x - 6, y - 20 - bob, 12, 14);
  g.fillStyle(0xe8c0a0, 1); g.fillCircle(x, y - 27 - bob, 5);
  g.fillStyle(REGENT, 1); g.fillEllipse(x, y - 31 - bob, 12, 5);
  // The wand: a whippy willow rod with leaves at the tip.
  const hx = x + 5, hy = y - 18 - bob;
  const tx = hx + Math.cos(swing) * 30, ty = hy + Math.sin(swing) * 30;
  g.lineStyle(2, 0x8a7a40, 1); g.lineBetween(hx, hy, tx, ty);
  for (let l = 0; l < 4; l++) { g.fillStyle(l % 2 ? 0x8fa850 : 0x6f8a3a, 1); g.fillEllipse(tx - Math.cos(swing) * l * 5 + (l % 2 ? 3 : -3), ty - Math.sin(swing) * l * 5, 5, 2.5); }
  if (!struck[i] || k < 0.25) return;
  g.lineStyle(2, REGENT_LIT, 0.6 * (1 - k)); g.strokeCircle(tx, ty, 10 + k * 14);
}

export const FALLEN_BOUNDS: GimmickDef = {
  id: ID,
  rules: 'Merestones bound Crown land: in it you take more, he less. Strike a stone to knock it a step. On the drum the bounds are beaten: get off the lines.',
  make,
};
