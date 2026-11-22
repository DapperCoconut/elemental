import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { spool } from '../art';
import { GOLD_THREAD, PLANK, PLANK_DARK, PLANK_LIT, ROPE_DARK, SILK_LIT, SPIDER_GOLD } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Marionette — Puppeteer Gepp.
 *
 * Gepp works the puppet theatre on the south bridge, and he fights from his bridge as well: his
 * crossbars hang over the yard, each with three threads dropping to a hook just above the floor.
 * Walk under a hook and it catches you at the wrists. Then you are a puppet: held, and walked —
 * three jerking steps toward your foe — and dangling there you take blows harder.
 *
 * The bars glide where Gepp sends them, and one always comes looking for you. But a hook does not
 * know whose wrists it has: lead Gepp under one and he is walked to *you*. Every thread runs up to
 * a spool on its bar — strike the spool and the thread is cut, dropping whoever it held.
 */

const CATCH_R = 22;
const STEP_MS = 360;
const STEPS = 3;
const STEP_PX = 44;
const IMMUNE_MS = 1600;
const HANG = 74;

interface Thread { ox: number; oy: number; spool: StrikeTarget | null; cutAt: number }
interface Bar { x: number; y: number; tx: number; ty: number; seed: number; threads: Thread[]; hunting: boolean }
interface Held { bar: Bar; thread: Thread; at: number; steps: number; freeAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const regrowMs = ctx.hard ? 7000 : 9000;
  const bars: Bar[] = [];
  const held = new Map<Fighter, Held>();
  const immuneUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let nextHunt = 0;
  let started = false;

  const hookOf = (b: Bar, t: Thread): Pt => ({ x: b.x + t.ox, y: b.y + t.oy });
  const spoolOf = (b: Bar, t: Thread): Pt => ({ x: b.x + t.ox * 0.55, y: b.y + t.oy - HANG });

  function cut(b: Bar, t: Thread): void {
    if (t.cutAt > 0) return;
    t.cutAt = ctx.scene.time.now;
    t.spool?.remove();
    t.spool = null;
    ctx.sfx('snap-back');
    const s = spoolOf(b, t);
    ctx.float(s.x, s.y - 16, 'CUT', '#f3f4ec');
    for (const [f, h] of held) if (h.thread === t) { held.delete(f); immuneUntil.set(f, ctx.scene.time.now + IMMUNE_MS); }
  }

  function arm(b: Bar, t: Thread): void {
    const s = spoolOf(b, t);
    t.cutAt = 0;
    t.spool = ctx.target({ x: s.x, y: s.y, r: 13, onStruck: () => cut(b, t) });
  }

  function makeBar(x: number, y: number): Bar {
    const b: Bar = {
      x, y, tx: x, ty: y, seed: rng() * 10, hunting: false,
      threads: [{ ox: -58, oy: 0, spool: null, cutAt: 0 }, { ox: 0, oy: 34, spool: null, cutAt: 0 }, { ox: 58, oy: 0, spool: null, cutAt: 0 }],
    };
    for (const t of b.threads) arm(b, t);
    bars.push(b);
    return b;
  }

  const foeOf = (f: Fighter) => (f === player ? npc : player);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextHunt = time + 2500;
        const n = ctx.hard ? 3 : 2;
        for (let i = 0; i < n; i++) makeBar(W * (0.25 + (i * 0.5) / Math.max(1, n - 1)), top + 150 + i * 150);
      }
      // One bar at a time goes looking for you.
      if (time >= nextHunt && alive(player)) {
        nextHunt = time + (ctx.hard ? 4200 : 5200);
        const b = bars.reduce((m, x) => (dist(x.x, x.y, player.x, player.y) < dist(m.x, m.y, player.x, player.y) ? x : m));
        for (const x of bars) x.hunting = false;
        b.hunting = true;
        b.tx = player.x; b.ty = player.y - 14;
        ctx.sfx('chain');
      }
      // Bars glide: the hunter toward its mark, the others on slow loops.
      bars.forEach((b, i) => {
        if (!b.hunting) {
          b.tx = W * (0.25 + 0.5 * i / Math.max(1, bars.length - 1)) + Math.sin(time / 3100 + b.seed) * 200;
          b.ty = top + 180 + (H - top - 300) * (0.5 + 0.5 * Math.sin(time / 2600 + b.seed * 2));
        }
        const d = dist(b.x, b.y, b.tx, b.ty);
        const sp = b.hunting ? 95 : 55;
        if (d > 2) { b.x += ((b.tx - b.x) / d) * Math.min(d, sp * dt); b.y += ((b.ty - b.y) / d) * Math.min(d, sp * dt); }
        b.x = clamp(b.x, 80, W - 80); b.y = clamp(b.y, top + HANG + 20, H - 60);
        if (b.hunting && d < 8) b.hunting = false;
        for (const t of b.threads) {
          if (t.cutAt > 0) { if (time - t.cutAt > regrowMs) arm(b, t); continue; }
          const s = spoolOf(b, t);
          t.spool?.moveTo(s.x, s.y);
        }
      });
      // Hooks catch wrists.
      for (const f of [player, npc]) {
        if (!alive(f) || held.has(f) || time < (immuneUntil.get(f) ?? 0)) continue;
        for (const b of bars) {
          const t = b.threads.find((th) => th.cutAt === 0 && dist(f.x, f.y, hookOf(b, th).x, hookOf(b, th).y) < CATCH_R);
          if (!t) continue;
          held.set(f, { bar: b, thread: t, at: time, steps: 0, freeAt: time + STEP_MS * (STEPS + 1) });
          ctx.root(f, STEP_MS);
          ctx.sfx('chain');
          ctx.float(f.x, f.y - 46, 'PUPPET', '#e2c25c');
          break;
        }
      }
      // The puppet walk: three jerks toward its foe.
      for (const [f, h] of held) {
        if (!alive(f) || time >= h.freeAt) { held.delete(f); immuneUntil.set(f, time + IMMUNE_MS); continue; }
        const due = Math.floor((time - h.at) / STEP_MS);
        if (due > h.steps && h.steps < STEPS) {
          h.steps++;
          const o = foeOf(f);
          const a = Math.atan2(o.y - f.y, o.x - f.x);
          const step = Math.min(STEP_PX, Math.max(0, dist(f.x, f.y, o.x, o.y) - 60));
          ctx.nudge(f, Math.cos(a) * step, Math.sin(a) * step);
          ctx.root(f, STEP_MS);
          ctx.sfx('drum-hit');
          // The bar follows its puppet so the threads stay true.
          h.bar.tx = f.x - h.thread.ox; h.bar.ty = f.y - h.thread.oy;
        }
      }
    },

    playerTakenMult() { return held.has(player) ? 1.3 : 1; },
    npcTakenMult() { return held.has(npc) ? 1.3 : 1; },

    npcSeek() {
      if (!alive(player)) return null;
      // Stand so a live hook lies between you and Gepp: come to him, and you walk under it.
      let best: Pt | null = null;
      let bd = Infinity;
      for (const b of bars) {
        for (const t of b.threads) {
          if (t.cutAt > 0) continue;
          const h = hookOf(b, t);
          const d = dist(h.x, h.y, player.x, player.y);
          if (d < 50 || d > 340 || d >= bd) continue;
          const a = Math.atan2(h.y - player.y, h.x - player.x);
          bd = d;
          best = { x: h.x + Math.cos(a) * 110, y: h.y + Math.sin(a) * 110 };
        }
      }
      let x = best ? best.x : player.x + 240 * Math.sign(npc.x - player.x || 1);
      let y = best ? best.y : npc.y;
      // Keep his own wrists clear.
      for (const b of bars) for (const t of b.threads) {
        if (t.cutAt > 0) continue;
        const h = hookOf(b, t);
        if (dist(h.x, h.y, x, y) < 60) { x += (x - h.x) * 1.2; y += (y - h.y) * 1.2; }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const b of bars) {
        // The bar's shadow and each hook's shadow-ring: where you must not walk.
        g.fillStyle(0x000000, 0.12); g.fillRect(b.x - 70, b.y - 4, 140, 8);
        for (const t of b.threads) {
          if (t.cutAt > 0) continue;
          const h = hookOf(b, t);
          const pulse = b.hunting ? 0.5 + Math.sin(time / 120) * 0.3 : 0.3;
          g.fillStyle(0x000000, 0.2); g.fillEllipse(h.x, h.y + 4, 26, 9);
          g.lineStyle(1.5, GOLD_THREAD, pulse); g.strokeCircle(h.x, h.y, CATCH_R);
        }
        if (b.hunting) { g.lineStyle(1, GOLD_THREAD, 0.4); g.lineBetween(b.x, b.y, b.tx, b.ty); }
      }
    },

    drawAir(g, time) {
      for (const b of bars) {
        const sway = Math.sin(time / 500 + b.seed) * 3;
        const cy = b.y - HANG - 10;
        // The control bar: a wooden cross, the main bar and a cross-piece, a hook to the flies.
        g.lineStyle(1, ROPE_DARK, 0.8); g.lineBetween(b.x, cy - 6, b.x, top);
        g.lineStyle(7, PLANK_DARK, 1); g.lineBetween(b.x - 70 + sway, cy + 1, b.x + 70 + sway, cy + 1);
        g.lineStyle(5, PLANK_LIT, 1); g.lineBetween(b.x - 70 + sway, cy, b.x + 70 + sway, cy);
        g.lineStyle(5, PLANK, 1); g.lineBetween(b.x + sway, cy - 16, b.x + sway, cy + 30);
        g.fillStyle(SPIDER_GOLD, 1); g.fillCircle(b.x + sway, cy, 4);
        for (const t of b.threads) {
          const s = spoolOf(b, t);
          if (t.cutAt > 0) {
            // A cut end curling, and a bud of new thread growing back on the spool.
            const k = clamp((time - t.cutAt) / 600, 0, 1);
            g.lineStyle(1, SILK_LIT, 0.6 * (1 - k)); g.lineBetween(s.x, s.y, s.x + 6, s.y + 30 * (1 - k) + 10);
            const r = clamp((time - t.cutAt) / regrowMs, 0, 1);
            g.lineStyle(1.5, GOLD_THREAD, 0.5); g.beginPath(); g.arc(s.x, s.y - 6, 9, -Math.PI / 2, -Math.PI / 2 + r * Math.PI * 2, false); g.strokePath();
            continue;
          }
          const h = hookOf(b, t);
          g.lineStyle(1.2, SILK_LIT, 0.75); g.lineBetween(s.x + sway, s.y - 8, h.x, h.y - 6);
          spool(g, s.x + sway, s.y + 4, 0.7, GOLD_THREAD);
          // The hook: a little brass crook, glinting.
          g.lineStyle(2, SPIDER_GOLD, 1); g.beginPath(); g.arc(h.x + 3, h.y - 6, 4, Math.PI, Math.PI * 2.4, false); g.strokePath();
          if (b.hunting) glow(g, h.x, h.y - 6, 10, GOLD_THREAD, 0.08, 2);
        }
      }
      // Puppets: threads from the bar to wrists and head, the body jerking.
      for (const [f, h] of held) {
        if (!alive(f)) continue;
        const s = spoolOf(h.bar, h.thread);
        const jerk = Math.max(0, 1 - ((time - h.at) % STEP_MS) / 160);
        for (const [dx, dy] of [[-14, -14], [14, -14], [0, -34]] as [number, number][]) {
          g.lineStyle(1.5, GOLD_THREAD, 0.9); g.lineBetween(s.x + dx * 0.4, s.y, f.x + dx, f.y + dy - jerk * 8);
        }
        g.lineStyle(2, GOLD_THREAD, 0.4 + jerk * 0.4); g.strokeCircle(f.x, f.y - 10, 26 + jerk * 6);
      }
    },
  };
}

export const MARIONETTE: GimmickDef = {
  id: 'web-marionette',
  rules: 'Crossbars hang hooks over the yard. Walk under one and you are caught and walked three steps toward your foe, taking blows harder. Strike a spool to cut its thread.',
  make,
};
