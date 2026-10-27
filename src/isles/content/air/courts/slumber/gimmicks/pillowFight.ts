import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { FEATHER, LINEN, QUILTS, TICKING, dist, feather, pillow } from '../art';

/**
 * Pillow Fight — Pillowmaker Down's mill yard.
 *
 * Fat goose-down pillows lie about the yard. Walk into one and you punt it: it flies off the way
 * you were going until it hits someone or something, and bursts — a thump that knocks everyone
 * near it back (harder for whoever it hit square), and a drift of feathers left lying where it
 * burst. Inside a feather drift you are cushioned — hits land soft — but you wade through it
 * slowly. Down tosses fresh pillows out of his sack all fight long.
 *
 * The player's play is to line a pillow up with Down and walk through it, or to drop a drift on
 * him so he wades while you shoot. Down plays it the same way: he circles round behind a pillow
 * so that you are the thing on the other side of it, and he dives into a drift when he's hurt.
 */

const MAX_PILLOWS = 5;
const MAX_PILLOWS_HARD = 6;
const START_PILLOWS = 4;
const TOSS_MS = 3200;
const TOSS_FLIGHT_MS = 700;
const KICK_R = 30;
const FLY_SPEED = 470;
const FLY_RANGE = 320;
const HIT_R = 32;
const BURST_R = 84;
const BURST_DAMAGE = 6;
const DIRECT_DAMAGE = 11;
const SHOVE = 90;
const SHOVE_MS = 260;
const DRIFT_R = 88;
const DRIFT_MS = 5200;
const DRIFT_HARD_MS = 6200;
const DRIFT_SPEED = 0.6;
const DRIFT_TAKEN = 0.6;

interface Pillow { x: number; y: number; at: number; color: number; ang: number }
interface Flying { x: number; y: number; vx: number; vy: number; travelled: number; by: Fighter; color: number; spin: number }
interface Toss { from: Pt; to: Pt; at: number; color: number }
interface Drift { x: number; y: number; at: number; dieAt: number; seed: number }
interface Shove { f: Fighter; dx: number; dy: number; until: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const maxPillows = ctx.hard ? MAX_PILLOWS_HARD : MAX_PILLOWS;
  const driftMs = ctx.hard ? DRIFT_HARD_MS : DRIFT_MS;

  let pillows: Pillow[] = [];
  let flying: Flying[] = [];
  let tosses: Toss[] = [];
  let drifts: Drift[] = [];
  let shoves: Shove[] = [];
  const bursts: { x: number; y: number; at: number }[] = [];
  let nextToss = TOSS_MS;
  let announced = false;
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const color = (): number => QUILTS[Math.floor(rng() * QUILTS.length)];

  const spot = (): Pt => {
    let best: Pt = { x: W / 2, y: (H + top) / 2 };
    let bestScore = -Infinity;
    for (let i = 0; i < 12; i++) {
      const p = { x: 80 + rng() * (W - 160), y: top + 60 + rng() * (H - top - 120) };
      const near = Math.min(dist(p.x, p.y, ctx.player.x, ctx.player.y), dist(p.x, p.y, ctx.npc.x, ctx.npc.y));
      const crowd = pillows.reduce((m, q) => Math.min(m, dist(p.x, p.y, q.x, q.y)), 999);
      const score = Math.min(near, 180) + Math.min(crowd, 160) + rng() * 40;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  };
  for (let i = 0; i < START_PILLOWS; i++) { const p = spot(); pillows.push({ x: p.x, y: p.y, at: -9999, color: color(), ang: (rng() - 0.5) * 0.6 }); }

  const inDrift = (f: Fighter): boolean => drifts.some((d) => dist(f.x, f.y, d.x, d.y) < DRIFT_R);

  const burst = (x: number, y: number, direct: Fighter | null, by: Fighter, time: number): void => {
    bursts.push({ x, y, at: time });
    drifts.push({ x, y, at: time, dieAt: time + driftMs, seed: rng() * 10 });
    ctx.sfx('explosion-small');
    for (const f of [ctx.player, ctx.npc]) {
      if (!alive(f)) continue;
      const d = dist(f.x, f.y, x, y);
      if (f !== direct && d > BURST_R) continue;
      const dmg = f === direct ? DIRECT_DAMAGE : BURST_DAMAGE;
      if (f !== by || f === direct) ctx.hit(f, dmg, f.x, f.y);
      const a = Math.atan2(f.y - y, f.x - x);
      const k = f === direct ? 1.4 : 1 - d / (BURST_R * 1.4);
      shoves.push({ f, dx: Math.cos(a) * SHOVE * k, dy: Math.sin(a) * SHOVE * k, until: time + SHOVE_MS });
    }
    if (direct) ctx.float(direct.x, direct.y - 54, direct === ctx.player ? 'WHUMP!' : 'POW! FEATHERS!', direct === ctx.player ? '#ffffff' : '#ffe2a0');
  };

  const kick = (f: Fighter, p: Pillow): void => {
    pillows = pillows.filter((q) => q !== p);
    let a = Math.atan2(p.y - f.y, p.x - f.x);
    if (dist(p.x, p.y, f.x, f.y) < 4) a = Math.atan2((f === ctx.player ? ctx.npc : ctx.player).y - p.y, (f === ctx.player ? ctx.npc : ctx.player).x - p.x);
    flying.push({ x: p.x, y: p.y, vx: Math.cos(a) * FLY_SPEED, vy: Math.sin(a) * FLY_SPEED, travelled: 0, by: f, color: p.color, spin: 0 });
    ctx.sfx('whoosh');
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('PILLOW FIGHT!', '#ffffff'); }

      // Down tosses fresh pillows out of his sack.
      if (time >= nextToss) {
        nextToss = time + TOSS_MS;
        if (pillows.length + tosses.length < maxPillows && alive(ctx.npc)) {
          const to = spot();
          tosses.push({ from: { x: ctx.npc.x, y: ctx.npc.y - 20 }, to, at: time, color: color() });
          ctx.sfx('grenade-throw');
        }
      }
      for (const t of [...tosses]) {
        if (time - t.at >= TOSS_FLIGHT_MS) { tosses = tosses.filter((q) => q !== t); pillows.push({ x: t.to.x, y: t.to.y, at: time, color: t.color, ang: (rng() - 0.5) * 0.6 }); ctx.sfx('land'); }
      }

      // Walk into a pillow and you punt it.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f)) continue;
        for (const p of [...pillows]) {
          if (time - p.at < 300) continue;
          if (dist(f.x, f.y + 6, p.x, p.y) < KICK_R) { kick(f, p); break; }
        }
      }

      // Pillows in flight: hit someone, hit a wall, or run out of puff — then burst.
      for (const fl of [...flying]) {
        fl.x += fl.vx * dt; fl.y += fl.vy * dt; fl.spin += dt * 9;
        fl.travelled += FLY_SPEED * dt;
        const other = fl.by === ctx.player ? ctx.npc : ctx.player;
        let hit: Fighter | null = null;
        if (alive(other) && dist(fl.x, fl.y, other.x, other.y) < HIT_R) hit = other;
        const wall = fl.x < 30 || fl.x > W - 30 || fl.y < top + 10 || fl.y > H - 20;
        if (hit || wall || fl.travelled >= FLY_RANGE) {
          flying = flying.filter((q) => q !== fl);
          burst(Math.max(30, Math.min(W - 30, fl.x)), Math.max(top + 10, Math.min(H - 20, fl.y)), hit, fl.by, time);
        }
      }

      // Shoves: a short positional push over a quarter-second (never a velocity write).
      for (const s of [...shoves]) {
        if (time >= s.until || !alive(s.f)) { shoves = shoves.filter((q) => q !== s); continue; }
        const k = dt / (SHOVE_MS / 1000);
        ctx.nudge(s.f, s.dx * k, s.dy * k);
      }

      drifts = drifts.filter((d) => time < d.dieAt);
      while (bursts.length && time - bursts[0].at > 600) bursts.shift();
    },

    playerSpeedMult: () => (inDrift(ctx.player) ? DRIFT_SPEED : 1),
    npcSpeedMult: () => (inDrift(ctx.npc) ? DRIFT_SPEED : 1),
    playerTakenMult: () => (inDrift(ctx.player) ? DRIFT_TAKEN : 1),
    npcTakenMult: () => (inDrift(ctx.npc) ? DRIFT_TAKEN : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      // Hurt: wade into the nearest drift and be cushioned.
      if (n.hp < n.maxHp * 0.35) {
        const d = drifts.slice().sort((a, b) => dist(n.x, n.y, a.x, a.y) - dist(n.x, n.y, b.x, b.y))[0];
        if (d && dist(n.x, n.y, d.x, d.y) < 380) return { x: d.x, y: d.y };
      }
      // Otherwise get behind a pillow that has the player on the far side of it.
      let best: Pt | null = null, bestCost = Infinity;
      for (const q of pillows) {
        const toP = dist(q.x, q.y, p.x, p.y);
        if (toP > FLY_RANGE + 40) continue;
        const a = Math.atan2(p.y - q.y, p.x - q.x);
        const kickSpot = { x: q.x - Math.cos(a) * 34, y: q.y - Math.sin(a) * 34 - 6 };
        const cost = dist(n.x, n.y, kickSpot.x, kickSpot.y) + toP * 0.4;
        if (cost < bestCost) { bestCost = cost; best = kickSpot; }
      }
      return best && bestCost < 520 ? best : null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // Feather drifts: a heap of down on the floor, thinning as it settles.
      for (const d of drifts) {
        const life = Math.min(1, (d.dieAt - time) / 900) * Math.min(1, (time - d.at) / 200);
        g.fillStyle(FEATHER, 0.22 * life); g.fillCircle(d.x, d.y, DRIFT_R);
        g.fillStyle(LINEN, 0.3 * life); g.fillCircle(d.x, d.y, DRIFT_R * 0.7);
        for (let i = 0; i < 22; i++) {
          const a = d.seed + i * 2.4, r = (i / 22) * DRIFT_R * 0.92;
          feather(g, d.x + Math.cos(a) * r, d.y + Math.sin(a) * r * 0.8, 4 + (i % 3), a + Math.sin(t + i) * 0.2, 0.85 * life);
        }
        g.lineStyle(1.5, FEATHER, 0.5 * life); g.strokeCircle(d.x, d.y, DRIFT_R);
      }
      // Where tossed pillows will land.
      for (const ts of tosses) {
        const k = (time - ts.at) / TOSS_FLIGHT_MS;
        g.fillStyle(0x000000, 0.15 + 0.15 * k); g.fillEllipse(ts.to.x, ts.to.y + 8, 40 * (0.5 + k * 0.5), 12);
      }
      // A faint aim line from each resting pillow to whichever fighter would punt it.
      for (const q of pillows) {
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f)) continue;
          const d = dist(f.x, f.y, q.x, q.y);
          if (d > 110) continue;
          const a = Math.atan2(q.y - f.y, q.x - f.x);
          const k = 1 - d / 110;
          g.lineStyle(2, f === ctx.player ? 0x7ad0ff : 0xff8a6a, 0.3 * k);
          g.lineBetween(q.x, q.y, q.x + Math.cos(a) * FLY_RANGE, q.y + Math.sin(a) * FLY_RANGE);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const q of pillows) {
        const pop = Math.min(1, (time - q.at) / 250);
        pillow(g, q.x, q.y - 6 + Math.sin(t * 2 + q.x) * 0.8, 40 * pop, 24 * pop, FEATHER, 1, q.ang, dim(q.color, 0.1));
      }
      for (const ts of tosses) {
        const k = (time - ts.at) / TOSS_FLIGHT_MS;
        const x = ts.from.x + (ts.to.x - ts.from.x) * k, y = ts.from.y + (ts.to.y - ts.from.y) * k - Math.sin(k * Math.PI) * 90;
        pillow(g, x, y, 36, 22, FEATHER, 1, k * 6, ts.color);
      }
      for (const fl of flying) {
        pillow(g, fl.x, fl.y - 10, 40, 24, FEATHER, 1, fl.spin, fl.color);
        // A wake of loose feathers behind it.
        for (let i = 1; i < 4; i++) feather(g, fl.x - fl.vx * 0.02 * i, fl.y - 10 - fl.vy * 0.02 * i, 3, fl.spin + i, 0.7 - i * 0.15);
      }
      for (const b of bursts) {
        const k = (time - b.at) / 600;
        g.lineStyle(3, LINEN, 0.8 * (1 - k)); g.strokeCircle(b.x, b.y, 20 + k * BURST_R);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + b.at;
          feather(g, b.x + Math.cos(a) * k * 70, b.y - 10 + Math.sin(a) * k * 50 - k * 20, 4, a + k * 5, 1 - k);
        }
        g.fillStyle(TICKING, 0.5 * (1 - k)); g.fillRect(b.x - 10 + k * 30, b.y - 14 - k * 20, 8, 5);
      }
      // Cushioned fighters: a few feathers stuck to them.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f) || !inDrift(f)) continue;
        for (let i = 0; i < 4; i++) feather(g, f.x - 14 + i * 9, f.y - 24 + Math.sin(t * 3 + i) * 3, 3, i + t, 0.85);
      }
    },
  };
}

export const PILLOW_FIGHT: GimmickDef = {
  id: 'slumber-pillow-fight',
  rules: 'Walk into a pillow to punt it — it bursts on whoever it hits, knocking everyone near back. Feather drifts cushion hits but slow you.',
  make,
};
