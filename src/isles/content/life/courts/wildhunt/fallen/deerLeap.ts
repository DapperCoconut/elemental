import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  FOE_C, GRASS, GRASS_LIT, HUNT_RED, LOAM_LIT, MINE_C, MOSS, TIMBER, TIMBER_DARK, TIMBER_LIT, clamp, hoofprint,
} from '../util';
import { EMBER, alive } from './kit';

/**
 * The Deer-Leap — Osric Thwaite, Park-Keeper of the deer park: in the King's telling the man who
 * built the park's paling so that what was driven in could never get out again, and who called the
 * pens for the Empress's crossbows when she came to cull.
 *
 * The floor is fenced into six pens by oak palings, and every paling is a **deer-leap**: a turf
 * ramp on one side lets you over it, the other side is a sheer wall of pales. You can only cross a
 * paling the way its leap runs, so the pens go round one way like a mill-race (and a dash clears
 * any pale — a leap is a leap). Every few seconds Osric **calls a pen**: flags go up at its corners,
 * and a moment later the crossbows loose into it. Get out the way the leaps let you.
 *
 * Exploit: strike a leap's ramp-post and it turns about for a while — the ramp swaps sides. Turn
 * the way out of a called pen with Osric in it and he is shut in under the bolts. At half, the
 * keeper turns the whole park: every leap runs the other way, and pens are called quicker.
 */

const ID = fallenId('wildhunt', 'deer-leap');
const WALL = 22;
const TURN_MS = 5000;
const CALL_WARN = 2200;

interface Leap { a: Pt; b: Pt; nx: number; ny: number; turnedUntil: number; t: StrikeTarget | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const x1 = W / 3, x2 = (W * 2) / 3, my = (top + H) / 2;
  const mk = (a: Pt, b: Pt, nx: number, ny: number): Leap => ({ a, b, nx, ny, turnedUntil: 0, t: null });
  // The pens run round like a mill-race: top row east, down the right, bottom row west, up the left,
  // with one cut through the middle from top to bottom.
  const leaps: Leap[] = [
    mk({ x: x1, y: top }, { x: x1, y: my }, 1, 0), mk({ x: x2, y: top }, { x: x2, y: my }, 1, 0),
    mk({ x: x2, y: my }, { x: W, y: my }, 0, 1), mk({ x: x2, y: my }, { x: x2, y: H }, -1, 0),
    mk({ x: x1, y: my }, { x: x1, y: H }, -1, 0), mk({ x: 0, y: my }, { x: x1, y: my }, 0, -1),
    mk({ x: x1, y: my }, { x: x2, y: my }, 0, 1),
  ];
  let reversed = false;
  let called = -1;
  let fireAt = 0;
  let nextCall = 0;
  let firedAt = -1e9;
  let firedPen = -1;
  let calls = 0;

  const mid = (l: Leap): Pt => ({ x: (l.a.x + l.b.x) / 2, y: (l.a.y + l.b.y) / 2 });
  const dirOf = (l: Leap): number => (reversed ? -1 : 1) * (tk.now < l.turnedUntil ? -1 : 1);
  const penOf = (x: number, y: number): number => {
    const col = x < x1 ? 0 : x < x2 ? 1 : 2;
    return y < my ? col : 5 - col;
  };
  const penRect = (p: number): { x: number; y: number; w: number; h: number } => {
    const row = p < 3 ? 0 : 1, col = p < 3 ? p : 5 - p;
    return { x: col * (W / 3), y: row ? my : top, w: W / 3, h: row ? H - my : my - top };
  };

  for (const l of leaps) {
    const m = mid(l);
    l.t = ctx.target({
      x: m.x, y: m.y - 16, r: 20, passThrough: true,
      onStruck: () => {
        if (tk.now < l.turnedUntil - TURN_MS + 900) return;
        l.turnedUntil = tk.now + TURN_MS;
        ctx.sfx('gear-turn');
        ctx.flash(m.x, m.y, EMBER);
      },
    });
  }

  /** Where a fighter must stand to be over leap `l` the way it runs, and whether it leads out of `pen`. */
  const exitsOf = (pen: number): Leap[] => leaps.filter((l) => {
    const m = mid(l), d = dirOf(l);
    return penOf(m.x - l.nx * d * 40, m.y - l.ny * d * 40) === pen;
  });

  return {
    update(time) {
      if (!nextCall) nextCall = time + 3200;
      if (!reversed && npc.hp < npc.maxHp * 0.5) {
        reversed = true;
        ctx.banner('THE PARK TURNED', '#ffcf8a');
        ctx.sfx('gear-turn');
      }
      // The pales: crossing only the way the leap runs.
      for (const f of [player, npc]) {
        if (!alive(f) || ctx.dashing(f)) continue;
        for (const l of leaps) {
          const d = dirOf(l), nx = l.nx * d, ny = l.ny * d;
          const ux = l.b.x - l.a.x, uy = l.b.y - l.a.y, len = Math.hypot(ux, uy);
          const along = ((f.x - l.a.x) * ux + (f.y - l.a.y) * uy) / len;
          if (along < -6 || along > len + 6) continue;
          const s = (f.x - l.a.x) * nx + (f.y - l.a.y) * ny;
          if (s > 0 && s < WALL) ctx.nudge(f, nx * (WALL - s), ny * (WALL - s));
        }
      }
      if (called < 0 && time >= nextCall) {
        calls++;
        called = calls % 3 === 0 && alive(npc) ? penOf(npc.x, npc.y) : penOf(player.x, player.y);
        fireAt = time + tk.warn(CALL_WARN);
        ctx.sfx('countdown-tick');
      }
      if (called >= 0 && time >= fireAt) {
        ctx.sfx('shotgun');
        for (const f of [player, npc]) {
          if (!alive(f) || penOf(f.x, f.y) !== called) continue;
          if (f === player) tk.hitPlayer(24, f.x, f.y);
          else { ctx.hit(npc, 32, f.x, f.y); ctx.float(f.x, f.y - 56, 'PENNED', '#9ae8ff'); }
        }
        firedAt = time; firedPen = called;
        called = -1;
        nextCall = time + (reversed ? 4200 : 5200);
      }
    },

    npcSeek() {
      if (!alive(npc) || called < 0 || penOf(npc.x, npc.y) !== called) return null;
      // Out of the called pen by the nearest leap that runs the right way.
      let best: Pt | null = null, bd = Infinity;
      for (const l of exitsOf(called)) {
        const m = mid(l), d = dirOf(l);
        const p = { x: m.x + l.nx * d * 60, y: m.y + l.ny * d * 60 };
        const dd = Math.hypot(p.x - npc.x, p.y - npc.y);
        if (dd < bd) { bd = dd; best = p; }
      }
      return best ? { x: tk.clampX(best.x), y: tk.clampY(best.y) } : null;
    },

    drawGround(g, time) {
      if (called >= 0) {
        const r = penRect(called);
        const k = clamp(1 - (fireAt - time) / CALL_WARN, 0, 1);
        g.fillStyle(HUNT_RED, 0.08 + k * 0.2); g.fillRect(r.x, r.y, r.w, r.h);
        g.lineStyle(3, 0xff8a6a, 0.4 + k * 0.5); g.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      }
      for (const l of leaps) drawRamp(g, l, dirOf(l), time < l.turnedUntil);
    },

    drawAir(g, time) {
      for (const l of leaps) drawPales(g, l, dirOf(l), time, time < l.turnedUntil);
      if (called >= 0) {
        const r = penRect(called);
        for (const c of [[r.x + 14, r.y + 20], [r.x + r.w - 14, r.y + 20], [r.x + 14, r.y + r.h - 8], [r.x + r.w - 14, r.y + r.h - 8]]) {
          drawFlag(g, c[0], c[1], time);
        }
      }
      // The volley: bolts slanting down into the pen.
      if (time - firedAt < 380 && firedPen >= 0) {
        const r = penRect(firedPen), k = (time - firedAt) / 380;
        for (let i = 0; i < 18; i++) {
          const bx = r.x + ((i * 53) % r.w), by = r.y + ((i * 97) % r.h);
          const y0 = by - 120 * (1 - k);
          g.lineStyle(2, TIMBER_LIT, 1 - k * 0.5); g.lineBetween(bx - 20, y0 - 30, bx, y0);
          g.fillStyle(0xd8d8d0, 1); g.fillTriangle(bx, y0, bx - 5, y0 - 3, bx - 2, y0 - 7);
        }
      }
    },

    drawHud(g) {
      // The park in little: six pens, an arrow on each leap, the called pen red, you and Osric.
      const ox = W / 2 - 45, oy = top + 4, s = 30, h = 14;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(ox - 4, oy - 3, s * 3 + 8, h * 2 + 6, 5);
      for (let p = 0; p < 6; p++) {
        const row = p < 3 ? 0 : 1, col = p < 3 ? p : 5 - p;
        g.fillStyle(p === called ? HUNT_RED : MOSS, 1); g.fillRect(ox + col * s + 1, oy + row * h + 1, s - 2, h - 2);
      }
      for (const l of leaps) {
        const m = mid(l), d = dirOf(l);
        const mx = ox + (m.x / W) * s * 3, mm = oy + ((m.y - top) / (H - top)) * h * 2;
        g.fillStyle(EMBER, 1);
        g.fillTriangle(mx + l.nx * d * 4, mm + l.ny * d * 4, mx - l.ny * 3 - l.nx * d * 2, mm + l.nx * 3 - l.ny * d * 2, mx + l.ny * 3 - l.nx * d * 2, mm - l.nx * 3 - l.ny * d * 2);
      }
      for (const [f, c] of [[player, MINE_C], [npc, FOE_C]] as [Fighter, number][]) {
        if (!alive(f)) continue;
        g.fillStyle(c, 1); g.fillCircle(ox + (f.x / W) * s * 3, oy + ((f.y - top) / (H - top)) * h * 2, 2);
      }
    },

    destroy() { for (const l of leaps) l.t?.remove(); },
  };
}

/** The leap's turf ramp, banked up on the side you climb from, hoofprints running over it. */
function drawRamp(g: G, l: Leap, d: number, turned: boolean): void {
  const nx = l.nx * d, ny = l.ny * d;
  const ux = l.b.x - l.a.x, uy = l.b.y - l.a.y, len = Math.hypot(ux, uy);
  const tx = ux / len, ty = uy / len;
  const m = { x: (l.a.x + l.b.x) / 2, y: (l.a.y + l.b.y) / 2 };
  const half = 46, deep = 34;
  const P = (u: number, n: number) => ({ x: m.x + tx * u - nx * n, y: m.y + ty * u - ny * n });
  g.fillStyle(LOAM_LIT, 0.9); g.fillPoints([P(-half, 0), P(half, 0), P(half * 0.7, deep), P(-half * 0.7, deep)], true);
  g.fillStyle(GRASS, 0.9); g.fillPoints([P(-half + 6, 2), P(half - 6, 2), P(half * 0.6, deep - 6), P(-half * 0.6, deep - 6)], true);
  for (let i = 0; i < 5; i++) {
    g.lineStyle(1, GRASS_LIT, 0.7);
    const a = P(-half * 0.5 + i * half * 0.25, 6), b = P(-half * 0.5 + i * half * 0.25, deep - 10);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
  const ang = Math.atan2(ny, nx);
  for (let i = 0; i < 3; i++) { const p = P(i % 2 ? 10 : -10, deep - 8 - i * 10); hoofprint(g, p.x, p.y, ang, 8, 0x1a140c, 0.55); }
  if (turned) glow(g, m.x, m.y, 50, EMBER, 0.06, 3);
}

/** A run of cleft oak pales on a rail along a leap, pointed tops leaning toward the sheer side. */
function drawPales(g: G, l: Leap, d: number, time: number, turned: boolean): void {
  const ux = l.b.x - l.a.x, uy = l.b.y - l.a.y, len = Math.hypot(ux, uy);
  const tx = ux / len, ty = uy / len;
  const vertical = Math.abs(tx) < 0.5;
  const step = 13;
  const midU = len / 2;
  for (let u = 6; u < len - 4; u += step) {
    const x = l.a.x + tx * u, y = l.a.y + ty * u;
    const atRamp = Math.abs(u - midU) < 44;
    const hgt = atRamp ? 16 : 24;
    g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(x, y, x + l.nx * d * 2, y - hgt);
    g.lineStyle(2, ((u / step) | 0) % 2 ? TIMBER : TIMBER_LIT, 1); g.lineBetween(x - 1, y, x - 1 + l.nx * d * 2, y - hgt);
    g.fillStyle(TIMBER_DARK, 1); g.fillTriangle(x - 3 + l.nx * d * 2, y - hgt, x + 3 + l.nx * d * 2, y - hgt, x + l.nx * d * 3, y - hgt - 6);
  }
  // The rail, and the ramp-post with its iron turning-ring at the leap.
  g.lineStyle(3, TIMBER_DARK, 1);
  if (vertical) g.lineBetween(l.a.x - 1, l.a.y, l.b.x - 1, l.b.y - 12); else g.lineBetween(l.a.x, l.a.y - 12, l.b.x, l.b.y - 12);
  const m = { x: l.a.x + tx * midU, y: l.a.y + ty * midU };
  g.lineStyle(7, TIMBER_DARK, 1); g.lineBetween(m.x, m.y, m.x, m.y - 34);
  g.lineStyle(2, turned ? EMBER : 0x8a8278, 1); g.strokeCircle(m.x, m.y - 30, 5 + (turned ? Math.sin(time / 80) : 0));
  g.fillStyle(EMBER, 0.8); g.fillCircle(m.x + l.nx * d * 7, m.y - 22 + l.ny * d * 7, 2);
}

/** A keeper's call-flag on a hazel wand: white with the hunt's red bar, snapping in the wind. */
function drawFlag(g: G, x: number, y: number, time: number): void {
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(x, y, x, y - 30);
  const w = Math.sin(time / 90 + x) * 3;
  g.fillStyle(0xe8e0cc, 1); g.fillTriangle(x, y - 30, x + 15, y - 26 + w, x, y - 19);
  g.lineStyle(2, HUNT_RED, 1); g.lineBetween(x + 1, y - 25, x + 11, y - 25 + w * 0.7);
}

export const FALLEN_DEER_LEAP: GimmickDef = {
  id: ID,
  rules: 'Palings pen the floor; each leap crosses one way only. Called pens are shot into — get out the way the leaps run. Strike a leap to turn it.',
  make,
};
