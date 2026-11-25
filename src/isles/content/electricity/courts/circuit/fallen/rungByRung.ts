import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow } from '../../../../../art/IsleArt';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { segText } from '../art';
import { BOLT, CERAMIC, CERAMIC_DARK, COPPER, COPPER_DARK, COPPER_LIT, FAULT, IRON, IRON_DARK, SILK } from '../palette';
import { alive, clamp, segDist, stepDt } from '../util';

/**
 * Rung by Rung — Arcwright Thaddeus Corriban, who in the King's telling built the arc lamps the
 * Grid hung in place of the lamplighters' flames, and tested every one on his ladder in the yard.
 *
 * A Jacob's ladder lies across the yard: two copper horns spreading from a narrow throat by the
 * transformer to a wide mouth. On the warning crackle an arc strikes across the throat and *climbs*
 * — slower than a walk — stretching as the horns spread, until it snaps at the mouth with a bang.
 * Whoever the arc touches is caught on it: carried up the ladder, scorched as it goes, and flung
 * off the mouth when it snaps. Walk out past a horn, or dash, to get off it. You cannot step back
 * through it; get out of the V or stay behind the arc.
 *
 * Strike the ignitor by the throat and a fresh arc strikes at once — light it while Corriban is
 * deep in the V. Halfway down, a second ladder stands up across the first, end to end through the
 * yard. The bot leaves the V while an arc climbs, and runs to strike the ignitor when you are in it.
 */

const ID = fallenId('circuit', 'rung-by-rung');
const CLIMB = 150;
const WARN_MS = 1150;
const REST_MS = 2600;
const THROAT_HW = 14;
const CATCH = 18;
const BURN = 5;
const BURN_MS = 500;
const SNAP_DMG = 18;
const FLING = 90;
const IGNITE_R = 22;

interface Ladder {
  throat: Pt; ax: number; ay: number; len: number; mouthHw: number; ignitor: Pt;
  phase: 'rest' | 'warn' | 'climb'; until: number; s: number; snapAt: number;
  carried: Set<Fighter>; burnAt: Map<Fighter, number>;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const ym = (top + H) / 2;
  const free = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const mk = (throat: Pt, ax: number, ay: number, len: number, mouthHw: number, ignitor: Pt, first: number): Ladder => ({
    throat, ax, ay, len, mouthHw, ignitor, phase: 'rest', until: first, s: 0, snapAt: -9999, carried: new Set(), burnAt: new Map(),
  });
  const ladders: Ladder[] = [mk({ x: 150, y: ym }, 1, 0, W - 260, 190, { x: 128, y: ym + 56 }, 1800)];
  let second = false;

  const hw = (l: Ladder, s: number): number => THROAT_HW + (l.mouthHw - THROAT_HW) * clamp(s / l.len, 0, 1);
  /** Axial and sideways coordinates of a point in a ladder's frame. */
  const frame = (l: Ladder, x: number, y: number): { s: number; p: number } => {
    const dx = x - l.throat.x, dy = y - l.throat.y;
    return { s: dx * l.ax + dy * l.ay, p: -dx * l.ay + dy * l.ax };
  };
  const ends = (l: Ladder, s: number): [Pt, Pt] => {
    const cx = l.throat.x + l.ax * s, cy = l.throat.y + l.ay * s, h = hw(l, s);
    return [{ x: cx + l.ay * h, y: cy - l.ax * h }, { x: cx - l.ay * h, y: cy + l.ax * h }];
  };
  const inV = (l: Ladder, f: Fighter): boolean => { const q = frame(l, f.x, f.y); return q.s > 0 && q.s < l.len && Math.abs(q.p) < hw(l, q.s) + 8; };

  function ignite(l: Ladder, time: number, warn: number): void {
    l.phase = 'warn'; l.until = time + warn; l.s = 0;
    ctx.sfx('electric-charge');
  }

  function addIgnitor(l: Ladder): void {
    ctx.target({
      x: l.ignitor.x, y: l.ignitor.y, r: IGNITE_R, passThrough: true,
      onStruck: (by) => {
        if (l.phase !== 'rest') return;
        ignite(l, ctx.scene.time.now, 350);
        ctx.float(l.ignitor.x, l.ignitor.y - 30, 'LIT', by === 'player' ? '#9af6ff' : '#ffb070');
      },
    });
  }
  addIgnitor(ladders[0]);

  function snap(l: Ladder, time: number): void {
    l.phase = 'rest'; l.until = time + REST_MS; l.snapAt = time;
    ctx.sfx('explosion-small');
    for (const f of l.carried) {
      if (!alive(f)) continue;
      ctx.hit(f, SNAP_DMG, f.x, f.y);
      ctx.nudge(f, l.ax * FLING, l.ay * FLING);
      ctx.stun(f, 380);
      ctx.flash(f.x, f.y, BOLT);
      free.set(f, time + 700);
    }
    l.carried.clear();
  }

  function stepLadder(l: Ladder, time: number, dt: number): void {
    if (l.phase === 'rest') { if (time >= l.until) ignite(l, time, WARN_MS); return; }
    if (l.phase === 'warn') { if (time >= l.until) { l.phase = 'climb'; ctx.sfx('plasma-arc'); } return; }
    l.s += CLIMB * dt;
    if (l.s >= l.len) { snap(l, time); return; }
    const [a, b] = ends(l, l.s);
    for (const f of [player, npc] as Fighter[]) {
      if (!alive(f)) continue;
      if (l.carried.has(f)) {
        const q = frame(l, f.x, f.y);
        if (ctx.dashing(f) || Math.abs(q.p) > hw(l, l.s) + 14) {
          l.carried.delete(f); free.set(f, time + 800);
          ctx.float(f.x, f.y - 34, 'FREE', '#c8e0ff');
          continue;
        }
        ctx.nudge(f, l.ax * (l.s - q.s), l.ay * (l.s - q.s));
        if (time - (l.burnAt.get(f) ?? 0) >= BURN_MS) { l.burnAt.set(f, time); ctx.hit(f, BURN, f.x, f.y); ctx.sfx('sizzle'); }
        continue;
      }
      if (time < (free.get(f) ?? 0)) continue;
      if (segDist(f.x, f.y, a.x, a.y, b.x, b.y) < CATCH + 20) {
        l.carried.add(f);
        l.burnAt.set(f, time);
        ctx.hit(f, BURN, f.x, f.y);
        ctx.sfx('status-shock');
      }
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!second && npc.hp < npc.maxHp * 0.5) {
        second = true;
        const l2 = mk({ x: W / 2, y: H - 62 }, 0, -1, H - top - 92, 170, { x: W / 2 + 52, y: H - 40 }, time + 1500);
        ladders.push(l2);
        addIgnitor(l2);
        ctx.banner('A second ladder stands up across the first.', '#d8c8ff');
        ctx.sfx('stone-rise');
      }
      for (const l of ladders) stepLadder(l, time, dt);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      for (const l of ladders) {
        if (l.phase === 'rest' || !inV(l, npc)) continue;
        const q = frame(l, npc.x, npc.y);
        if (l.phase === 'climb' && q.s < l.s - 20) continue; // already behind the arc
        const side = q.p >= 0 ? 1 : -1, out = hw(l, q.s) + 70;
        const cx = l.throat.x + l.ax * q.s, cy = l.throat.y + l.ay * q.s;
        return { x: clamp(cx - l.ay * out * side, 50, W - 50), y: clamp(cy + l.ax * out * side, top + 40, H - 40) };
      }
      for (const l of ladders) {
        if (l.phase === 'rest' && inV(l, player) && frame(l, player.x, player.y).s > 120) {
          return { x: l.ignitor.x + 24, y: l.ignitor.y + 18 };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const l of ladders) {
        // The live band: the V's floor scorched violet, brighter while it is armed.
        const [m1, m2] = ends(l, l.len), [t1, t2] = ends(l, 0);
        const hot = l.phase === 'rest' ? 0.04 : 0.1 + (l.phase === 'warn' ? Math.sin(time / 50) * 0.05 : 0);
        g.fillStyle(0x6a4aff, hot);
        g.fillTriangle(t1.x, t1.y, m1.x, m1.y, m2.x, m2.y); g.fillTriangle(t1.x, t1.y, t2.x, t2.y, m2.x, m2.y);
        // Rung marks on the board every 70 px: where the arc has been, scorched.
        for (let s = 70; s < l.len; s += 70) {
          const [a, b] = ends(l, s);
          g.lineStyle(2, SILK, l.phase === 'climb' && s < l.s ? 0.08 : 0.2); g.lineBetween(a.x, a.y, b.x, b.y);
        }
        // The horns: copper rods on porcelain stand-offs.
        for (const [p0, p1] of [[t1, m1], [t2, m2]] as [Pt, Pt][]) {
          g.lineStyle(11, 0x000000, 0.3); g.lineBetween(p0.x + 3, p0.y + 4, p1.x + 3, p1.y + 4);
          g.lineStyle(9, COPPER_DARK, 1); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
          g.lineStyle(5, COPPER, 1); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
          g.lineStyle(1.5, COPPER_LIT, 0.8); g.lineBetween(p0.x, p0.y - 1, p1.x, p1.y - 1);
          for (let t = 0.2; t < 1; t += 0.3) {
            const x = p0.x + (p1.x - p0.x) * t, y = p0.y + (p1.y - p0.y) * t;
            g.fillStyle(CERAMIC_DARK, 1); g.fillCircle(x, y + 2, 7); g.fillStyle(CERAMIC, 1); g.fillCircle(x, y, 6);
            g.lineStyle(1, CERAMIC_DARK, 1); g.strokeCircle(x, y, 3.5);
          }
          // Burnt tips at the mouth.
          g.fillStyle(0x2a1a10, 1); g.fillCircle(p1.x, p1.y, 6);
        }
        drawTransformer(g, l, time);
      }
    },

    drawAir(g, time) {
      for (const l of ladders) {
        if (l.phase === 'warn') {
          const [a, b] = ends(l, 0);
          const k = Math.sin(time / 30);
          glow(g, l.throat.x, l.throat.y, 30, BOLT, 0.12, 3);
          arc(g, a, b, l.ax, l.ay, 6, Math.floor(time / 40), 0.5 + k * 0.4, 1.5);
        } else if (l.phase === 'climb') {
          const [a, b] = ends(l, l.s);
          const bow = 10 + (l.s / l.len) * 34;
          glow(g, (a.x + b.x) / 2 + l.ax * bow * 0.5, (a.y + b.y) / 2 + l.ay * bow * 0.5, 40 + hw(l, l.s) * 0.5, 0x8a6aff, 0.06, 4);
          arc(g, a, b, l.ax, l.ay, bow, Math.floor(time / 35), 1, 3);
          arc(g, a, b, l.ax, l.ay, bow * 0.7, Math.floor(time / 35) + 7, 0.5, 1.5);
        }
        const k = (time - l.snapAt) / 450;
        if (k >= 0 && k < 1) {
          const [a, b] = ends(l, l.len);
          for (let i = 0; i < 9; i++) {
            const t = i / 8, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
            g.lineStyle(3 * (1 - k), i % 2 ? 0x8a6aff : 0xffffff, 1 - k);
            g.lineBetween(x, y, x + l.ax * (20 + k * 60), y + l.ay * (20 + k * 60));
          }
        }
      }
    },

    drawHud(g) {
      // One lamp per ladder: dark at rest, amber on the warning crackle, violet while it climbs.
      ladders.forEach((l, i) => {
        const x = W / 2 - 40 + i * 44, y = top + 6;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, 36, 18, 6);
        const col = l.phase === 'climb' ? 0x8a6aff : l.phase === 'warn' ? FAULT : dim(0x8a6aff, 0.7);
        g.fillStyle(col, 1); g.fillCircle(x + 10, y + 9, 5);
        const k = l.phase === 'climb' ? l.s / l.len : 0;
        g.fillStyle(0x8a6aff, 0.8); g.fillRect(x + 18, y + 13, 14 * k, 2);
      });
    },
  };
}

/** The arc itself: a jagged, bowed plasma line between the horns, bending up the ladder. */
function arc(g: G, a: Pt, b: Pt, ax: number, ay: number, bow: number, seed: number, alpha: number, w: number): void {
  let s = (Math.abs(seed) % 9973) + 3;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s % 1000) / 1000; };
  const n = 10;
  let px = a.x, py = a.y;
  for (let i = 1; i <= n; i++) {
    const t = i / n, bend = Math.sin(t * Math.PI) * bow;
    const j = i < n ? (rnd() - 0.5) * 12 : 0;
    const x = a.x + (b.x - a.x) * t + ax * (bend + j), y = a.y + (b.y - a.y) * t + ay * (bend + j);
    g.lineStyle(w * 4, 0x8a6aff, alpha * 0.2); g.lineBetween(px, py, x, y);
    g.lineStyle(w * 1.8, BOLT, alpha * 0.8); g.lineBetween(px, py, x, y);
    g.lineStyle(w * 0.7, 0xffffff, alpha); g.lineBetween(px, py, x, y);
    px = x; py = y;
  }
}

/** The transformer behind the throat — a ribbed iron box, two porcelain bushings — and its ignitor button. */
function drawTransformer(g: G, l: Ladder, time: number): void {
  const bx = l.throat.x - l.ax * 34, by = l.throat.y - l.ay * 34;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(bx + 3, by + 14, 46, 14);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(bx - 20, by - 18, 40, 32, 4);
  g.fillStyle(IRON, 1); g.fillRoundedRect(bx - 18, by - 20, 36, 30, 4);
  for (let i = -12; i <= 12; i += 6) { g.lineStyle(2, IRON_DARK, 1); g.lineBetween(bx + i, by - 16, bx + i, by + 6); }
  segText(g, bx - 10, by - 6, '15', 9, SILK, 0.5);
  const ready = l.phase === 'rest';
  const ix = l.ignitor.x, iy = l.ignitor.y;
  g.fillStyle(0x1a1410, 1); g.fillCircle(ix, iy, IGNITE_R - 6);
  g.fillStyle(ready ? FAULT : dim(FAULT, 0.6), 1); g.fillCircle(ix, iy - 2, IGNITE_R - 10);
  g.fillStyle(0xffffff, ready ? 0.35 : 0.1); g.fillCircle(ix - 3, iy - 6, 3);
  if (ready) { g.lineStyle(1.5, FAULT, 0.4 + Math.sin(time / 200) * 0.2); g.strokeCircle(ix, iy, IGNITE_R); }
}

export const FALLEN_RUNG_BY_RUNG: GimmickDef = {
  id: ID,
  rules: 'An arc climbs the ladder, carrying whoever it touches to fling them off the mouth. Leave the V or dash. Strike the ignitor to light one.',
  make,
};
