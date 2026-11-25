import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { windKey } from '../art';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, CREPE, IRON, LATEX, LATEX_LIT, RUBBER, TOY_BLUE, TOY_GREEN, TOY_RED, TOY_VIOLET, TOY_YELLOW } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Caught Out — Hepzibah Quellow, Games-Mistress of the Ball Court: she ran the children's dodgeball
 * on the half-holidays, before the balls were confiscated. In the King's telling she kept them for
 * the Prince, and fielded a team of clockwork children who never tired, never missed and never
 * once let anyone off.
 *
 * Wind-up fielders patrol the four walls with red rubber balls. One winds its arm back — its line
 * to you chalked — and throws, hard and straight. It is dodgeball, so the old rule holds: **face
 * a ball as it reaches you and you catch it.** A ball that takes you in the side or the back
 * knocks you about. A caught ball is held over your head, and your next cast throws it at
 * Hepzibah; if it hits, she is OUT (stunned). But she plays by the rule too: if she is facing the
 * throw she catches it, and then *you* are out. Throw while she is turned away.
 *
 * So the rule pulls your aim off her: to catch, you must turn to the fielder. Hepzibah knows it —
 * she circles to stand on the far side of you from the thrower, so that looking at her turns
 * your back to the ball. Past halfway the fielders throw in pairs from opposite walls: catch one,
 * dodge the other.
 */

const ID = fallenId('bounce', 'caught-out');
const WIND_MS = 760;
const BALL_SPEED = 360;
const BACK_SPEED = 520;
const CATCH = 0.95;
const BALL_R = 11;
const COATS = [TOY_RED, TOY_BLUE, TOY_GREEN, TOY_VIOLET];

interface Fielder { side: 0 | 1 | 2 | 3; ph: number; x: number; y: number; windAt: number; coat: number }
interface Ball { x: number; y: number; vx: number; vy: number; back: boolean; spin: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const fielders: Fielder[] = ([0, 1, 2, 3] as const).map((side, i) => ({ side, ph: i * 1.7, x: 0, y: 0, windAt: -1, coat: COATS[i] }));
  let balls: Ball[] = [];
  let held = 0;
  let outs = 0;
  let catches = 0;
  let next = 0;
  let started = false;
  let pairs = false;
  const outFx: { x: number; y: number; at: number; word: 'catch' | 'out' }[] = [];

  /** Each fielder paces its own wall. */
  function place(f: Fielder, time: number): void {
    const s = 0.5 + Math.sin(time / 2600 + f.ph) * 0.36;
    if (f.side === 0) { f.x = W * s; f.y = top + 22; }
    else if (f.side === 1) { f.x = W - 26; f.y = top + (H - top) * s; }
    else if (f.side === 2) { f.x = W * (1 - s); f.y = H - 18; }
    else { f.x = 26; f.y = top + (H - top) * (1 - s); }
  }
  /** The fielder the player would most have to turn from her to face. */
  const behind = () => {
    const toFoe = Math.atan2(npc.y - player.y, npc.x - player.x);
    return [...fielders].sort((a, b) =>
      Math.abs(wrapAngle(Math.atan2(b.y - player.y, b.x - player.x) - toFoe)) - Math.abs(wrapAngle(Math.atan2(a.y - player.y, a.x - player.x) - toFoe)));
  };
  const winding = (f: Fielder, t: number) => f.windAt >= 0 && t < f.windAt + WIND_MS;
  /** True when `who` faces a ball coming at them from (bx, by). */
  const faces = (who: typeof player, bx: number, by: number) =>
    Math.abs(wrapAngle(ctx.facing(who) - Math.atan2(by - who.y, bx - who.x))) < CATCH;

  function throwAt(f: Fielder): void {
    const d = Math.max(1, dist(f.x, f.y, player.x, player.y));
    balls.push({ x: f.x, y: f.y - 26, vx: ((player.x - f.x) / d) * BALL_SPEED, vy: ((player.y - f.y + 26) / d) * BALL_SPEED, back: false, spin: 0 });
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; next = time + 1800; }
      if (!pairs && npc.hp < npc.maxHp * 0.5) { pairs = true; ctx.banner('TWO BALLS IN PLAY', '#ffe2a8'); ctx.sfx('countdown-go'); }
      for (const f of fielders) {
        if (!winding(f, time)) place(f, time);
        if (f.windAt >= 0 && time >= f.windAt + WIND_MS) { f.windAt = -1; if (alive(player)) throwAt(f); }
      }
      if (time >= next && alive(player) && alive(npc)) {
        next = time + (pairs ? 2300 : 1800);
        const order = behind();
        const first = order[0];
        first.windAt = time;
        if (pairs) {
          const opp = fielders.find((f) => f.side === ((first.side + 2) % 4)) as Fielder;
          if (opp.windAt < 0) opp.windAt = time + 120;
        }
      }
      for (const b of balls) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 14;
        if (!b.back && alive(player) && dist(b.x, b.y, player.x, player.y - 20) < BALL_R + 20) {
          const caught = faces(player, player.x - b.vx, player.y - b.vy);
          b.x = -9999;
          if (caught) {
            held = Math.min(2, held + 1); catches++;
            outFx.push({ x: player.x, y: player.y - 60, at: time, word: 'catch' });
            ctx.sfx('land');
          } else {
            tk.hitPlayer(13, player.x, player.y);
            tk.slowPlayer(0.65, 700);
            ctx.nudge(player, (b.vx / BALL_SPEED) * 40, (b.vy / BALL_SPEED) * 40);
            ctx.sfx('boing');
          }
        } else if (b.back && alive(npc) && dist(b.x, b.y, npc.x, npc.y - 20) < BALL_R + 22) {
          if (faces(npc, npc.x - b.vx, npc.y - b.vy)) {
            ctx.stun(player, 600);
            outFx.push({ x: npc.x, y: npc.y - 60, at: time, word: 'catch' });
            ctx.float(player.x, player.y - 56, 'CAUGHT — YOU\'RE OUT', '#ffb0a0');
            ctx.sfx('snap-back');
          } else {
            ctx.hit(npc, 26, npc.x, npc.y);
            ctx.stun(npc, 700);
            outs++;
            outFx.push({ x: npc.x, y: npc.y - 60, at: time, word: 'out' });
            ctx.sfx('hit-heavy');
          }
          b.x = -9999;
        }
      }
      balls = balls.filter((b) => b.x > -40 && b.x < W + 40 && b.y > top - 40 && b.y < H + 40);
      while (outFx.length && time - outFx[0].at > 800) outFx.shift();
    },

    onPlayerCast() {
      if (held <= 0 || !alive(npc) || !alive(player)) return;
      held--;
      const d = Math.max(1, dist(player.x, player.y, npc.x, npc.y));
      balls.push({ x: player.x, y: player.y - 30, vx: ((npc.x - player.x) / d) * BACK_SPEED, vy: ((npc.y - player.y) / d) * BACK_SPEED, back: true, spin: 0 });
      ctx.sfx('whoosh');
    },

    npcSeek() {
      if (!alive(player)) return null;
      const t = tk.now;
      // Stand on the far side of you from the arm that is winding (or about to), so facing her turns your back on it.
      const f = fielders.find((q) => winding(q, t)) ?? behind()[0];
      const d = Math.max(1, dist(f.x, f.y, player.x, player.y));
      return { x: tk.clampX(player.x + ((player.x - f.x) / d) * 170), y: tk.clampY(player.y + ((player.y - f.y) / d) * 170) };
    },

    drawGround(g, time) {
      // The court's lines, chalked on the rubber.
      g.lineStyle(2, LATEX_LIT, 0.14); g.strokeRect(60, top + 50, W - 120, H - top - 90);
      g.lineBetween(W / 2, top + 50, W / 2, H - 40); g.strokeCircle(W / 2, (top + H) / 2 + 5, 60);
      for (const f of fielders) {
        if (!winding(f, time) || !alive(player)) continue;
        const k = clamp((time - f.windAt) / WIND_MS, 0, 1);
        const d = Math.max(1, dist(f.x, f.y, player.x, player.y));
        const ux = (player.x - f.x) / d, uy = (player.y - f.y) / d;
        for (let u = 30; u < d + 60; u += 24) {
          g.lineStyle(2, f.coat, 0.2 + 0.5 * k);
          g.lineBetween(f.x + ux * u, f.y + uy * u, f.x + ux * (u + 12), f.y + uy * (u + 12));
        }
      }
      for (const b of balls) shadow(g, b.x, b.y + 26, 18, 6, 0.3);
      for (const f of fielders) shadow(g, f.x, f.y + 1, 22, 7, 0.35);
    },

    drawAir(g, time) {
      for (const f of fielders) drawFielder(g, f, winding(f, time) ? clamp((time - f.windAt) / WIND_MS, 0, 1) : -1, time);
      for (const b of balls) drawBall(g, b.x, b.y, BALL_R, b.back ? TOY_BLUE : TOY_RED, b.spin);
      if (held > 0 && alive(player)) {
        for (let i = 0; i < held; i++) drawBall(g, player.x - (held - 1) * 9 + i * 18, player.y - 66 + Math.sin(time / 200) * 2, 10, TOY_BLUE, time / 400);
      }
      for (const o of outFx) {
        const k = (time - o.at) / 800;
        g.lineStyle(3, o.word === 'out' ? TOY_YELLOW : LATEX_LIT, 1 - k);
        g.strokeCircle(o.x, o.y + 30, 20 + k * 30);
        if (o.word === 'out') for (let i = 0; i < 5; i++) {
          const a = time / 150 + (i / 5) * Math.PI * 2;
          g.fillStyle(TOY_YELLOW, 1 - k); g.fillCircle(o.x + Math.cos(a) * 18, o.y + Math.sin(a) * 6, 3);
        }
      }
    },

    drawHud(g) {
      // The games slate: chalk tallies for catches and outs, and the ball in your hand.
      const x = W / 2 - 80, y = top + 6;
      g.fillStyle(0x5a3a24, 1); g.fillRoundedRect(x - 4, y - 4, 168, 34, 4);
      g.fillStyle(0x24302a, 1); g.fillRect(x, y, 160, 26);
      const tally = (x0: number, n: number, c: number) => {
        for (let i = 0; i < Math.min(n, 10); i++) {
          const gx = x0 + Math.floor(i / 5) * 26 + (i % 5) * 4;
          g.lineStyle(1.5, c, 0.9);
          if (i % 5 === 4) g.lineBetween(gx - 18, y + 20, gx, y + 6); else g.lineBetween(gx, y + 5, gx, y + 21);
        }
      };
      drawBall(g, x + 10, y + 13, 6, TOY_BLUE, 0); tally(x + 22, catches, LATEX_LIT);
      drawBall(g, x + 88, y + 13, 6, TOY_YELLOW, 0); tally(x + 100, outs, TOY_YELLOW);
      for (let i = 0; i < held; i++) { g.fillStyle(TOY_BLUE, 1); g.fillCircle(x + 152, y + 7 + i * 12, 4); }
    },
  };
}

/** A red rubber playground ball: a moulded seam band, a highlight, turning as it flies. */
function drawBall(g: G, x: number, y: number, r: number, c: number, spin: number): void {
  g.fillStyle(dim(c, 0.35), 1); g.fillCircle(x + 1, y + 1, r);
  g.fillStyle(c, 1); g.fillCircle(x, y, r);
  const a = spin % (Math.PI * 2);
  g.lineStyle(Math.max(1, r * 0.18), lit(c, 0.35), 0.9);
  g.beginPath(); g.arc(x, y, r * 0.62, a, a + Math.PI, false); g.strokePath();
  g.fillStyle(LATEX_LIT, 0.7); g.fillCircle(x - r * 0.35, y - r * 0.4, r * 0.25);
}

/** A clockwork fielder: a tin child in a games bib and cap, key turning in its back, arm wound back with a ball. */
function drawFielder(g: G, f: Fielder, wind: number, time: number): void {
  const x = f.x, y = f.y, s = 1.15;
  g.fillStyle(RUBBER, 1); g.fillRect(x - 5 * s, y - 12 * s, 4 * s, 12 * s); g.fillRect(x + 1 * s, y - 12 * s, 4 * s, 12 * s);
  g.fillStyle(LATEX, 1); g.fillRect(x - 6 * s, y - 15 * s, 12 * s, 4 * s);
  g.fillStyle(dim(f.coat, 0.25), 1); g.fillRoundedRect(x - 7 * s, y - 30 * s, 14 * s, 17 * s, 3 * s);
  g.fillStyle(f.coat, 1); g.fillRoundedRect(x - 6 * s, y - 30 * s, 12 * s, 16 * s, 3 * s);
  g.fillStyle(LATEX_LIT, 1); g.fillRect(x - 4 * s, y - 27 * s, 8 * s, 8 * s);
  g.fillStyle(f.coat, 1); g.fillCircle(x, y - 23 * s, 2.5 * s);
  g.fillStyle(0xf0c8a8, 1); g.fillCircle(x, y - 35 * s, 5 * s);
  g.fillStyle(0xf07a8a, 0.8); g.fillCircle(x - 2.5 * s, y - 34 * s, 1.2 * s); g.fillCircle(x + 2.5 * s, y - 34 * s, 1.2 * s);
  g.fillStyle(f.coat, 1); g.fillEllipse(x, y - 39 * s, 11 * s, 5 * s); g.fillRect(x, y - 39 * s, 7 * s, 2 * s);
  windKey(g, x - 7 * s, y - 24 * s, Math.PI + Math.sin(time / 90) * 0.6, 7 * s, BRASS);
  // The throwing arm: at rest a ball tucked at the hip; winding, swung back over the shoulder.
  const a = wind < 0 ? 0.9 : 0.9 - wind * 2.6;
  const sx = x + 6 * s, sy = y - 27 * s, hx = sx + Math.cos(a) * 12 * s, hy = sy + Math.sin(a) * 12 * s;
  g.lineStyle(3 * s, dim(f.coat, 0.15), 1); g.lineBetween(sx, sy, hx, hy);
  drawBall(g, hx, hy, 6, TOY_RED, 0);
  if (wind > 0.7) glow(g, hx, hy, 16, TOY_RED, 0.06, 2);
  g.lineStyle(1, IRON, 0.6); g.lineBetween(x - 6 * s, y - 1, x + 6 * s, y - 1);
  g.fillStyle(CREPE, 1); g.fillRect(x - 6 * s, y - 2, 5 * s, 2); g.fillRect(x + 1 * s, y - 2, 5 * s, 2);
}

export const FALLEN_CAUGHT_OUT: GimmickDef = {
  id: ID,
  rules: 'Clockwork fielders throw at you: face a ball to catch it, your next cast throws it at her — OUT. If she faces it, she catches and you are out.',
  make,
};
