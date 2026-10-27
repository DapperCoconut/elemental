import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_SLICK } from '../encounters';
import {
  CRUDE, CRUDE_AMBER, SAFETY_RED, SAFETY_WHITE, STEEL_DARK, TIMBER_LIT, blobPts, clamp, dist, frameClock,
  noise, oilDrum, segDist, sheenAt, slick,
} from '../util';

/**
 * Slick — Mopper Gunnel's stretch of quay. Rainbow slicks spread across the boards from four
 * leaking tithe drums in the corners. On a slick you **skate**: your footing keeps the speed and
 * direction you had, so you go fast in a straight line and turn like a barge.
 *
 * Gunnel mops. Every few seconds she swings her mop at you and scrubs a stripe of dry, grippy
 * board from her feet toward you — the suds show where it will land first. A mopped stripe holds
 * for a while before the oil creeps back over it.
 *
 * The rule the player can turn: **a hit on a skater sends them sliding**, and a skater who hits
 * the quay rail at speed wipes out — hurt, splashed, sprawled. Catch Gunnel on her own oil, hit
 * her toward the rail and let the slick finish the job. She knows this, too.
 */

interface Spill { x: number; y: number; r: number; seed: number; bornAt: number }
interface Stroke { x1: number; y1: number; x2: number; y2: number; startAt: number; landAt: number; until: number }
interface Skater {
  /** Slide velocity carried by the oil, px/s. */
  dx: number; dy: number;
  /** Position just after last frame's slide, to tell walking apart from sliding. */
  px: number; py: number;
  wipeReadyAt: number;
  /** Streak trail for the art. */
  trail: Pt[];
}

const MAX_SPILLS = 9;
const MOP_HALF = 34;
const MOP_LEN = 270;

function makeSlick(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const now0 = ctx.scene.time.now;
  const wipeDmg = hard ? 12 : 9;
  const mopEvery = hard ? 3600 : 4600;
  const slideKick = hard ? 300 : 270;

  const drums: Pt[] = [
    { x: 46, y: top + 44 }, { x: W - 46, y: top + 44 }, { x: 46, y: H - 40 }, { x: W - 46, y: H - 40 },
  ];
  const spills: Spill[] = [];
  let seedN = 1;
  const addSpill = (x: number, y: number, r: number, time: number): void => {
    if (spills.length >= MAX_SPILLS) {
      // Merge into the nearest spill instead of carpeting the deck.
      let near = spills[0];
      for (const s of spills) if (dist(x, y, s.x, s.y) < dist(x, y, near.x, near.y)) near = s;
      near.r = Math.min(120, near.r + 10);
      return;
    }
    spills.push({ x: clamp(x, 70, W - 70), y: clamp(y, top + 60, H - 60), r, seed: seedN++ * 1.37, bornAt: time });
  };
  addSpill(W * 0.3, top + 150, 88, now0 - 2000);
  addSpill(W * 0.7, H - 150, 92, now0 - 2000);
  addSpill(W * 0.5, (top + H) / 2, 76, now0 - 2000);
  addSpill(W * 0.16, H - 170, 66, now0 - 2000);
  addSpill(W * 0.86, top + 170, 66, now0 - 2000);
  let nextLeak = now0 + 5000;
  let leakIdx = 0;

  const strokes: Stroke[] = [];
  let nextMop = now0 + 2600;

  const skaters = new Map<Fighter, Skater>();
  const skaterOf = (f: Fighter): Skater => {
    let s = skaters.get(f);
    if (!s) { s = { dx: 0, dy: 0, px: f.x, py: f.y, wipeReadyAt: 0, trail: [] }; skaters.set(f, s); }
    return s;
  };
  const splashes: { x: number; y: number; at: number }[] = [];

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  /** Spill growth: a new spill swells in over its first second. */
  const spillR = (s: Spill, time: number): number => s.r * clamp((time - s.bornAt) / 1000, 0.05, 1);
  const mopped = (x: number, y: number, time: number): boolean =>
    strokes.some((k) => time >= k.landAt && time < k.until && segDist(x, y, k.x1, k.y1, k.x2, k.y2) < MOP_HALF);
  const onOil = (x: number, y: number, time: number): boolean =>
    !mopped(x, y, time) && spills.some((s) => {
      const r = spillR(s, time);
      const dx = (x - s.x) / r, dy = (y - s.y) / (r * 0.62);
      return dx * dx + dy * dy < 1;
    });

  const mop = (time: number): void => {
    const n = ctx.npc, p = ctx.player;
    if (!alive(n) || !alive(p)) return;
    const a = Math.atan2(p.y - n.y, p.x - n.x);
    const x2 = clamp(n.x + Math.cos(a) * MOP_LEN, 40, W - 40), y2 = clamp(n.y + Math.sin(a) * MOP_LEN, top + 30, H - 30);
    strokes.push({ x1: n.x, y1: n.y, x2, y2, startAt: time, landAt: time + 650, until: time + 650 + (hard ? 6000 : 7000) });
    ctx.sfx('splash');
    ctx.float(n.x, n.y - 46, 'MOP!', '#e8f6ff');
    // Mopping thins whatever it crosses.
    for (const s of spills) if (segDist(s.x, s.y, n.x, n.y, x2, y2) < s.r) s.r = Math.max(40, s.r * 0.86);
  };

  const step = (f: Fighter, dt: number, time: number): void => {
    const s = skaterOf(f);
    if (!alive(f)) { s.dx = 0; s.dy = 0; s.px = f.x; s.py = f.y; return; }
    const mx = f.x - s.px, my = f.y - s.py;
    const moved = Math.hypot(mx, my) / dt;
    // `px/py` were taken after last frame's slide nudge, so this is the fighter's own walking.
    const wx = mx / dt, wy = my / dt;
    if (moved > 700) { s.dx = 0; s.dy = 0; } // Teleport or a big knockback: not skating.
    const oil = onOil(f.x, f.y, time);
    if (oil) {
      const k = Math.min(1, dt * 1.3);
      s.dx += (wx * 0.6 - s.dx) * k;
      s.dy += (wy * 0.6 - s.dy) * k;
    } else {
      const k = Math.exp(-dt * 9);
      s.dx *= k; s.dy *= k;
    }
    const sp = Math.hypot(s.dx, s.dy);
    if (sp > 340) { s.dx *= 340 / sp; s.dy *= 340 / sp; }
    if (sp > 6) {
      const nx = s.dx * dt, ny = s.dy * dt;
      ctx.nudge(f, nx, ny);
      // The rail: a fast skater who fetches up against the edge wipes out.
      const atRail = f.x < 58 || f.x > W - 58 || f.y < top + 36 || f.y > H - 50;
      if (atRail && sp > 150 && time >= s.wipeReadyAt) {
        s.wipeReadyAt = time + 1400;
        ctx.hit(f, wipeDmg, f.x, f.y);
        ctx.float(f.x, f.y - 44, 'WIPEOUT!', f === ctx.player ? '#ffb27a' : '#8fe6ff');
        ctx.sfx('slime-splat');
        splashes.push({ x: f.x, y: f.y, at: time });
        s.dx *= -0.25; s.dy *= -0.25;
      }
    }
    s.px = f.x; s.py = f.y;
    // Skate streaks.
    if (oil && sp > 90) { s.trail.push({ x: f.x, y: f.y + 8 }); if (s.trail.length > 10) s.trail.shift(); }
    else if (s.trail.length) s.trail.shift();
  };

  /** A hit on a skater: shove them away from whoever struck, along the oil. */
  const kick = (f: Fighter, from: Fighter, amount: number): void => {
    if (amount < 3 || !onOil(f.x, f.y, ctx.scene.time.now)) return;
    const s = skaterOf(f);
    const a = Math.atan2(f.y - from.y, f.x - from.x);
    s.dx += Math.cos(a) * slideKick;
    s.dy += Math.sin(a) * slideKick;
    ctx.float(f.x, f.y - 30, 'SKID', '#e0d8ff');
  };

  const drumAngles = drums.map((d) => Math.atan2((top + H) / 2 - d.y, W / 2 - d.x));

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      step(ctx.player, dt, time);
      step(ctx.npc, dt, time);

      // The drums leak in turn: a fresh puddle rolls out from the corner toward the middle.
      if (time >= nextLeak) {
        nextLeak = time + (hard ? 4200 : 5200);
        const i = leakIdx++ % drums.length;
        const d = drums[i], a = drumAngles[i] + (ctx.rng() - 0.5) * 0.6;
        const reach = 90 + ctx.rng() * 170;
        addSpill(d.x + Math.cos(a) * reach, d.y + Math.sin(a) * reach, 52 + ctx.rng() * 26, time);
        ctx.sfx('oil-splash');
      }
      // Slow creep: every spill swells a touch.
      for (const s of spills) s.r = Math.min(118, s.r + dt * 1.6);

      if (time >= nextMop) { nextMop = time + mopEvery; mop(time); }
      for (let i = strokes.length - 1; i >= 0; i--) if (time >= strokes[i].until) strokes.splice(i, 1);
      for (let i = splashes.length - 1; i >= 0; i--) if (time - splashes[i].at > 700) splashes.splice(i, 1);
    },

    onPlayerHurt(amount) { kick(ctx.player, ctx.npc, amount); },
    onNpcHurt(amount) { kick(ctx.npc, ctx.player, amount); },

    npcSeek(): Pt | null {
      const n = ctx.npc, time = ctx.scene.time.now;
      if (!onOil(n.x, n.y, time)) return null;
      // On the oil: get to the nearest mopped stripe, or the nearest dry board.
      let best: Pt | null = null;
      let bd = Infinity;
      for (const k of strokes) {
        if (time < k.landAt) continue;
        const m = { x: (k.x1 + k.x2) / 2, y: (k.y1 + k.y2) / 2 };
        const d = dist(n.x, n.y, m.x, m.y);
        if (d < bd) { bd = d; best = m; }
      }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        for (const r of [60, 120, 180]) {
          const x = clamp(n.x + Math.cos(a) * r, 80, W - 80), y = clamp(n.y + Math.sin(a) * r, top + 60, H - 70);
          if (onOil(x, y, time)) continue;
          const d = dist(n.x, n.y, x, y);
          if (d < bd) { bd = d; best = { x, y }; }
          break;
        }
      }
      return best;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      // Leaking drums in the corners, each with a crude tongue reaching for the deck.
      for (let i = 0; i < drums.length; i++) {
        const d = drums[i];
        const a = drumAngles[i];
        g.fillStyle(CRUDE, 0.85);
        g.fillPoints(blobPts(d.x + Math.cos(a) * 30, d.y + Math.sin(a) * 22, 34, 16, i * 4.1, 9, 0.35), true, true);
      }
      for (const s of spills) slick(g, s.x, s.y, spillR(s, time), spillR(s, time) * 0.62, s.seed, ts * 0.45 + s.seed, 0.95);
      // Mop strokes: suds telegraph, then scrubbed board.
      for (const k of strokes) {
        const ang = Math.atan2(k.y2 - k.y1, k.x2 - k.x1);
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        const quad = [
          new Phaser.Geom.Point(k.x1 + nx * MOP_HALF, k.y1 + ny * MOP_HALF), new Phaser.Geom.Point(k.x2 + nx * MOP_HALF, k.y2 + ny * MOP_HALF),
          new Phaser.Geom.Point(k.x2 - nx * MOP_HALF, k.y2 - ny * MOP_HALF), new Phaser.Geom.Point(k.x1 - nx * MOP_HALF, k.y1 - ny * MOP_HALF),
        ];
        if (time < k.landAt) {
          const c = clamp((time - k.startAt) / (k.landAt - k.startAt), 0, 1);
          g.lineStyle(2, SAFETY_WHITE, 0.25 + c * 0.5); g.strokePoints(quad, true);
          const len = dist(k.x1, k.y1, k.x2, k.y2);
          for (let d = 0; d < len * c; d += 18) {
            const x = k.x1 + Math.cos(ang) * d, y = k.y1 + Math.sin(ang) * d;
            g.fillStyle(0xffffff, 0.5); g.fillCircle(x + nx * (noise(d) - 0.5) * 40, y + ny * (noise(d + 3) - 0.5) * 40, 3 + noise(d + 7) * 3);
          }
          continue;
        }
        const fade = clamp((k.until - time) / 1200, 0, 1);
        g.fillStyle(TIMBER_LIT, 0.5 * fade); g.fillPoints(quad, true);
        // Wet streaks along the stroke and a crust of suds at both ends.
        g.lineStyle(1.5, 0xd8e0e0, 0.35 * fade);
        for (let s = -3; s <= 3; s++) {
          const o = (s / 3) * (MOP_HALF - 6);
          g.lineBetween(k.x1 + nx * o, k.y1 + ny * o, k.x2 + nx * o, k.y2 + ny * o);
        }
        for (const [ex, ey] of [[k.x1, k.y1], [k.x2, k.y2]] as const) {
          for (let b = 0; b < 6; b++) {
            g.fillStyle(0xffffff, 0.45 * fade);
            g.fillCircle(ex + nx * (b - 2.5) * 11, ey + ny * (b - 2.5) * 11 + Math.sin(ts * 3 + b) * 1.5, 3.5);
          }
        }
      }
      // Skate streaks behind anyone sliding.
      for (const [f, s] of skaters) {
        if (!alive(f) || s.trail.length < 2) continue;
        for (let i = 1; i < s.trail.length; i++) {
          const a = s.trail[i - 1], b = s.trail[i];
          g.lineStyle(3, sheenAt(ts * 2 + i * 0.4), (i / s.trail.length) * 0.6);
          g.lineBetween(a.x - 6, a.y, b.x - 6, b.y); g.lineBetween(a.x + 6, a.y, b.x + 6, b.y);
        }
      }
    },

    drawAir(g, time) {
      // Drums standing in the corners.
      drums.forEach((d, i) => oilDrum(g, d.x, d.y + 14, 13, i % 2 ? SAFETY_RED : 0x2a2a30, true));
      // Gunnel's mop: carried on her shoulder; swept along the stroke while mopping.
      const n = ctx.npc;
      if (alive(n)) {
        const k = strokes.find((s) => time < s.landAt);
        let hx = n.x + 26, hy = n.y - 6, ha = -0.9;
        if (k) {
          const c = clamp((time - k.startAt) / (k.landAt - k.startAt), 0, 1);
          hx = k.x1 + (k.x2 - k.x1) * c; hy = k.y1 + (k.y2 - k.y1) * c;
          ha = Math.atan2(n.y - hy, n.x - hx);
        }
        const ex = hx + Math.cos(ha) * 46, ey = hy + Math.sin(ha) * 46;
        g.lineStyle(3, 0x8a6a44, 1); g.lineBetween(hx, hy, ex, ey);
        for (let s = 0; s < 7; s++) {
          const a = ha + Math.PI + (s - 3) * 0.22;
          g.lineStyle(3, s % 2 ? 0xd8d0c0 : 0xbab0a0, 1);
          g.lineBetween(hx, hy, hx + Math.cos(a) * 14, hy + Math.sin(a) * 14);
        }
        g.fillStyle(STEEL_DARK, 1); g.fillCircle(hx, hy, 3);
      }
      // Wipeout splashes: a crown of crude and amber flecks.
      for (const s of splashes) {
        const k = (time - s.at) / 700;
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const r = 10 + k * 44;
          g.fillStyle(i % 3 ? CRUDE : CRUDE_AMBER, 1 - k);
          g.fillCircle(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.6 - Math.sin(k * Math.PI) * 18, 4 * (1 - k) + 1);
        }
      }
      // A little "skating" tell over a fast skater.
      for (const [f, s] of skaters) {
        if (!alive(f)) continue;
        const sp = Math.hypot(s.dx, s.dy);
        if (sp < 120) continue;
        const a = Math.atan2(s.dy, s.dx);
        g.lineStyle(2, 0xffffff, Math.min(0.7, sp / 400));
        for (let i = 0; i < 3; i++) {
          const o = (i - 1) * 9;
          g.lineBetween(f.x - Math.cos(a) * 26 - Math.sin(a) * o, f.y - Math.sin(a) * 26 + Math.cos(a) * o,
            f.x - Math.cos(a) * 44 - Math.sin(a) * o, f.y - Math.sin(a) * 44 + Math.cos(a) * o);
        }
      }
    },
  };
}

export const SLICK: GimmickDef = {
  id: GIM_SLICK,
  rules: 'On a slick you skate. A hit sends a skater sliding — and a fast skater who meets the rail wipes out. Gunnel mops herself dry paths.',
  make: makeSlick,
};
