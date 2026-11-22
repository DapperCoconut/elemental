import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { DEW, PLANK_DARK, ROPE, SILK_DARK, SILK_LIT, SPIDER_GOLD } from '../palette';
import { alive, clamp, dist, segDist, sideOf, stepDt } from '../util';

/**
 * Silk Lines — Spinner Arachne.
 *
 * Arachne spins for the mills, and in her yard everything that moves fast leaves silk. Every dash
 * — yours, hers, a blink, a shove — trails a silk line from where it began to where it ended,
 * pinned at both ends by a knot. Lines criss-cross the floor; whoever touches one is stuck to it,
 * slowed to a wade until they tear free. Arachne also *throws* lines: a dotted cast runs from her
 * hands across the yard, and a beat later it lands, sticking anyone on it.
 *
 * Every line hangs on its two knots, and a knot can be struck. Cut one and the line snaps back like
 * a bowstring, lashing anyone stuck on it. Stick her to a line, then cut it.
 */

const DASH_SPEED = 380;
const STICK_R = 13;
const STUCK_MS = 520;
const MAX_LINES = 7;
const LINE_LIFE = 16000;
const SNAP_DMG = 10;
const THROW_DMG = 6;

interface Line {
  ax: number; ay: number; bx: number; by: number;
  bornAt: number;
  knots: StrikeTarget[];
  /** A cut line whips back for a moment before it is gone. */
  snapAt: number;
  /** Which knot was cut (the line recoils toward the other one). */
  cutEnd: 0 | 1;
  seed: number;
}

interface Throw { ax: number; ay: number; bx: number; by: number; at: number; landAt: number }

interface Trail { dashing: boolean; sx: number; sy: number; px: number; py: number; speed: number; stuckUntil: number; wrapFx: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const lines: Line[] = [];
  const throws: Throw[] = [];
  const trails = new Map<Fighter, Trail>([
    [player, { dashing: false, sx: 0, sy: 0, px: player.x, py: player.y, speed: 0, stuckUntil: 0, wrapFx: 0 }],
    [npc, { dashing: false, sx: 0, sy: 0, px: npc.x, py: npc.y, speed: 0, stuckUntil: 0, wrapFx: 0 }],
  ]);
  const throwEvery = ctx.hard ? 3700 : 4600;
  let nextThrow = 0;
  let started = false;

  const clampPt = (x: number, y: number): Pt => ({ x: clamp(x, 40, W - 40), y: clamp(y, top + 30, H - 30) });

  function removeLine(i: number): void {
    for (const k of lines[i].knots) k.remove();
    lines.splice(i, 1);
  }

  function snap(line: Line, end: 0 | 1, time: number): void {
    if (line.snapAt > 0) return;
    line.snapAt = time;
    line.cutEnd = end;
    for (const k of line.knots) k.remove();
    ctx.sfx('snap-back');
    ctx.float((line.ax + line.bx) / 2, (line.ay + line.by) / 2 - 20, 'SNAP', '#f3f4ec');
    // The recoil lashes anyone stuck to it.
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      if (segDist(f.x, f.y, line.ax, line.ay, line.bx, line.by) > STICK_R + 10) continue;
      ctx.hit(f, ctx.hard && f === player ? SNAP_DMG + 2 : SNAP_DMG, f.x, f.y);
      const s = sideOf(f.x, f.y, line.ax, line.ay, line.bx, line.by) || 1;
      const len = Math.max(1, dist(line.ax, line.ay, line.bx, line.by));
      const nx = -(line.by - line.ay) / len * s, ny = (line.bx - line.ax) / len * s;
      ctx.nudge(f, nx * 70, ny * 70);
      const t = trails.get(f);
      if (t) t.stuckUntil = 0;
    }
  }

  function addLine(ax: number, ay: number, bx: number, by: number, time: number): Line {
    while (lines.length >= MAX_LINES) removeLine(0);
    const line: Line = { ax, ay, bx, by, bornAt: time, knots: [], snapAt: 0, cutEnd: 0, seed: rng() * 10 };
    const pts: [number, number][] = [[ax, ay], [bx, by]];
    pts.forEach(([x, y], i) => {
      line.knots.push(ctx.target({ x, y, r: 14, passThrough: true, onStruck: () => snap(line, i as 0 | 1, ctx.scene.time.now) }));
    });
    lines.push(line);
    return line;
  }

  function throwLine(time: number): void {
    if (!alive(npc) || !alive(player)) return;
    // From her hands, through where you stand, on out across the yard.
    const a = Math.atan2(player.y - npc.y, player.x - npc.x) + (rng() - 0.5) * 0.25;
    const len = dist(npc.x, npc.y, player.x, player.y) + 160;
    const s = clampPt(npc.x + Math.cos(a) * 30, npc.y + Math.sin(a) * 30);
    const e = clampPt(npc.x + Math.cos(a) * len, npc.y + Math.sin(a) * len);
    throws.push({ ax: s.x, ay: s.y, bx: e.x, by: e.y, at: time, landAt: time + (ctx.hard ? 800 : 950) });
    ctx.sfx('whip');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextThrow = time + 2200;
        // Two old lines already strung across the yard.
        addLine(W * 0.22, top + 90, W * 0.4, H - 70, time);
        addLine(W * 0.62, top + 70, W * 0.84, H - 110, time);
      }
      // Dashes leave silk.
      for (const [f, t] of trails) {
        if (!alive(f)) continue;
        const d = Math.hypot(f.x - t.px, f.y - t.py);
        const v = dt > 0 ? d / dt : 0;
        t.speed = Math.max(v, t.speed * 0.5);
        if (!t.dashing && v > DASH_SPEED) { t.dashing = true; t.sx = t.px; t.sy = t.py; }
        else if (t.dashing && t.speed < DASH_SPEED * 0.6) {
          t.dashing = false;
          if (dist(t.sx, t.sy, f.x, f.y) > 70) { addLine(t.sx, t.sy, f.x, f.y, time); ctx.sfx('whoosh'); }
        }
        t.px = f.x; t.py = f.y;
        // Sticking: touching any whole line.
        for (const l of lines) {
          if (l.snapAt > 0 || t.dashing) continue;
          if (segDist(f.x, f.y, l.ax, l.ay, l.bx, l.by) < STICK_R) {
            if (time > t.stuckUntil) t.wrapFx = time;
            t.stuckUntil = time + STUCK_MS;
          }
        }
      }
      // Her thrown lines land.
      if (time >= nextThrow) { nextThrow = time + throwEvery; throwLine(time); }
      for (let i = throws.length - 1; i >= 0; i--) {
        const th = throws[i];
        if (time < th.landAt) continue;
        throws.splice(i, 1);
        addLine(th.ax, th.ay, th.bx, th.by, time);
        ctx.sfx('thorn');
        if (alive(player) && segDist(player.x, player.y, th.ax, th.ay, th.bx, th.by) < STICK_R + 8) {
          ctx.hit(player, ctx.hard ? THROW_DMG + 2 : THROW_DMG, player.x, player.y);
          ctx.float(player.x, player.y - 40, 'STUCK', '#f3f4ec');
        }
      }
      // Age and clear.
      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i];
        if (l.snapAt > 0 && time - l.snapAt > 450) { lines.splice(i, 1); continue; }
        if (l.snapAt === 0 && time - l.bornAt > LINE_LIFE) removeLine(i);
      }
    },

    playerSpeedMult() { return ctx.scene.time.now < (trails.get(player)?.stuckUntil ?? 0) ? 0.4 : 1; },
    npcSpeedMult() { return ctx.scene.time.now < (trails.get(npc)?.stuckUntil ?? 0) ? 0.4 : 1; },

    npcSeek() {
      if (!alive(player)) return null;
      // Put a whole line between you and her: stand just across the nearest one from you.
      let best: Pt | null = null;
      let bd = Infinity;
      for (const l of lines) {
        if (l.snapAt > 0) continue;
        const d = segDist(player.x, player.y, l.ax, l.ay, l.bx, l.by);
        if (d < 40 || d > 320 || d >= bd) continue;
        const len = Math.max(1, dist(l.ax, l.ay, l.bx, l.by));
        const s = -(sideOf(player.x, player.y, l.ax, l.ay, l.bx, l.by) || 1);
        const nx = -(l.by - l.ay) / len * s, ny = (l.bx - l.ax) / len * s;
        // The point on the line nearest you, then 60px past it.
        const t = clamp(((player.x - l.ax) * (l.bx - l.ax) + (player.y - l.ay) * (l.by - l.ay)) / (len * len), 0.15, 0.85);
        const px = l.ax + (l.bx - l.ax) * t, py = l.ay + (l.by - l.ay) * t;
        bd = d;
        best = clampPt(px + nx * 70, py + ny * 70);
      }
      if (best) return best;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.6;
      return clampPt(player.x + Math.cos(a) * 230, player.y + Math.sin(a) * 200);
    },

    drawGround(g, time) {
      for (const l of lines) {
        if (l.snapAt > 0) continue;
        const age = clamp((time - l.bornAt) / 300, 0, 1);
        const fade = clamp((LINE_LIFE - (time - l.bornAt)) / 1500, 0.25, 1);
        // Its shadow on the floor, then the line itself, taut, with dew.
        g.lineStyle(4, SILK_DARK, 0.25 * fade); g.lineBetween(l.ax + 2, l.ay + 4, l.bx + 2, l.by + 4);
        g.lineStyle(2.4, SILK_LIT, 0.85 * fade * age); g.lineBetween(l.ax, l.ay, l.bx, l.by);
        g.lineStyle(1, 0xffffff, 0.5 * fade); g.lineBetween(l.ax, l.ay - 1, l.bx, l.by - 1);
        const len = dist(l.ax, l.ay, l.bx, l.by);
        for (let d = 20; d < len - 10; d += 34) {
          const k = d / len;
          const shine = 0.4 + Math.sin(time / 300 + d * 0.1 + l.seed) * 0.4;
          g.fillStyle(DEW, shine * fade); g.fillCircle(l.ax + (l.bx - l.ax) * k, l.ay + (l.by - l.ay) * k, 1.6);
        }
        // Knots: a peg driven in, the silk wound round it, a ring to say "strike me".
        for (const k of l.knots) {
          g.fillStyle(PLANK_DARK, 1); g.fillCircle(k.x, k.y + 2, 6);
          g.fillStyle(ROPE, 1); g.fillCircle(k.x, k.y, 5);
          g.lineStyle(2, SILK_LIT, 1); g.strokeCircle(k.x, k.y, 6.5);
          g.lineStyle(1.5, SPIDER_GOLD, 0.35 + Math.sin(time / 220 + l.seed) * 0.25); g.strokeCircle(k.x, k.y, 13);
        }
      }
      // Her casts in the air: a dotted line racing out, solidifying.
      for (const th of throws) {
        const k = clamp((time - th.at) / Math.max(1, th.landAt - th.at), 0, 1);
        const len = dist(th.ax, th.ay, th.bx, th.by);
        for (let d = 0; d < len * Math.min(1, k * 1.6); d += 14) {
          const f = d / len;
          g.fillStyle(SILK_LIT, 0.3 + k * 0.6); g.fillCircle(th.ax + (th.bx - th.ax) * f, th.ay + (th.by - th.ay) * f, 1.5 + k);
        }
        g.lineStyle(1, lit(SILK_LIT, 0.4), 0.15 + k * 0.3); g.lineBetween(th.ax, th.ay, th.bx, th.by);
      }
    },

    drawAir(g, time) {
      // Snapped lines whip back toward their surviving knot.
      for (const l of lines) {
        if (l.snapAt === 0) continue;
        const k = clamp((time - l.snapAt) / 450, 0, 1);
        const [fx, fy, tx, ty] = l.cutEnd === 0 ? [l.ax, l.ay, l.bx, l.by] : [l.bx, l.by, l.ax, l.ay];
        const ex = fx + (tx - fx) * k, ey = fy + (ty - fy) * k;
        const mx = (ex + tx) / 2 + Math.sin(k * 20) * 30 * (1 - k), my = (ey + ty) / 2 - 30 * (1 - k);
        g.lineStyle(2.5, SILK_LIT, 1 - k);
        g.beginPath(); g.moveTo(ex, ey); g.lineTo(mx, my); g.lineTo(tx, ty); g.strokePath();
      }
      // Anyone stuck: strands wrapping round them, stretching back to the line.
      for (const [f, t] of trails) {
        if (!alive(f) || time > t.stuckUntil) continue;
        const k = clamp((time - t.wrapFx) / 300, 0, 1);
        for (let i = 0; i < 4; i++) {
          const a = time / 400 + i * 1.6;
          g.lineStyle(1.5, SILK_LIT, 0.75 * k);
          g.lineBetween(f.x + Math.cos(a) * 16, f.y - 8 + Math.sin(a) * 6, f.x + Math.cos(a + 2.2) * 16, f.y - 8 + Math.sin(a + 2.2) * 6);
        }
        g.lineStyle(1, SILK_LIT, 0.5); g.strokeEllipse(f.x, f.y + 6, 36, 12);
      }
    },
  };
}

export const SILK_LINES: GimmickDef = {
  id: 'web-silk-lines',
  rules: 'Every dash trails a silk line; lines stick whoever touches them. Arachne throws lines too. Strike a line\'s knot to snap it — it lashes anyone stuck on it.',
  make,
};
