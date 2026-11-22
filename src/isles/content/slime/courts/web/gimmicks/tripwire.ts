import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { BARK_DARK, LAMP_HOT, PLANK, PLANK_DARK, SILK_LIT, SPIDER_GOLD } from '../palette';
import { alive, clamp, dist, segCross, segDist, segT, sideOf, stepDt, wallToWall } from '../util';

/**
 * Tripwire — Trapper Snare.
 *
 * Snare sets the wires on the Long Strand, and he sets them in his yard for practice. A wire runs
 * wall to wall through two brass pegs, spider-silk so fine you only see it when the light runs
 * along it. Step across one and it catches your ankle — held a breath — and at both walls the
 * crossbows it was tied to let go: bolts fly in along the wire from each end and meet in the
 * middle. Whoever is still standing on the wire is skewered.
 *
 * Snare lays a new wire as he goes: a peg where he stands, a second where he stands a moment
 * later. The wires trip him as readily as you — and the pegs can be struck. Strike a peg and its
 * wire fires at once, whoever is on it. Watch him cross, then strike.
 */

const MAX_WIRES = 4;
const SNAG_MS = 380;
const FIRE_DELAY = 440;
const FLIGHT_MS = 260;
const BOLT_DMG = 14;
const BOLT_HALF = 24;

interface Wire {
  /** Wall to wall. */
  x0: number; y0: number; x1: number; y1: number;
  pegs: StrikeTarget[];
  armedAt: number;
  /** -1 = set; otherwise when it was tripped (bolts fly FIRE_DELAY later). */
  trippedAt: number;
  fired: boolean;
  seed: number;
}

interface Laying { at: number; x: number; y: number; peg: StrikeTarget }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const wires: Wire[] = [];
  const last = new Map<Fighter, Pt>([[player, { x: player.x, y: player.y }], [npc, { x: npc.x, y: npc.y }]]);
  const layEvery = ctx.hard ? 4200 : 5200;
  const LAY_GAP = 1100;
  let nextLay = 0;
  let laying: Laying | null = null;
  let started = false;
  const X0 = 24, X1 = W - 24, Y0 = top + 8, Y1 = H - 12;

  function dropWire(i: number): void {
    for (const p of wires[i].pegs) p.remove();
    wires.splice(i, 1);
  }

  function trip(w: Wire, time: number, by: Fighter | null): void {
    if (w.trippedAt >= 0) return;
    w.trippedAt = time;
    ctx.sfx('trap-snap');
    if (by && alive(by)) {
      ctx.root(by, SNAG_MS);
      ctx.float(by.x, by.y - 44, 'TRIPPED', '#ffe6a8');
    } else {
      const mx = (w.x0 + w.x1) / 2, my = (w.y0 + w.y1) / 2;
      ctx.float(mx, my - 20, 'TWANG', '#ffe6a8');
    }
  }

  function makeWire(ax: number, ay: number, bx: number, by: number, time: number, armDelay: number): Wire | null {
    const ends = wallToWall(ax, ay, bx, by, X0, Y0, X1, Y1);
    if (!ends) return null;
    while (wires.length >= MAX_WIRES) dropWire(0);
    const w: Wire = { x0: ends[0], y0: ends[1], x1: ends[2], y1: ends[3], pegs: [], armedAt: time + armDelay, trippedAt: -1, fired: false, seed: rng() * 10 };
    for (const [x, y] of [[ax, ay], [bx, by]] as [number, number][]) {
      w.pegs.push(ctx.target({ x, y, r: 13, passThrough: true, onStruck: () => trip(w, ctx.scene.time.now, null) }));
    }
    wires.push(w);
    return w;
  }

  function finishLaying(time: number): void {
    if (!laying) return;
    const a = laying;
    laying = null;
    a.peg.remove();
    let bx = npc.x, by = npc.y;
    if (dist(a.x, a.y, bx, by) < 90) {
      // He barely moved: run the wire on along his heading.
      const f = ctx.facing(npc);
      bx = clamp(a.x + Math.cos(f) * 160, 60, W - 60); by = clamp(a.y + Math.sin(f) * 160, top + 50, H - 40);
    }
    makeWire(a.x, a.y, bx, by, time, 650);
    ctx.sfx('trap-set');
  }

  return {
    update(time, dtRaw) {
      void stepDt(dtRaw);
      if (!started) {
        started = true;
        nextLay = time + 2600;
        // Two wires already set when the fight begins.
        makeWire(W * 0.3, top + 60, W * 0.38, H - 40, time, 0);
        makeWire(W * 0.1, top + (H - top) * 0.62, W * 0.9, top + (H - top) * 0.42, time, 0);
      }
      // Snare lays as he goes.
      if (!laying && time >= nextLay && alive(npc)) {
        nextLay = time + layEvery;
        laying = { at: time, x: npc.x, y: npc.y, peg: ctx.target({ x: npc.x, y: npc.y, r: 13, passThrough: true, onStruck: () => { if (laying) { laying.peg.remove(); laying = null; ctx.sfx('snap-back'); } } }) };
        ctx.sfx('trap-set');
      }
      if (laying && time - laying.at >= LAY_GAP) finishLaying(time);

      // Crossing a set wire trips it.
      for (const [f, p] of last) {
        if (alive(f)) {
          for (const w of wires) {
            if (w.trippedAt >= 0 || time < w.armedAt) continue;
            if (segCross(p.x, p.y, f.x, f.y, w.x0, w.y0, w.x1, w.y1)) trip(w, time, f);
          }
        }
        p.x = f.x; p.y = f.y;
      }
      // Bolts.
      for (let i = wires.length - 1; i >= 0; i--) {
        const w = wires[i];
        if (w.trippedAt < 0) continue;
        if (!w.fired && time >= w.trippedAt + FIRE_DELAY + FLIGHT_MS) {
          w.fired = true;
          ctx.sfx('musket');
          for (const f of [player, npc]) {
            if (!alive(f)) continue;
            if (segDist(f.x, f.y, w.x0, w.y0, w.x1, w.y1) < BOLT_HALF) {
              ctx.hit(f, ctx.hard && f === player ? Math.round(BOLT_DMG * 1.25) : BOLT_DMG, f.x, f.y);
              ctx.flash(f.x, f.y, LAMP_HOT);
            }
          }
        }
        if (time > w.trippedAt + FIRE_DELAY + FLIGHT_MS + 500) dropWire(i);
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Keep a set wire between you and him: stand across the nearest one.
      let best: Pt | null = null;
      let bd = Infinity;
      for (const w of wires) {
        if (w.trippedAt >= 0) continue;
        const d = segDist(player.x, player.y, w.x0, w.y0, w.x1, w.y1);
        if (d > 360 || d >= bd) continue;
        const len = Math.max(1, dist(w.x0, w.y0, w.x1, w.y1));
        const s = -(sideOf(player.x, player.y, w.x0, w.y0, w.x1, w.y1) || 1);
        const nx = -(w.y1 - w.y0) / len * s, ny = (w.x1 - w.x0) / len * s;
        const t = clamp(segT(player.x, player.y, w.x0, w.y0, w.x1, w.y1), 0.1, 0.9);
        bd = d;
        best = { x: clamp(w.x0 + (w.x1 - w.x0) * t + nx * 120, 60, W - 60), y: clamp(w.y0 + (w.y1 - w.y0) * t + ny * 120, top + 50, H - 40) };
      }
      if (best) return best;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) - 0.5;
      return { x: clamp(player.x + Math.cos(a) * 260, 60, W - 60), y: clamp(player.y + Math.sin(a) * 220, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const w of wires) {
        const armed = time >= w.armedAt && w.trippedAt < 0;
        const len = dist(w.x0, w.y0, w.x1, w.y1);
        // Near-invisible: a hair of silk, brighter where a fighter is close to it.
        let near = 0;
        for (const f of [player, npc]) if (alive(f)) near = Math.max(near, 1 - clamp(segDist(f.x, f.y, w.x0, w.y0, w.x1, w.y1) / 90, 0, 1));
        const base = w.trippedAt >= 0 ? 0.9 : armed ? 0.1 + near * 0.3 : 0.3;
        g.lineStyle(w.trippedAt >= 0 ? 2 : 1, w.trippedAt >= 0 ? LAMP_HOT : SILK_LIT, base); g.lineBetween(w.x0, w.y0, w.x1, w.y1);
        // The glint: light running along the wire every couple of seconds.
        if (w.trippedAt < 0) {
          const ph = ((time / 2400) + w.seed) % 1;
          const k = ph * 1.4 - 0.2;
          if (k > 0 && k < 1) {
            const gx = w.x0 + (w.x1 - w.x0) * k, gy = w.y0 + (w.y1 - w.y0) * k;
            g.fillStyle(0xffffff, 0.75); g.fillCircle(gx, gy, 1.8);
            g.lineStyle(1.5, 0xffffff, 0.35);
            const ux = (w.x1 - w.x0) / len, uy = (w.y1 - w.y0) / len;
            g.lineBetween(gx - ux * 24, gy - uy * 24, gx + ux * 24, gy + uy * 24);
          }
        }
        // The crossbows at each wall: a stock and a bow, aimed in along the wire.
        const a = Math.atan2(w.y1 - w.y0, w.x1 - w.x0);
        for (const [x, y, d] of [[w.x0, w.y0, 1], [w.x1, w.y1, -1]] as [number, number, number][]) {
          const ca = Math.cos(a) * d, sa = Math.sin(a) * d;
          g.lineStyle(5, BARK_DARK, 1); g.lineBetween(x - ca * 4, y - sa * 4, x + ca * 18, y + sa * 18);
          g.lineStyle(2.5, PLANK, 1);
          g.lineBetween(x + ca * 10 - sa * 12, y + sa * 10 + ca * 12, x + ca * 14, y + sa * 14);
          g.lineBetween(x + ca * 10 + sa * 12, y + sa * 10 - ca * 12, x + ca * 14, y + sa * 14);
          if (w.trippedAt >= 0 && time < w.trippedAt + FIRE_DELAY) { g.fillStyle(LAMP_HOT, 0.7); g.fillCircle(x + ca * 18, y + sa * 18, 3); }
        }
        // Pegs: little brass stakes, the silk wound round them.
        for (const p of w.pegs) {
          if (!p.alive) continue;
          g.fillStyle(PLANK_DARK, 1); g.fillCircle(p.x, p.y + 2, 5);
          g.fillStyle(SPIDER_GOLD, 1); g.fillCircle(p.x, p.y, 4);
          g.lineStyle(1, SILK_LIT, 0.8); g.strokeCircle(p.x, p.y, 5);
          if (armed) { g.lineStyle(1, SPIDER_GOLD, 0.25 + near * 0.4); g.strokeCircle(p.x, p.y, 11); }
        }
      }
      // Snare's first peg while he lays: a thread trailing from it to his hand.
      if (laying && alive(npc)) {
        g.fillStyle(SPIDER_GOLD, 1); g.fillCircle(laying.x, laying.y, 4);
        g.lineStyle(1, SILK_LIT, 0.6); g.lineBetween(laying.x, laying.y, npc.x, npc.y - 6);
        const k = clamp((time - laying.at) / LAY_GAP, 0, 1);
        g.lineStyle(1.5, SPIDER_GOLD, 0.6); g.beginPath(); g.arc(laying.x, laying.y, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    drawAir(g, time) {
      // Bolts in flight, in from both walls to meet in the middle.
      for (const w of wires) {
        if (w.trippedAt < 0) continue;
        const fly = clamp((time - w.trippedAt - FIRE_DELAY) / FLIGHT_MS, 0, 1);
        if (time < w.trippedAt + FIRE_DELAY || fly >= 1 && time > w.trippedAt + FIRE_DELAY + FLIGHT_MS + 120) continue;
        const a = Math.atan2(w.y1 - w.y0, w.x1 - w.x0);
        const mx = (w.x0 + w.x1) / 2, my = (w.y0 + w.y1) / 2;
        for (const [x, y, d] of [[w.x0, w.y0, 1], [w.x1, w.y1, -1]] as [number, number, number][]) {
          const bx = x + (mx - x) * fly, by = y + (my - y) * fly;
          const ca = Math.cos(a) * d, sa = Math.sin(a) * d;
          g.lineStyle(3, PLANK_DARK, 1); g.lineBetween(bx - ca * 18, by - sa * 18, bx, by);
          g.fillStyle(0xd8dccc, 1); g.fillTriangle(bx + ca * 6, by + sa * 6, bx - sa * 3, by + ca * 3, bx + sa * 3, by - ca * 3);
          g.lineStyle(2, SILK_LIT, 0.6); g.lineBetween(bx - ca * 18 - sa * 3, by - sa * 18 + ca * 3, bx - ca * 18 + sa * 3, by - sa * 18 - ca * 3);
        }
        if (fly >= 1) glow(g, mx, my, 30, LAMP_HOT, 0.12, 3);
      }
    },
  };
}

export const TRIPWIRE: GimmickDef = {
  id: 'web-tripwire',
  rules: 'Near-invisible wires run wall to wall. Cross one and you are snagged as bolts fly in along it. Snare lays new wires — strike a peg to fire its wire on whoever is on it.',
  make,
};
