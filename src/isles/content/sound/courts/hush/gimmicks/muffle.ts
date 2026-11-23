import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { baffle } from '../art';
import { BRONZE_LIT, FELT_COLORS, FELT_OAT, FINE_RED, SILK, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, segCross, segDist, stepDt } from '../util';

/**
 * Muffle — Upholsterer Batting.
 *
 * Batting pads the Quiet House: every wall, every door, every voice. Here thick quilted felt
 * baffles stand on castors and drift about the room. **Any shot that hits a baffle dies in the
 * felt.** Batting fights with a tape measure: every few seconds he runs it out at you — a yellow
 * line ticked in inches — and snaps it, and it cuts whoever it reaches; but a measure cannot pass
 * through felt, so behind a baffle you are out of his sight.
 *
 * A baffle is heavy but it rolls. Strike it and it trundles away from you; run it into the foe at
 * speed and it bowls him over and wraps him — held fast in felt for a moment.
 */

const LEN = 130;
const HALF_T = 12;
const PUSH = 320;
const WRAP_MS = 1100;
const WRAP_DMG = 7;
const MEASURE_HALF = 16;

interface Baffle {
  x: number; y: number; ang: number; spin: number;
  vx: number; vy: number;
  /** Who last drove it fast — it cannot wrap them. */
  drivenBy: Fighter | null;
  color: number;
  target: StrikeTarget | null;
  puffAt: number;
}

interface Measure { a: number; warnAt: number; fireAt: number; fired: boolean; reach: number; hitP: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const baffles: Baffle[] = [];
  const n = ctx.hard ? 4 : 3;
  const every = ctx.hard ? 4600 : 5600;
  const WARN = 1100;
  let nextMeasure = 0;
  let measure: Measure | null = null;
  let started = false;
  const wrappedAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  const ends = (b: Baffle) => {
    const c = Math.cos(b.ang) * LEN / 2, s = Math.sin(b.ang) * LEN / 2;
    return { x1: b.x - c, y1: b.y - s, x2: b.x + c, y2: b.y + s };
  };

  /** How far a ray from (x,y) at angle a travels before it meets felt (or the wall). */
  function rayReach(x: number, y: number, a: number): number {
    const far = 1200;
    const ex = x + Math.cos(a) * far, ey = y + Math.sin(a) * far;
    let best = far;
    for (const b of baffles) {
      const e = ends(b);
      if (!segCross(x, y, ex, ey, e.x1, e.y1, e.x2, e.y2)) continue;
      // Step along to find the crossing distance.
      for (let d = 0; d < far; d += 8) {
        if (segDist(x + Math.cos(a) * d, y + Math.sin(a) * d, e.x1, e.y1, e.x2, e.y2) < HALF_T) { best = Math.min(best, d); break; }
      }
    }
    return best;
  }

  /** True when felt stands between the two fighters. */
  const hidden = () => baffles.some((b) => { const e = ends(b); return segCross(player.x, player.y, npc.x, npc.y, e.x1, e.y1, e.x2, e.y2); });

  function shove(b: Baffle, from: Fighter, speed: number): void {
    const d = Math.max(1, dist(from.x, from.y, b.x, b.y));
    b.vx = ((b.x - from.x) / d) * speed; b.vy = ((b.y - from.y) / d) * speed;
    b.spin = (rng() - 0.5) * 2;
    b.drivenBy = from;
  }

  function spawn(i: number): void {
    const b: Baffle = {
      x: W * (0.3 + i * 0.4 / Math.max(1, n - 1)) + (rng() - 0.5) * 60, y: top + 120 + rng() * (H - top - 240),
      ang: rng() * Math.PI, spin: (rng() - 0.5) * 0.3, vx: (rng() - 0.5) * 50, vy: (rng() - 0.5) * 50,
      drivenBy: null, color: FELT_COLORS[(i * 2 + 1) % FELT_COLORS.length], target: null, puffAt: -9999,
    };
    b.target = ctx.target({
      x: b.x, y: b.y, r: 30,
      onStruck(by) {
        shove(b, by === 'player' ? player : npc, PUSH);
        b.puffAt = ctx.scene.time.now;
        ctx.sfx('hit-light');
      },
    });
    baffles.push(b);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < n; i++) spawn(i);
        nextMeasure = time + 2400;
      }
      for (const b of baffles) {
        const sp = Math.hypot(b.vx, b.vy);
        b.x += b.vx * dt; b.y += b.vy * dt; b.ang += b.spin * dt;
        // Castors on felt: fast pushes slow quickly, then a gentle drift.
        const k = sp > 60 ? Math.exp(-dt * 1.6) : 1;
        b.vx *= k; b.vy *= k; b.spin *= sp > 60 ? Math.exp(-dt * 1.2) : 1;
        if (sp < 30) { b.vx += Math.cos(time / 2000 + b.ang) * 6 * dt; b.vy += Math.sin(time / 2300 + b.ang) * 6 * dt; b.drivenBy = null; }
        if (b.x < 80 || b.x > W - 80) b.vx = -b.vx * 0.6;
        if (b.y < top + 70 || b.y > H - 60) b.vy = -b.vy * 0.6;
        b.x = clamp(b.x, 80, W - 80); b.y = clamp(b.y, top + 70, H - 60);
        b.target?.moveTo(b.x, b.y);
        const e = ends(b);
        // Shots die in the felt.
        for (const s of ctx.shotsNear(b.x, b.y, LEN / 2 + 16)) {
          if (segDist(s.x, s.y, e.x1, e.y1, e.x2, e.y2) > HALF_T + 4) continue;
          s.block();
          b.puffAt = time;
          // The felt rocks back a little from whoever fired.
          const f = s.owner === 'player' ? player : npc;
          const d = Math.max(1, dist(f.x, f.y, b.x, b.y));
          b.vx += ((b.x - f.x) / d) * 40; b.vy += ((b.y - f.y) / d) * 40;
        }
        // Driven fast into a fighter: bowled over and wrapped.
        if (sp > 150) {
          for (const f of [player, npc]) {
            if (f === b.drivenBy || !alive(f) || time - (wrappedAt.get(f) ?? 0) < 2500) continue;
            if (segDist(f.x, f.y, e.x1, e.y1, e.x2, e.y2) > HALF_T + 18) continue;
            wrappedAt.set(f, time);
            ctx.root(f, WRAP_MS);
            ctx.hit(f, WRAP_DMG, f.x, f.y);
            ctx.float(f.x, f.y - 50, 'WRAPPED', '#c9b99a');
            ctx.sfx('status-slow');
            b.vx *= 0.2; b.vy *= 0.2;
          }
        }
      }
      // Batting's tape measure.
      if (!measure && time >= nextMeasure && alive(npc) && alive(player)) {
        const a = Math.atan2(player.y - npc.y, player.x - npc.x);
        measure = { a, warnAt: time, fireAt: time + WARN, fired: false, reach: 0, hitP: false };
        ctx.sfx('reload');
      }
      if (measure) {
        if (!measure.fired) {
          measure.reach = rayReach(npc.x, npc.y, measure.a);
          if (time >= measure.fireAt) {
            measure.fired = true;
            nextMeasure = time + every;
            ctx.sfx('whip');
            const along = (player.x - npc.x) * Math.cos(measure.a) + (player.y - npc.y) * Math.sin(measure.a);
            const off = Math.abs(-(player.x - npc.x) * Math.sin(measure.a) + (player.y - npc.y) * Math.cos(measure.a));
            if (alive(player) && along > 0 && along < measure.reach && off < MEASURE_HALF + 20) {
              measure.hitP = true;
              ctx.hit(player, ctx.hard ? 15 : 12, player.x, player.y);
              ctx.tk.slowPlayer(0.75, 700);
              ctx.float(player.x, player.y - 50, 'MEASURED', '#f6dc52');
            } else if (along > measure.reach - 20) {
              ctx.float(npc.x + Math.cos(measure.a) * measure.reach, npc.y + Math.sin(measure.a) * measure.reach - 20, 'MUFFLED', '#c9b99a');
            }
          }
        } else if (time > measure.fireAt + 450) measure = null;
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Every other few seconds, go and stand behind a baffle near you, to bowl it at you.
      if (Math.floor(ctx.scene.time.now / 4500) % 2 === 1) {
        let best: Baffle | null = null, bd = 340;
        for (const b of baffles) { const d = dist(b.x, b.y, player.x, player.y); if (d < bd) { bd = d; best = b; } }
        if (best) {
          const d = Math.max(1, dist(best.x, best.y, player.x, player.y));
          return { x: clamp(best.x + ((best.x - player.x) / d) * 60, 60, W - 60), y: clamp(best.y + ((best.y - player.y) / d) * 60, top + 50, H - 40) };
        }
      }
      // Otherwise, a clear line to measure you from: step round whatever felt is between.
      if (hidden()) return { x: clamp(player.x + (npc.x < player.x ? -1 : 1) * 260, 60, W - 60), y: clamp(player.y + (npc.y < player.y ? 120 : -120), top + 50, H - 40) };
      return null;
    },

    drawGround(g, time) {
      for (const b of baffles) {
        // Castor tracks and the shadow of the frame.
        g.fillStyle(0x000000, 0.12); g.fillEllipse(b.x + 4, b.y + 10, LEN * 1.05, 24);
        const e = ends(b);
        for (const [x, y] of [[e.x1, e.y1], [e.x2, e.y2]] as [number, number][]) { g.fillStyle(TIMBER_DARK, 0.8); g.fillCircle(x, y + 8, 4); }
      }
      // The measure: a yellow tape, ticked, running out from Batting and stopping dead at felt.
      if (measure && alive(npc)) {
        const k = measure.fired ? 1 : clamp((time - measure.warnAt) / WARN, 0, 1);
        const len = measure.reach * (measure.fired ? 1 : k);
        const ca = Math.cos(measure.a), sa = Math.sin(measure.a);
        const ex = npc.x + ca * len, ey = npc.y + sa * len;
        const fade = measure.fired ? clamp(1 - (time - measure.fireAt) / 450, 0, 1) : 1;
        g.lineStyle(measure.fired ? MEASURE_HALF * 2 : 6, measure.fired ? 0xfff2b0 : 0xf6dc52, (measure.fired ? 0.5 : 0.85) * fade);
        g.lineBetween(npc.x, npc.y, ex, ey);
        for (let d = 20; d < len; d += 20) {
          const tx = npc.x + ca * d, ty = npc.y + sa * d;
          const tl = d % 100 === 0 ? 7 : 3.5;
          g.lineStyle(1.2, 0x3a2a14, 0.9 * fade); g.lineBetween(tx - sa * tl, ty + ca * tl, tx, ty);
        }
        // The brass case at his hand, the red tip at the end.
        g.fillStyle(BRONZE_LIT, fade); g.fillCircle(npc.x + ca * 18, npc.y + sa * 18, 7);
        g.fillStyle(FINE_RED, fade); g.fillRect(ex - 4, ey - 4, 8, 8);
        if (!measure.fired) { g.lineStyle(1, 0xf6dc52, 0.25); g.lineBetween(npc.x, npc.y, npc.x + ca * measure.reach, npc.y + sa * measure.reach); }
      }
    },

    drawAir(g, time) {
      for (const b of baffles) {
        // The frame's feet, then the felt standing up off them.
        baffle(g, b.x, b.y - 14, LEN, b.ang, b.color);
        const e = ends(b);
        g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(e.x1, e.y1 - 2, e.x1, e.y1 + 8); g.lineBetween(e.x2, e.y2 - 2, e.x2, e.y2 + 8);
        // A felt puff where a shot died.
        if (time - b.puffAt < 400) {
          const k = (time - b.puffAt) / 400;
          for (let i = 0; i < 6; i++) { g.fillStyle(lit(b.color, 0.4), 0.5 * (1 - k)); g.fillCircle(b.x + Math.cos(i) * k * 30, b.y - 14 + Math.sin(i) * k * 18 - k * 12, 4 + k * 4); }
        }
        if (Math.hypot(b.vx, b.vy) > 150) { g.lineStyle(2, SILK, 0.4); g.lineBetween(b.x, b.y - 14, b.x - b.vx * 0.12, b.y - 14 - b.vy * 0.12); }
      }
      // The wrapped: a bolt of felt rolled round them, stitched.
      for (const f of [player, npc]) {
        const since = time - (wrappedAt.get(f) ?? -9999);
        if (since > WRAP_MS || !alive(f)) continue;
        for (let i = 0; i < 3; i++) {
          g.fillStyle(i % 2 ? FELT_OAT : dim(FELT_OAT, 0.2), 0.9); g.fillRoundedRect(f.x - 20, f.y - 30 + i * 12, 40, 10, 5);
        }
        g.lineStyle(1.5, 0x3a2a14, 0.8); for (let i = 0; i < 4; i++) g.lineBetween(f.x - 14 + i * 9, f.y - 32, f.x - 10 + i * 9, f.y + 4);
      }
      // Hidden from his measure: a muffled outline round you while felt is between.
      if (alive(player) && alive(npc) && hidden()) {
        g.lineStyle(2, SILK, 0.35 + Math.sin(time / 200) * 0.1); g.strokeCircle(player.x, player.y - 6, 28);
      }
    },
  };
}

export const MUFFLE: GimmickDef = {
  id: 'hush-muffle',
  rules: 'Felt baffles drift about: shots that hit them die in the felt, and Batting\'s tape measure can\'t see through. Strike a baffle to bowl it — it wraps whoever it runs down.',
  make,
};
