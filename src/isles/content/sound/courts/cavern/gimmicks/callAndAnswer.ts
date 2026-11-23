import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { soundArcs } from '../art';
import { FLOW, FLOW_DARK, FLOW_LIT, GLOW, POOL_LIT, ROCK_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * Call and Answer — Caller Halloo.
 *
 * The cave answers. Any shot that reaches a wall is swallowed by the rock, and two seconds later
 * the wall answers it: the same shot comes back out of the stone, flying straight at the place
 * the thrower stood when it struck. Stay put and it finds you. Move, and it flies through where
 * you were — and through anyone standing in its path on the way.
 *
 * Halloo calls on purpose. He cups his hands and shouts *past* you at the wall behind you, then
 * holds still: the answer comes back to him, through you. Step off the line before it does — or
 * pin him there: send your own shots past him into the wall at his back and stand still.
 */

const ANSWER_MS = 2000;
const BOLT_SPEED = 400;
const BOLT_R = 12;
const MOVED_PX = 60;
const WALL_PAD = 34;

interface Call {
  /** Where the shot met the rock. */
  wall: Pt;
  /** Where the thrower stood when it did. */
  aim: Pt;
  thrower: Fighter;
  damage: number;
  at: number;
  /** Halloo's own deliberate call (it travels visibly to the wall first). */
  shout?: { from: Pt; startAt: number; arriveAt: number };
}

interface Bolt { x: number; y: number; vx: number; vy: number; damage: number; thrower: Fighter; dieAt: number; trail: Pt[] }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const calls: Call[] = [];
  const bolts: Bolt[] = [];
  const shoutEvery = ctx.hard ? 4600 : 5800;
  let nextShout = 0;
  let holdUntil = 0;
  let holdAt: Pt | null = null;
  let started = false;
  let announced = false;

  const inner = { x0: WALL_PAD, x1: W - WALL_PAD, y0: top + WALL_PAD - 8, y1: H - WALL_PAD };
  const atWall = (x: number, y: number) => x < inner.x0 || x > inner.x1 || y < inner.y0 || y > inner.y1;

  /** Cast a ray from a point along a heading to the arena wall. */
  function rayToWall(x: number, y: number, a: number): Pt {
    const dx = Math.cos(a), dy = Math.sin(a);
    let t = Infinity;
    if (dx > 1e-6) t = Math.min(t, (W - 12 - x) / dx);
    if (dx < -1e-6) t = Math.min(t, (12 - x) / dx);
    if (dy > 1e-6) t = Math.min(t, (H - 12 - y) / dy);
    if (dy < -1e-6) t = Math.min(t, (top + 4 - y) / dy);
    return { x: x + dx * t, y: y + dy * t };
  }

  function answer(c: Call): void {
    const a = Math.atan2(c.aim.y - c.wall.y, c.aim.x - c.wall.x);
    const len = dist(c.wall.x, c.wall.y, c.aim.x, c.aim.y) + 160;
    bolts.push({
      x: c.wall.x, y: c.wall.y, vx: Math.cos(a) * BOLT_SPEED, vy: Math.sin(a) * BOLT_SPEED,
      damage: c.damage, thrower: c.thrower, dieAt: ctx.scene.time.now + (len / BOLT_SPEED) * 1000, trail: [],
    });
    const moved = alive(c.thrower) && dist(c.thrower.x, c.thrower.y, c.aim.x, c.aim.y) > MOVED_PX;
    ctx.float(c.wall.x, c.wall.y - 20, moved ? 'answer… (missed)' : 'ANSWER', moved ? '#8ab8c8' : '#bff4ff');
    ctx.sfx('sonic-pulse');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextShout = time + 2600; ctx.banner('THE WALLS ANSWER EVERY SHOT', '#bff4ff'); }

      // Shots reaching the rock are swallowed and remembered.
      for (const s of ctx.shotsNear(W / 2, (top + H) / 2, Math.hypot(W, H))) {
        if (!atWall(s.x, s.y)) continue;
        const thrower = s.owner === 'player' ? player : npc;
        s.block();
        const wall = { x: clamp(s.x, 14, W - 14), y: clamp(s.y, top + 6, H - 14) };
        calls.push({ wall, aim: { x: thrower.x, y: thrower.y }, thrower, damage: clamp(Math.round(s.damage * 0.9), 4, 18), at: time });
        ctx.sfx('hush');
        if (!announced) { announced = true; ctx.float(wall.x, wall.y - 20, 'the rock listens…', '#8ab8c8'); }
      }

      // Halloo's call: when you stand between him and a wall, he shouts past you at it.
      if (time >= nextShout && alive(npc) && alive(player)) {
        nextShout = time + shoutEvery;
        const a = Math.atan2(player.y - npc.y, player.x - npc.x);
        const wall = rayToWall(npc.x, npc.y, a);
        const travel = (dist(npc.x, npc.y, wall.x, wall.y) / 700) * 1000;
        calls.push({
          wall, aim: { x: npc.x, y: npc.y }, thrower: npc, damage: ctx.hard ? 16 : 13, at: time + travel,
          shout: { from: { x: npc.x, y: npc.y }, startAt: time, arriveAt: time + travel },
        });
        holdUntil = time + travel + ANSWER_MS + 400;
        holdAt = { x: npc.x, y: npc.y };
        ctx.float(npc.x, npc.y - 52, 'HALLOOO!', '#bff4ff');
        ctx.sfx('screech');
      }

      for (let i = calls.length - 1; i >= 0; i--) {
        const c = calls[i];
        if (time - c.at < ANSWER_MS) continue;
        calls.splice(i, 1);
        answer(c);
      }

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        const ox = b.x, oy = b.y;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 8) b.trail.shift();
        let spent = false;
        // It strikes whoever it meets first — thrower or not.
        for (const f of [player, npc].sort((p, q) => dist(ox, oy, p.x, p.y) - dist(ox, oy, q.x, q.y))) {
          if (!alive(f) || segDist(f.x, f.y, ox, oy, b.x, b.y) > BOLT_R + 16) continue;
          ctx.hit(f, b.damage, f.x, f.y);
          ctx.float(f.x, f.y - 44, f === b.thrower ? 'ANSWERED' : 'CAUGHT IT', f === player ? '#ff9a9a' : '#bff4ff');
          ctx.flash(f.x, f.y, GLOW);
          spent = true;
          break;
        }
        if (spent || time > b.dieAt || b.x < -20 || b.x > W + 20 || b.y < top - 20 || b.y > H + 20) bolts.splice(i, 1);
      }
    },

    npcSeek() {
      // Hold still after a call so the answer comes back through you.
      if (holdAt && ctx.scene.time.now < holdUntil) return holdAt;
      // Otherwise: get you between him and the nearest wall behind you.
      const a = Math.atan2(player.y - npc.y, player.x - npc.x);
      const behind = rayToWall(player.x, player.y, a);
      const d = dist(player.x, player.y, behind.x, behind.y);
      const back = d < 260 ? 200 : 260;
      return { x: clamp(player.x - Math.cos(a) * back, 60, W - 60), y: clamp(player.y - Math.sin(a) * back, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The pending answers: a ripple growing in the rock, and a faint line to where it will fly.
      for (const c of calls) {
        if (c.shout && time < c.shout.arriveAt) continue;
        const k = clamp((time - c.at) / ANSWER_MS, 0, 1);
        const moved = alive(c.thrower) && dist(c.thrower.x, c.thrower.y, c.aim.x, c.aim.y) > MOVED_PX;
        g.lineStyle(1.5, c.thrower === player ? GLOW : 0xffb0a0, (0.15 + k * 0.45) * (moved ? 0.5 : 1));
        g.lineBetween(c.wall.x, c.wall.y, c.aim.x, c.aim.y);
        g.fillStyle(c.thrower === player ? GLOW : 0xffb0a0, 0.2 + k * 0.3); g.fillCircle(c.aim.x, c.aim.y, 10 + k * 8);
        g.lineStyle(2, c.thrower === player ? GLOW : 0xffb0a0, 0.6); g.strokeCircle(c.aim.x, c.aim.y, 26 - k * 10);
      }
    },

    drawAir(g, time) {
      // The rock face round the room: flowstone lips on all four sides.
      for (let x = 0; x < W; x += 26) {
        g.fillStyle(FLOW_DARK, 0.85); g.fillEllipse(x + 13, H - 4, 30, 14);
        g.fillStyle(FLOW, 0.8); g.fillEllipse(x + 12, H - 7, 24, 8);
      }
      for (let y = top; y < H; y += 26) {
        for (const x of [4, W - 4]) { g.fillStyle(FLOW_DARK, 0.85); g.fillEllipse(x, y + 13, 14, 30); g.fillStyle(FLOW, 0.75); g.fillEllipse(x + (x < W / 2 ? 2 : -2), y + 12, 8, 24); }
      }
      // Ripples in the rock where a shot went in and is coming back.
      for (const c of calls) {
        if (c.shout && time < c.shout.arriveAt) {
          // The shout crossing the room as sound-arcs.
          const k = clamp((time - c.shout.startAt) / Math.max(1, c.shout.arriveAt - c.shout.startAt), 0, 1);
          const sx = c.shout.from.x + (c.wall.x - c.shout.from.x) * k, sy = c.shout.from.y + (c.wall.y - c.shout.from.y) * k;
          const a = Math.atan2(c.wall.y - c.shout.from.y, c.wall.x - c.shout.from.x);
          soundArcs(g, sx, sy, 10, a, 0.6, 0xffd0b0, 0.9);
          g.lineStyle(1, 0xffd0b0, 0.25); g.lineBetween(c.shout.from.x, c.shout.from.y, c.wall.x, c.wall.y);
          continue;
        }
        const k = clamp((time - c.at) / ANSWER_MS, 0, 1);
        for (let r = 0; r < 3; r++) {
          const ph = (k * 3 + r / 3) % 1;
          g.lineStyle(2, lit(POOL_LIT, 0.3), (1 - ph) * 0.8); g.strokeCircle(c.wall.x, c.wall.y, 6 + ph * 30);
        }
        glow(g, c.wall.x, c.wall.y, 20 + k * 16, c.thrower === player ? GLOW : 0xffb0a0, 0.04 + k * 0.05, 3);
        // A countdown ring.
        g.lineStyle(2.5, 0xffffff, 0.7); g.beginPath(); g.arc(c.wall.x, c.wall.y, 16, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      // Answers in flight: a pale wave-front with a trail.
      for (const b of bolts) {
        const a = Math.atan2(b.vy, b.vx);
        for (let i = 0; i < b.trail.length; i++) {
          const p = b.trail[i];
          g.fillStyle(ROCK_LIT, 0.12 + (i / b.trail.length) * 0.25); g.fillCircle(p.x, p.y, 4 + i);
        }
        soundArcs(g, b.x - Math.cos(a) * 8, b.y - Math.sin(a) * 8, BOLT_R, a, 0.9, b.thrower === player ? GLOW : 0xffd0b0, 1);
        g.fillStyle(FLOW_LIT, 1); g.fillCircle(b.x, b.y, 4);
      }
      // Halloo cupping his hands while he holds for the answer.
      if (holdAt && time < holdUntil && alive(npc)) {
        const a = Math.atan2(player.y - npc.y, player.x - npc.x);
        soundArcs(g, npc.x, npc.y - 10, 18, a, 0.5, 0xffd0b0, 0.4 + Math.sin(time / 120) * 0.2);
      }
    },
  };
}

export const CALL_AND_ANSWER: GimmickDef = {
  id: 'cavern-call-and-answer',
  rules: 'Shots that reach a wall come back out of it 2s later, flying at where the thrower stood — and hit whoever is on the line. Halloo shouts past you on purpose.',
  make,
};
