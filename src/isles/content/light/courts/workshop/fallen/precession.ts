import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, BRASS_DARK, BRASS_LIT, COPPER, CYAN, IRON, IRON_DARK, IRON_LIT, LIME_DARK } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { arrowHead, hpRatio, hudPlate, rivet } from './kit';

/**
 * Precession — Instrument-Maker Delphine Gimbal, who built the great gyroscope that is to keep
 * the Magnum Opus upright when it walks.
 *
 * The gyroscope — a heavy iron rotor spinning in a brass gimbal, balanced on a steel toe — wanders
 * the yard on its own slow precession and bites whoever it rubs against. Strike it and it obeys
 * the law of every spinning thing: it does **not** fly away from the blow. It rears for a beat (the
 * chalk shows the way), then runs off at **a right angle to the blow** — to the side its spin
 * arrows turn — and crushes whoever is on that line, striker or not. So you aim a quarter-turn off:
 * stand where the foe is beside your blow, not behind it.
 *
 * Every fourteen seconds the rotor slows, stops and spins up the other way, and the right angle
 * flips. Past half a second, smaller gyroscope joins, spinning against the first.
 */

const ID = fallenId('workshop', 'precession');
const REAR_MS = 430;
const LAUNCH = 400;
const RUNNING = 150;
const FLIP_EVERY = 14000;
const FLIP_WARN = 2000;

interface Gyro {
  x: number; y: number; vx: number; vy: number; r: number;
  spin: 1 | -1; rotor: number;
  rearUntil: number; heading: number;
  lastStruck: number; flipAt: number;
  hitSet: Set<Fighter>; bite: Map<Fighter, number>;
  orbit: number; target: StrikeTarget | null;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const cx = W / 2, cy = top + (H - top) / 2;
  const gyros: Gyro[] = [];
  let doubled = false;
  let started = false;

  function addGyro(x: number, y: number, r: number, spin: 1 | -1, time: number): void {
    const gy: Gyro = {
      x, y, vx: 0, vy: 0, r, spin, rotor: 0, rearUntil: 0, heading: 0, lastStruck: 0, flipAt: time + FLIP_EVERY,
      hitSet: new Set(), bite: new Map(), orbit: ctx.rng() * Math.PI * 2, target: null,
    };
    gy.target = ctx.target({ x, y, r: r + 4, onStruck: (by) => struck(gy, by) });
    gyros.push(gy);
  }

  function struck(gy: Gyro, by: Striker): void {
    const now = ctx.scene.time.now;
    if (now - gy.lastStruck < 400 || now < gy.rearUntil) return;
    const f = by === 'player' ? player : npc;
    gy.lastStruck = now;
    const blow = Math.atan2(gy.y - f.y, gy.x - f.x);
    gy.heading = blow + gy.spin * Math.PI / 2;
    gy.rearUntil = now + REAR_MS;
    gy.vx = 0; gy.vy = 0;
    ctx.sfx('gear-turn');
  }

  const speed = (gy: Gyro): number => Math.hypot(gy.vx, gy.vy);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; addGyro(cx, cy, 34, 1, time); }
      if (!doubled && hpRatio(npc) < 0.5) {
        doubled = true;
        addGyro(clamp(W - npc.x, 90, W - 90), clamp(H + top - npc.y, top + 70, H - 60), 26, (-gyros[0].spin) as 1 | -1, time);
        ctx.banner('A SECOND ROTOR SPINS UP'); ctx.sfx('engine');
      }
      for (const gy of gyros) {
        // Spin reversal on its own clock: slow, stop, the other way.
        if (time >= gy.flipAt) { gy.spin = (-gy.spin) as 1 | -1; gy.flipAt = time + FLIP_EVERY; ctx.sfx('snap-back'); }
        const warn = gy.flipAt - time < FLIP_WARN;
        gy.rotor += dt * gy.spin * (warn ? 18 * ((gy.flipAt - time) / FLIP_WARN) : 18);
        if (time < gy.rearUntil) { gy.target?.moveTo(gy.x, gy.y); continue; }
        if (gy.rearUntil > 0) {
          gy.rearUntil = 0;
          gy.vx = Math.cos(gy.heading) * LAUNCH; gy.vy = Math.sin(gy.heading) * LAUNCH;
          gy.hitSet.clear();
          ctx.sfx('whoosh');
        }
        const sp = speed(gy);
        if (sp > RUNNING) {
          const k = Math.exp(-0.9 * dt);
          gy.vx *= k; gy.vy *= k;
        } else {
          // Idle precession: a slow circle about a wandering centre.
          gy.orbit += dt * 0.5 * gy.spin;
          const ox = cx + Math.cos(gy.orbit * 0.6) * 170, oy = cy + Math.sin(gy.orbit) * 110;
          const a = Math.atan2(oy - gy.y, ox - gy.x);
          gy.vx += (Math.cos(a) * 55 - gy.vx) * Math.min(1, dt * 1.5);
          gy.vy += (Math.sin(a) * 55 - gy.vy) * Math.min(1, dt * 1.5);
        }
        gy.x += gy.vx * dt; gy.y += gy.vy * dt;
        if (gy.x < 40 + gy.r || gy.x > W - 40 - gy.r) { gy.vx = -gy.vx * 0.8; gy.x = clamp(gy.x, 40 + gy.r, W - 40 - gy.r); if (sp > RUNNING) ctx.sfx('clang'); }
        if (gy.y < top + 20 + gy.r || gy.y > H - 30 - gy.r) { gy.vy = -gy.vy * 0.8; gy.y = clamp(gy.y, top + 20 + gy.r, H - 30 - gy.r); if (sp > RUNNING) ctx.sfx('clang'); }
        gy.target?.moveTo(gy.x, gy.y);
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(f.x, f.y, gy.x, gy.y);
          if (d > gy.r + 20) continue;
          if (speed(gy) > RUNNING) {
            if (gy.hitSet.has(f)) continue;
            gy.hitSet.add(f);
            ctx.hit(f, gy.r > 30 ? 16 : 12, f.x, f.y);
            ctx.stun(f, 450);
            const s = speed(gy);
            ctx.nudge(f, (gy.vx / s) * 60, (gy.vy / s) * 60);
            ctx.sfx('anvil');
          } else {
            // The rim bites whoever leans on it, and shoulders them aside.
            const a = Math.atan2(f.y - gy.y, f.x - gy.x);
            ctx.nudge(f, Math.cos(a) * 4, Math.sin(a) * 4);
            if (time - (gy.bite.get(f) ?? 0) >= 600) { gy.bite.set(f, time); ctx.hit(f, 5, f.x, f.y); }
          }
        }
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      // Get out of a rearing or running rotor's line first.
      for (const gy of gyros) {
        const running = speed(gy) > RUNNING;
        if (now >= gy.rearUntil && !running) continue;
        const a = now < gy.rearUntil ? gy.heading : Math.atan2(gy.vy, gy.vx);
        if (segDist(npc.x, npc.y, gy.x, gy.y, gy.x + Math.cos(a) * 340, gy.y + Math.sin(a) * 340) < gy.r + 40) {
          const side = Math.sin(Math.atan2(npc.y - gy.y, npc.x - gy.x) - a) >= 0 ? 1 : -1;
          return { x: clamp(npc.x + Math.cos(a + side * Math.PI / 2) * 110, 60, W - 60), y: clamp(npc.y + Math.sin(a + side * Math.PI / 2) * 110, top + 40, H - 40) };
        }
      }
      // Stand a quarter-turn off: where a blow from here runs the rotor at the stranger.
      let best: Pt | null = null, bs = Infinity;
      for (const gy of gyros) {
        if (speed(gy) > RUNNING || now < gy.rearUntil) continue;
        const u = Math.atan2(player.y - gy.y, player.x - gy.x);
        const blow = u - gy.spin * Math.PI / 2;
        const spot = { x: clamp(gy.x - Math.cos(blow) * (gy.r + 36), 50, W - 50), y: clamp(gy.y - Math.sin(blow) * (gy.r + 36), top + 40, H - 40) };
        const s = dist(npc.x, npc.y, spot.x, spot.y) + dist(player.x, player.y, gy.x, gy.y) * 0.6;
        if (s < bs) { bs = s; best = spot; }
      }
      return best;
    },

    drawGround(g, time) {
      for (const gy of gyros) {
        // The steel toe's scratch-ring and its shadow.
        g.fillStyle(0x000000, 0.18); g.fillEllipse(gy.x, gy.y + gy.r * 0.55, gy.r * 1.8, gy.r * 0.5);
        if (time < gy.rearUntil) {
          // The chalked line of the run, a quarter-turn off the blow, chevrons running along it.
          const k = 1 - (gy.rearUntil - time) / REAR_MS;
          const hx = Math.cos(gy.heading), hy = Math.sin(gy.heading);
          const len = 340;
          g.fillStyle(0xffffff, 0.08 + 0.1 * k);
          const nx = -hy * (gy.r + 6), ny = hx * (gy.r + 6);
          g.fillPoints([
            { x: gy.x + nx, y: gy.y + ny }, { x: gy.x + hx * len + nx, y: gy.y + hy * len + ny },
            { x: gy.x + hx * len - nx, y: gy.y + hy * len - ny }, { x: gy.x - nx, y: gy.y - ny },
          ], true);
          g.lineStyle(2, LIME_DARK, 0.8); g.lineBetween(gy.x + nx, gy.y + ny, gy.x + hx * len * k + nx, gy.y + hy * len * k + ny);
          g.lineBetween(gy.x - nx, gy.y - ny, gy.x + hx * len * k - nx, gy.y + hy * len * k - ny);
          for (let i = 1; i < 6; i++) {
            const d = i * 56;
            if (d > len * k) break;
            arrowHead(g, gy.x + hx * d, gy.y + hy * d, gy.heading, 12, 0xffffff, 0.7);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const gy of gyros) drawGyro(g, gy, time, gy.flipAt - time < FLIP_WARN, time < gy.rearUntil, speed(gy) > RUNNING);
    },

    drawHud(g, time) {
      // One card per rotor: a blow arrow, bent a right angle the way the rotor turns it; flip pips.
      gyros.forEach((gy, i) => {
        const x = W / 2 - 60 + i * 64, y = top + 6;
        hudPlate(g, x - 26, y - 2, 54, 50);
        const warn = gy.flipAt - time < FLIP_WARN;
        const c = warn && Math.floor(time / 160) % 2 ? 0xff6a4a : BRASS_LIT;
        g.lineStyle(3, IRON_LIT, 1); g.lineBetween(x - 18, y + 22, x, y + 22);
        arrowHead(g, x + 2, y + 22, 0, 6, IRON_LIT, 1);
        g.lineStyle(3, c, 1); g.lineBetween(x + 4, y + 22, x + 4, y + 22 + gy.spin * 16);
        arrowHead(g, x + 4, y + 22 + gy.spin * 18, gy.spin * Math.PI / 2, 7, c, 1);
        g.lineStyle(2, BRASS, 0.9); g.strokeCircle(x + 4, y + 22, 5);
        const left = clamp((gy.flipAt - time) / FLIP_EVERY, 0, 1);
        g.fillStyle(0x333333, 1); g.fillRect(x - 20, y + 42, 48, 3);
        g.fillStyle(warn ? 0xff6a4a : CYAN, 1); g.fillRect(x - 20, y + 42, 48 * left, 3);
      });
    },

    destroy() { for (const gy of gyros) gy.target?.remove(); },
  };
}

/**
 * The gyroscope: a brass gimbal ring tilted on its pins round a heavy iron rotor whose spokes and
 * spin arrows turn with it. Rearing, the gimbal swings over toward the run; running, it leans and
 * sheds a heat glow at the toe.
 */
function drawGyro(g: G, gy: Gyro, time: number, warn: boolean, rearing: boolean, running: boolean): void {
  const { x, r } = gy;
  const lift = rearing ? 6 : 0;
  const y = gy.y - 10 - lift;
  const tilt = rearing ? 0.55 : running ? 0.35 : 0.15 * Math.sin(time / 700 + gy.orbit);
  // Steel toe.
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(gy.x - 5, gy.y - 4, gy.x + 5, gy.y - 4, gy.x, gy.y + 6);
  if (running) glow(g, gy.x, gy.y + 4, 14, 0xffd27a, 0.1, 3);
  // Outer gimbal (brass), seen as an ellipse that narrows as it tilts.
  const ry = r * (0.9 - tilt * 0.5);
  g.lineStyle(7, BRASS_DARK, 1); g.strokeEllipse(x, y + 2, (r + 10) * 2, (ry + 8) * 2);
  g.lineStyle(4, BRASS, 1); g.strokeEllipse(x, y, (r + 10) * 2, (ry + 8) * 2);
  g.lineStyle(1.5, BRASS_LIT, 0.9); g.strokeEllipse(x, y - 1, (r + 9) * 2, (ry + 7) * 2);
  // Pivot pins.
  rivet(g, x - r - 10, y, BRASS_LIT, 3.5); rivet(g, x + r + 10, y, BRASS_LIT, 3.5);
  // The rotor: a heavy iron disc with a bright rim, spokes turning.
  g.fillStyle(dim(IRON, 0.2), 1); g.fillEllipse(x, y + 3, r * 2, ry * 2);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y, r * 2, ry * 2);
  g.lineStyle(3, IRON_LIT, 1); g.strokeEllipse(x, y, r * 2, ry * 2);
  for (let i = 0; i < 6; i++) {
    const a = gy.rotor + (i * Math.PI) / 3;
    g.lineStyle(2, dim(IRON_LIT, 0.2), 1);
    g.lineBetween(x + Math.cos(a) * 6, y + Math.sin(a) * 6 * (ry / r), x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4) * (ry / r));
  }
  // Spin arrows painted on the rim in copper: they show which way a blow is turned.
  const ac = warn ? (Math.floor(time / 160) % 2 ? 0xff6a4a : COPPER) : COPPER;
  for (let i = 0; i < 3; i++) {
    const a0 = gy.rotor + i * ((Math.PI * 2) / 3);
    const a1 = a0 + gy.spin * 0.8;
    g.lineStyle(2.5, ac, 1);
    g.beginPath();
    const steps = 6;
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (a1 - a0) * (s / steps);
      const px = x + Math.cos(a) * (r - 9), py = y + Math.sin(a) * (r - 9) * (ry / r);
      if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    arrowHead(g, x + Math.cos(a1) * (r - 9), y + Math.sin(a1) * (r - 9) * (ry / r), a1 + gy.spin * Math.PI / 2, 5, ac, 1);
  }
  // Hub.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 7);
  g.fillStyle(lit(BRASS, 0.2), 1); g.fillCircle(x - 1, y - 1, 4);
}

export const PRECESSION: GimmickDef = {
  id: ID,
  rules: 'Strike the gyroscope and it rears, then runs off a right angle from your blow — the way its arrows turn — crushing all in line. Its spin reverses.',
  make,
};
