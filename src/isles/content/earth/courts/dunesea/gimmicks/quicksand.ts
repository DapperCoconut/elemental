import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { quicksand, sinkCollar } from '../art';
import { FLOW_DARK, FLOW_LIT, SAND_PALE, STONE_LIT, TIMBER_DARK } from '../palette';
import { Gait, alive, clamp, dist, stepDt } from '../util';

/**
 * Quicksand — Sinker Ammon.
 *
 * Pools of quicksand drift across the floor and slowly spread. Inside one you sink, and the deeper
 * you are the slower you go — standing still sinks you fastest of all bar one thing: *dashing*,
 * which drives you down in a gulp. Walk out steadily and you come free; out of the sand you rise
 * again. Sink to the chest and you are held fast, the grave-sand squeezing, and hit harder until
 * it lets you go.
 *
 * Ammon calls the sand. Every few seconds the pool nearest you lurches toward you (an arrow of
 * ripples shows the way it will come). It takes whoever it reaches — Ammon included, if he has
 * come close to finish you.
 */

const MOVE_SINK = 20;
const STILL_SINK = 27;
const DASH_SINK = 95;
const RISE = 32;
const HELD_MS = 1600;

interface Pool { x: number; y: number; r: number; max: number; vx: number; vy: number; seed: number; callAt: number; lurchAt: number; lurchUntil: number; la: number }
interface Sink { v: number; heldAt: number; heldUntil: number; lastTick: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const pools: Pool[] = [];
  const sinks = new Map<Fighter, Sink>([[player, { v: 0, heldAt: -9999, heldUntil: 0, lastTick: 0 }], [npc, { v: 0, heldAt: -9999, heldUntil: 0, lastTick: 0 }]]);
  const gaits = new Map<Fighter, Gait>([[player, new Gait(player)], [npc, new Gait(npc)]]);
  const n = ctx.hard ? 4 : 3;
  const callEvery = ctx.hard ? 5600 : 7000;
  const CALL_WARN = 950;
  let nextCall = 0;
  let started = false;
  let wrecks: { x: number; y: number; kind: number; seed: number }[] = [];

  const inside = (p: Pool, x: number, y: number) => {
    const dx = (x - p.x) / p.r, dy = (y - p.y) / (p.r * 0.75);
    return dx * dx + dy * dy < 1;
  };
  const poolOf = (f: Fighter) => pools.find((p) => inside(p, f.x, f.y + 10));

  function place(i: number): Pool {
    const x = W * (0.22 + (i / Math.max(1, n - 1)) * 0.56) + (rng() - 0.5) * 80;
    const y = top + 90 + rng() * (H - top - 170);
    const a = rng() * Math.PI * 2;
    return { x, y, r: 50, max: 84 + rng() * 22, vx: Math.cos(a) * 22, vy: Math.sin(a) * 18, seed: rng() * 10, callAt: 0, lurchAt: 0, lurchUntil: 0, la: 0 };
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < n; i++) pools.push(place(i));
        // Don't open a pool under anyone's feet.
        for (const p of pools) for (const f of [player, npc]) if (dist(p.x, p.y, f.x, f.y) < 130) p.y = clamp(p.y + (p.y < f.y ? -140 : 140), top + 80, H - 70);
        wrecks = pools.map((p, i) => ({ x: p.x, y: p.y, kind: i % 3, seed: p.seed }));
        nextCall = time + 4500;
      }

      // Ammon calls the pool nearest you.
      if (time >= nextCall && alive(npc) && alive(player)) {
        nextCall = time + callEvery;
        const p = pools.reduce((b, q) => (dist(q.x, q.y, player.x, player.y) < dist(b.x, b.y, player.x, player.y) ? q : b), pools[0]);
        p.callAt = time;
        p.lurchAt = time + ctx.tk.warn(CALL_WARN);
        p.lurchUntil = p.lurchAt + 1200;
        p.la = Math.atan2(player.y - p.y, player.x - p.x);
        ctx.banner('AMMON CALLS THE SAND', '#d8b07a');
        ctx.sfx('curse-cast');
      }

      for (const p of pools) {
        p.r = Math.min(p.max, p.r + 3 * dt);
        if (time >= p.lurchAt && time < p.lurchUntil) {
          p.x += Math.cos(p.la) * 160 * dt; p.y += Math.sin(p.la) * 160 * dt;
        } else if (time < p.lurchAt) {
          // Called: the pool gathers itself, aim still tracking you.
          if (alive(player)) p.la = Math.atan2(player.y - p.y, player.x - p.x);
        } else {
          p.x += p.vx * dt; p.y += p.vy * dt;
        }
        if (p.x < p.r * 0.7 || p.x > W - p.r * 0.7) { p.vx = -p.vx; p.x = clamp(p.x, p.r * 0.7, W - p.r * 0.7); }
        if (p.y < top + p.r * 0.5 || p.y > H - p.r * 0.4) { p.vy = -p.vy; p.y = clamp(p.y, top + p.r * 0.5, H - p.r * 0.4); }
      }
      // Pools that meet push apart.
      for (let i = 0; i < pools.length; i++) for (let j = i + 1; j < pools.length; j++) {
        const a = pools[i], b = pools[j];
        const d = dist(a.x, a.y, b.x, b.y), m = (a.r + b.r) * 0.8;
        if (d < m && d > 0) { const k = (m - d) / d * 0.5; a.x -= (b.x - a.x) * k * dt * 4; a.y -= (b.y - a.y) * k * dt * 4; b.x += (b.x - a.x) * k * dt * 4; b.y += (b.y - a.y) * k * dt * 4; }
      }

      for (const [f, s] of sinks) {
        const sp = gaits.get(f)?.step(dt) ?? 0;
        if (!alive(f)) continue;
        if (time < s.heldUntil) {
          if (time - s.lastTick > 500) { s.lastTick = time; ctx.hit(f, ctx.hard ? 5 : 4, f.x, f.y); }
          continue;
        }
        const p = poolOf(f);
        if (p) {
          const rate = sp > 270 ? DASH_SINK : sp > 25 ? MOVE_SINK : STILL_SINK;
          s.v = clamp(s.v + rate * dt, 0, 100);
          if (s.v >= 100) {
            s.heldAt = time;
            s.heldUntil = time + HELD_MS;
            s.v = 62;
            ctx.root(f, HELD_MS);
            ctx.float(f.x, f.y - 46, 'SUNK TO THE CHEST', '#d8b07a');
            ctx.sfx('status-slow');
          }
        } else s.v = clamp(s.v - RISE * dt, 0, 100);
      }
    },

    playerSpeedMult() { return 1 - (sinks.get(player)?.v ?? 0) * 0.0062; },
    npcSpeedMult() { return 1 - (sinks.get(npc)?.v ?? 0) * 0.0062; },
    playerTakenMult() { return ctx.scene.time.now < (sinks.get(player)?.heldUntil ?? 0) ? 1.35 : 1; },
    npcTakenMult() { return ctx.scene.time.now < (sinks.get(npc)?.heldUntil ?? 0) ? 1.35 : 1; },

    npcSeek() {
      // Stand off the player, never in sand; drift in close only while the player is held.
      const held = ctx.scene.time.now < (sinks.get(player)?.heldUntil ?? 0);
      const r = held ? 110 : 230;
      let best: Pt | null = null;
      let bs = -Infinity;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * r, 60, W - 60), y = clamp(player.y + Math.sin(a) * r * 0.8, top + 50, H - 40);
        const clear = pools.reduce((m, p) => Math.min(m, dist(p.x, p.y, x, y) - p.r), 999);
        const s = Math.min(clear, 120) - dist(x, y, npc.x, npc.y) * 0.15;
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const p of pools) {
        const called = p.callAt > 0 && time < p.lurchUntil;
        quicksand(g, p.x, p.y, p.r, t, p.seed, called ? 1 : 0);
        if (called && time < p.lurchAt) {
          // The way it will come: an arrow of ripples toward its target.
          const k = clamp((time - p.callAt) / Math.max(1, p.lurchAt - p.callAt), 0, 1);
          for (let i = 1; i <= 5; i++) {
            const d = p.r * 0.6 + i * 34;
            const x = p.x + Math.cos(p.la) * d, y = p.y + Math.sin(p.la) * d * 0.9;
            g.lineStyle(2.5, FLOW_DARK, (0.25 + k * 0.6) * (1 - i / 7));
            const wa = p.la + Math.PI / 2;
            g.lineBetween(x - Math.cos(wa) * 14, y - Math.sin(wa) * 10, x + Math.cos(p.la) * 10, y + Math.sin(p.la) * 8);
            g.lineBetween(x + Math.cos(wa) * 14, y + Math.sin(wa) * 10, x + Math.cos(p.la) * 10, y + Math.sin(p.la) * 8);
          }
        }
      }
      // What the sand has taken: a hilt, a skull, a ship's lantern, slowly going round and under.
      wrecks.forEach((w, i) => {
        const p = pools[i];
        if (!p) return;
        const a = t * 0.6 + w.seed;
        const x = p.x + Math.cos(a) * p.r * 0.4, y = p.y + Math.sin(a) * p.r * 0.25;
        if (w.kind === 0) { g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x, y, x + 4, y - 14); g.lineStyle(2, 0xa8a8b0, 1); g.lineBetween(x - 6, y - 4, x + 8, y - 6); }
        else if (w.kind === 1) { g.fillStyle(STONE_LIT, 1); g.fillCircle(x, y - 4, 6); g.fillStyle(0x2a1a14, 1); g.fillCircle(x - 2, y - 5, 1.6); g.fillCircle(x + 2, y - 5, 1.6); }
        else { g.fillStyle(0x7a5620, 1); g.fillRect(x - 4, y - 10, 8, 10); g.fillStyle(0xffd070, 0.6); g.fillRect(x - 2, y - 8, 4, 5); }
      });
    },

    drawAir(g, time) {
      for (const [f, s] of sinks) {
        if (!alive(f) || s.v < 4) continue;
        sinkCollar(g, f.x, f.y, s.v / 100);
        if (time < s.heldUntil) {
          // Held: the sand squeezing — rings tightening round them.
          const k = ((time - s.heldAt) % 500) / 500;
          g.lineStyle(2, FLOW_LIT, 0.6 * (1 - k)); g.strokeEllipse(f.x, f.y + 8, 70 - k * 30, 26 - k * 10);
        }
        // Grains pattering off a struggling fighter.
        if (s.v > 40) for (let i = 0; i < 3; i++) { const ph = (time / 260 + i / 3) % 1; g.fillStyle(SAND_PALE, 0.6 * (1 - ph)); g.fillCircle(f.x - 14 + i * 14, f.y - 10 + ph * 14, 1.6); }
      }
    },

    drawHud(g) {
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const s = sinks.get(f);
        if (!s) continue;
        // A depth gauge: a little figure going under.
        const x0 = d > 0 ? x : x - 14, y0 = top + 6;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 3, y0 - 3, 20, 46, 5);
        g.fillStyle(0xf0e2c4, 1); g.fillCircle(x0 + 7, y0 + 6, 4); g.fillRect(x0 + 4, y0 + 10, 6, 14); g.fillRect(x0 + 4, y0 + 24, 2, 12); g.fillRect(x0 + 8, y0 + 24, 2, 12);
        const lvl = (s.v / 100) * 38;
        g.fillStyle(0xa8783c, 0.92); g.fillRect(x0 - 1, y0 + 38 - lvl, 16, lvl);
        g.lineStyle(1, FLOW_LIT, 1); g.lineBetween(x0 - 1, y0 + 38 - lvl, x0 + 15, y0 + 38 - lvl);
      }
    },
  };
}

export const QUICKSAND: GimmickDef = {
  id: 'dunesea-quicksand',
  rules: 'Quicksand pools drift and spread. Inside, you sink and slow — standing still or dashing sinks you faster. Ammon calls the nearest pool at you.',
  make,
};
