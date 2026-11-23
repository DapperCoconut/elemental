import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { horse, tiltRail } from '../art';
import { GILT, IVORY, MUD_LIT, RED, RED_LIT } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Tilt Yard — Jouster Lance.
 *
 * A striped tilt rail runs the length of the yard. Either side of it is a lane, and down the
 * lanes, on a beat, caparisoned horses thunder lance-first: dust kicks up at the start of a lane
 * and a pennant drops before each run, and whoever is in the lane when the horse comes through is
 * ridden down and thrown out of it. The rail itself is never ridden down.
 *
 * And the rail can be ridden. Dash onto it — any burst of speed that carries you across it — and
 * a horse is under you: you are carried along the rail at the gallop, lance couched, and anyone
 * standing on the rail ahead of you is unhorsed. Lance rides it too, when you stand on his line.
 */

interface Run { lane: -1 | 1; dir: -1 | 1; warnAt: number; goAt: number; x: number; done: boolean; hit: Set<Fighter>; seed: number }
interface Ride { f: Fighter; dir: -1 | 1; until: number; t: number; struck: boolean }

const LANE_OFF = 82;
const LANE_HALF = 38;
const HORSE_SPEED = 620;
const RIDE_SPEED = 430;
const DASH_SPEED = 560;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const RY = Math.round((top + H) / 2 + 10);
  const X0 = 90, X1 = W - 90;
  const HORSE_DMG = ctx.hard ? 19 : 15;
  const LANCE_DMG = ctx.hard ? 24 : 20;
  const EVERY = ctx.hard ? 2900 : 3600;
  const WARN = 1300;
  const runs: Run[] = [];
  const rides: Ride[] = [];
  let nextRun = 0;
  let lastLane: -1 | 1 = 1;
  let started = false;
  let npcRideReady = 0;
  let npcCallAt = -1;
  const last = new Map<Fighter, { x: number; y: number }>();
  /** Fighters this rule shoved last frame — their jump is not a dash. */
  const skip = new Set<Fighter>();
  const shove = (f: Fighter, dx: number, dy: number) => { ctx.nudge(f, dx, dy); skip.add(f); };

  const laneY = (lane: number) => RY + lane * LANE_OFF;
  const riding = (f: Fighter) => rides.some((r) => r.f === f);
  const onRail = (f: Fighter) => Math.abs(f.y - RY) < 30 && f.x > X0 - 10 && f.x < X1 + 10;

  function mount(f: Fighter, dir: -1 | 1, time: number): void {
    if (riding(f)) return;
    rides.push({ f, dir, until: time + 2400, t: 0, struck: false });
    ctx.sfx('drum-hit');
    ctx.float(f.x, f.y - 50, f === player ? 'YOU RIDE THE RAIL' : 'LANCE RIDES', '#f4d67e');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextRun = time + 2000; npcRideReady = time + 6000; }

      // A dash across the rail mounts you.
      for (const f of [player, npc]) {
        const l = last.get(f);
        if (l && alive(f) && dt > 0.001 && !skip.has(f)) {
          const speed = Math.hypot(f.x - l.x, f.y - l.y) / dt;
          const crossed = (l.y - RY) * (f.y - RY) <= 0 || Math.abs(f.y - RY) < 22;
          if (f === player && speed > DASH_SPEED && crossed && f.x > X0 && f.x < X1) {
            mount(f, f.x >= l.x ? 1 : -1, time);
          }
        }
        last.set(f, { x: f.x, y: f.y });
      }
      skip.clear();

      // Lance whistles for his horse when you stand on his line.
      if (npcCallAt < 0 && time >= npcRideReady && alive(npc) && alive(player) && !riding(npc)
        && Math.abs(npc.y - RY) < 70 && Math.abs(player.y - RY) < 70 && Math.abs(player.x - npc.x) > 120) {
        npcCallAt = time;
        ctx.banner('LANCE COUCHES HIS LANCE', '#ffb0a0');
        ctx.sfx('whoosh');
      }
      if (npcCallAt >= 0 && time - npcCallAt >= ctx.tk.warn(700)) {
        npcCallAt = -1;
        npcRideReady = time + (ctx.hard ? 6500 : 8500);
        if (alive(npc)) {
          shove(npc, 0, RY - npc.y);
          mount(npc, player.x >= npc.x ? 1 : -1, time);
        }
      }

      // Rides along the rail.
      for (let i = rides.length - 1; i >= 0; i--) {
        const r = rides[i];
        r.t += dt;
        const f = r.f;
        if (!alive(f) || time >= r.until || (r.dir > 0 ? f.x >= X1 : f.x <= X0)) { rides.splice(i, 1); continue; }
        ctx.root(f, 140);
        ctx.nudge(f, r.dir * RIDE_SPEED * dt, (RY - f.y) * Math.min(1, dt * 12));
        const foe = f === player ? npc : player;
        if (!r.struck && alive(foe)) {
          const ahead = (foe.x - f.x) * r.dir;
          if (ahead > 0 && ahead < 70 && Math.abs(foe.y - f.y) < 46) {
            r.struck = true;
            ctx.hit(foe, LANCE_DMG, foe.x, foe.y);
            ctx.stun(foe, 550);
            shove(foe, r.dir * 60, foe.y >= RY ? 70 : -70);
            ctx.float(foe.x, foe.y - 50, 'UNHORSED', '#ff8a7a');
            ctx.sfx('clang');
            r.until = Math.min(r.until, time + 250);
          }
        }
      }

      // The beat of the horses.
      if (time >= nextRun) {
        nextRun = time + EVERY;
        lastLane = (lastLane === 1 ? -1 : 1);
        const dir: -1 | 1 = rng() < 0.5 ? -1 : 1;
        runs.push({ lane: lastLane, dir, warnAt: time, goAt: time + ctx.tk.warn(WARN), x: dir > 0 ? -80 : W + 80, done: false, hit: new Set(), seed: rng() * 6 });
        ctx.sfx('drum-hit');
      }
      for (let i = runs.length - 1; i >= 0; i--) {
        const r = runs[i];
        if (time < r.goAt) continue;
        if (!r.done && time - r.goAt < 40) ctx.sfx('stone-slam');
        r.x += r.dir * HORSE_SPEED * dt;
        const ly = laneY(r.lane);
        for (const f of [player, npc]) {
          if (!alive(f) || r.hit.has(f) || riding(f) || onRail(f)) continue;
          if (Math.abs(f.y - ly) < LANE_HALF + 14 && Math.abs(f.x - r.x) < 44) {
            r.hit.add(f);
            ctx.hit(f, HORSE_DMG, f.x, f.y);
            ctx.stun(f, 300);
            shove(f, r.dir * 40, r.lane * 80);
            ctx.sfx('hit-heavy');
          }
        }
        if (r.x < -140 || r.x > W + 140) runs.splice(i, 1);
      }
    },

    npcSeek() {
      // A run coming: get out of its lane — onto the rail if it is near.
      const now = ctx.scene.time.now;
      for (const r of runs) {
        if (now > r.goAt + 1600) continue;
        const ly = laneY(r.lane);
        if (Math.abs(npc.y - ly) < LANE_HALF + 30) return { x: clamp(npc.x, X0 + 20, X1 - 20), y: RY };
      }
      // Ready to ride: line up on the rail with you.
      if (now >= npcRideReady && Math.abs(player.y - RY) < 90) {
        return { x: clamp(player.x > W / 2 ? player.x - 260 : player.x + 260, X0 + 20, X1 - 20), y: RY };
      }
      return null;
    },

    drawGround(g, time) {
      // The two lanes: churned tan bands, the near edge pegged with little flags.
      for (const lane of [-1, 1] as const) {
        const ly = laneY(lane);
        g.fillStyle(MUD_LIT, 0.25); g.fillRect(0, ly - LANE_HALF, W, LANE_HALF * 2);
        for (let x = 20; x < W; x += 60) { g.fillStyle(0x000000, 0.08); g.fillEllipse(x + ((x * 7) % 20), ly + ((x * 13) % 30) - 15, 10, 4); }
      }
      for (const r of runs) {
        const ly = laneY(r.lane);
        if (time < r.goAt) {
          const k = clamp((time - r.warnAt) / Math.max(1, r.goAt - r.warnAt), 0, 1);
          g.fillStyle(RED, 0.08 + k * 0.22); g.fillRect(0, ly - LANE_HALF, W, LANE_HALF * 2);
          g.lineStyle(2, RED_LIT, 0.3 + k * 0.5); g.strokeRect(2, ly - LANE_HALF, W - 4, LANE_HALF * 2);
          // Chevrons pointing the way the horse will come.
          for (let x = r.dir > 0 ? 40 : W - 40; x > 0 && x < W; x += r.dir * 90) {
            const ox = ((time / 6) % 90) * r.dir;
            g.lineStyle(3, IVORY, 0.25 + k * 0.4);
            g.lineBetween(x + ox - r.dir * 10, ly - 12, x + ox + r.dir * 4, ly); g.lineBetween(x + ox + r.dir * 4, ly, x + ox - r.dir * 10, ly + 12);
          }
          // Dust kicking at the start.
          const sx = r.dir > 0 ? 16 : W - 16;
          for (let i = 0; i < 6; i++) { g.fillStyle(MUD_LIT, 0.4 * k); g.fillCircle(sx + r.dir * ((time / 4 + i * 23) % 60), ly + Math.sin(time / 60 + i) * 18, 6 + i); }
        } else {
          // Hoof-churned wake behind the horse.
          for (let i = 0; i < 8; i++) { const wx = r.x - r.dir * (30 + i * 22); g.fillStyle(MUD_LIT, 0.35 - i * 0.04); g.fillCircle(wx, ly + 10 + Math.sin(i + r.seed) * 12, 7 - i * 0.6); }
        }
      }
      tiltRail(g, X0, X1, RY + 14);
      // A rider on the rail: the horse drawn under them, so the rider sits on top.
      for (const r of rides) horse(g, r.f.x, RY + 20, 0.85, r.dir, time / 60, r.f === player ? RED : 0x2a2632, false);
      // The rail ride's dust.
      for (const r of rides) for (let i = 0; i < 5; i++) { g.fillStyle(MUD_LIT, 0.5 - i * 0.08); g.fillCircle(r.f.x - r.dir * (28 + i * 18), RY + 14 + Math.sin(time / 50 + i) * 6, 8 - i); }
    },

    drawAir(g, time) {
      for (const r of runs) {
        if (time < r.goAt) {
          // The pennant drops before the run.
          const k = clamp((time - r.warnAt) / Math.max(1, r.goAt - r.warnAt), 0, 1);
          const sx = r.dir > 0 ? 30 : W - 30, ly = laneY(r.lane);
          g.lineStyle(2, 0x4c3624, 1); g.lineBetween(sx, ly - LANE_HALF - 4, sx, ly - LANE_HALF - 44);
          g.fillStyle(k > 0.85 ? RED : GILT, 1);
          const fy = ly - LANE_HALF - 44 + k * 30;
          g.fillTriangle(sx, fy, sx, fy + 12, sx + r.dir * 18, fy + 6);
          continue;
        }
        horse(g, r.x, laneY(r.lane) + 18, 0.9, r.dir, time / 70 + r.seed, r.lane > 0 ? RED : 0x2a2632);
      }
      if (npcCallAt >= 0 && alive(npc)) {
        const k = clamp((time - npcCallAt) / 700, 0, 1);
        g.lineStyle(2, RED_LIT, 0.3 + k * 0.5); g.lineBetween(npc.x, RY, player.x, RY);
      }
    },
  };
}

export const TILT_YARD: GimmickDef = {
  id: 'war-tilt-yard',
  rules: 'Horses charge down the lanes either side of the tilt rail on a beat. Dash across the rail to ride it, lance couched: whoever stands on the rail ahead is unhorsed.',
  make,
};
