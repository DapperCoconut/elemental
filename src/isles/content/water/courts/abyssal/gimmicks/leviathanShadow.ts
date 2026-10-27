import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { ABY, alive, clamp, dist, drawJaws, makeClock } from '../palette';

/**
 * Leviathan's Shadow — Tidepriest Varn.
 *
 * Something vast passes over the bubble, and its shadow slides across the arena floor: a
 * great dark body with fins, drifting on the current. Standing in the shadow hides you — blows
 * against you land a quarter lighter in there. But on a clock the shadow *stops*, and the thing
 * that casts it comes up from below: the shadow blackens, its rim lights with pale photophores,
 * bubbles boil inside it — and then it rises, and anyone still within it is swallowed. It
 * hurts. A moment later it spits you out somewhere else in the room, dazed.
 *
 * Varn shelters in the shadow and walks out of it when it stops. The Leviathan does not care
 * that he is its priest: the play is to keep him in it — fight him in the middle of the dark,
 * block the short way out, slow him as it rises.
 */

type Phase = 'drift' | 'stir' | 'rise' | 'sink';

export const leviathanShadowGimmick: GimmickDef = {
  id: 'abyssal-leviathan',
  rules: 'A vast shadow drifts over the floor. Inside it you take 25% less — until it stops, rises, and swallows whoever is still in it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng, hard } = ctx;
    const tick = makeClock();
    const RX = hard ? 220 : 200, RY = hard ? 124 : 112;
    const driftMs = hard ? 4200 : 5200;
    const stirMs = hard ? 1450 : 1650;
    const riseMs = 900;
    const sinkMs = 900;
    const SWALLOW = hard ? 20 : 17;
    const DAZE_MS = 900;
    const cy0 = (top + H) / 2;

    let phase: Phase = 'drift';
    let phaseAt = -1;
    let cx = W * 0.3, cy = cy0;
    let heading = rng() * Math.PI * 2;
    let rot = 0;
    let swallowed: { f: Fighter; at: Pt; outAt: number; done: boolean }[] = [];
    const dazedUntil = new Map<Fighter, number>([[ctx.player, 0], [ctx.npc, 0]]);
    let now = 0;
    let rises = 0;

    /** Inside the body: the ellipse, rotated to its heading. */
    const inside = (f: Fighter): boolean => {
      if (!alive(f) || phase === 'sink') return false;
      const dx = f.x - cx, dy = f.y - cy;
      const c = Math.cos(-rot), s = Math.sin(-rot);
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      return (lx * lx) / (RX * RX) + (ly * ly) / (RY * RY) < 1;
    };

    /** Where to spit someone: a fair distance from where they went in, inside the room. */
    const spitPoint = (from: Pt): Pt => {
      let best: Pt = { x: W / 2, y: cy0 }, bestErr = Infinity;
      for (let i = 0; i < 12; i++) {
        const x = 80 + rng() * (W - 160), y = top + 70 + rng() * (H - top - 130);
        if (Math.hypot((x - cx) / RX, (y - cy) / RY) < 1.2) continue;
        const err = Math.abs(dist(from.x, from.y, x, y) - 340);
        if (err < bestErr) { bestErr = err; best = { x, y }; }
      }
      return best;
    };

    const ellipse = (sx: number, sy: number, r1: number, r2: number): Phaser.Geom.Point[] => {
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        // The body: fuller at the head end, a fin bulge either side, narrowing to the tail.
        const head = Math.cos(a) > 0 ? 1 : 0.82;
        const fin = 1 + 0.18 * Math.max(0, Math.sin(a * 2 + 0.6)) * (Math.cos(a) < 0.3 ? 1 : 0);
        const lx = Math.cos(a) * r1 * head, ly = Math.sin(a) * r2 * fin;
        pts.push(new Phaser.Geom.Point(sx + lx * Math.cos(rot) - ly * Math.sin(rot), sy + lx * Math.sin(rot) + ly * Math.cos(rot)));
      }
      return pts;
    };

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        if (phaseAt < 0) phaseAt = time;
        const el = time - phaseAt;
        switch (phase) {
          case 'drift': {
            // It swims: a slow heading that wanders, turning back off the walls.
            heading += Math.sin(time / 1700) * 0.6 * dt + (rng() - 0.5) * 0.4 * dt;
            const sp = hard ? 78 : 64;
            cx += Math.cos(heading) * sp * dt; cy += Math.sin(heading) * sp * dt * 0.7;
            if (cx < RX * 0.6 || cx > W - RX * 0.6) { heading = Math.PI - heading; cx = clamp(cx, RX * 0.6, W - RX * 0.6); }
            if (cy < top + RY * 0.7 || cy > H - RY * 0.6) { heading = -heading; cy = clamp(cy, top + RY * 0.7, H - RY * 0.6); }
            rot += (Phaser.Math.Angle.Wrap(heading - rot)) * Math.min(1, dt * 1.5);
            if (el >= driftMs) { phase = 'stir'; phaseAt = time; ctx.sfx('roar'); ctx.banner('IT IS RISING', '#9fe4ff'); }
            break;
          }
          case 'stir':
            if (el >= stirMs) {
              phase = 'rise'; phaseAt = time; rises++;
              ctx.sfx('gravity-slam');
              swallowed = [];
              for (const f of [ctx.player, ctx.npc]) {
                if (!inside(f)) continue;
                ctx.hit(f, SWALLOW, f.x, f.y);
                swallowed.push({ f, at: spitPoint(f), outAt: time + 650, done: false });
                ctx.float(f.x, f.y - 50, 'SWALLOWED', '#9fe4ff');
              }
            }
            break;
          case 'rise':
            if (el >= riseMs) { phase = 'sink'; phaseAt = time; }
            break;
          case 'sink':
            if (el >= sinkMs) {
              // It comes round again from somewhere else.
              phase = 'drift'; phaseAt = time;
              cx = rng() < 0.5 ? RX * 0.7 : W - RX * 0.7;
              cy = clamp(top + 120 + rng() * (H - top - 240), top + RY, H - RY);
              heading = cx < W / 2 ? (rng() - 0.5) * 0.8 : Math.PI + (rng() - 0.5) * 0.8;
              rot = heading;
              if (hard && rises % 3 === 0) ctx.float(W / 2, top + 60, 'it is circling faster', '#9fe4ff');
            }
            break;
        }
        for (const s of swallowed) {
          if (s.done || time < s.outAt) continue;
          s.done = true;
          // Spat out: a positional shove to the spit point, and a moment of being very dizzy.
          ctx.nudge(s.f, s.at.x - s.f.x, s.at.y - s.f.y);
          dazedUntil.set(s.f, time + DAZE_MS);
          ctx.flash(s.at.x, s.at.y, ABY.membrane);
          ctx.sfx('splash');
        }
      },

      playerTakenMult: () => (phase === 'drift' && inside(ctx.player) ? 0.75 : 1),
      npcTakenMult: () => (phase === 'drift' && inside(ctx.npc) ? 0.75 : 1),
      playerSpeedMult: () => (now < (dazedUntil.get(ctx.player) ?? 0) ? 0.5 : 1),
      npcSpeedMult: () => (now < (dazedUntil.get(ctx.npc) ?? 0) ? 0.5 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        if (phase === 'stir') {
          if (!inside(n)) return null;
          // Out by the shortest way: straight away from the body's centre.
          const a = Math.atan2(n.y - cy, n.x - cx);
          return { x: clamp(cx + Math.cos(a) * (RX + 80), 60, W - 60), y: clamp(cy + Math.sin(a) * (RY + 80), top + 50, H - 50) };
        }
        if (phase === 'drift' && phaseAt >= 0 && now - phaseAt < driftMs - 900 && !inside(n)) {
          // Into the dark while it is safe, on the edge nearest the player.
          const a = Math.atan2(ctx.player.y - cy, ctx.player.x - cx);
          return { x: cx + Math.cos(a) * RX * 0.45, y: cy + Math.sin(a) * RY * 0.45 };
        }
        return null;
      },

      drawGround(g, time) {
        const body = ellipse(cx, cy, RX, RY);
        if (phase === 'drift') {
          g.fillStyle(0x000206, 0.5); g.fillPoints(body, true, true);
          g.fillStyle(0x000206, 0.25); g.fillPoints(ellipse(cx, cy, RX * 0.7, RY * 0.6), true, true);
          // Caustic light round its edge — the bubble's lamps falling past a body overhead.
          g.lineStyle(2, ABY.membraneDim, 0.35); g.strokePoints(body, true, true);
        } else if (phase === 'stir') {
          const k = (time - phaseAt) / stirMs;
          g.fillStyle(0x000206, 0.55 + k * 0.35); g.fillPoints(body, true, true);
          // Photophores lighting round the rim, one after another — the countdown.
          const lit = Math.floor(k * body.length);
          for (let i = 0; i < body.length; i++) {
            g.fillStyle(i < lit ? 0xdfe8ff : 0x3a4a5a, i < lit ? 0.95 : 0.5);
            g.fillCircle(body[i].x, body[i].y, i < lit ? 3.4 : 2);
          }
          // Bubbles boiling up through it.
          for (let i = 0; i < 16; i++) {
            const ph = ((time / 500) + i / 16) % 1;
            const a = i * 2.4, r = (i % 5) / 5;
            const bx = cx + Math.cos(a) * RX * r * 0.8, by = cy + Math.sin(a) * RY * r * 0.8 - ph * 20;
            g.lineStyle(1.2, ABY.membrane, 0.6 * (1 - ph)); g.strokeCircle(bx, by, 2 + ph * 5);
          }
        } else if (phase === 'rise') {
          const k = (time - phaseAt) / riseMs;
          g.fillStyle(0x000000, 0.92 * (1 - k * 0.4)); g.fillPoints(body, true, true);
        } else {
          const k = (time - phaseAt) / sinkMs;
          g.fillStyle(0x000206, 0.5 * (1 - k)); g.fillPoints(ellipse(cx, cy, RX * (1 + k * 0.2), RY * (1 + k * 0.2)), true, true);
          g.lineStyle(3, ABY.membrane, 0.4 * (1 - k)); g.strokePoints(ellipse(cx, cy, RX * (1 + k * 0.5), RY * (1 + k * 0.5)), true, true);
        }
        // Where the swallowed will be spat out: a ring of foam the moment before.
        for (const s of swallowed) {
          if (s.done) continue;
          const k = clamp(1 - (s.outAt - time) / 650, 0, 1);
          g.lineStyle(3, ABY.membrane, 0.3 + k * 0.6); g.strokeCircle(s.at.x, s.at.y, 30 - k * 10);
        }
      },

      drawAir(g, time) {
        if (phase === 'rise') {
          // The mouth breaks the floor: a jaw as wide as the shadow, closing.
          const k = (time - phaseAt) / riseMs;
          const open = k < 0.35 ? 1 - k / 0.35 * 0.2 : Math.max(0, 0.8 - (k - 0.35) * 3);
          drawJaws(g, cx, cy, Math.min(RX, RY * 1.4), open, 1 - Math.max(0, k - 0.7) / 0.3, 17);
          // Spray thrown up off its back.
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2;
            const d = (RX * 0.8) * (0.5 + k * 0.7);
            g.fillStyle(ABY.membrane, 0.6 * (1 - k)); g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6 - k * 30, 3);
          }
        }
        if (phase === 'stir') {
          // One eye opens beneath the floor, at the head end.
          const k = clamp((time - phaseAt) / (stirMs * 0.7), 0, 1);
          const ex = cx + Math.cos(rot) * RX * 0.62, ey = cy + Math.sin(rot) * RX * 0.62 * 0.5;
          g.fillStyle(0xdfe8f0, 0.15 * k); g.fillEllipse(ex, ey, 60, 36 * k);
          g.fillStyle(0xdfe8f0, 0.75 * k); g.fillEllipse(ex, ey, 30, 16 * k);
          g.fillStyle(0x000000, 0.95 * k); g.fillEllipse(ex, ey, 8, 15 * k);
        }
        // Dazed fighters: little bubbles orbiting their heads.
        for (const [f, until] of dazedUntil) {
          if (now >= until || !alive(f)) continue;
          for (let i = 0; i < 3; i++) {
            const a = time / 160 + i * 2.1;
            g.lineStyle(1.2, ABY.membrane, 0.8); g.strokeCircle(f.x + Math.cos(a) * 18, f.y - 34 + Math.sin(a) * 5, 3);
          }
        }
      },

      drawHud(g, time) {
        // The tidepriests' clock: a ring that fills toward the rising.
        const x = W / 2, y = top + 22;
        let k = 0;
        if (phase === 'drift') k = clamp((time - phaseAt) / driftMs, 0, 1);
        else if (phase === 'stir') k = 1;
        g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 16);
        g.lineStyle(4, phase === 'stir' ? (Math.floor(time / 120) % 2 ? 0xdfe8ff : ABY.membraneDim) : ABY.membraneDim, 0.95);
        g.beginPath(); g.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        g.fillStyle(0x000000, 1); g.fillEllipse(x, y, 12, 6);
      },

      destroy() { swallowed = []; dazedUntil.clear(); },
    };
  },
};
