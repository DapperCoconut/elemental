import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { tuningCrystal } from '../art';
import { AMETHYST_LIT, BRASS, QUARTZ, QUARTZ_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Resonance — Tuner Quartz.
 *
 * Quartz tunes the court's chimes: crystal rods in brass forks that each ring one true note.
 * Five stand about the floor. Strike one — a shot, a swing, a blast — and it hums for a few
 * seconds. And when two hum at once their notes beat against each other —
 * the air in the straight line between them shivers (half a second's warning) and then shatters,
 * hurting anyone on the line and spending both notes.
 *
 * Every few seconds Quartz strikes his tuning fork at the rod nearest you. He then goes to ring
 * a second one so the line runs through you. Ring the second one yourself, while he is on it.
 */

/** A rod's strike body: the crystal above its fork. */
const ROD_R = 26;
const ROD_UP = 40;
const HUM_MS = 3400;
const WARN_MS = 620;
const LANE_HALF = 20;

interface Rod { x: number; y: number; humUntil: number; humAt: number; hue: number }
interface Lane { a: Rod; b: Rod; warnAt: number; fireAt: number; fired: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const dmg = ctx.hard ? 17 : 14;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  const rods: Rod[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    rods.push({ x: cx + Math.cos(a) * 320, y: cy + Math.sin(a) * 205, humUntil: 0, humAt: -9999, hue: [QUARTZ, 0xd8c8ff, 0xc8f0ff, 0xffe0f0, 0xe8ffd8][i] });
  }
  const lanes: Lane[] = [];
  let nextFork = 0;
  let started = false;

  const humming = (r: Rod, t: number) => t < r.humUntil;

  function ring(r: Rod, time: number): void {
    const was = humming(r, time);
    r.humUntil = time + HUM_MS;
    r.humAt = time;
    if (!was) ctx.sfx('crystal-chime');
    // Pair with every other humming rod that has no lane yet.
    for (const o of rods) {
      if (o === r || !humming(o, time)) continue;
      if (lanes.some((l) => !l.fired && ((l.a === r && l.b === o) || (l.a === o && l.b === r)))) continue;
      lanes.push({ a: o, b: r, warnAt: time, fireAt: time + WARN_MS, fired: false });
      ctx.sfx('sonic-pulse');
    }
  }

  const bodies = rods.map((r) => ctx.target({ x: r.x, y: r.y - ROD_UP, r: ROD_R, onStruck: () => ring(r, ctx.scene.time.now) }));

  const onLane = (l: Lane, x: number, y: number, pad = 0) => segDist(x, y, l.a.x, l.a.y, l.b.x, l.b.y) < LANE_HALF + 12 + pad;

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextFork = time + 2600; }
      // Quartz's fork: rings the rod nearest you.
      if (time >= nextFork && alive(player) && alive(npc)) {
        nextFork = time + (ctx.hard ? 6000 : 7600);
        let near = rods[0], nd = Infinity;
        for (const r of rods) { const d = dist(r.x, r.y, player.x, player.y); if (d < nd) { nd = d; near = r; } }
        ring(near, time);
        ctx.banner('QUARTZ STRIKES HIS FORK', '#e8f0ff');
      }
      // Lanes shatter.
      for (const l of lanes) {
        if (l.fired || time < l.fireAt) continue;
        l.fired = true;
        l.a.humUntil = 0; l.b.humUntil = 0;
        ctx.sfx('crystal-shatter');
        for (const f of [player, npc]) {
          if (!alive(f) || !onLane(l, f.x, f.y)) continue;
          ctx.hit(f, dmg, f.x, f.y);
          // Thrown off the line, sideways.
          const ax = l.b.x - l.a.x, ay = l.b.y - l.a.y;
          const len = Math.hypot(ax, ay) || 1;
          let nx = -ay / len, ny = ax / len;
          if ((f.x - l.a.x) * nx + (f.y - l.a.y) * ny < 0) { nx = -nx; ny = -ny; }
          ctx.nudge(f, nx * 46, ny * 46);
          ctx.float(f.x, f.y - 44, 'SHATTERED', '#e8f0ff');
        }
      }
      for (let i = lanes.length - 1; i >= 0; i--) if (lanes[i].fired && time - lanes[i].fireAt > 500) lanes.splice(i, 1);
    },

    destroy() { for (const b of bodies) b.remove(); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      // Off any line about to shatter.
      for (const l of lanes) {
        if (l.fired || !onLane(l, npc.x, npc.y, 24)) continue;
        const ax = l.b.x - l.a.x, ay = l.b.y - l.a.y;
        const len = Math.hypot(ax, ay) || 1;
        let nx = -ay / len, ny = ax / len;
        if ((npc.x - l.a.x) * nx + (npc.y - l.a.y) * ny < 0) { nx = -nx; ny = -ny; }
        return { x: clamp(npc.x + nx * 90, 60, W - 60), y: clamp(npc.y + ny * 90, top + 50, H - 40) };
      }
      // A rod is humming: ring the partner whose line runs through you.
      let best: Pt | null = null, bs = Infinity;
      for (const a of rods) {
        if (!humming(a, time)) continue;
        for (const b of rods) {
          if (b === a || humming(b, time)) continue;
          const off = segDist(player.x, player.y, a.x, a.y, b.x, b.y);
          const self = segDist(npc.x, npc.y, a.x, a.y, b.x, b.y);
          if (off > 70 || self < 50) continue;
          const s = off + dist(npc.x, npc.y, b.x, b.y) * 0.2;
          if (s < bs) {
            bs = s;
            const away = Math.atan2(b.y - a.y, b.x - a.x);
            best = { x: b.x + Math.cos(away) * 24, y: b.y + Math.sin(away) * 24 };
          }
        }
      }
      if (best) return { x: clamp(best.x, 60, W - 60), y: clamp(best.y, top + 50, H - 40) };
      // Nothing humming: loiter at the rod beside the line nearest you.
      let pick = rods[0], pd = Infinity;
      for (const a of rods) for (const b of rods) {
        if (a === b) continue;
        const d = segDist(player.x, player.y, a.x, a.y, b.x, b.y) + dist(npc.x, npc.y, a.x, a.y) * 0.15;
        if (d < pd) { pd = d; pick = a; }
      }
      const a = Math.atan2(pick.y - cy, pick.x - cx);
      return { x: clamp(pick.x + Math.cos(a) * 60, 60, W - 60), y: clamp(pick.y + Math.sin(a) * 50, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // Faint chalk lines between every pair, so the geometry is readable before anything rings.
      for (let i = 0; i < rods.length; i++) for (let j = i + 1; j < rods.length; j++) {
        g.lineStyle(1, QUARTZ_LIT, 0.08); g.lineBetween(rods[i].x, rods[i].y, rods[j].x, rods[j].y);
      }
      // A humming rod's partner lines brighten.
      for (const a of rods) {
        if (!humming(a, time)) continue;
        for (const b of rods) {
          if (b === a) continue;
          g.lineStyle(2, AMETHYST_LIT, 0.16); g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
      // Lanes: a shivering band, then the shatter.
      for (const l of lanes) {
        const ax = l.b.x - l.a.x, ay = l.b.y - l.a.y;
        const len = Math.hypot(ax, ay) || 1;
        const nx = -ay / len, ny = ax / len;
        if (!l.fired) {
          const k = clamp((time - l.warnAt) / WARN_MS, 0, 1);
          g.fillStyle(0xe8f0ff, 0.08 + k * 0.18);
          g.fillPoints([
            { x: l.a.x + nx * LANE_HALF, y: l.a.y + ny * LANE_HALF }, { x: l.b.x + nx * LANE_HALF, y: l.b.y + ny * LANE_HALF },
            { x: l.b.x - nx * LANE_HALF, y: l.b.y - ny * LANE_HALF }, { x: l.a.x - nx * LANE_HALF, y: l.a.y - ny * LANE_HALF },
          ], true);
          // A standing wave between the two rods.
          const pts: Pt[] = [];
          for (let s = 0; s <= 24; s++) {
            const t = s / 24;
            const amp = Math.sin(t * Math.PI * 6 + time / 30) * LANE_HALF * 0.8 * Math.sin(t * Math.PI) * (0.3 + k * 0.7);
            pts.push({ x: l.a.x + ax * t + nx * amp, y: l.a.y + ay * t + ny * amp });
          }
          g.lineStyle(2, 0xffffff, 0.4 + k * 0.5); g.strokePoints(pts, false);
        } else {
          const k = clamp((time - l.fireAt) / 500, 0, 1);
          g.lineStyle(LANE_HALF * 2 * (1 - k * 0.5), 0xffffff, 0.6 * (1 - k)); g.lineBetween(l.a.x, l.a.y, l.b.x, l.b.y);
          for (let s = 0; s < 14; s++) {
            const t = (s + 0.5) / 14;
            const side = s % 2 ? 1 : -1;
            g.fillStyle(QUARTZ_LIT, 1 - k);
            g.fillTriangle(
              l.a.x + ax * t + nx * side * k * 40, l.a.y + ay * t + ny * side * k * 40,
              l.a.x + ax * t + nx * side * (k * 40 + 8) + 3, l.a.y + ay * t + ny * side * (k * 40 + 8),
              l.a.x + ax * t + nx * side * (k * 40 + 4) - 3, l.a.y + ay * t + ny * side * (k * 40 + 4) + 3,
            );
          }
        }
      }
      // Rings round humming rods.
      for (const r of rods) {
        if (!humming(r, time)) continue;
        for (let i = 0; i < 3; i++) {
          const ph = ((time - r.humAt) / 700 + i / 3) % 1;
          g.lineStyle(1.5, lit(r.hue, 0.3), 0.5 * (1 - ph)); g.strokeEllipse(r.x, r.y, 30 + ph * 90, 12 + ph * 36);
        }
      }
    },

    drawAir(g, time) {
      for (const r of rods) {
        const hum = humming(r, time) ? clamp((r.humUntil - time) / HUM_MS, 0.2, 1) : 0;
        const wob = hum ? Math.sin(time / 18) * 1.2 : 0;
        tuningCrystal(g, r.x + wob, r.y, 1.1, hum, r.hue);
      }
      // Quartz's fork over his head when he is about to strike.
      if (alive(npc)) {
        const left = clamp(1 - (nextFork - time) / 1200, 0, 1);
        if (left > 0) {
          const x = npc.x, y = npc.y - 62;
          g.lineStyle(3, BRASS, 0.6 + left * 0.4);
          g.lineBetween(x, y + 14, x, y); g.lineBetween(x, y, x - 5, y - 14); g.lineBetween(x, y, x + 5, y - 14);
          g.lineStyle(1, 0xffffff, left); g.strokeCircle(x, y - 8, 10 + left * 8);
        }
      }
    },
  };
}

export const RESONANCE: GimmickDef = {
  id: 'geode-resonance',
  rules: 'Strike a tuning-crystal and it hums. Two humming at once shatter the air in the line between them.',
  make,
};
