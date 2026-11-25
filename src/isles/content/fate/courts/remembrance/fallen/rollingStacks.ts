import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  GILT, MEMORY_COLORS, PAPER, PAVE_RED, SEPIA_DARK, SEPIA_DEEP, STONE, STONE_DARK, TIMBER, TIMBER_DARK,
} from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * The Rolling Stacks — Stack-Keeper Leopold Cranmer, in the King's telling the keeper of the
 * Archive's rolling stacks, who wound the shelves shut on anyone who came looking for their own
 * pledge in the stacks after hours, and filed what was left.
 *
 * Six steel shelving units stand across the middle of the yard on floor rails, packed so tight
 * that there is only ever ONE open aisle between them. The shelves are walls: nothing walks or
 * shoots through them; you go round by the ends or down the aisle. Every crank-wheel on a unit's
 * end opens the aisle beside that unit — and to open one aisle the stacks must close the other.
 * The bell rings, the closing aisle is hatched red, and then the shelves roll: whoever is still
 * in it when it shuts is crushed between them and thrown out at the end.
 *
 * Cranmer cranks the stacks himself on his own clock, and shut on you if you are in the aisle.
 * The exploit is the wheels: strike any unit's crank-wheel and the aisle jumps to it, shutting
 * the old one — wait for him to come through after you, and wind it shut on him. Past half the
 * stacks run faster and he cranks more often. The bot runs for the ends when the bell rings and
 * goes for a wheel when you are in the aisle.
 */

const ID = fallenId('remembrance', 'rolling-stacks');
const N = 6;
const UW = 64;
const AISLE = 116;
const R = 20;
const WARN_MS = 900;
const CRUSH_W = 2 * R + 6;

interface Unit { x: number; target: StrikeTarget; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const BAND_L = Math.round(W / 2 - (N * UW + AISLE) / 2);
  const SPAN_T = top + 72;
  const SPAN_B = H - 72;
  let aisle = 3;
  const homeX = (i: number, a: number): number => BAND_L + i * UW + (i >= a ? AISLE : 0);
  let crank: { b: number; at: number } | null = null;
  let moving = false;
  let late = false;
  let nextKeep = 0;
  let started = false;
  let now = 0;
  const crushedAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  const startCrank = (b: number): void => {
    if (crank || moving || b === aisle) return;
    crank = { b, at: now };
    ctx.sfx('countdown-tick');
  };
  const units: Unit[] = [];
  for (let i = 0; i < N; i++) {
    const idx = i;
    units.push({
      x: homeX(i, aisle), seed: rng() * 1000,
      target: ctx.target({
        x: homeX(i, aisle) + UW / 2, y: SPAN_B + 14, r: 16,
        onStruck: () => startCrank(aisle > idx ? idx : idx + 1),
      }),
    });
  }
  const aisleX = (): number => BAND_L + aisle * UW + AISLE / 2;
  const inStack = (f: Fighter): boolean => f.y > SPAN_T && f.y < SPAN_B && f.x > BAND_L && f.x < BAND_L + N * UW + AISLE;
  const inAisle = (f: Fighter): boolean => inStack(f) && Math.abs(f.x - aisleX()) < AISLE / 2 + 4;

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!started) { started = true; nextKeep = time + 5000; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        ctx.banner('THE STACKS RUN', '#f2d68a');
        ctx.sfx('gear-turn');
      }
      // Cranmer's own clock.
      if (!crank && !moving && time >= nextKeep) {
        nextKeep = time + (late ? 4200 : 6400);
        let b: number;
        if (alive(player) && inAisle(player)) { do b = Math.floor(rng() * (N + 1)); while (b === aisle); }
        else {
          b = 0; let best = 1e9;
          for (let a = 0; a <= N; a++) { const d = Math.abs(BAND_L + a * UW + AISLE / 2 - player.x); if (a !== aisle && d < best) { best = d; b = a; } }
        }
        startCrank(b);
      }
      if (crank && time - crank.at >= tk.warn(WARN_MS)) {
        aisle = crank.b; crank = null; moving = true;
        ctx.sfx('engine');
      }
      if (moving) {
        const v = (late ? 135 : 92) * dt;
        let still = true;
        for (let i = 0; i < N; i++) {
          const u = units[i], t = homeX(i, aisle);
          if (Math.abs(t - u.x) > 0.5) { u.x += clamp(t - u.x, -v, v); still = false; } else u.x = t;
        }
        if (still) { moving = false; ctx.sfx('clang'); }
      }
      for (const u of units) u.target.moveTo(u.x + UW / 2, SPAN_B + 14);

      // The shelves are walls: push bodies out, stop shots, crush whoever a closing aisle traps.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (inStack(f)) {
          let left = -1e9, right = 1e9;
          for (const u of units) {
            if (u.x + UW / 2 <= f.x) left = Math.max(left, u.x + UW);
            else right = Math.min(right, u.x);
          }
          if (right - left < CRUSH_W && time - (crushedAt.get(f) ?? 0) > 1500) {
            crushedAt.set(f, time);
            ctx.sfx('gravity-slam');
            ctx.flash(f.x, f.y, PAVE_RED);
            if (f === player) { tk.hitPlayer(26, f.x, f.y); ctx.stun(player, 700); }
            else { ctx.hit(npc, 60, f.x, f.y); ctx.stun(npc, 1200); }
            const toTop = f.y - SPAN_T < SPAN_B - f.y;
            ctx.nudge(f, 0, toTop ? SPAN_T - R - 12 - f.y : SPAN_B + R + 12 - f.y);
            continue;
          }
        }
        for (const u of units) {
          const x0 = u.x - R, x1 = u.x + UW + R, y0 = SPAN_T - R, y1 = SPAN_B + R;
          if (f.x <= x0 || f.x >= x1 || f.y <= y0 || f.y >= y1) continue;
          const pl = f.x - x0, pr = x1 - f.x, pt = f.y - y0, pb = y1 - f.y;
          const m = Math.min(pl, pr, pt, pb);
          if (m === pl) ctx.nudge(f, -pl, 0);
          else if (m === pr) ctx.nudge(f, pr, 0);
          else if (m === pt) ctx.nudge(f, 0, -pt);
          else ctx.nudge(f, 0, pb);
        }
      }
      for (const u of units) {
        for (let k = 0; k < 5; k++) {
          const cy = SPAN_T + ((k + 0.5) / 5) * (SPAN_B - SPAN_T);
          for (const s of ctx.shotsNear(u.x + UW / 2, cy, 60)) {
            if (s.x > u.x - 4 && s.x < u.x + UW + 4 && s.y > SPAN_T && s.y < SPAN_B) s.block();
          }
        }
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const ends = (f: Fighter) => (f.y - SPAN_T < SPAN_B - f.y ? SPAN_T - 50 : SPAN_B + 50);
      if (inStack(npc) && (crank || moving)) return { x: npc.x, y: tk.clampY(ends(npc)) };
      if (alive(player) && inAisle(player) && !crank && !moving) {
        let best = units[0], bd = 1e9;
        for (const u of units) { const d = Math.hypot(u.x + UW / 2 - npc.x, SPAN_B + 40 - npc.y); if (d < bd) { bd = d; best = u; } }
        return { x: best.x + UW / 2, y: tk.clampY(SPAN_B + 44) };
      }
      const band0 = BAND_L, band1 = BAND_L + N * UW + AISLE;
      const across = (npc.x < band0 && player.x > band1) || (npc.x > band1 && player.x < band0);
      if (across && npc.y > SPAN_T - 30 && npc.y < SPAN_B + 30) return { x: npc.x, y: tk.clampY(ends(npc)) };
      return null;
    },

    drawGround(g, time) {
      const x1 = BAND_L + N * UW + AISLE;
      // The stack-room floor: worn linoleum between steel rails.
      g.fillStyle(STONE_DARK, 0.55); g.fillRect(BAND_L - 6, SPAN_T - 8, x1 - BAND_L + 12, SPAN_B - SPAN_T + 16);
      for (let y = SPAN_T; y < SPAN_B; y += 24) { g.lineStyle(1, SEPIA_DARK, 0.18); g.lineBetween(BAND_L - 6, y, x1 + 6, y); }
      for (const ry of [SPAN_T + 26, SPAN_B - 26]) {
        g.fillStyle(0x3a3a40, 1); g.fillRect(BAND_L - 10, ry - 3, x1 - BAND_L + 20, 6);
        g.fillStyle(0x9a9aa4, 1); g.fillRect(BAND_L - 10, ry - 2, x1 - BAND_L + 20, 2);
      }
      // A bell rung: the aisle that will shut is hatched red; chalk marks where the new one opens.
      if (crank) {
        const k = clamp((time - crank.at) / tk.warn(WARN_MS), 0, 1);
        const ax = BAND_L + aisle * UW;
        g.fillStyle(PAVE_RED, 0.12 + 0.18 * k + Math.sin(time / 50) * 0.05); g.fillRect(ax, SPAN_T, AISLE, SPAN_B - SPAN_T);
        g.lineStyle(2, PAVE_RED, 0.55);
        for (let y = SPAN_T - AISLE; y < SPAN_B; y += 22) {
          const ya = Math.max(SPAN_T, y), yb = Math.min(SPAN_B, y + AISLE);
          g.lineBetween(ax + (ya - y), ya, ax + (yb - y), yb);
        }
        const nx = BAND_L + crank.b * UW;
        g.lineStyle(2, PAPER, 0.7);
        for (let y = SPAN_T; y < SPAN_B; y += 16) { g.lineBetween(nx + AISLE / 2, y, nx + AISLE / 2, y + 8); }
      }
    },

    drawAir(g, time) {
      for (let i = 0; i < N; i++) drawUnit(g, units[i], SPAN_T, SPAN_B, time, moving, !!crank);
    },

    drawHud(g, time) {
      const w = N * 12 + 20, x0 = W / 2 - w / 2, y = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 12, y - 13, w + 24 + 76, 28, 6);
      for (let i = 0; i < N; i++) {
        const ux = x0 + ((units[i].x - BAND_L) / (N * UW + AISLE)) * w;
        g.fillStyle(crank ? PAVE_RED : 0x8a8a94, 1); g.fillRect(ux, y - 8, 9, 16);
      }
      g.lineStyle(1, GILT, 1); g.strokeRect(x0 - 2, y - 10, w + 4, 20);
      const k = crank ? 1 : clamp(1 - (nextKeep - time) / (late ? 4200 : 6400), 0, 1);
      g.fillStyle(0x2a241e, 1); g.fillRect(x0 + w + 12, y - 4, 60, 8);
      g.fillStyle(crank ? PAVE_RED : SEPIA_DARK, 1); g.fillRect(x0 + w + 12, y - 4, 60 * k, 8);
      g.lineStyle(1, GILT, 1); g.strokeRect(x0 + w + 12, y - 4, 60, 8);
    },

    destroy() { for (const u of units) u.target.remove(); },
  };
}

/**
 * One rolling shelving unit seen from above: the steel deck, a row of box-files and corked
 * memories along each face, and on the end that faces you a label-holder and the crank-wheel.
 */
function drawUnit(g: G, u: Unit, t: number, b: number, time: number, moving: boolean, warn: boolean): void {
  const x = u.x, lift = 20;
  g.fillStyle(0x000000, 0.25); g.fillRect(x + 5, t - lift + 6, UW, b - t + lift);
  // The long top deck.
  g.fillStyle(0x5a5a64, 1); g.fillRect(x, t - lift, UW, b - t);
  g.fillStyle(0x7a7a86, 1); g.fillRect(x + 2, t - lift + 2, UW - 4, b - t - 4);
  g.fillStyle(0x4a4a52, 1); g.fillRect(x + UW / 2 - 2, t - lift + 4, 4, b - t - 8);
  // What is shelved: tops of box-files, ledgers and memory bottles along both faces.
  let s = u.seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (const side of [0, 1]) {
    let y = t - lift + 8;
    while (y < b - lift - 10) {
      const h = 7 + rnd() * 10;
      const bx = side ? x + UW / 2 + 4 : x + 4;
      if (rnd() < 0.22) {
        const c = MEMORY_COLORS[Math.floor(rnd() * MEMORY_COLORS.length)];
        g.fillStyle(c, 0.35 + Math.sin(time / 300 + y) * 0.1); g.fillCircle(bx + 12, y + 5, 7);
        g.fillStyle(0xd8e6e0, 0.7); g.fillCircle(bx + 12, y + 5, 4);
        g.fillStyle(0xa87a4a, 1); g.fillCircle(bx + 12, y + 5, 2.4);
        y += 14;
      } else {
        const col = [SEPIA_DARK, TIMBER, 0x5a6a50, 0x6a4a5a, PAPER][Math.floor(rnd() * 5)];
        g.fillStyle(col, 1); g.fillRect(bx, y, UW / 2 - 8, h);
        g.fillStyle(0x000000, 0.25); g.fillRect(bx, y + h - 1.5, UW / 2 - 8, 1.5);
        if (rnd() < 0.5) { g.fillStyle(PAPER, 0.8); g.fillRect(bx + 4, y + h / 2 - 1, 8, 2); }
        y += h + 1;
      }
    }
  }
  // The end panel toward you, and its crank.
  g.fillStyle(0x3e3e46, 1); g.fillRect(x, b - lift, UW, lift);
  g.fillStyle(0x6a6a74, 1); g.fillRect(x + 2, b - lift + 2, UW - 4, 3);
  g.fillStyle(GILT, 1); g.fillRect(x + 6, b - lift + 7, 18, 9);
  g.fillStyle(PAPER, 1); g.fillRect(x + 8, b - lift + 9, 14, 5);
  const wx = x + UW / 2 + 12, wy = b - lift / 2 + 4;
  const rot = moving ? time / 120 : 0;
  g.lineStyle(3, warn ? PAVE_RED : STONE, 1); g.strokeCircle(wx, wy, 10);
  for (let k = 0; k < 3; k++) {
    const a = rot + (k / 3) * Math.PI * 2;
    g.lineStyle(2, STONE, 1); g.lineBetween(wx, wy, wx + Math.cos(a) * 10, wy + Math.sin(a) * 10);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillCircle(wx + Math.cos(rot) * 10, wy + Math.sin(rot) * 10, 3);
  g.fillStyle(SEPIA_DEEP, 1); g.fillCircle(wx, wy, 2.5);
  if (warn) glow(g, wx, wy, 22, PAVE_RED, 0.05, 2);
  // Wheels on the rails.
  for (const ry of [t + 26 - lift + 4, b - 26]) { g.fillStyle(0x2a2a30, 1); g.fillRect(x - 2, ry - 3, 5, 6); g.fillRect(x + UW - 3, ry - 3, 5, 6); }
}

export const FALLEN_ROLLING_STACKS: GimmickDef = {
  id: ID,
  rules: 'The shelves are walls with one aisle. A crank-wheel opens the aisle beside its unit and shuts the old one — on whoever is in it. Strike a wheel.',
  make,
};
