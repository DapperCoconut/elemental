import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow } from '../../../../../art/IsleArt';
import { sandShip } from '../art';
import { CANVAS, CANVAS_DARK, SAND_LIT, SAND_PALE, STRIPE_INDIGO, STRIPE_RED, STRIPE_SAFFRON } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Sand-Ships — Skipper Barca.
 *
 * Three sailing lanes cross the dunes, and sand-ships tack across them — a sail shows on the
 * horizon at one edge first, wind-streaks run down its lane, then the ship comes through. Stand in
 * its path and the prow rams you aside. Step onto its deck *from the side* and it carries you along
 * its lane — and while anyone is aboard, its gun ports fire a broadside out of the side that faces
 * the other fighter, every second, until the ship sails off the edge.
 *
 * Barca is a skipper: he boards every ship he can reach. Board before he does, or stand where his
 * broadside cannot find you (in the ship's own lane, ahead of the prow — and dodge the prow).
 */

const SHIP_S = 0.8;
/** Hull extent along the lane (behind / ahead of the ship's x, in the direction of travel). */
const HULL_BACK = 72;
const HULL_FWD = 56;
const HULL_HALF = 30;
/** The prow's ram zone, ahead of the hull. */
const PROW_TO = 100;
const PROW_HALF = 36;
const WARN_MS = 1600;
const VOLLEY_MS = 950;
const BALL_SPEED = 330;
const BALL_R = 7;

interface Ship {
  laneY: number; dir: 1 | -1; x: number; speed: number;
  warnAt: number; sailAt: number; lastVolley: number;
  sail: number; stripe: number;
  aboard: Set<Fighter>; rammed: Set<Fighter>;
  flashAt: number;
}
interface Ball { x: number; y: number; vx: number; vy: number; owner: Fighter; dieAt: number; trail: Pt[] }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const lanes = [top + 100, (top + H) / 2 + 10, H - 70];
  const ships: Ship[] = [];
  const balls: Ball[] = [];
  const every = ctx.hard ? 2600 : 3300;
  const speed = ctx.hard ? 175 : 150;
  const dmgBall = ctx.hard ? 10 : 8;
  const dmgRam = ctx.hard ? 13 : 10;
  let nextShip = 0;
  let started = false;
  let lastLane = -1;

  const other = (f: Fighter) => (f === player ? npc : player);
  const along = (s: Ship, f: Fighter) => (f.x - s.x) * s.dir;

  function launch(time: number): void {
    const busy = new Set(ships.map((s) => s.laneY));
    const free = lanes.map((_, i) => i).filter((i) => !busy.has(lanes[i]) && i !== lastLane);
    if (!free.length) return;
    // Favour the lane nearest the player now and then, so the ships stay in the fight.
    let li = free[Math.floor(rng() * free.length)];
    if (rng() < 0.45) li = free.reduce((b, i) => (Math.abs(lanes[i] - player.y) < Math.abs(lanes[b] - player.y) ? i : b), free[0]);
    lastLane = li;
    const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const palette = [[CANVAS, STRIPE_RED], [CANVAS, STRIPE_INDIGO], [STRIPE_SAFFRON, CANVAS]][Math.floor(rng() * 3)];
    ships.push({
      laneY: lanes[li], dir, x: dir > 0 ? -HULL_FWD - 120 : W + HULL_FWD + 120, speed,
      warnAt: time, sailAt: time + WARN_MS, lastVolley: 0, sail: palette[0], stripe: palette[1],
      aboard: new Set(), rammed: new Set(), flashAt: -9999,
    });
    ctx.sfx('gust');
  }

  function broadside(s: Ship, rider: Fighter, time: number): void {
    const foe = other(rider);
    if (!alive(foe)) return;
    const side = foe.y >= s.laneY ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      const px = s.x + s.dir * (-40 + i * 28);
      const py = s.laneY + side * 14;
      // Perpendicular to the lane, swung toward the foe by at most ~35°.
      const want = Math.atan2(foe.y - py, foe.x - px);
      const base = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      let off = Math.atan2(Math.sin(want - base), Math.cos(want - base));
      off = clamp(off, -0.6, 0.6);
      const a = base + off;
      balls.push({ x: px, y: py, vx: Math.cos(a) * BALL_SPEED, vy: Math.sin(a) * BALL_SPEED, owner: rider, dieAt: time + 2600, trail: [] });
    }
    s.flashAt = time;
    ctx.sfx('musket');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextShip = time + 900; }
      if (time >= nextShip) {
        nextShip = time + every;
        if (ships.length < (ctx.hard ? 3 : 2)) launch(time);
      }

      for (let i = ships.length - 1; i >= 0; i--) {
        const s = ships[i];
        if (time < s.sailAt) continue;
        s.x += s.dir * s.speed * dt;
        for (const f of [player, npc]) {
          if (!alive(f)) { s.aboard.delete(f); continue; }
          const ax = along(s, f), dy = f.y - s.laneY;
          const onHull = ax > -HULL_BACK && ax < HULL_FWD && Math.abs(dy) < HULL_HALF;
          if (s.aboard.has(f)) {
            if (!onHull) { s.aboard.delete(f); continue; }
            // Carried: the deck moves under you, and it keeps you amidships.
            ctx.nudge(f, s.dir * s.speed * dt, -dy * Math.min(1, dt * 3));
            continue;
          }
          if (onHull && !s.rammed.has(f)) {
            s.aboard.add(f);
            ctx.float(f.x, f.y - 44, 'ABOARD', '#f2d496');
            ctx.sfx('land');
            continue;
          }
          // The prow.
          if (!s.rammed.has(f) && ax >= HULL_FWD && ax < PROW_TO && Math.abs(dy) < PROW_HALF) {
            s.rammed.add(f);
            const side = dy === 0 ? (rng() < 0.5 ? -1 : 1) : Math.sign(dy);
            ctx.hit(f, dmgRam, f.x, f.y);
            ctx.nudge(f, s.dir * 40, side * 90);
            ctx.stun(f, 350);
            ctx.float(f.x, f.y - 44, 'RAMMED', '#ffb070');
            ctx.sfx('hit-heavy');
          }
        }
        if (s.aboard.size && time - s.lastVolley >= VOLLEY_MS && s.x > 0 && s.x < W) {
          s.lastVolley = time;
          for (const r of s.aboard) broadside(s, r, time);
        }
        if ((s.dir > 0 && s.x > W + 200) || (s.dir < 0 && s.x < -200)) ships.splice(i, 1);
      }

      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 6) b.trail.shift();
        b.x += b.vx * dt; b.y += b.vy * dt;
        const foe = other(b.owner);
        if (alive(foe) && dist(b.x, b.y, foe.x, foe.y) < 20 + BALL_R) {
          ctx.hit(foe, dmgBall, b.x, b.y);
          ctx.flash(b.x, b.y, 0xffc070);
          ctx.sfx('hit-medium');
          balls.splice(i, 1);
          continue;
        }
        if (time > b.dieAt || b.x < -40 || b.x > W + 40 || b.y < top - 20 || b.y > H + 40) balls.splice(i, 1);
      }
    },

    npcSeek() {
      // Board the nearest ship he can reach from the side; ride it while it lasts.
      for (const s of ships) if (s.aboard.has(npc)) return { x: clamp(s.x - s.dir * 6, 40, W - 40), y: s.laneY };
      let best: Pt | null = null;
      let bd = Infinity;
      for (const s of ships) {
        if (s.rammed.has(npc)) continue;
        const sx = time() < s.sailAt ? (s.dir > 0 ? 80 : W - 80) : s.x;
        if (sx < -40 || sx > W + 40) continue;
        const side = npc.y >= s.laneY ? 1 : -1;
        // Come alongside first, then step onto the deck from the side — never meet the prow.
        const near = Math.abs(npc.x - sx) < 70 && Math.abs(npc.y - s.laneY) < 90;
        const p = near ? { x: sx - s.dir * 16, y: s.laneY } : { x: clamp(sx, 60, W - 60), y: s.laneY + side * 64 };
        const d = dist(npc.x, npc.y, p.x, p.y);
        if (d < bd && d < 420) { bd = d; best = p; }
      }
      if (best) return best;
      // Between the lanes, off the player's flank.
      const gap = player.y < (lanes[0] + lanes[1]) / 2 ? (lanes[1] + lanes[2]) / 2 : (lanes[0] + lanes[1]) / 2;
      return { x: clamp(player.x + (npc.x < player.x ? -180 : 180), 60, W - 60), y: gap };
    },

    drawGround(g, time) {
      // The lanes: faint tracks of old runners in the sand.
      for (const y of lanes) {
        g.lineStyle(2, dim(SAND_LIT, 0.25), 0.25); g.lineBetween(0, y + 26, W, y + 26); g.lineBetween(0, y + 30, W, y + 30);
      }
      for (const s of ships) {
        if (time < s.sailAt) {
          // On the horizon: wind-streaks racing down the lane from the edge it will come in by.
          const k = clamp((time - s.warnAt) / WARN_MS, 0, 1);
          for (let i = 0; i < 9; i++) {
            const ph = (time / 500 + i / 9) % 1;
            const x = s.dir > 0 ? ph * W * k : W - ph * W * k;
            g.lineStyle(2, SAND_PALE, 0.15 + k * 0.35);
            g.lineBetween(x, s.laneY + ((i * 13) % 40) - 20, x - s.dir * 30, s.laneY + ((i * 13) % 40) - 20);
          }
          g.fillStyle(0x000000, 0.06 + k * 0.08); g.fillRect(0, s.laneY - PROW_HALF, W, PROW_HALF * 2);
          continue;
        }
        // Wake: sand thrown off the runners.
        for (let i = 0; i < 8; i++) {
          const ph = (time / 260 + i / 8) % 1;
          const wx = s.x - s.dir * (HULL_BACK + ph * 80), wy = s.laneY + 26 + Math.sin(i * 2.1) * 8;
          g.fillStyle(SAND_PALE, 0.5 * (1 - ph)); g.fillCircle(wx, wy - ph * 10, 3 + ph * 6);
        }
        // The prow's warning ahead of it.
        g.fillStyle(0xb8382c, 0.12); g.fillRect(s.dir > 0 ? s.x + HULL_FWD : s.x - PROW_TO, s.laneY - PROW_HALF, PROW_TO - HULL_FWD, PROW_HALF * 2);
        const guns = clamp(1 - (time - s.flashAt) / 260, 0, 1);
        sandShip(g, s.x, s.laneY + 26, SHIP_S, s.dir, { sail: s.sail, stripe: s.stripe, guns });
        if (s.aboard.size) { g.lineStyle(2, SAND_PALE, 0.4); g.strokeRect(s.dir > 0 ? s.x - HULL_BACK : s.x - HULL_FWD, s.laneY - HULL_HALF, HULL_BACK + HULL_FWD, HULL_HALF * 2); }
      }
    },

    drawAir(g, time) {
      for (const s of ships) {
        if (time >= s.sailAt) {
          // Muzzle smoke at the ports after a volley.
          const k = (time - s.flashAt) / 700;
          if (k >= 0 && k < 1) {
            for (let i = 0; i < 3; i++) {
              const px = s.x + s.dir * (-40 + i * 28);
              g.fillStyle(0xe8e0d0, 0.5 * (1 - k)); g.fillCircle(px, s.laneY + 6 - k * 20, 6 + k * 14);
            }
          }
          continue;
        }
        // The sail on the horizon: a little lateen triangle rising at the edge.
        const k = clamp((time - s.warnAt) / WARN_MS, 0, 1);
        const ex = s.dir > 0 ? 18 : W - 18;
        const h = 14 + k * 30;
        g.fillStyle(CANVAS_DARK, 0.9); g.fillTriangle(ex, s.laneY + 6, ex + s.dir * h * 0.5, s.laneY + 6, ex, s.laneY + 6 - h);
        g.fillStyle(s.stripe, 0.9); g.fillRect(ex - 1, s.laneY + 6 - h * 0.5, s.dir * h * 0.25, 3);
        glow(g, ex, s.laneY - 6, 26, 0xfff0c8, 0.04 + k * 0.05, 2);
      }
      for (const b of balls) {
        b.trail.forEach((p, i) => { g.fillStyle(0xd8d0c0, (i / b.trail.length) * 0.35); g.fillCircle(p.x, p.y, 3 + i * 0.6); });
        g.fillStyle(0x1a1a1e, 1); g.fillCircle(b.x, b.y, BALL_R);
        g.fillStyle(0x6a6a74, 1); g.fillCircle(b.x - 2, b.y - 2, 2.4);
      }
    },
  };

  function time(): number { return ctx.scene.time.now; }
}

export const SAND_SHIPS: GimmickDef = {
  id: 'dunesea-sand-ships',
  rules: 'Sand-ships tack across three lanes (watch the horizon). The prow rams; step aboard from the side to ride — and fire its broadside at your foe.',
  make,
};
