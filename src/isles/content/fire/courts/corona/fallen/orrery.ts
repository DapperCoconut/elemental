import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, BRASS_DARK, BRASS_LIT, GLASS_GLINT, IRON, PLASMA, PLASMA_DEEP, PLASMA_LIT, STONE, STONE_LIT, SUN, SUN_CORE,
  SUN_DEEP, SUN_RIM,
} from '../palette';
import { inPlay, wrapPi } from './geom';

/**
 * The Orrery Lesson — Master Almagest's fight (the prince's old tutor).
 *
 * The tutor who taught Flux that the heavens are a machine, and a machine is a thing you
 * own, sets the plaza's great orrery turning under the fight. Two planets ride brass arms
 * round the hub in opposite directions — **Ember** on the inner ring, **Ash** on the outer —
 * and when they line up on the same side (a **conjunction**) a beam runs the whole diameter
 * through them. A small moon rides the middle ring and shoulders aside anyone it meets.
 *
 * The lesson is something to *do*: **strike a planet** and its arm jumps forward a step, so
 * the conjunction comes sooner or later and lands on a different line. In the last moments
 * before alignment the arms are clamped (the brass brackets show) — no strike moves them, so
 * the line you see then is the line that fires. Put that line through the tutor.
 *
 * Halfway the lesson reverses: the arms run the other way, a little faster, and each
 * conjunction fires a cross — the diameter and the one square to it.
 */

const ID = fallenId('corona', 'orrery');
const R_IN = 112;
const R_MOON = 172;
const R_OUT = 234;
const LOCK_S = 1.4;
const KICK = 0.45;
const BEAM_HALF = 20;
const BEAM_MS = 450;
const BEAM_DMG = 26;
const MOON_DMG = 10;

interface Body { th: number; w: number; r: number; kickReady: number }

export const ORRERY: GimmickDef = {
  id: ID,
  rules: 'Two planets circle; when they align a beam crosses the room. Strike a planet to step it on. Clamped arms mean the line is set.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const C: Pt = { x: W / 2, y: (top + H) / 2 };
    const inner: Body = { th: ctx.rng() * Math.PI * 2, w: 0.55, r: R_IN, kickReady: 0 };
    const outer: Body = { th: inner.th + Math.PI * 0.9, w: -0.32, r: R_OUT, kickReady: 0 };
    const moon: Body = { th: ctx.rng() * Math.PI * 2, w: 0.85, r: R_MOON, kickReady: 0 };
    let half = false;
    let locked = false;
    let lockedAngle = 0;
    let prevEta = 99;
    let firedAt = -9999;
    let firedAngle = 0;
    const beamHit = new Set<Fighter>();
    const moonCd = new Map<Fighter, number>();

    const posOf = (b: Body): Pt => ({ x: C.x + Math.cos(b.th) * b.r, y: C.y + Math.sin(b.th) * b.r });

    /** Seconds until Ember and Ash share a ray from the hub, for these two angles. */
    const etaFor = (thI: number, thO: number): number => {
      const rel = outer.w - inner.w;
      const P = (Math.PI * 2) / Math.abs(rel);
      const raw = -wrapPi(thO - thI) / rel;
      return ((raw % P) + P) % P;
    };
    const eta = (): number => etaFor(inner.th, outer.th);
    const angleAt = (thI: number, t: number): number => thI + inner.w * t;

    /** The lines a conjunction at angle `a` fires along. */
    const linesAt = (a: number): number[] => (half ? [a, a + Math.PI / 2] : [a]);
    const lineDist = (p: Pt, a: number): number => Math.abs((p.x - C.x) * Math.sin(a) - (p.y - C.y) * Math.cos(a));

    const kick = (b: Body): void => {
      const now = ctx.scene.time.now;
      if (locked || now < b.kickReady) { ctx.sfx('clang'); return; }
      const th = b.th + Math.sign(b.w) * KICK;
      const next = b === inner ? etaFor(th, outer.th) : etaFor(inner.th, th);
      if (next < LOCK_S + 0.2) { ctx.sfx('clang'); return; }
      b.th = th;
      b.kickReady = now + 700;
      ctx.sfx('gear-turn');
    };

    const tI = ctx.target({ x: posOf(inner).x, y: posOf(inner).y, r: 20, onStruck: () => kick(inner) });
    const tO = ctx.target({ x: posOf(outer).x, y: posOf(outer).y, r: 22, onStruck: () => kick(outer) });

    return {
      update(time, dt) {
        if (!half && ctx.npc.hp < ctx.npc.maxHp * 0.5 && !locked && eta() > 2.2) {
          half = true;
          inner.w = -0.6; outer.w = 0.36; moon.w = -0.95;
          ctx.banner('THE LESSON REVERSES', '#e6d2ff');
          ctx.sfx('time-warp');
        }
        inner.th += inner.w * dt; outer.th += outer.w * dt; moon.th += moon.w * dt;
        const pi = posOf(inner), po = posOf(outer);
        tI.moveTo(pi.x, pi.y); tO.moveTo(po.x, po.y);

        const e = eta();
        if (!locked && e < LOCK_S) {
          locked = true;
          lockedAngle = angleAt(inner.th, e);
          ctx.sfx('beam-charge');
        }
        if (locked && prevEta < 0.3 && e > prevEta + 0.5) {
          locked = false;
          firedAt = time;
          firedAngle = lockedAngle;
          beamHit.clear();
          ctx.sfx('beam-fire');
          ctx.flash(C.x, C.y, SUN_CORE);
        }
        prevEta = e;

        if (time - firedAt < BEAM_MS) {
          for (const f of [ctx.player, ctx.npc]) {
            if (beamHit.has(f) || !inPlay(f) || ctx.isAirborne(f)) continue;
            if (linesAt(firedAngle).some((a) => lineDist(f, a) < BEAM_HALF + 14)) {
              beamHit.add(f);
              ctx.hit(f, BEAM_DMG, f.x, f.y);
              ctx.sfx('status-burn');
            }
          }
        }

        // The moon shoulders aside whoever it meets.
        const pm = posOf(moon);
        for (const f of [ctx.player, ctx.npc]) {
          if (!inPlay(f) || time < (moonCd.get(f) ?? 0)) continue;
          const d = Math.hypot(f.x - pm.x, f.y - pm.y);
          if (d < 34) {
            moonCd.set(f, time + 700);
            ctx.hit(f, MOON_DMG, f.x, f.y);
            const ox = (f.x - C.x) / (Math.hypot(f.x - C.x, f.y - C.y) || 1);
            const oy = (f.y - C.y) / (Math.hypot(f.x - C.x, f.y - C.y) || 1);
            ctx.nudge(f, ox * 56, oy * 56);
            ctx.sfx('stone-slam');
          }
        }
      },

      npcSeek() {
        const me: Pt = { x: ctx.npc.x, y: ctx.npc.y };
        const e = eta();
        if (e < 1.9) {
          const a = locked ? lockedAngle : angleAt(inner.th, e);
          for (const la of linesAt(a)) {
            const d = lineDist(me, la);
            if (d < BEAM_HALF + 60) {
              let nx = -Math.sin(la), ny = Math.cos(la);
              if ((me.x - C.x) * nx + (me.y - C.y) * ny < 0) { nx = -nx; ny = -ny; }
              return { x: me.x + nx * 130, y: me.y + ny * 130 };
            }
          }
          return null;
        }
        // The tutor's lesson: step the planet that brings the line onto you.
        const now = ctx.scene.time.now;
        for (const b of [inner, outer]) {
          if (now < b.kickReady) continue;
          const th = b.th + Math.sign(b.w) * KICK;
          const thI = b === inner ? th : inner.th;
          const ne = b === inner ? etaFor(th, outer.th) : etaFor(inner.th, th);
          if (ne < LOCK_S + 0.2 || ne > 4.5) continue;
          const lines = linesAt(angleAt(thI, ne));
          if (lines.some((a) => lineDist(ctx.player, a) < 50) && lines.every((a) => lineDist(me, a) > 90)) return posOf(b);
        }
        return null;
      },

      drawGround(g, time) {
        // Orbit grooves cut into the glass, with brass inlay and graduations.
        for (const [r, a] of [[R_IN, 0.6], [R_MOON, 0.35], [R_OUT, 0.6]] as [number, number][]) {
          g.lineStyle(6, IRON, 0.35); g.strokeCircle(C.x, C.y, r);
          g.lineStyle(1.5, BRASS, a); g.strokeCircle(C.x, C.y, r);
        }
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const long = i % 4 === 0;
          g.lineStyle(long ? 2 : 1, BRASS_LIT, long ? 0.6 : 0.35);
          g.lineBetween(C.x + Math.cos(a) * (R_OUT + 6), C.y + Math.sin(a) * (R_OUT + 6), C.x + Math.cos(a) * (R_OUT + (long ? 18 : 11)), C.y + Math.sin(a) * (R_OUT + (long ? 18 : 11)));
          if (long) {
            // A house-notch: a little engraved wedge for each of the twelve houses.
            const x = C.x + Math.cos(a + 0.065) * (R_OUT + 26), y = C.y + Math.sin(a + 0.065) * (R_OUT + 26);
            g.fillStyle(BRASS_DARK, 0.7); g.fillTriangle(x, y - 4, x - 4, y + 3, x + 4, y + 3);
          }
        }
        // Predicted line: faint and dotted while it can still be moved, a solid band once clamped.
        const e = eta();
        if (time - firedAt > BEAM_MS && e < 4) {
          const a = locked ? lockedAngle : angleAt(inner.th, e);
          for (const la of linesAt(a)) {
            const ux = Math.cos(la), uy = Math.sin(la);
            if (locked) {
              const k = 1 - e / LOCK_S;
              g.lineStyle(BEAM_HALF * 2, SUN, 0.08 + 0.2 * k);
              g.lineBetween(C.x - ux * 700, C.y - uy * 700, C.x + ux * 700, C.y + uy * 700);
              g.lineStyle(2, SUN_CORE, 0.4 + 0.5 * k);
              g.lineBetween(C.x - ux * 700, C.y - uy * 700, C.x + ux * 700, C.y + uy * 700);
            } else {
              g.lineStyle(2, SUN_RIM, 0.3);
              for (let d = -700; d < 700; d += 26) g.lineBetween(C.x + ux * d, C.y + uy * d, C.x + ux * (d + 10), C.y + uy * (d + 10));
            }
          }
        }
        // The arms: brass rods with a counterweight behind the hub.
        for (const b of [inner, moon, outer]) {
          const p = posOf(b);
          g.lineStyle(b === moon ? 2 : 3, BRASS_DARK, 1); g.lineBetween(C.x, C.y, p.x, p.y);
          g.lineStyle(1, BRASS_LIT, 0.7); g.lineBetween(C.x, C.y, p.x, p.y);
          const cw = { x: C.x - Math.cos(b.th) * 36, y: C.y - Math.sin(b.th) * 36 };
          g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(C.x, C.y, cw.x, cw.y);
          g.fillStyle(IRON, 1); g.fillCircle(cw.x, cw.y, 5);
          if (locked && b !== moon) {
            // The clamp: two brackets biting the arm just short of the planet.
            const k = (b.r - 30) / b.r;
            const cx = C.x + (p.x - C.x) * k, cy = C.y + (p.y - C.y) * k;
            const nx = -Math.sin(b.th), ny = Math.cos(b.th);
            g.lineStyle(4, BRASS_LIT, 1);
            g.lineBetween(cx + nx * 9, cy + ny * 9, cx + nx * 3, cy + ny * 3);
            g.lineBetween(cx - nx * 9, cy - ny * 9, cx - nx * 3, cy - ny * 3);
          }
        }
        // The hub: a toothed brass boss round a little sun.
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(C.x, C.y, 32);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + time / 3000 * (half ? -1 : 1);
          g.fillStyle(BRASS, 1); g.fillRect(C.x + Math.cos(a) * 32 - 3, C.y + Math.sin(a) * 32 - 3, 6, 6);
        }
        g.fillStyle(BRASS, 1); g.fillCircle(C.x, C.y, 26);
        g.lineStyle(1, BRASS_DARK, 1); g.strokeCircle(C.x, C.y, 20);
        g.fillStyle(SUN, 1); g.fillCircle(C.x, C.y, 11);
        g.fillStyle(SUN_CORE, 1); g.fillCircle(C.x - 3, C.y - 3, 4);
      },

      drawAir(g, time) {
        // The beam, while it burns.
        const age = time - firedAt;
        if (age < BEAM_MS) {
          const k = 1 - age / BEAM_MS;
          for (const la of linesAt(firedAngle)) {
            const ux = Math.cos(la), uy = Math.sin(la);
            g.lineStyle(BEAM_HALF * 2 + 12, SUN, 0.35 * k);
            g.lineBetween(C.x - ux * 700, C.y - uy * 700, C.x + ux * 700, C.y + uy * 700);
            g.lineStyle(10, SUN_CORE, 0.9 * k);
            g.lineBetween(C.x - ux * 700, C.y - uy * 700, C.x + ux * 700, C.y + uy * 700);
          }
        }
        // Ember: a hot little world, cratered, with a flickering rim.
        const pi = posOf(inner);
        g.fillStyle(SUN_RIM, 0.25); g.fillCircle(pi.x, pi.y, 24 + Math.sin(time / 90) * 2);
        g.fillStyle(SUN_RIM, 1); g.fillCircle(pi.x, pi.y, 17);
        g.fillStyle(SUN_DEEP, 1); g.fillCircle(pi.x + 5, pi.y + 4, 5); g.fillCircle(pi.x - 6, pi.y + 6, 3); g.fillCircle(pi.x + 2, pi.y - 8, 2.5);
        g.fillStyle(SUN_CORE, 0.8); g.fillCircle(pi.x - 6, pi.y - 6, 4);
        // Ash: banded violet-grey under a tilted ring.
        const po = posOf(outer);
        g.lineStyle(3, STONE_LIT, 0.8); g.strokeEllipse(po.x, po.y, 50, 14);
        g.fillStyle(PLASMA_DEEP, 1); g.fillCircle(po.x, po.y, 19);
        g.fillStyle(PLASMA, 0.8); g.fillRect(po.x - 17, po.y - 6, 34, 4); g.fillRect(po.x - 15, po.y + 5, 30, 3);
        g.fillStyle(PLASMA_LIT, 0.6); g.fillCircle(po.x - 6, po.y - 8, 5);
        g.lineStyle(3, STONE_LIT, 1); g.beginPath(); g.arc(po.x, po.y, 25, 0.15, Math.PI - 0.15, false); g.strokePath();
        // The moon: pale, pocked, on its own thin arm.
        const pm = posOf(moon);
        g.fillStyle(0x000000, 0.3); g.fillEllipse(pm.x, pm.y + 12, 24, 7);
        g.fillStyle(STONE_LIT, 1); g.fillCircle(pm.x, pm.y, 13);
        g.fillStyle(STONE, 1); g.fillCircle(pm.x + 4, pm.y + 3, 3.5); g.fillCircle(pm.x - 5, pm.y + 1, 2.5);
        g.fillStyle(GLASS_GLINT, 0.7); g.fillCircle(pm.x - 4, pm.y - 5, 3);
      },

      drawHud(g) {
        // Two planet tokens slide along a brass rule and meet at the centre at conjunction.
        const x = W / 2 - 150, y = 104, w = 300;
        const rel = Math.abs(outer.w - inner.w);
        const P = (Math.PI * 2) / rel;
        const k = 1 - Math.min(1, eta() / P);
        g.fillStyle(0x000000, 0.55); g.fillRect(x - 3, y - 3, w + 6, 16);
        g.fillStyle(BRASS_DARK, 1); g.fillRect(x, y + 4, w, 2);
        const clampW = (LOCK_S / P) * (w / 2);
        g.fillStyle(locked ? SUN : BRASS, 0.6); g.fillRect(x + w / 2 - clampW, y, clampW * 2, 10);
        g.fillStyle(SUN_RIM, 1); g.fillCircle(x + (w / 2) * k, y + 5, 5);
        g.fillStyle(PLASMA, 1); g.fillCircle(x + w - (w / 2) * k, y + 5, 5);
        if (half) { g.lineStyle(2, PLASMA_LIT, 1); g.strokeCircle(x + w / 2, y + 5, 9); g.lineBetween(x + w / 2 - 9, y + 5, x + w / 2 + 9, y + 5); }
      },

      destroy() {
        tI.remove(); tO.remove();
      },
    };
  },
};
