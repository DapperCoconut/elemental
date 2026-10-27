import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { Clock, R, RCOL, alive, dist, drawCrack, drawHole, drawGlint, jit } from '../util';

/**
 * THIN ICE — Skater Brisa.
 *
 * The fight is on the rink Brisa keeps swept in the middle of the frozen harbour, and the rink is
 * thinner than it looks. Three rules:
 *
 * • **The ice keeps your momentum.** Both fighters slide: you build speed slowly and you coast
 *   when you let go. The snow banked round the rink's edge grips — inside that white band you stop
 *   dead. Brisa was born on skates; she turns far tighter than you do.
 * • **Heavy hits crack the ice where they land.** Any big hit on either fighter stars the ice
 *   under their feet. A crack creaks for a few seconds and then gives way into a hole of black
 *   water; a second heavy hit on a crack breaks it at once.
 * • **Holes dunk whoever slides in.** Go through a hole and you are under: hurt, frozen in a block
 *   for a moment, then heaved out onto the rim. Holes skin over again after a while.
 *
 * The trick is that the cracks are made by *hits*, and every hit you land on Brisa stars the ice
 * under her. Hit her hard where she stands, then make her come to you across it.
 */

type Side = 'player' | 'npc';

interface Crack { x: number; y: number; born: number; breakAt: number; seed: number; hits: number }
interface Hole { x: number; y: number; r: number; openAt: number; closeAt: number; seed: number }
interface Scratch { x1: number; y1: number; x2: number; y2: number; at: number }

interface Slider {
  side: Side;
  vx: number; vy: number;
  lastX: number; lastY: number;
  /** Our own nudge last frame — subtracted so the slide never feeds on itself. */
  pushX: number; pushY: number;
  /** Dunked: frozen in the hole until this time. */
  frozenUntil: number;
  holdX: number; holdY: number;
  /** Where they went in from — they are heaved out on that side. */
  entryX: number; entryY: number;
  /** Hole that has them — to heave them out of it. */
  hole: Hole | null;
  /** No second dunk until this time. */
  immuneUntil: number;
  started: boolean;
}

const HEAVY = 8;
const CRACK_MS = 2700;
const CRACK_QUICK_MS = 700;
const HOLE_R = 36;
const HOLE_OPEN_MS = 7400;
const FREEZE_MS = 1150;
const GRIP_BAND = 56;
const MAX_CRACKS = 9;

export const THIN_ICE: GimmickDef = {
  id: 'rimefast-thin-ice',
  rules: 'The ice keeps your momentum (the snowy rim grips). Heavy hits crack the ice underfoot; cracks give way into holes that dunk and freeze whoever slides in.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const cracks: Crack[] = [];
    const holes: Hole[] = [];
    const scratches: Scratch[] = [];
    const dunkDamage = ctx.hard ? 17 : 14;
    const sliders: Slider[] = (['player', 'npc'] as Side[]).map((side) => ({
      side, vx: 0, vy: 0, lastX: 0, lastY: 0, pushX: 0, pushY: 0,
      frozenUntil: 0, holdX: 0, holdY: 0, entryX: 0, entryY: 0, hole: null, immuneUntil: 0, started: false,
    }));
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const sliderOf = (s: Side): Slider => sliders[s === 'player' ? 0 : 1];
    let now = 0;
    let lastScratch = 0;

    const inGrip = (x: number, y: number): boolean =>
      x < GRIP_BAND || x > W - GRIP_BAND || y < top + GRIP_BAND * 0.7 || y > H - GRIP_BAND;

    const openHoleAt = (x: number, y: number): Hole | null => {
      for (const h of holes) {
        if (now < h.openAt || now > h.closeAt) continue;
        if (dist(h.x, h.y, x, y) < h.r * 0.85) return h;
      }
      return null;
    };

    /** A heavy blow lands on `f`: star the ice under them, or break a crack already there. */
    const crackAt = (f: Fighter): void => {
      if (inGrip(f.x, f.y)) return;
      // No crack on top of an open hole — the water is already there.
      if (openHoleAt(f.x, f.y)) return;
      for (const c of cracks) {
        if (dist(c.x, c.y, f.x, f.y) < 46) {
          c.hits++;
          const quick = now + CRACK_QUICK_MS;
          if (quick < c.breakAt) {
            c.breakAt = quick;
            ctx.float(c.x, c.y - 30, 'CRACK!', RCOL.ice);
            ctx.sfx('ice-shatter');
          }
          return;
        }
      }
      if (cracks.length >= MAX_CRACKS) cracks.shift();
      cracks.push({ x: f.x, y: f.y + 6, born: now, breakAt: now + CRACK_MS, seed: rng() * 100, hits: 1 });
      ctx.sfx('ice-shard');
    };

    const breakCrack = (c: Crack): void => {
      holes.push({ x: c.x, y: c.y, r: HOLE_R + Math.min(10, (c.hits - 1) * 5), openAt: now, closeAt: now + HOLE_OPEN_MS, seed: c.seed });
      if (holes.length > 8) holes.shift();
      ctx.flash(c.x, c.y, R.iceLit);
      ctx.sfx('splash');
    };

    const dunk = (s: Slider, f: Fighter, h: Hole): void => {
      s.frozenUntil = now + FREEZE_MS;
      s.hole = h;
      s.holdX = h.x; s.holdY = h.y - 4;
      s.entryX = s.lastX - s.vx * 0.15; s.entryY = s.lastY - s.vy * 0.15;
      s.vx = 0; s.vy = 0;
      ctx.hit(f, dunkDamage, f.x, f.y);
      ctx.stun(f, FREEZE_MS);
      ctx.float(f.x, f.y - 46, s.side === 'player' ? 'DUNKED!' : 'BRISA GOES UNDER!', s.side === 'player' ? RCOL.red : RCOL.green);
      ctx.sfx('splash');
      ctx.sfx('status-freeze');
      ctx.flash(f.x, f.y, R.frost);
    };

    /** Heave a frozen fighter out onto the rim of their hole, on the side they went in from. */
    const heaveOut = (s: Slider, f: Fighter): void => {
      const h = s.hole;
      s.hole = null;
      s.immuneUntil = now + 1700;
      if (!h) return;
      let a = Math.atan2(s.entryY - h.y, s.entryX - h.x);
      if (!Number.isFinite(a)) a = rng() * Math.PI * 2;
      // Toward the middle of the room if that rim would put them in the snow wall.
      const ox = h.x + Math.cos(a) * (h.r + 30), oy = h.y + Math.sin(a) * (h.r + 30);
      const tx = Math.max(60, Math.min(W - 60, ox)), ty = Math.max(top + 40, Math.min(H - 50, oy));
      ctx.nudge(f, tx - f.x, ty - f.y);
      ctx.sfx('ice-shatter');
    };

    const stepSlider = (s: Slider, dt: number): void => {
      const f = fighterOf(s.side);
      if (!alive(f)) return;
      if (!s.started) { s.lastX = f.x; s.lastY = f.y; s.started = true; return; }
      // Frozen in a block: pinned in the hole, no momentum.
      if (s.frozenUntil > now) {
        ctx.nudge(f, s.holdX - f.x, s.holdY - f.y);
        s.lastX = f.x; s.lastY = f.y; s.pushX = 0; s.pushY = 0;
        return;
      }
      if (s.hole) heaveOut(s, f);

      // What the fighter did by themselves this frame (input, dashes, knockback) — our own
      // push from last frame taken back out.
      const inX = (f.x - s.lastX - s.pushX) / dt;
      const inY = (f.y - s.lastY - s.pushY) / dt;
      const grip = inGrip(f.x, f.y);
      // Response time: how long the skate takes to answer the stick. Brisa answers quickly.
      const tau = grip ? 0.02 : s.side === 'npc' ? 0.2 : 0.48;
      const k = 1 - Math.exp(-dt / tau);
      s.vx += (inX - s.vx) * k;
      s.vy += (inY - s.vy) * k;
      const sp = Math.hypot(s.vx, s.vy);
      if (sp > 330) { s.vx *= 330 / sp; s.vy *= 330 / sp; }
      // Extra glide: how far the slide carries beyond what they asked for.
      let ex = (s.vx - inX) * dt, ey = (s.vy - inY) * dt;
      // A dash (big input) is never fought — the ice only adds coast, it never steals a burst.
      if (Math.hypot(inX, inY) > 420) { ex = 0; ey = 0; s.vx = inX * 0.6; s.vy = inY * 0.6; }
      const bx = f.x, by = f.y;
      if (Math.abs(ex) + Math.abs(ey) > 0.01) ctx.nudge(f, ex, ey);
      s.pushX = f.x - bx; s.pushY = f.y - by;
      // Hit the arena wall: the slide stops along that axis.
      if (Math.abs(s.pushX - ex) > 0.5) s.vx = 0;
      if (Math.abs(s.pushY - ey) > 0.5) s.vy = 0;
      s.lastX = f.x; s.lastY = f.y;

      // Slide into an open hole.
      if (now >= s.immuneUntil) {
        const h = openHoleAt(f.x, f.y);
        if (h) dunk(s, f, h);
      }
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) {
          for (const s of sliders) { const f = fighterOf(s.side); s.lastX = f.x; s.lastY = f.y; s.started = true; }
          return;
        }
        for (const s of sliders) stepSlider(s, dt);

        for (let i = cracks.length - 1; i >= 0; i--) {
          if (now >= cracks[i].breakAt) { breakCrack(cracks[i]); cracks.splice(i, 1); }
        }
        for (let i = holes.length - 1; i >= 0; i--) if (now > holes[i].closeAt + 400) holes.splice(i, 1);

        // Brisa's blades score the ice when she is really moving — the marks you see her by.
        const ns = sliderOf('npc');
        const nf = ctx.npc;
        if (Math.hypot(ns.vx, ns.vy) > 140 && now - lastScratch > 70) {
          lastScratch = now;
          const a = Math.atan2(ns.vy, ns.vx);
          scratches.push({ x1: nf.x - Math.cos(a) * 14, y1: nf.y + 12 - Math.sin(a) * 14, x2: nf.x, y2: nf.y + 12, at: now });
          if (scratches.length > 90) scratches.shift();
        }
      },

      onPlayerHurt(amount: number) { if (amount >= HEAVY) crackAt(ctx.player); },
      onNpcHurt(amount: number) { if (amount >= HEAVY) crackAt(ctx.npc); },

      npcSpeedMult: () => 1.08,

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // Brisa knows this rink: she never skates onto a crack that is about to go or into water.
        for (const c of cracks) {
          if (c.breakAt - now < 1300 && dist(c.x, c.y, n.x, n.y) < 90) {
            const a = Math.atan2(n.y - c.y, n.x - c.x);
            return { x: n.x + Math.cos(a) * 140, y: n.y + Math.sin(a) * 140 };
          }
        }
        for (const h of holes) {
          if (now > h.closeAt) continue;
          if (dist(h.x, h.y, n.x, n.y) < h.r + 70) {
            const a = Math.atan2(n.y - h.y, n.x - h.x);
            return { x: n.x + Math.cos(a) * 150, y: n.y + Math.sin(a) * 150 };
          }
        }
        // When you are standing on a crack, she hangs back and works you from range — the next
        // heavy hit will put you through it.
        const p = ctx.player;
        if (cracks.some((c) => dist(c.x, c.y, p.x, p.y) < 50)) {
          const a = Math.atan2(n.y - p.y, n.x - p.x);
          return { x: p.x + Math.cos(a) * 240, y: p.y + Math.sin(a) * 240 };
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        // The swept rink: an oval of clearer, darker ice with a painted circuit line.
        const cx = W / 2, cy = top + (H - top) / 2;
        g.fillStyle(R.iceDark, 0.16); g.fillEllipse(cx, cy, W - 150, H - top - 110);
        g.lineStyle(2, R.scarf, 0.35); g.strokeEllipse(cx, cy, W - 230, H - top - 180);
        g.lineStyle(1, R.iceLit, 0.25); g.strokeEllipse(cx, cy, W - 236, H - top - 186);
        // Gripping snow banked round the rim (where momentum stops).
        g.fillStyle(R.snow, 0.5);
        g.fillRect(0, top, GRIP_BAND, H - top); g.fillRect(W - GRIP_BAND, top, GRIP_BAND, H - top);
        g.fillRect(0, top, W, GRIP_BAND * 0.7); g.fillRect(0, H - GRIP_BAND, W, GRIP_BAND);
        for (let i = 0; i < 26; i++) {
          const x = jit(7, i) * W;
          g.fillStyle(R.snow, 0.6); g.fillEllipse(x, top + GRIP_BAND * 0.7, 50, 14); g.fillEllipse(x, H - GRIP_BAND, 50, 14);
        }
        for (let i = 0; i < 14; i++) {
          const y = top + jit(9, i) * (H - top);
          g.fillStyle(R.snow, 0.6); g.fillEllipse(GRIP_BAND, y, 14, 46); g.fillEllipse(W - GRIP_BAND, y, 14, 46);
        }
        // Skate scratches, fading.
        for (const s of scratches) {
          const a = 1 - (time - s.at) / 6000;
          if (a <= 0) continue;
          g.lineStyle(1.2, R.iceLit, 0.55 * a); g.lineBetween(s.x1, s.y1, s.x2, s.y2);
        }
        // Cracks: they grow and darken as they near the break, and jitter in the last moment.
        for (const c of cracks) {
          const life = c.breakAt - c.born;
          const k = Math.max(0, Math.min(1, (time - c.born) / life));
          const urgent = c.breakAt - time < 700;
          const jx = urgent ? Math.sin(time / 25) * 1.5 : 0;
          drawCrack(g, c.x + jx, c.y, HOLE_R * 1.6, c.seed, k);
          if (urgent) {
            g.lineStyle(2, R.water, 0.4 + Math.sin(time / 40) * 0.2); g.strokeEllipse(c.x, c.y, HOLE_R * 2.2, HOLE_R * 1.5);
          }
        }
        // Holes: open water, skinning over at the end.
        for (const h of holes) {
          const opening = Math.min(1, (time - h.openAt) / 250);
          const closing = Math.max(0, Math.min(1, (h.closeAt - time) / 1600));
          const open = Math.min(opening, closing <= 0 ? 0 : 0.35 + closing * 0.65);
          if (time > h.closeAt) {
            // Fresh skin: a pale disc that gives no more trouble.
            const fade = 1 - (time - h.closeAt) / 400;
            g.fillStyle(R.slush, 0.6 * Math.max(0, fade)); g.fillEllipse(h.x, h.y, h.r * 2, h.r * 1.4);
            continue;
          }
          drawHole(g, h.x, h.y, h.r * 0.95, t, h.seed, open);
          if (closing < 1) {
            // New ice creeping in from the rim.
            g.lineStyle(3, R.iceLit, 0.6 * (1 - closing)); g.strokeEllipse(h.x, h.y, h.r * 2 * open, h.r * 1.35 * open);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // A fighter frozen into the hole: locked in a block of fresh ice with frost round it.
        for (const s of sliders) {
          if (s.frozenUntil <= time) continue;
          const f = fighterOf(s.side);
          const k = (s.frozenUntil - time) / FREEZE_MS;
          g.fillStyle(R.ice, 0.42); g.fillRoundedRect(f.x - 30, f.y - 34, 60, 62, 8);
          g.lineStyle(2, R.glassLit, 0.8); g.strokeRoundedRect(f.x - 30, f.y - 34, 60, 62, 8);
          g.fillStyle(R.glassLit, 0.5); g.fillTriangle(f.x - 26, f.y - 30, f.x - 6, f.y - 30, f.x - 26, f.y);
          drawGlint(g, f.x + 18, f.y - 24, 6, 0.6 + Math.sin(time / 90) * 0.3);
          // Thaw meter: a thin bar under the block.
          g.fillStyle(0x000000, 0.4); g.fillRect(f.x - 24, f.y + 32, 48, 4);
          g.fillStyle(R.frost, 0.9); g.fillRect(f.x - 24, f.y + 32, 48 * k, 4);
        }
        // Spray off Brisa's blades on a hard turn.
        const ns = sliderOf('npc');
        const sp = Math.hypot(ns.vx, ns.vy);
        if (sp > 200) {
          const a = Math.atan2(ns.vy, ns.vx) + Math.PI;
          for (let i = 0; i < 4; i++) {
            const ph = ((time / 200 + i * 0.25) % 1);
            g.fillStyle(R.snow, 0.7 * (1 - ph));
            g.fillCircle(ctx.npc.x + Math.cos(a + (i - 1.5) * 0.3) * (16 + ph * 22), ctx.npc.y + 14 + Math.sin(a + (i - 1.5) * 0.3) * ph * 14, 2);
          }
        }
      },
    };
  },
};
