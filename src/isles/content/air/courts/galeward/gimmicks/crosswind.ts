import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { windStreak, windsock } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, FLAG, FLAG_DARK, KITE_RED, ROCK_DARK, SLATE, SLATE_DARK, TAR } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Crosswind — Windsock Tilly.
 *
 * A great weathervane stands in the yard and the wind is whatever it says. Every few seconds the
 * vane swings and calls a new quarter — the compass letter lights, a banner names the wind — and
 * from then on everything drifts downwind: both fighters are leaned on by it, walking into it is
 * a slog and walking with it is a run.
 *
 * And the blows ride it. Strike with the wind at your back — your foe downwind of you — and they
 * land hard; strike into the teeth of it and they arrive tired. So the yard is a race for the
 * upwind side, every time the vane swings. Between swings the gale throws a rank of loose slates
 * and straw off the upwind wall, with one gap in the rank to step through.
 *
 * Tilly reads the vane before anyone. Get round her before she gets round you.
 */

const SWING_EVERY = 7000;
const SWING_MS = 1200;
const DRIFT = 52;
const WITH_MULT = 1.3;
const AGAINST_MULT = 0.7;
const DEBRIS_WARN = 950;
const DEBRIS_DMG = 7;

const QUARTERS = ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'];

interface Front { at: number; fireAt: number; a: number; gap: number; fired: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  const drift = ctx.hard ? DRIFT * 1.3 : DRIFT;
  /** The wind blows *toward* this angle. */
  let wind = 0;
  let from = 0, to = 0;
  let swingAt = -1, nextSwing = 0;
  let front: Front | null = null;
  let nextFront = 0;
  const vel = new Map<Fighter, { x: number; y: number; lx: number; ly: number }>();

  /** Wind blows from the west at the bell; the vane's quarters are the 8 directions. */
  const quarterOf = (a: number) => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  /** Wind name: the quarter it blows *from*. */
  const nameOf = (a: number) => QUARTERS[(quarterOf(a) + 4) % 8];

  /** +1 if `to` is straight downwind of `fromF`, −1 if straight upwind. */
  const downwindness = (fromF: Fighter, toF: Fighter): number => {
    const d = dist(fromF.x, fromF.y, toF.x, toF.y) || 1;
    return ((toF.x - fromF.x) * Math.cos(wind) + (toF.y - fromF.y) * Math.sin(wind)) / d;
  };
  const blowMult = (attacker: Fighter, target: Fighter): number => {
    if (!alive(attacker)) return 1;
    const k = downwindness(attacker, target);
    return k > 0.35 ? WITH_MULT : k < -0.35 ? AGAINST_MULT : 1;
  };
  /** Walking with the wind is quick, into it is slow — read off each fighter's own motion. */
  const walkMult = (f: Fighter): number => {
    const v = vel.get(f);
    if (!v) return 1;
    const sp = Math.hypot(v.x, v.y);
    if (sp < 30) return 1;
    const along = (v.x * Math.cos(wind) + v.y * Math.sin(wind)) / sp;
    return 1 + along * 0.18;
  };

  function swing(time: number): void {
    from = wind;
    const turn = (rng() < 0.5 ? 1 : -1) * (Math.PI / 4) * (2 + Math.floor(rng() * 2));
    to = wrapAngle(Math.round((wind + turn) / (Math.PI / 4)) * (Math.PI / 4));
    swingAt = time;
    ctx.sfx('gust');
  }

  function fireFront(f: Front): void {
    // A rank of slates thrown off the upwind edge, travelling downwind, one gap in it.
    const ux = Math.cos(f.a), uy = Math.sin(f.a);
    const px = -uy, py = ux;
    const reach = Math.hypot(W, H - top) / 2 + 40;
    const ox = cx - ux * reach, oy = cy - uy * reach;
    const n = 15;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 58;
      if (Math.abs(off - f.gap) < 70) continue;
      tk.spawnBullet({ x: ox + px * off, y: oy + py * off, angle: f.a, speed: ctx.hard ? 250 : 215, damage: DEBRIS_DMG, r: 7, lifeMs: 5200, color: i % 3 ? SLATE : 0xd8c070 });
    }
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (nextSwing === 0) { nextSwing = time + 3200; nextFront = time + 2600; ctx.banner('WIND FROM THE WEST', '#cde9fb'); }
      // Velocity per fighter, for the walk rule.
      for (const f of [player, npc]) {
        const v = vel.get(f) ?? { x: 0, y: 0, lx: f.x, ly: f.y };
        if (dt > 0) { v.x = v.x * 0.7 + ((f.x - v.lx) / dt) * 0.3; v.y = v.y * 0.7 + ((f.y - v.ly) / dt) * 0.3; }
        v.lx = f.x; v.ly = f.y;
        vel.set(f, v);
      }
      // The vane swings.
      if (time >= nextSwing && swingAt < 0) swing(time);
      if (swingAt >= 0) {
        const k = clamp((time - swingAt) / SWING_MS, 0, 1);
        // It spins past and settles — a wobble so the swing reads as weather, not a dial.
        wind = from + wrapAngle(to - from) * k + Math.sin(k * Math.PI * 3) * (1 - k) * 0.6;
        if (k >= 1) {
          wind = to;
          swingAt = -1;
          nextSwing = time + (ctx.hard ? SWING_EVERY * 0.8 : SWING_EVERY);
          nextFront = time + 1800;
          ctx.banner(`WIND FROM THE ${nameOf(wind)}`, '#cde9fb');
        }
      }
      // The lean: both fighters drift downwind (less while the vane is still turning).
      const lean = (swingAt >= 0 ? 0.3 : 1) * drift * dt;
      for (const f of [player, npc]) if (alive(f)) ctx.nudge(f, Math.cos(wind) * lean, Math.sin(wind) * lean);
      // The debris front.
      if (!front && swingAt < 0 && time >= nextFront) {
        const gap = (rng() - 0.5) * 520;
        front = { at: time, fireAt: time + DEBRIS_WARN, a: wind, gap, fired: false };
      }
      if (front && !front.fired && time >= front.fireAt) { front.fired = true; fireFront(front); }
      if (front && front.fired && time > front.fireAt + 600) { front = null; nextFront = time + 2900 + rng() * 900; }
    },

    playerSpeedMult: () => walkMult(player),
    npcSpeedMult: () => walkMult(npc),
    npcTakenMult: () => blowMult(player, npc),
    playerTakenMult: () => blowMult(npc, player),

    npcSeek() {
      if (nextSwing === 0) return null;
      // Tilly reads the vane: always for the upwind side of you, at casting range.
      const a = swingAt >= 0 ? to : wind;
      return { x: clamp(player.x - Math.cos(a) * 230, 60, W - 60), y: clamp(player.y - Math.sin(a) * 230, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // A paved compass rose under the vane.
      g.fillStyle(FLAG_DARK, 0.7); g.fillCircle(cx, cy, 92);
      g.fillStyle(FLAG, 0.8); g.fillCircle(cx, cy, 86);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const lit8 = swingAt < 0 && quarterOf(wrapAngle(wind + Math.PI)) === i;
        g.fillStyle(lit8 ? BRASS_LIT : i % 2 ? SLATE : SLATE_DARK, lit8 ? 0.95 : 0.55);
        g.fillTriangle(cx + Math.cos(a - 0.16) * 22, cy + Math.sin(a - 0.16) * 22, cx + Math.cos(a + 0.16) * 22, cy + Math.sin(a + 0.16) * 22, cx + Math.cos(a) * (i % 2 ? 62 : 84), cy + Math.sin(a) * (i % 2 ? 62 : 84));
      }
      g.lineStyle(2, BRASS_DARK, 0.6); g.strokeCircle(cx, cy, 88);
      // The wind itself, visible: streaks racing downwind across the whole yard.
      const ux = Math.cos(wind), uy = Math.sin(wind);
      const span = Math.hypot(W, H);
      for (let i = 0; i < 26; i++) {
        const ph = ((time / 1000) * 0.9 + i * 0.137) % 1;
        const off = ((i * 211) % 1000) / 1000 - 0.5;
        const along = (ph - 0.5) * span;
        const x = cx + ux * along - uy * off * span * 0.8, y = cy + uy * along + ux * off * span * 0.8;
        if (x < -40 || x > W + 40 || y < top - 10 || y > H + 20) continue;
        const a = Math.sin(ph * Math.PI) * 0.35;
        g.lineStyle(1.5, 0xffffff, a); g.lineBetween(x - ux * 40, y - uy * 40, x, y);
      }
      // The debris front's warning: a dashed line along the upwind edge, the gap left clear.
      if (front && !front.fired) {
        const k = clamp((time - front.at) / DEBRIS_WARN, 0, 1);
        const fx = Math.cos(front.a), fy = Math.sin(front.a);
        const px = -fy, py = fx;
        const reach = Math.hypot(W, H - top) / 2 - 30;
        for (let i = -8; i <= 8; i++) {
          const off = i * 58;
          if (Math.abs(off - front.gap) < 70) continue;
          const x = cx - fx * reach + px * off, y = cy - fy * reach + py * off;
          g.fillStyle(SLATE_DARK, 0.25 + k * 0.5); g.fillRect(x - 6, y - 3, 12, 6);
          g.lineStyle(1, 0xffffff, 0.15 + k * 0.3); g.lineBetween(x, y, x + fx * 80 * k, y + fy * 80 * k);
        }
        // The gap glows: the way through.
        const gx = cx - fx * reach + px * front.gap, gy = cy - fy * reach + py * front.gap;
        g.lineStyle(2, BRASS_LIT, 0.3 + k * 0.5); g.lineBetween(gx, gy, gx + fx * 500, gy + fy * 500);
      }
    },

    drawAir(g, time) {
      // The vane: a tall brass pole with a cockerel arrow, drawn big in the middle.
      const h = 120;
      g.fillStyle(0x000000, 0.25); g.fillEllipse(cx, cy + 4, 26, 8);
      g.fillStyle(ROCK_DARK, 1); g.fillRect(cx - 9, cy - 10, 18, 12);
      g.fillStyle(BRASS_DARK, 1); g.fillRect(cx - 3, cy - h, 6, h);
      g.fillStyle(BRASS, 1); g.fillRect(cx - 3, cy - h, 2, h);
      const top0 = cy - h;
      const ax = Math.cos(wind), ay = Math.sin(wind) * 0.45;
      const L = 46;
      g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(cx - ax * L, top0 - ay * L, cx + ax * L, top0 + ay * L);
      g.fillStyle(BRASS, 1);
      const tx = cx + ax * L, ty = top0 + ay * L;
      g.fillTriangle(tx + ax * 12, ty + ay * 12, tx - ay * 12, ty + ax * 8 * 0.45 - 6, tx + ay * 12, ty - ax * 8 * 0.45 + 6);
      g.fillTriangle(cx - ax * L, top0 - ay * L - 10, cx - ax * L, top0 - ay * L + 10, cx - ax * (L - 20), top0 - ay * (L - 20));
      // The cockerel faces into the wind.
      const f = ax >= 0 ? -1 : 1;
      g.fillStyle(BRASS_LIT, 1); g.fillEllipse(cx, top0 - 12, 24, 15);
      g.fillCircle(cx + f * 10, top0 - 22, 6);
      g.fillStyle(KITE_RED, 1); g.fillCircle(cx + f * 10, top0 - 29, 3);
      g.fillStyle(BRASS_LIT, 1); g.fillTriangle(cx - f * 10, top0 - 8, cx - f * 22, top0 - 28, cx - f * 6, top0 - 16);
      g.fillStyle(TAR, 1); g.fillTriangle(cx + f * 15, top0 - 23, cx + f * 21, top0 - 21, cx + f * 15, top0 - 19);
      // A windsock at each corner of the yard, streaming with the wind.
      const strength = swingAt >= 0 ? 0.4 : 1;
      for (const [x, y] of [[44, top + 70], [W - 44, top + 70], [44, H - 30], [W - 44, H - 30]] as [number, number][]) windsock(g, x, y, time / 1000, strength, wind);
      // A little sign of the rule over each fighter: an arrow showing which way their blows ride.
      for (const [a, b] of [[player, npc], [npc, player]] as [Fighter, Fighter][]) {
        if (!alive(a) || !alive(b)) continue;
        const k = downwindness(a, b);
        if (Math.abs(k) < 0.35) continue;
        const x = a.x, y = a.y - 52;
        if (k > 0) {
          for (let i = 0; i < 3; i++) windStreak(g, x - 8 + i * 6 + Math.cos(wind) * ((time / 30 + i * 8) % 16), y + i * 4 - 4, 12, 0.7, 0.6);
        } else {
          g.lineStyle(2, 0xa0a8c0, 0.7); g.strokeCircle(x, y, 6); g.lineBetween(x - 4, y + 4, x + 4, y - 4);
        }
      }
    },

    drawHud(g) {
      // A compass in the corner: the wind's arrow and the time to the next swing.
      const x = W - 48, y = top + 34;
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 24);
      g.fillStyle(0xe8eef6, 1); g.fillCircle(x, y, 20);
      g.lineStyle(1, SLATE_DARK, 0.7);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineBetween(x + Math.cos(a) * 15, y + Math.sin(a) * 15, x + Math.cos(a) * 19, y + Math.sin(a) * 19); }
      g.lineStyle(3, KITE_RED, 1); g.lineBetween(x - Math.cos(wind) * 12, y - Math.sin(wind) * 12, x + Math.cos(wind) * 14, y + Math.sin(wind) * 14);
      g.fillStyle(KITE_RED, 1); g.fillCircle(x + Math.cos(wind) * 14, y + Math.sin(wind) * 14, 3);
      if (nextSwing > 0 && swingAt < 0) {
        const left = clamp((nextSwing - ctx.scene.time.now) / SWING_EVERY, 0, 1);
        g.lineStyle(2, BRASS, 1); g.beginPath(); g.arc(x, y, 23, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      }
    },
  };
}

export const CROSSWIND: GimmickDef = {
  id: 'galeward-crosswind',
  rules: 'The weathervane calls the wind every 7s and everything drifts downwind. Strike with the wind at your back (foe downwind) for +30%; into it, −30%. Gusts throw a rank of slates off the upwind side — find the gap.',
  make,
};
