import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Side } from './shared';
import { fighterOf, live, PAD, SIDES } from './shared';
import { CSS_SKY, CSS_VERD, LAMPLIGHT, SKY_PALE, STONE_LIT, VERD, VERD_LIT, WHITE } from '../palette';
import { dashedEllipse, pebble } from '../orbitArt';

/**
 * Zero-G — Spacer Lofty's fight.
 *
 * Three rings are marked out on the yard in verdigris paint, and in turn each one *forgets
 * gravity*. A ring warns first — its rim flickers and the loose grit inside starts to lift — then
 * switches on. Step into a live ring and your feet find nothing to push on: you keep the speed
 * and heading you came in with and **drift**, steering only feebly, until you sail out the far
 * side. Hit the yard's wall while drifting and you bounce off it, and it stings.
 *
 * Drifting bodies carry their momentum into whatever they meet: sail into the other fighter at
 * speed and you **crash** into them — they take the hit, and if they are in a live ring too they
 * take your momentum and go sailing off. Lofty is a rubber man and loves it; he waits for you to
 * float helpless, then launches himself across the ring at you. Come in fast and from the side,
 * and you can bowl him into the wall instead.
 */

const ZONE_R = 118;
const OFF_MS = 3600;
const WARN_MS = 1300;
const CRASH_R = 46;

interface Zone { x: number; y: number; offset: number; seed: number }
interface Drift { on: boolean; vx: number; vy: number; zone: number; lastX: number; lastY: number; wallAt: number; crashAt: number; spin: number }

export const ZERO_G: GimmickDef = {
  id: 'orbit-zero-g',
  rules: 'Marked rings lose their gravity in turn. Enter a live ring and you drift with your momentum, bouncing off walls. Crash into the foe to hit them.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const onMs = hard ? 7000 : 6000;
    const cycle = OFF_MS + WARN_MS + onMs;
    const wallDmg = hard ? 7 : 5;
    const midY = (top + H) / 2 + 8;
    const zones: Zone[] = [
      { x: W * 0.25, y: midY - 105, offset: 0, seed: 1 },
      { x: W * 0.75, y: midY - 105, offset: cycle / 3, seed: 5 },
      { x: W * 0.5, y: midY + 120, offset: (cycle * 2) / 3, seed: 9 },
    ];
    const t0 = ctx.scene.time.now;
    const state: Record<Side, Drift> = {
      p: { on: false, vx: 0, vy: 0, zone: -1, lastX: ctx.player.x, lastY: ctx.player.y, wallAt: 0, crashAt: 0, spin: 0 },
      n: { on: false, vx: 0, vy: 0, zone: -1, lastX: ctx.npc.x, lastY: ctx.npc.y, wallAt: 0, crashAt: 0, spin: 0 },
    };
    const pops: { x: number; y: number; at: number; big: boolean }[] = [];

    /** 0 off, 1 warning, 2 live — and how far into that state (0–1). */
    const phaseOf = (z: Zone, time: number): { s: 0 | 1 | 2; k: number } => {
      const t = (((time - t0 + z.offset) % cycle) + cycle) % cycle;
      if (t < OFF_MS) return { s: 0, k: t / OFF_MS };
      if (t < OFF_MS + WARN_MS) return { s: 1, k: (t - OFF_MS) / WARN_MS };
      return { s: 2, k: (t - OFF_MS - WARN_MS) / onMs };
    };
    const liveZoneAt = (x: number, y: number, time: number): number => {
      for (let i = 0; i < zones.length; i++) {
        if (phaseOf(zones[i], time).s === 2 && Math.hypot(x - zones[i].x, y - zones[i].y) < ZONE_R) return i;
      }
      return -1;
    };

    return {
      update(time, dt) {
        const step = Math.max(0.001, dt);
        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          const d = state[k];
          // Velocity as the fighter actually moved since last frame (their own legs + anything else).
          const mvx = (f.x - d.lastX) / step, mvy = (f.y - d.lastY) / step;
          if (!live(f)) { d.on = false; d.lastX = f.x; d.lastY = f.y; continue; }
          const z = liveZoneAt(f.x, f.y, time);
          if (!d.on && z >= 0) {
            // Into a live ring: keep what you came in with, never less than a drift.
            d.on = true; d.zone = z;
            let vx = mvx, vy = mvy;
            const sp = Math.hypot(vx, vy);
            if (sp < 1) { const a = Math.atan2(f.y - zones[z].y, f.x - zones[z].x) + Math.PI; vx = Math.cos(a); vy = Math.sin(a); }
            const want = Phaser.Math.Clamp(Math.max(sp, 150), 150, 290);
            const sl = Math.hypot(vx, vy) || 1;
            d.vx = (vx / sl) * want; d.vy = (vy / sl) * want;
            ctx.sfx('whoosh');
            if (k === 'p') ctx.float(f.x, f.y - 46, 'ZERO-G', CSS_SKY);
          } else if (d.on && z < 0) {
            // Out the far side, or the ring switched off under you: feet back on the ground.
            d.on = false;
            ctx.sfx('land');
            pops.push({ x: f.x, y: f.y + 14, at: time, big: false });
          }
          if (d.on) {
            // Feeble steering: a little of whatever the legs try adds to the drift.
            const legsX = mvx - d.vx, legsY = mvy - d.vy;
            d.vx += Phaser.Math.Clamp(legsX, -200, 200) * 0.5 * step;
            d.vy += Phaser.Math.Clamp(legsY, -200, 200) * 0.5 * step;
            let nx = d.vx * step, ny = d.vy * step;
            // The yard's walls: bounce, and it stings.
            const tx = f.x + nx, ty = f.y + ny;
            let bounced = false;
            if (tx < PAD || tx > W - PAD) { d.vx = -d.vx * 0.92; nx = -nx; bounced = true; }
            if (ty < top + PAD * 0.6 || ty > H - PAD) { d.vy = -d.vy * 0.92; ny = -ny; bounced = true; }
            if (bounced && time - d.wallAt > 380) {
              d.wallAt = time;
              ctx.hit(f, wallDmg, f.x, f.y);
              ctx.sfx('boing');
              pops.push({ x: f.x, y: f.y, at: time, big: true });
            }
            ctx.nudge(f, nx, ny);
            d.spin += step * Math.hypot(d.vx, d.vy) / 30;
            // Crashing into the other fighter.
            const ok: Side = k === 'p' ? 'n' : 'p';
            const o = fighterOf(ctx, ok);
            const sp = Math.hypot(d.vx, d.vy);
            if (live(o) && sp > 110 && time - d.crashAt > 700 && Math.hypot(o.x - f.x, o.y - f.y) < CRASH_R) {
              d.crashAt = time;
              const od = state[ok];
              const dmg = Math.round((hard ? 9 : 7) + sp / 28);
              ctx.hit(o, dmg, o.x, o.y);
              ctx.sfx('hit-heavy');
              pops.push({ x: (o.x + f.x) / 2, y: (o.y + f.y) / 2, at: time, big: true });
              if (liveZoneAt(o.x, o.y, time) >= 0) {
                // Momentum handed over: they go sailing, you all but stop.
                od.on = true; od.zone = liveZoneAt(o.x, o.y, time);
                od.vx = d.vx * 0.85; od.vy = d.vy * 0.85;
                d.vx *= 0.25; d.vy *= 0.25;
              } else {
                ctx.nudge(o, (d.vx / sp) * 60, (d.vy / sp) * 60);
                d.vx *= 0.4; d.vy *= 0.4;
              }
              ctx.float(o.x, o.y - 48, k === 'p' ? 'CRASH!' : 'LOFTY CANNONBALLS', k === 'p' ? CSS_VERD : CSS_SKY);
            }
          }
          d.lastX = f.x; d.lastY = f.y;
        }
        while (pops.length && time - pops[0].at > 520) pops.shift();
      },

      // In a live ring your legs barely grip.
      playerSpeedMult: () => (state.p.on ? 0.3 : 1),
      npcSpeedMult: () => (state.n.on ? 0.3 : 1),

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const t = ctx.scene.time.now;
        if (state.n.on) return null;
        // You are floating: he launches himself straight at you, into your ring.
        if (state.p.on) return { x: p.x, y: p.y };
        // A ring is about to go live under him while you stand clear of it: get out first.
        for (const z of zones) {
          const ph = phaseOf(z, t);
          if (ph.s === 1 && Math.hypot(n.x - z.x, n.y - z.y) < ZONE_R + 10 && Math.hypot(p.x - z.x, p.y - z.y) > ZONE_R) {
            const a = Math.atan2(n.y - z.y, n.x - z.x);
            return { x: z.x + Math.cos(a) * (ZONE_R + 60), y: z.y + Math.sin(a) * (ZONE_R + 60) };
          }
        }
        return null;
      },

      drawGround(g, time) {
        const sec = time / 1000;
        for (const z of zones) {
          const ph = phaseOf(z, time);
          // The painted ring is always there; the live one glows.
          g.fillStyle(VERD, ph.s === 2 ? 0.12 : 0.04); g.fillCircle(z.x, z.y, ZONE_R);
          dashedEllipse(g, z.x, z.y, ZONE_R, ZONE_R, 24, ph.s === 2 ? (sec * 0.15) % 1 : 0, ph.s === 0 ? 2 : 3, ph.s === 0 ? VERD : VERD_LIT, ph.s === 0 ? 0.45 : 0.9);
          // The "0 G" stencil in the middle of the ring.
          g.lineStyle(3, VERD, ph.s === 2 ? 0.55 : 0.3);
          g.strokeEllipse(z.x - 14, z.y, 16, 22);
          g.beginPath(); g.arc(z.x + 14, z.y, 10, Math.PI * 1.75, Math.PI * 1.45, false); g.strokePath();
          g.lineBetween(z.x + 14, z.y, z.x + 24, z.y);
          if (ph.s === 1) {
            // Warning: rings tightening onto the rim, the rim flickering.
            for (let i = 0; i < 3; i++) {
              const q = (ph.k * 2 + i / 3) % 1;
              g.lineStyle(2, LAMPLIGHT, 0.7 * (1 - q)); g.strokeCircle(z.x, z.y, ZONE_R + 50 * (1 - q));
            }
            if (Math.floor(time / 90) % 2) { g.lineStyle(4, WHITE, 0.5); g.strokeCircle(z.x, z.y, ZONE_R); }
          }
          if (ph.s === 2 && ph.k > 0.82) {
            // About to switch off: the rim fades in steps.
            g.lineStyle(3, LAMPLIGHT, Math.floor(time / 120) % 2 ? 0.7 : 0.1); g.strokeCircle(z.x, z.y, ZONE_R + 4);
          }
        }
      },

      drawAir(g, time) {
        const sec = time / 1000;
        // Grit lifting off the floor in warning rings, floating in live ones.
        for (const z of zones) {
          const ph = phaseOf(z, time);
          if (ph.s === 0) continue;
          const lift = ph.s === 1 ? ph.k * 18 : 18 + Math.sin(sec * 1.3 + z.seed) * 6;
          for (let i = 0; i < 9; i++) {
            const a = i * 2.39 + z.seed;
            const r = ZONE_R * (0.2 + ((i * 0.37 + z.seed * 0.1) % 1) * 0.7);
            const bob = Math.sin(sec * (0.8 + i * 0.13) + i) * 5;
            const px = z.x + Math.cos(a + sec * 0.15) * r, py = z.y + Math.sin(a + sec * 0.15) * r * 0.8;
            g.fillStyle(0x000000, 0.15); g.fillEllipse(px, py + 4, 10, 4);
            pebble(g, px, py - lift - bob, 3 + (i % 3), STONE_LIT, 0.9);
          }
        }
        // Drifters: tumbling, with speed-streaks behind them.
        for (const k of SIDES) {
          const f = fighterOf(ctx, k);
          const d = state[k];
          if (!d.on || !live(f)) continue;
          const sp = Math.hypot(d.vx, d.vy) || 1;
          const ux = d.vx / sp, uy = d.vy / sp;
          for (let i = 0; i < 4; i++) {
            const off = (i - 1.5) * 9;
            g.lineStyle(2, SKY_PALE, 0.55);
            g.lineBetween(f.x - uy * off - ux * 24, f.y + ux * off - uy * 24, f.x - uy * off - ux * (40 + sp / 8), f.y + ux * off - uy * (40 + sp / 8));
          }
          g.lineStyle(2, VERD_LIT, 0.8);
          g.beginPath(); g.arc(f.x, f.y - 4, 30, d.spin, d.spin + 1.4, false); g.strokePath();
          g.beginPath(); g.arc(f.x, f.y - 4, 30, d.spin + Math.PI, d.spin + Math.PI + 1.4, false); g.strokePath();
        }
        for (const p of pops) {
          const q = (time - p.at) / 520;
          g.lineStyle(p.big ? 4 * (1 - q) : 2 * (1 - q), p.big ? WHITE : STONE_LIT, 1 - q);
          if (p.big) g.strokeCircle(p.x, p.y, 12 + q * 34); else g.strokeEllipse(p.x, p.y, 20 + q * 30, 6 + q * 8);
        }
      },

      drawHud(g) {
        // Three pips, one per ring: dark off, flickering warning, green live.
        const t = ctx.scene.time.now;
        const x = W / 2, y = 114;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 34, y - 10, 68, 20, 7);
        zones.forEach((z, i) => {
          const ph = phaseOf(z, t);
          const c = ph.s === 2 ? VERD_LIT : ph.s === 1 ? (Math.floor(t / 90) % 2 ? LAMPLIGHT : VERD) : 0x2b4038;
          g.fillStyle(c, 1); g.fillCircle(x - 20 + i * 20, y, 5);
        });
      },
    };
  },
};

