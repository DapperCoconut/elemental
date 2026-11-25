import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRONZE, BRONZE_DARK, BRONZE_LIT, GILT, GILT_DARK, GILT_LIT, VESPER_DARK, VESPER_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { FOE, MINE, motionTracker, sideBadge, vellum } from './common';

/**
 * Reckoned Ahead — Computist Boethia Lunell.
 *
 * The Computist works out the feasts: when the moon will be full, which Sunday Easter must fall
 * on, years ahead, by the golden number and the epact. In the star's telling she reckons people
 * the same way. Every little while she sets a brass computus wheel on the floor where each
 * fighter's present heading will carry them — current speed, current direction, a breath and a
 * half on — and when that moment comes the date falls due: whoever stands on the wheel is struck
 * and held to it. Walk true and you arrive on time. Stand still and the wheel is under you.
 *
 * So you must keep breaking your line. Her reckonings are no respecters of persons: the wheel
 * set for her own heading takes her too, and a bot that walks straight at you walks into its date.
 * Lead her down long straight chases. Past half she reckons your turning as well — circle and the
 * wheel waits on the circle — and only a change of mind escapes it.
 */

const EVERY = 1400;          // ms between reckonings
const AHEAD = 1.5;           // seconds of heading reckoned forward
const R = 50;                // the wheel
const DAMAGE = 9;

interface Reckoning { x: number; y: number; set: number; due: number; owner: Fighter; fell: number; spin: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const motion = motionTracker();
  const wheels: Reckoning[] = [];
  const kept = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let next = 1200;
  let t0 = -1;
  const half = () => npc.hp < npc.maxHp * 0.5;

  /** Where `f` will be in `AHEAD` seconds if nothing changes — along a line, or, past half, along its arc. */
  function reckon(f: Fighter): Pt {
    const m = motion.get(f);
    let x = f.x, y = f.y;
    if (!half() || Math.abs(m.turn) < 0.25) {
      x += m.vx * AHEAD; y += m.vy * AHEAD;
    } else {
      let h = m.heading;
      const steps = 12, dt = AHEAD / steps, turn = clamp(m.turn, -3.5, 3.5);
      for (let i = 0; i < steps; i++) { h += turn * dt; x += Math.cos(h) * m.speed * dt; y += Math.sin(h) * m.speed * dt; }
    }
    return { x: clamp(x, 44, W - 44), y: clamp(y, top + 36, H - 40) };
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (t0 < 0) t0 = time;
      for (const f of [player, npc]) motion.step(f, dt);
      const el = time - t0;
      if (el >= next) {
        next = el + EVERY;
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const p = reckon(f);
          wheels.push({ x: p.x, y: p.y, set: time, due: time + AHEAD * 1000, owner: f, fell: 0, spin: ctx.rng() * Math.PI * 2 });
        }
        ctx.sfx('clock-tick');
      }
      for (const w of wheels) {
        if (w.fell || time < w.due) continue;
        w.fell = time;
        let any = false;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, w.x, w.y) > R + 18) continue;
          ctx.hit(f, DAMAGE, w.x, w.y);
          ctx.root(f, 450);
          kept.set(f, (kept.get(f) ?? 0) + 1);
          any = true;
        }
        ctx.sfx(any ? 'gravity-slam' : 'crystal-chime');
      }
      for (let i = wheels.length - 1; i >= 0; i--) if (wheels[i].fell && time - wheels[i].fell > 600) wheels.splice(i, 1);
    },

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      const time = ctx.scene.time.now;
      const m = motion.get(npc);
      // Any wheel about to fall that she is standing on, or that her heading runs into: break the line.
      for (const w of wheels) {
        if (w.fell) continue;
        const left = (w.due - time) / 1000;
        const ax = npc.x + m.vx * left, ay = npc.y + m.vy * left;
        const onIt = dist(npc.x, npc.y, w.x, w.y) < R + 30;
        const willBe = dist(ax, ay, w.x, w.y) < R + 30;
        if (!onIt && !willBe) continue;
        let nx = -m.vy, ny = m.vx;
        const l = Math.hypot(nx, ny);
        if (l < 1) { nx = npc.x - w.x; ny = npc.y - w.y; }
        const ll = Math.hypot(nx, ny) || 1;
        const side = (npc.x - w.x) * nx + (npc.y - w.y) * ny >= 0 ? 1 : -1;
        return { x: clamp(npc.x + (nx / ll) * side * 140, 50, W - 50), y: clamp(npc.y + (ny / ll) * side * 140, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // The calendar inlaid in the nave: a great brass ring of the nineteen years round the crossing.
      const cx = W / 2, cy = (top + H) / 2 + 10;
      g.lineStyle(3, BRONZE_DARK, 0.35); g.strokeCircle(cx, cy, 230);
      g.lineStyle(1.5, BRONZE, 0.35); g.strokeCircle(cx, cy, 222);
      for (let i = 0; i < 19; i++) {
        const a = (i / 19) * Math.PI * 2 - Math.PI / 2;
        g.lineStyle(1.5, BRONZE, 0.35); g.lineBetween(cx + Math.cos(a) * 222, cy + Math.sin(a) * 222, cx + Math.cos(a) * 208, cy + Math.sin(a) * 208);
        g.fillStyle(GILT, 0.35); g.fillCircle(cx + Math.cos(a) * 214, cy + Math.sin(a) * 214, i % 4 === 0 ? 2.4 : 1.4);
      }
      g.lineStyle(1, BRONZE, 0.25); g.lineBetween(cx - 230, cy, cx + 230, cy); g.lineBetween(cx, cy - 230, cx, cy + 230);

      for (const w of wheels) {
        const life = clamp((time - w.set) / (w.due - w.set), 0, 1);
        const col = w.owner === npc ? FOE : MINE;
        if (w.fell) {
          const k = (time - w.fell) / 600;
          g.lineStyle(4 * (1 - k), GILT_LIT, 1 - k); g.strokeCircle(w.x, w.y, R + k * 30);
          continue;
        }
        // The thread from the fighter to the date reckoned for them.
        if (alive(w.owner)) {
          const n = Math.floor(dist(w.owner.x, w.owner.y, w.x, w.y) / 14);
          for (let i = 1; i < n; i++) {
            const t = i / n;
            g.fillStyle(col, 0.25 + 0.25 * life); g.fillCircle(w.owner.x + (w.x - w.owner.x) * t, w.owner.y + (w.y - w.owner.y) * t, 1.4);
          }
        }
        glow(g, w.x, w.y, R + 8, col, 0.03 + 0.05 * life, 3);
        // The wheel: brass rim with nineteen ticks, a ring of dominical letters, the moon at the hub.
        g.fillStyle(VESPER_DARK, 0.35 + 0.25 * life); g.fillCircle(w.x, w.y, R);
        g.lineStyle(3, BRONZE_DARK, 0.9); g.strokeCircle(w.x, w.y, R);
        g.lineStyle(1.6, BRONZE_LIT, 0.85); g.strokeCircle(w.x, w.y, R - 3);
        for (let i = 0; i < 19; i++) {
          const a = w.spin + (i / 19) * Math.PI * 2;
          g.lineStyle(1.2, GILT, 0.8);
          g.lineBetween(w.x + Math.cos(a) * (R - 4), w.y + Math.sin(a) * (R - 4), w.x + Math.cos(a) * (R - 10), w.y + Math.sin(a) * (R - 10));
        }
        g.lineStyle(1, GILT_DARK, 0.8); g.strokeCircle(w.x, w.y, R - 18);
        for (let i = 0; i < 7; i++) {
          const a = w.spin * -0.5 + (i / 7) * Math.PI * 2;
          const lx = w.x + Math.cos(a) * (R - 14), ly = w.y + Math.sin(a) * (R - 14);
          g.fillStyle(GILT_LIT, 0.8); g.fillRect(lx - 1.5, ly - 2, 3, 4);
        }
        // The moon's phase: a lit disc eaten by shadow as the date approaches full.
        g.fillStyle(lit(VESPER_LIT, 0.4), 0.9); g.fillCircle(w.x, w.y, 11);
        g.fillStyle(VESPER_DARK, 0.95); g.fillCircle(w.x + 22 * (1 - life) - 11 * (1 - life), w.y, 11 * (1 - life * 0.9));
        // The hand: sweeps once round as the date comes due.
        const ha = -Math.PI / 2 + life * Math.PI * 2;
        g.lineStyle(2.4, col, 0.95); g.lineBetween(w.x, w.y, w.x + Math.cos(ha) * (R - 6), w.y + Math.sin(ha) * (R - 6));
        g.lineStyle(3, col, 0.55); g.beginPath(); g.arc(w.x, w.y, R + 5, -Math.PI / 2, ha); g.strokePath();
      }
    },

    drawAir(g, time) {
      // A shaft of starlight comes down on each date as it falls.
      for (const w of wheels) {
        if (!w.fell) {
          const left = w.due - time;
          if (left < 350) {
            const k = 1 - left / 350;
            g.fillStyle(GILT_LIT, 0.18 * k); g.fillRect(w.x - R * 0.5, top, R, w.y - top);
          }
          continue;
        }
        const k = (time - w.fell) / 600;
        g.fillStyle(GILT_LIT, 0.45 * (1 - k)); g.fillRect(w.x - R * 0.6 * (1 - k * 0.5), top, R * 1.2 * (1 - k * 0.5), w.y - top);
        for (let i = 0; i < 8; i++) {
          const a = i * 0.785 + k;
          g.fillStyle(0xffffff, 1 - k);
          g.fillCircle(w.x + Math.cos(a) * (R + k * 40), w.y + Math.sin(a) * (R + k * 40) * 0.7, 2.2 * (1 - k));
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      vellum(g, x, y, 196, 28);
      // The little computus dial: the hand shows the next reckoning coming round.
      const el = t0 < 0 ? 0 : time - t0;
      const k = clamp(1 - (next - el) / EVERY, 0, 1);
      g.fillStyle(BRONZE_DARK, 1); g.fillCircle(x, y + 14, 10);
      g.fillStyle(lit(BRONZE, 0.3), 1); g.fillCircle(x, y + 14, 8.5);
      for (let i = 0; i < 19; i++) { const a = (i / 19) * Math.PI * 2; g.fillStyle(GILT_DARK, 1); g.fillCircle(x + Math.cos(a) * 7, y + 14 + Math.sin(a) * 7, 0.7); }
      const ha = -Math.PI / 2 + k * Math.PI * 2;
      g.lineStyle(1.6, VESPER_DARK, 1); g.lineBetween(x, y + 14, x + Math.cos(ha) * 7, y + 14 + Math.sin(ha) * 7);
      if (half()) { g.lineStyle(1, VESPER_DARK, 0.8); g.beginPath(); g.arc(x, y + 14, 12.5, 0, Math.PI * 1.4); g.strokePath(); }
      // Dates each side has kept (been struck on): tally strokes in fives.
      for (const [f, col, dir] of [[player, MINE, -1], [npc, FOE, 1]] as const) {
        const n = Math.min(15, kept.get(f) ?? 0);
        const bx = x + dir * 22;
        sideBadge(g, bx + dir * 4, y + 14, col);
        for (let i = 0; i < n; i++) {
          const grp = Math.floor(i / 5), j = i % 5;
          const tx = bx + dir * (14 + grp * 22 + j * 4);
          g.lineStyle(1.4, 0x3a2a1a, 1);
          if (j < 4) g.lineBetween(tx, y + 8, tx, y + 20);
          else g.lineBetween(bx + dir * (12 + grp * 22), y + 18, bx + dir * (28 + grp * 22), y + 10);
        }
      }
    },
  };
}

export const FALLEN_RECKONED_AHEAD: GimmickDef = {
  id: fallenId('cathedral', 'reckoned-ahead'),
  rules: 'She sets a wheel where your heading will carry you; it falls when you would arrive. Keep breaking your line. Her own wheels take her too.',
  make,
};
