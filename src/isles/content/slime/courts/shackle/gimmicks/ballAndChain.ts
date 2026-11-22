import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { chainLinks, ironBall, manacle, sagPoints } from '../art';
import { HOT_LIT, IRON, IRON_DARK, IRON_LIT, MUD_DARK, STONE_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Ball and Chain — Convict Link.
 *
 * Link has been on the causeway gang eleven years and has learned to fight in his irons. In this
 * yard, so do you: each fighter wears an ankle-iron on a chain, and on the end of the chain an
 * iron ball that drags behind. The ball is real weight — a Verlet body on a rope:
 *
 * • it trails you, and while the chain is taut and you are towing it, you are slowed;
 * • it keeps its momentum — walk one way and turn sharply, and the ball runs on past you;
 * • a **dash** (anything that moves you fast — a dash, a blink, a leap) yanks the chain and
 *   whips the ball round you in a smashing arc;
 * • a ball moving fast enough smashes whoever it meets *except its owner*, harder the faster it
 *   goes, and shoves them along its line; two balls that meet clang and trade their speed;
 * • iron is iron: the ball stops the foe's shots that fly into it.
 *
 * Link circles you so his ball swings round into you. Turn the rule on him: dash past him and
 * let your ball wrap round into his back — or keep your ball between you and his shots.
 */

const BALL_R = 13;
const SMASH_V = 230;
const DASH_V = 430;
const SWING_CD = 900;
const HIT_CD = 600;

interface Ball {
  f: Fighter;
  x: number; y: number;
  px: number; py: number;
  /** The fighter's position last frame, to read their speed. */
  lx: number; ly: number;
  speed: number;
  swingAt: number;
  hitCdUntil: number;
  /** Rotation sign of the last swing, for the drawn arc. */
  spin: number;
  taut: boolean;
}

interface Scuff { x: number; y: number; a: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const L = ctx.hard ? 132 : 116;
  const SWING_KICK = ctx.hard ? 640 : 560;
  const DMG_BONUS = ctx.hard ? 3 : 0;
  const mk = (f: Fighter, side: number): Ball => ({
    f, x: f.x + side * 60, y: f.y + 40, px: f.x + side * 60, py: f.y + 40, lx: f.x, ly: f.y,
    speed: 0, swingAt: -9999, hitCdUntil: 0, spin: 1, taut: false,
  });
  const balls: Ball[] = [mk(player, -1), mk(npc, 1)];
  const scuffs: Scuff[] = [];
  const sparks: { x: number; y: number; at: number }[] = [];
  let lastScuff = 0;
  let lastBlockSfx = 0;
  let orbitA = 0;
  let started = false;

  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  function swing(b: Ball, time: number, fvx: number, fvy: number): void {
    b.swingAt = time;
    // Whip it round: a kick across the chain, turning the way the fighter is going.
    const cx = b.x - b.f.x, cy = b.y - b.f.y;
    const cl = Math.hypot(cx, cy) || 1;
    const tx = -cy / cl, ty = cx / cl;
    const sign = Math.sign(tx * fvx + ty * fvy) || 1;
    b.spin = sign;
    const dt = 1 / 60;
    b.px = b.x - tx * sign * SWING_KICK * dt;
    b.py = b.y - ty * sign * SWING_KICK * dt;
    ctx.sfx('whip');
    if (b.f === player) ctx.float(b.f.x, b.f.y - 50, 'SWING!', '#d8dce4');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        ctx.banner('IRONS ON — DASH TO SWING THE BALL', '#d8dce4');
      }
      if (dt <= 0) return;
      for (const b of balls) {
        const f = b.f;
        if (!alive(f)) { b.lx = f.x; b.ly = f.y; continue; }
        const fvx = (f.x - b.lx) / dt, fvy = (f.y - b.ly) / dt;
        const fv = Math.hypot(fvx, fvy);
        b.lx = f.x; b.ly = f.y;
        if (fv > DASH_V && fv < 6000 && time - b.swingAt > SWING_CD) swing(b, time, fvx, fvy);
        // Verlet step with ground friction.
        const damp = Math.pow(0.16, dt);
        let nx = b.x + (b.x - b.px) * damp;
        let ny = b.y + (b.y - b.py) * damp;
        const d = dist(nx, ny, f.x, f.y);
        b.taut = d >= L - 1;
        if (d > L) { nx = f.x + ((nx - f.x) * L) / d; ny = f.y + ((ny - f.y) * L) / d; }
        b.px = b.x; b.py = b.y;
        b.x = nx; b.y = ny;
        // The yard walls: the ball thuds off them and loses most of its run.
        if (b.x < 30 || b.x > W - 30) { b.x = clamp(b.x, 30, W - 30); b.px = b.x + (b.x - b.px) * 0.3; }
        if (b.y < top + 24 || b.y > H - 30) { b.y = clamp(b.y, top + 24, H - 30); b.py = b.y + (b.y - b.py) * 0.3; }
        b.speed = dist(b.x, b.y, b.px, b.py) / dt;
        // Iron stops the foe's shots.
        const foeSide = f === player ? 'npc' : 'player';
        for (const s of ctx.shotsNear(b.x, b.y, BALL_R + 8)) {
          if (s.owner !== foeSide) continue;
          s.block();
          sparks.push({ x: b.x, y: b.y, at: time });
          if (time - lastBlockSfx > 160) { lastBlockSfx = time; ctx.sfx('clang'); }
        }
      }
      // Smashes.
      for (const b of balls) {
        const e = other(b.f);
        if (!alive(b.f) || !alive(e) || b.speed < SMASH_V || time < b.hitCdUntil) continue;
        if (dist(b.x, b.y, e.x, e.y) > BALL_R + 22) continue;
        const dmg = Math.round(clamp(6 + (b.speed - SMASH_V) / 28, 6, 18)) + DMG_BONUS;
        b.hitCdUntil = time + HIT_CD;
        const ux = (b.x - b.px) / (dist(b.x, b.y, b.px, b.py) || 1), uy = (b.y - b.py) / (dist(b.x, b.y, b.px, b.py) || 1);
        ctx.hit(e, dmg, e.x, e.y);
        ctx.nudge(e, ux * 46, uy * 46);
        ctx.flash(b.x, b.y, 0xd8dce4);
        ctx.sfx('anvil');
        if (e === npc) ctx.float(e.x, e.y - 52, 'SMASH', '#ffd08a');
        // The ball gives up most of its run on the body.
        b.px = b.x - (b.x - b.px) * 0.3; b.py = b.y - (b.y - b.py) * 0.3;
      }
      // Ball on ball: a clang, and they trade their runs.
      const [a, c] = balls;
      const dd = dist(a.x, a.y, c.x, c.y);
      if (dd < BALL_R * 2 && dd > 0.01) {
        const avx = a.x - a.px, avy = a.y - a.py, cvx = c.x - c.px, cvy = c.y - c.py;
        const ox = ((a.x - c.x) / dd) * (BALL_R * 2 - dd) * 0.5, oy = ((a.y - c.y) / dd) * (BALL_R * 2 - dd) * 0.5;
        a.x += ox; a.y += oy; c.x -= ox; c.y -= oy;
        a.px = a.x - cvx; a.py = a.y - cvy; c.px = c.x - avx; c.py = c.y - avy;
        if (Math.hypot(avx, avy) + Math.hypot(cvx, cvy) > 4) {
          ctx.sfx('clang');
          sparks.push({ x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, at: time });
        }
      }
      // Scuffs where a ball drags.
      if (time - lastScuff > 70) {
        lastScuff = time;
        for (const b of balls) {
          if (b.speed > 50 && alive(b.f)) scuffs.push({ x: b.x, y: b.y + BALL_R * 0.6, a: Math.atan2(b.y - b.py, b.x - b.px), at: time });
        }
        while (scuffs.length > 90) scuffs.shift();
      }
      while (sparks.length && time - sparks[0].at > 400) sparks.shift();
      orbitA += dt * 1.6;
    },

    playerSpeedMult() {
      const b = balls[0];
      return b.taut ? 0.82 : 1;
    },
    npcSpeedMult() {
      const b = balls[1];
      return b.taut ? 0.82 : 1;
    },

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      // Circle the player so the ball swings round into them.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.8;
      const r = 120 + Math.sin(orbitA) * 30;
      return { x: clamp(player.x + Math.cos(a) * r, 60, W - 60), y: clamp(player.y + Math.sin(a) * r, top + 50, H - 50) };
    },

    drawGround(g, time) {
      // Drag scuffs in the flags: pale scratches, fading.
      for (const s of scuffs) {
        const k = clamp((time - s.at) / 4000, 0, 1);
        if (k >= 1) continue;
        g.lineStyle(1.5, STONE_LIT, 0.35 * (1 - k));
        g.lineBetween(s.x - Math.cos(s.a) * 6, s.y - Math.sin(s.a) * 6, s.x + Math.cos(s.a) * 6, s.y + Math.sin(s.a) * 6);
        g.lineStyle(1, MUD_DARK, 0.3 * (1 - k));
        g.lineBetween(s.x - Math.cos(s.a) * 6, s.y - Math.sin(s.a) * 6 + 2, s.x + Math.cos(s.a) * 6, s.y - Math.sin(s.a) * 6 + 2);
      }
      for (const b of balls) {
        if (!alive(b.f)) continue;
        // The reach of the chain round each fighter, faint.
        g.lineStyle(1, IRON, 0.18); g.strokeCircle(b.f.x, b.f.y, L);
        // The smashing arc: a swept wedge behind a fast ball.
        if (b.speed > SMASH_V) {
          const a0 = Math.atan2(b.py - b.f.y, b.px - b.f.x), a1 = Math.atan2(b.y - b.f.y, b.x - b.f.x);
          const r = dist(b.x, b.y, b.f.x, b.f.y);
          g.lineStyle(BALL_R * 2, b.f === player ? 0xd8dce4 : 0xffb08a, 0.12);
          g.beginPath(); g.arc(b.f.x, b.f.y, r, a0 - b.spin * 0.6, a1, b.spin < 0); g.strokePath();
        }
      }
    },

    drawAir(g, time) {
      for (const b of balls) {
        const f = b.f;
        if (!alive(f)) continue;
        const ax = f.x, ay = f.y + 14;
        const d = dist(ax, ay, b.x, b.y - BALL_R);
        const sag = d < L ? Math.sqrt(Math.max(0, L * L - d * d)) * 0.25 : 0;
        chainLinks(g, sagPoints(ax, ay, b.x, b.y - BALL_R, sag, 10), 8, b.taut ? IRON_LIT : IRON, 1.6);
        // Motion ghosts behind a smashing ball.
        if (b.speed > SMASH_V) {
          const vx = b.x - b.px, vy = b.y - b.py;
          for (let k = 3; k >= 1; k--) {
            g.fillStyle(IRON_DARK, 0.12 * (4 - k)); g.fillCircle(b.x - vx * k * 1.4, b.y - vy * k * 1.4, BALL_R);
          }
        }
        ironBall(g, b.x, b.y, BALL_R, f === player ? 0.15 : 0.45);
        // The ankle-iron.
        manacle(g, ax, ay + 2, 6, -Math.PI / 2, 0, 0);
        // Fresh from a swing: the iron glows where the chain bit.
        if (time - b.swingAt < 300) {
          const k = (time - b.swingAt) / 300;
          g.lineStyle(2, HOT_LIT, 0.7 * (1 - k)); g.strokeCircle(ax, ay + 2, 8 + k * 10);
        }
      }
      for (const s of sparks) {
        const k = clamp((time - s.at) / 400, 0, 1);
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + s.x;
          g.lineStyle(1.5, lit(HOT_LIT, 0.3), 1 - k);
          g.lineBetween(s.x + Math.cos(a) * k * 10, s.y + Math.sin(a) * k * 10, s.x + Math.cos(a) * (6 + k * 22), s.y + Math.sin(a) * (6 + k * 22));
        }
      }
    },
  };
}

export const BALL_AND_CHAIN: GimmickDef = {
  id: 'shackle-ball-and-chain',
  rules: 'You and your foe drag iron balls on chains. A dash whips your ball round in a smashing arc; a fast ball smashes the foe and stops their shots.',
  make,
};
