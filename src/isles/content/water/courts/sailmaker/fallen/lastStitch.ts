import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, mixC, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CANVAS, CANVAS_OLD, CANVAS_SHADE, CHALK, FOE_TINT, PLAYER_TINT, RED_THREAD, STEEL, chalkLine, dist, needle,
  segDist, stitches,
} from '../art';

/**
 * The Last Stitch — Widow Thole, who sews the shrouds.
 *
 * Sailmakers sew the dead into old sailcloth, and the last stitch of a shroud goes through the
 * nose — to be sure. In the star's telling Thole sewed the drowned of Lowstitch into canvas before
 * the Queen sent them under as ballast, and she sews the stranger the same way. She throws her
 * great sail-needle on its red thread clean across the room: a chalk line marks its flight
 * first, then it flies, and anyone it passes through takes a stitch. Six stitches pinch; the
 * seventh is the last stitch — a heavy blow and a moment sewn stiff. Stitches work loose with
 * time. Below half she throws them in crossed pairs.
 *
 * The exploit is the thread: a thrown needle sticks quivering in the far wall with its eye up.
 * Strike the eye and the needle is hauled back home along its own thread — double-stitching
 * anyone on the line, and Thole most of all if she stands on it.
 */

const ID = fallenId('sailmaker', 'last-stitch');
const WARN_MS = 950;
const FLY_SPEED = 980;
const BACK_SPEED = 1150;
const STUCK_MS = 2700;
const THROW_GAP_MS = 2700;
const PAIR_GAP_MS = 2300;
const PAIR_DELAY_MS = 380;
const SEW_R = 30;
const HAND_CLEAR = 90;
const LAST = 7;
const LOOSEN_MS = 5000;

type State = 'warn' | 'fly' | 'stuck' | 'back' | 'gone';
interface Throw {
  ax: number; ay: number; bx: number; by: number; len: number;
  state: State; t0: number; pos: number; prev: number;
  sewn: Set<Fighter>; target: StrikeTarget | null; seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const X0 = 30, X1 = W - 30, Y0 = top + 14, Y1 = H - 14;
  let throws: Throw[] = [];
  let nextThrowAt = 1500;
  let crossed = false;
  let announced = false;
  const count = new Map<Fighter, number>();
  const lastSewn = new Map<Fighter, number>();
  const lastStitchAt = new Map<Fighter, number>();

  /** Clip the infinite line through P at angle a to the arena box. */
  const chord = (P: Pt, a: number): [Pt, Pt] => {
    const ux = Math.cos(a), uy = Math.sin(a);
    const ts: number[] = [];
    if (Math.abs(ux) > 1e-4) { ts.push((X0 - P.x) / ux, (X1 - P.x) / ux); }
    if (Math.abs(uy) > 1e-4) { ts.push((Y0 - P.y) / uy, (Y1 - P.y) / uy); }
    const neg = Math.max(...ts.filter((t) => t < 0)), pos = Math.min(...ts.filter((t) => t > 0));
    return [{ x: P.x + ux * neg, y: P.y + uy * neg }, { x: P.x + ux * pos, y: P.y + uy * pos }];
  };

  const launch = (P: Pt, a: number, delay: number): void => {
    const [e0, e1] = chord(P, a);
    // She throws from the end nearer her own hand.
    const n = ctx.npc;
    const [A, B] = dist(n.x, n.y, e0.x, e0.y) < dist(n.x, n.y, e1.x, e1.y) ? [e0, e1] : [e1, e0];
    throws.push({
      ax: A.x, ay: A.y, bx: B.x, by: B.y, len: dist(A.x, A.y, B.x, B.y), state: 'warn',
      t0: ctx.scene.time.now + delay, pos: 0, prev: 0, sewn: new Set(), target: null, seed: rng() * 10,
    });
  };

  const sew = (f: Fighter, n: number, x: number, y: number, time: number): void => {
    if (!f.active || f.hp <= 0) return;
    const isP = f === ctx.player;
    let c = (count.get(f) ?? 0) + n;
    lastSewn.set(f, time);
    ctx.sfx('stab');
    if (c >= LAST) {
      c = 0;
      lastStitchAt.set(f, time);
      ctx.sfx('curse-cast');
      if (isP) { ctx.tk.hitPlayer(26, x, y); ctx.stun(f, 900); ctx.banner('THE LAST STITCH', '#ff8a7a'); }
      else { ctx.hit(f, Math.max(30, f.maxHp * 0.11), x, y); ctx.stun(f, 1300); ctx.banner('SEWN IN HER OWN SHROUD', '#9df5c8'); }
    } else if (isP) ctx.tk.hitPlayer(4 * n, x, y);
    else ctx.hit(f, Math.max(5, f.maxHp * 0.018) * n, x, y);
    count.set(f, c);
  };

  const pointAt = (t: Throw, d: number): Pt => ({ x: t.ax + ((t.bx - t.ax) / t.len) * d, y: t.ay + ((t.by - t.ay) / t.len) * d });

  /** Who the needle passed through between `from` and `to` along its line. */
  const sweep = (t: Throw, from: number, to: number, stitchesEach: number, time: number, guardHand: boolean): void => {
    const p0 = pointAt(t, from), p1 = pointAt(t, to);
    for (const f of [ctx.player, ctx.npc]) {
      if (t.sewn.has(f) || ctx.isAirborne(f)) continue;
      if (guardHand && f === ctx.npc && dist(f.x, f.y, t.ax, t.ay) < HAND_CLEAR) continue;
      if (segDist(f.x, f.y + 8, p0.x, p0.y, p1.x, p1.y) < SEW_R) { t.sewn.add(f); sew(f, stitchesEach, f.x, f.y, time); }
    }
  };

  const stick = (t: Throw): void => {
    t.state = 'stuck';
    t.t0 = ctx.scene.time.now;
    ctx.sfx('clang');
    t.target = ctx.target({
      x: t.bx, y: t.by, r: 24,
      onStruck: () => {
        if (t.state !== 'stuck') return;
        t.state = 'back'; t.t0 = ctx.scene.time.now; t.pos = t.len; t.prev = t.len; t.sewn = new Set();
        t.target?.remove(); t.target = null;
        ctx.sfx('whip');
      },
    });
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('SEVEN STITCHES TO A SHROUD', '#e8d8c0'); }
      if (!crossed && ctx.npc.hp < ctx.npc.maxHp * 0.5) { crossed = true; ctx.banner('CROSS-STITCH', '#ff9a7a'); ctx.sfx('boss-phase'); }

      if (time >= nextThrowAt) {
        const p = ctx.player;
        const a = rng() * Math.PI;
        launch({ x: p.x, y: p.y + 8 }, a, 0);
        if (crossed) launch({ x: p.x, y: p.y + 8 }, a + Math.PI / 2 + (rng() - 0.5) * 0.6, PAIR_DELAY_MS);
        nextThrowAt = time + (crossed ? PAIR_GAP_MS : THROW_GAP_MS);
      }

      for (const t of throws) {
        if (t.state === 'warn' && time >= t.t0 + WARN_MS) { t.state = 'fly'; ctx.sfx('whoosh'); }
        if (t.state === 'fly') {
          t.prev = t.pos; t.pos = Math.min(t.len, t.pos + FLY_SPEED * dt);
          sweep(t, t.prev, t.pos, 1, time, true);
          if (t.pos >= t.len) stick(t);
        } else if (t.state === 'stuck' && time - t.t0 > STUCK_MS) {
          t.target?.remove(); t.target = null; t.state = 'gone'; t.t0 = time;
        } else if (t.state === 'back') {
          t.prev = t.pos; t.pos = Math.max(0, t.pos - BACK_SPEED * dt);
          sweep(t, t.pos, t.prev, 2, time, false);
          if (t.pos <= 0) { t.state = 'gone'; t.t0 = time; }
        }
      }
      throws = throws.filter((t) => t.state !== 'gone' || time - t.t0 < 600);

      // Stitches work loose one at a time.
      for (const f of [ctx.player, ctx.npc]) {
        const c = count.get(f) ?? 0;
        if (c > 0 && time - (lastSewn.get(f) ?? 0) > LOOSEN_MS) { count.set(f, c - 1); lastSewn.set(f, time - LOOSEN_MS * 0.4); }
      }
    },

    playerSpeedMult() { return 1 - (count.get(ctx.player) ?? 0) * 0.035; },
    npcSpeedMult() { return 1 - (count.get(ctx.npc) ?? 0) * 0.03; },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      // Off any line about to carry a needle.
      for (const t of throws) {
        if (t.state !== 'warn' && t.state !== 'fly' && t.state !== 'back') continue;
        if (segDist(n.x, n.y + 8, t.ax, t.ay, t.bx, t.by) > SEW_R + 26) continue;
        const ux = (t.bx - t.ax) / t.len, uy = (t.by - t.ay) / t.len;
        const s = (n.x - t.ax) * -uy + (n.y - t.ay) * ux >= 0 ? 1 : -1;
        return { x: n.x - uy * s * 90, y: n.y + ux * s * 90 };
      }
      // Haul a stuck needle home when the stranger stands on its thread.
      for (const t of throws) {
        if (t.state !== 'stuck') continue;
        if (segDist(p.x, p.y + 8, t.ax, t.ay, t.bx, t.by) < SEW_R + 10 && segDist(n.x, n.y + 8, t.ax, t.ay, t.bx, t.by) > 70) {
          return { x: t.bx + (t.ax - t.bx) / t.len * 40, y: t.by + (t.ay - t.by) / t.len * 40 };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const t of throws) {
        if (t.state === 'warn') {
          if (time < t.t0) continue;
          const k = Math.min(1, (time - t.t0) / WARN_MS);
          g.lineStyle(SEW_R * 2, RED_THREAD, 0.05 + k * 0.08); g.lineBetween(t.ax, t.ay, t.bx, t.by);
          chalkLine(g, t.ax, t.ay, t.bx, t.by, 0.35 + k * 0.5);
        }
        // The thread lies along the floor where the needle has passed.
        if (t.state === 'fly' || t.state === 'stuck' || t.state === 'back' || t.state === 'gone') {
          const end = t.state === 'stuck' ? t.len : t.pos;
          const e = pointAt(t, end);
          const fade = t.state === 'gone' ? 1 - (time - t.t0) / 600 : 1;
          const taut = t.state === 'stuck' ? Math.sin(time / 30 + t.seed) * 1.2 : 0;
          g.lineStyle(2, dim(RED_THREAD, 0.3), 0.6 * fade); g.lineBetween(t.ax, t.ay + 2, e.x, e.y + 2 + taut);
          g.lineStyle(1.4, RED_THREAD, 0.95 * fade); g.lineBetween(t.ax, t.ay, e.x, e.y + taut);
          // Tacks every so often where the thread caught the boards.
          for (let d = 40; d < end; d += 70) {
            const q = pointAt(t, d);
            g.fillStyle(lit(RED_THREAD, 0.3), 0.8 * fade); g.fillCircle(q.x, q.y, 1.6);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const t of throws) {
        const ang = Math.atan2(t.by - t.ay, t.bx - t.ax);
        if (t.state === 'warn' && time >= t.t0) {
          // Poised in her hand at the line's start, shivering.
          const k = (time - t.t0) / WARN_MS;
          const sh = Math.sin(time / 25) * 2 * k;
          needle(g, t.ax + Math.cos(ang) * 22 + sh, t.ay + Math.sin(ang) * 22 - 10, ang, 46);
        } else if (t.state === 'fly' || t.state === 'back') {
          const q = pointAt(t, t.pos);
          const a = t.state === 'back' ? ang + Math.PI : ang;
          // Speed streaks behind the needle.
          g.lineStyle(3, STEEL, 0.25);
          g.lineBetween(q.x - Math.cos(a) * 60, q.y - 10 - Math.sin(a) * 60, q.x, q.y - 10);
          needle(g, q.x, q.y - 10, a, 52);
        } else if (t.state === 'stuck') {
          // Buried half-way in the wall planking, eye up and glinting: strike it.
          const q = pointAt(t, t.len - 12);
          const quiver = Math.sin((time - t.t0) / 22) * Math.max(0, 1 - (time - t.t0) / 700) * 0.25;
          needle(g, q.x, q.y - 8, ang + quiver, 46);
          const eye = { x: q.x - Math.cos(ang) * 20, y: q.y - 8 - Math.sin(ang) * 20 };
          const life = 1 - (time - t.t0) / STUCK_MS;
          const pulse = 0.5 + 0.5 * Math.sin(time / 120);
          g.lineStyle(2, RED_THREAD, 0.5 + pulse * 0.4); g.strokeCircle(eye.x, eye.y, 12 + pulse * 4);
          g.lineStyle(3, CHALK, 0.7); g.beginPath(); g.arc(eye.x, eye.y, 20, -Math.PI / 2, -Math.PI / 2 + life * Math.PI * 2); g.strokePath();
        }
      }
      // The last stitch: a big needle punched down through whoever took it.
      for (const f of [ctx.player, ctx.npc]) {
        const at = lastStitchAt.get(f) ?? -9999;
        const k = (time - at) / 700;
        if (k < 0 || k > 1) continue;
        const y = f.y - 70 + Math.min(1, k * 3) * 50;
        needle(g, f.x + 4, y, Math.PI / 2, 60, 1 - k * 0.6);
        g.lineStyle(2, RED_THREAD, 1 - k); g.lineBetween(f.x + 4, y - 30, f.x + 28, f.y - 80);
      }
      // Loose thread trailing from anyone half sewn.
      for (const f of [ctx.player, ctx.npc]) {
        const c = count.get(f) ?? 0;
        for (let i = 0; i < c; i++) {
          const a = i * 0.9 + time / 700;
          g.lineStyle(1.2, RED_THREAD, 0.7);
          g.lineBetween(f.x - 14 + i * 4, f.y + 10 - i * 5, f.x - 14 + i * 4 + Math.cos(a) * 7, f.y + 14 - i * 5 + Math.sin(a) * 4);
        }
      }
    },

    drawHud(g) {
      drawShroud(g, W / 2 - 150, top + 6, count.get(ctx.player) ?? 0, PLAYER_TINT);
      drawShroud(g, W / 2 + 40, top + 6, count.get(ctx.npc) ?? 0, FOE_TINT);
    },

    destroy() { for (const t of throws) t.target?.remove(); throws = []; },
  };
}

/** A canvas shroud lying on its side: seven stitch slots up the seam, the last one at the nose. */
function drawShroud(g: G, x: number, y: number, n: number, who: number): void {
  const w = 110, h = 22;
  g.fillStyle(0x15120f, 0.7); g.fillRoundedRect(x - 6, y - 4, w + 12, h + 8, 10);
  g.fillStyle(mixC(CANVAS_OLD, who, 0.12), 1); g.fillRoundedRect(x, y, w, h, 10);
  g.fillStyle(CANVAS_SHADE, 0.6); g.fillRoundedRect(x, y + h * 0.55, w, h * 0.45, 8);
  g.fillStyle(CANVAS, 0.5); g.fillRoundedRect(x + 4, y + 3, w - 8, 4, 2);
  // The head end is rounded over the face.
  g.fillStyle(dim(CANVAS_OLD, 0.15), 1); g.fillCircle(x + w - 11, y + h / 2, 9);
  stitches(g, x + 6, y + h / 2, x + w - 24, y + h / 2, dim(CANVAS_OLD, 0.4), 1, 3, 9);
  for (let i = 0; i < LAST; i++) {
    const sx = x + 10 + i * 14, sy = y + h / 2;
    const done = i < n;
    if (i === LAST - 1) {
      g.lineStyle(2.4, done ? RED_THREAD : 0x5a4a3a, done ? 1 : 0.7);
      g.lineBetween(sx - 4, sy - 4, sx + 4, sy + 4); g.lineBetween(sx - 4, sy + 4, sx + 4, sy - 4);
    } else {
      g.lineStyle(2, done ? RED_THREAD : 0x5a4a3a, done ? 1 : 0.55);
      g.lineBetween(sx - 3, sy - 5, sx + 3, sy + 5);
    }
  }
  g.fillStyle(who, 1); g.fillCircle(x - 1, y + h / 2, 3);
}

export const FALLEN_LAST_STITCH: GimmickDef = {
  id: ID,
  rules: 'Her needle flies along chalk lines: each pass is a stitch, the seventh the last. Strike a stuck needle to haul it back along its thread.',
  make,
};
