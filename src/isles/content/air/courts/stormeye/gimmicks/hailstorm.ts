import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { Clock, S, SCOL, alive, clamp, dist, drawHailstone, jit, segDist } from '../util';

/**
 * HAILSTORM — Hailwarden Grue.
 *
 * Hail comes down on Grue's yard in volleys. Each fall is announced by its shadow — a dark patch on
 * the setts that grows and sharpens — and in its last moment you can see the stones dropping into
 * it. Whoever is inside when it lands is pelted.
 *
 * What lands, heaps. A hail mound stands where every fall landed (a fall on an old mound piles it
 * higher), and a mound is two things at once:
 * • **Cover.** A blow that has to pass through a mound to reach you is mostly soaked by it — if the
 *   line between the fighters crosses a heap, the one behind it takes far less.
 * • **Ice.** Step onto one and you skid: your feet keep going the way they were going, and stopping
 *   or turning on it is a fight.
 * Mounds melt, shrinking to slush and then nothing, so the cover keeps moving.
 *
 * Grue has hidden behind heaps his whole life. He will try to keep one between you; walk round it,
 * or make him slide off it.
 */

type Side = 'player' | 'npc';

interface Patch { x: number; y: number; r: number; at: number; landAt: number; landed: boolean; seed: number }
interface Mound { x: number; y: number; r: number; born: number; dieAt: number; seed: number }
interface Slide { lx: number; ly: number; mx: number; my: number; init: boolean; on: boolean }

const MOUND_LIFE = 9500;
const MOUND_MAX_R = 58;
const COVER_MULT = 0.4;

export const HAILSTORM: GimmickDef = {
  id: 'stormeye-hailstorm',
  rules: 'Hail falls on growing shadows — get out from under them. Every fall heaps into a mound: a hit that passes through a mound is mostly soaked, but standing on one you skid. Mounds melt away.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    let now = 0;
    let nextVolley = -1;
    let patches: Patch[] = [];
    let mounds: Mound[] = [];
    const slides: Record<Side, Slide> = {
      player: { lx: 0, ly: 0, mx: 0, my: 0, init: false, on: false },
      npc: { lx: 0, ly: 0, mx: 0, my: 0, init: false, on: false },
    };
    const every = ctx.hard ? 1300 : 1700;
    const warn = ctx.tk.warn(1400);
    const dmg = ctx.hard ? 11 : 9;
    let lastCover: { side: Side; m: Mound; at: number } | null = null;

    const fall = (x: number, y: number): void => {
      const r = 42 + rng() * 18;
      patches.push({
        x: clamp(x, 80, W - 80), y: clamp(y, top + 50, H - 40), r, at: now, landAt: now + warn, landed: false, seed: rng() * 100,
      });
    };

    const volley = (): void => {
      const p = ctx.player, n = ctx.npc;
      if (alive(p)) fall(p.x + (rng() - 0.5) * 120, p.y + (rng() - 0.5) * 80);
      if (alive(n)) fall(n.x + (rng() - 0.5) * 140, n.y + (rng() - 0.5) * 90);
      fall(100 + rng() * (W - 200), top + 60 + rng() * (H - top - 110));
      if (ctx.hard && rng() < 0.5) fall(100 + rng() * (W - 200), top + 60 + rng() * (H - top - 110));
      ctx.sfx('ice-shard');
    };

    const land = (pt: Patch): void => {
      pt.landed = true;
      for (const s of ['player', 'npc'] as Side[]) {
        const f = fighterOf(s);
        if (alive(f) && dist(f.x, f.y, pt.x, pt.y) < pt.r) {
          ctx.hit(f, dmg, f.x, f.y);
          ctx.sfx('hit-light');
        }
      }
      ctx.sfx('frost-blast');
      // Heap: on top of an old mound it piles higher, otherwise a fresh mound.
      const old = mounds.find((m) => dist(m.x, m.y, pt.x, pt.y) < m.r + pt.r * 0.5);
      if (old) {
        old.r = Math.min(MOUND_MAX_R, old.r + 10);
        old.x = (old.x * 2 + pt.x) / 3; old.y = (old.y * 2 + pt.y) / 3;
        old.dieAt = now + MOUND_LIFE;
      } else {
        mounds.push({ x: pt.x, y: pt.y, r: pt.r * 0.62, born: now, dieAt: now + MOUND_LIFE, seed: pt.seed });
        if (mounds.length > 8) mounds.shift();
      }
    };

    const moundR = (m: Mound): number => {
      const left = m.dieAt - now;
      return left < 3000 ? m.r * Math.max(0.2, left / 3000) : m.r;
    };

    /** A mound standing between the attacker and the defender (and neither is on it). */
    const coverFor = (defender: Side): Mound | null => {
      const d = fighterOf(defender), a = fighterOf(defender === 'player' ? 'npc' : 'player');
      if (!alive(d) || !alive(a)) return null;
      for (const m of mounds) {
        const r = moundR(m);
        if (r < 14) continue;
        if (dist(d.x, d.y, m.x, m.y) < r || dist(a.x, a.y, m.x, m.y) < r) continue;
        if (segDist(m.x, m.y, a.x, a.y, d.x, d.y) < r * 0.85) return m;
      }
      return null;
    };

    const taken = (s: Side): number => {
      const m = coverFor(s);
      return m ? COVER_MULT : 1;
    };

    const onHurt = (s: Side): void => {
      const m = coverFor(s);
      if (!m) return;
      if (!lastCover || now - lastCover.at > 700) {
        const f = fighterOf(s);
        ctx.float(m.x, m.y - 40, s === 'player' ? 'THE HEAP TOOK IT' : 'GRUE BEHIND THE HEAP', s === 'player' ? SCOL.ice : SCOL.red);
        ctx.sfx('ice-shatter');
        void f;
      }
      lastCover = { side: s, m, at: now };
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextVolley < 0) nextVolley = time + 1600;
        if (dt === 0) return;
        if (time >= nextVolley) { volley(); nextVolley = time + every; }
        for (const pt of patches) if (!pt.landed && time >= pt.landAt) land(pt);
        patches = patches.filter((pt) => !pt.landed || time - pt.landAt < 500);
        mounds = mounds.filter((m) => time < m.dieAt);

        // Skidding: on a mound your own motion carries on after you, and only fades off it.
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighterOf(s);
          const sl = slides[s];
          if (!alive(f)) { sl.init = false; continue; }
          if (!sl.init) { sl.lx = f.x; sl.ly = f.y; sl.init = true; continue; }
          const vx = (f.x - sl.lx) / dt, vy = (f.y - sl.ly) / dt;
          sl.on = mounds.some((m) => dist(f.x, f.y, m.x, m.y) < moundR(m));
          if (sl.on) {
            sl.mx = sl.mx * Math.pow(0.4, dt) + vx * (1 - Math.pow(0.4, dt));
            sl.my = sl.my * Math.pow(0.4, dt) + vy * (1 - Math.pow(0.4, dt));
          } else {
            sl.mx *= Math.pow(0.02, dt); sl.my *= Math.pow(0.02, dt);
          }
          const sp = Math.hypot(sl.mx, sl.my);
          if (sp > 260) { sl.mx *= 260 / sp; sl.my *= 260 / sp; }
          if (sp > 8) ctx.nudge(f, sl.mx * dt * 0.75, sl.my * dt * 0.75);
          // Measure next frame's own motion from after the slide.
          sl.lx = f.x; sl.ly = f.y;
        }
      },

      playerTakenMult: () => taken('player'),
      npcTakenMult: () => taken('npc'),
      onPlayerHurt() { onHurt('player'); },
      onNpcHurt() { onHurt('npc'); },

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // First, out from under a falling patch.
        for (const pt of patches) {
          if (pt.landed || dist(n.x, n.y, pt.x, pt.y) > pt.r + 10) continue;
          const a = Math.atan2(n.y - pt.y, n.x - pt.x);
          return { x: clamp(pt.x + Math.cos(a) * (pt.r + 50), 60, W - 60), y: clamp(pt.y + Math.sin(a) * (pt.r + 50), top + 40, H - 40) };
        }
        // Then into the lee of the nearest decent heap.
        let best: Mound | null = null, bd = Infinity;
        for (const m of mounds) {
          if (moundR(m) < 22) continue;
          const d = dist(n.x, n.y, m.x, m.y);
          if (d < bd && d < 320) { bd = d; best = m; }
        }
        if (!best) return null;
        const a = Math.atan2(best.y - p.y, best.x - p.x);
        const r = moundR(best) + 26;
        return { x: clamp(best.x + Math.cos(a) * r, 60, W - 60), y: clamp(best.y + Math.sin(a) * r, top + 40, H - 40) };
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Meltwater round every mound, wider as it goes.
        for (const m of mounds) {
          const r = moundR(m);
          const melt = 1 - clamp((m.dieAt - time) / MOUND_LIFE, 0, 1);
          g.fillStyle(S.puddle, 0.5); g.fillEllipse(m.x, m.y + 4, (r + 10 + melt * 30) * 2, (r + 10 + melt * 30) * 0.8);
          g.fillStyle(S.puddleLit, 0.2); g.fillEllipse(m.x - r * 0.3, m.y + 2, r * 0.9, r * 0.2);
        }
        // Shadows of falls to come: darker and crisper as they near, a ring closing to the rim.
        for (const pt of patches) {
          if (pt.landed) {
            const f = 1 - (time - pt.landAt) / 500;
            g.lineStyle(3, S.hail, f); g.strokeEllipse(pt.x, pt.y, pt.r * 2 * (1.1 - f * 0.1) + 20, pt.r * 1.2 + 10);
            continue;
          }
          const k = clamp((time - pt.at) / (pt.landAt - pt.at), 0, 1);
          g.fillStyle(0x0a0e16, 0.12 + k * 0.32); g.fillEllipse(pt.x, pt.y, pt.r * 2, pt.r * 1.2);
          g.lineStyle(2, S.hailShade, 0.4 + k * 0.5); g.strokeEllipse(pt.x, pt.y, pt.r * 2, pt.r * 1.2);
          g.lineStyle(1.5, S.hail, 0.5); g.strokeEllipse(pt.x, pt.y, pt.r * 2 * (1.8 - k * 0.8), pt.r * 1.2 * (1.8 - k * 0.8));
          if (k > 0.82 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.5); g.strokeEllipse(pt.x, pt.y, pt.r * 2 + 4, pt.r * 1.2 + 4); }
        }
        // The line of cover, while a heap is soaking: a pale frost streak from the heap to its sheltered side.
        if (lastCover && time - lastCover.at < 400) {
          const f = fighterOf(lastCover.side);
          const a = 1 - (time - lastCover.at) / 400;
          g.lineStyle(6, S.hail, 0.3 * a); g.lineBetween(lastCover.m.x, lastCover.m.y, f.x, f.y);
        }
        // Skid marks under anyone sliding.
        for (const s of ['player', 'npc'] as Side[]) {
          const sl = slides[s], f = fighterOf(s);
          if (!sl.on || !alive(f) || Math.hypot(sl.mx, sl.my) < 40) continue;
          const a = Math.atan2(sl.my, sl.mx);
          for (const o of [-8, 8]) {
            g.lineStyle(2, 0xffffff, 0.5);
            g.lineBetween(f.x - Math.sin(a) * o, f.y + 18 + Math.cos(a) * o * 0.4, f.x - Math.sin(a) * o - Math.cos(a) * 30, f.y + 18 + Math.cos(a) * o * 0.4 - Math.sin(a) * 12);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // Hail dropping into its shadow in the last stretch of the warning.
        for (const pt of patches) {
          if (pt.landed) {
            // Bouncing stones scattering off the landing.
            const k = (time - pt.landAt) / 500;
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + jit(pt.seed, i);
              const d = pt.r * (0.3 + k * 0.9) * (0.6 + jit(pt.seed, i + 8) * 0.6);
              drawHailstone(g, pt.x + Math.cos(a) * d, pt.y + Math.sin(a) * d * 0.6 - Math.sin(k * Math.PI) * 14, 2.6, 1 - k);
            }
            continue;
          }
          const k = clamp((time - pt.at) / (pt.landAt - pt.at), 0, 1);
          if (k < 0.55) continue;
          const drop = (k - 0.55) / 0.45;
          for (let i = 0; i < 10; i++) {
            const ox = (jit(pt.seed, i) - 0.5) * pt.r * 1.6, oy = (jit(pt.seed, i + 20) - 0.5) * pt.r;
            const lag = jit(pt.seed, i + 40) * 0.3;
            const u = clamp((drop - lag) / (1 - lag), 0, 1);
            if (u <= 0) continue;
            const y = pt.y + oy - (1 - u) * 300;
            g.lineStyle(1, S.hail, 0.4); g.lineBetween(pt.x + ox - 3, y - 18, pt.x + ox, y);
            drawHailstone(g, pt.x + ox, y, 3.5, 0.95);
          }
        }
        // Mounds: heaped white stones, shading blue at the foot, sinking as they melt.
        for (const m of mounds) {
          const r = moundR(m);
          const n = Math.floor(r * 0.9);
          g.fillStyle(S.hailShade, 0.95); g.fillEllipse(m.x, m.y, r * 2, r * 0.9);
          g.fillStyle(S.hail, 0.95); g.fillEllipse(m.x - r * 0.08, m.y - r * 0.22, r * 1.6, r * 0.75);
          for (let i = 0; i < n; i++) {
            const a = jit(m.seed, i) * Math.PI * 2, d = Math.sqrt(jit(m.seed, i + 50)) * r * 0.85;
            const x = m.x + Math.cos(a) * d, y = m.y + Math.sin(a) * d * 0.42 - (1 - d / r) * r * 0.45;
            drawHailstone(g, x, y, 3 + jit(m.seed, i + 90) * 2.5, 1);
          }
          if (Math.floor(time / 300 + m.seed) % 5 === 0) { g.fillStyle(0xffffff, 0.9); g.fillCircle(m.x - r * 0.3, m.y - r * 0.5, 2.2); }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics) {
        // Frost creeping in at the screen's corners.
        for (const [x, y] of [[0, top], [W, top], [0, H], [W, H]] as [number, number][]) {
          g.fillStyle(S.hail, 0.08); g.fillCircle(x, y, 110);
          g.fillStyle(S.hail, 0.06); g.fillCircle(x, y, 70);
        }
      },
    };
  },
};
