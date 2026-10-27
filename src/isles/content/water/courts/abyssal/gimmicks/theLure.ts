import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { ABY, abyssDark, alive, clamp, dist, drawEsca, drawJaws, makeClock } from '../palette';

/**
 * The Lure — Angler Mox.
 *
 * The room is the dark of the deep: you see a little way round yourself and no further. Only
 * one other thing gives light — a glowing lure hanging on a line from somewhere above, drifting
 * slowly about the floor. Under it you can see, and you hit harder (40% harder, whichever of
 * you is standing there). But the lure is bait. Every few seconds it stops, flickers, and the
 * eyes of something enormous open in the dark above it; a beat later jaws snap shut on the
 * spot where it hangs, and anyone still under it is bitten.
 *
 * Mox fishes with it: he follows the lure, fights under it, and steps out when it flickers.
 * The play is to steal the light from him — fight him under it, crowd his way out when it
 * flickers, or hold him in place as the jaws come down. Anyone hit by the jaws knocks the lure
 * loose, and it darts somewhere new.
 */

type Phase = 'drift' | 'flicker' | 'snap';

export const lureGimmick: GimmickDef = {
  id: 'abyssal-lure',
  rules: 'Darkness. Under the drifting lure you hit 40% harder — but when it flickers, jaws snap shut where it hangs.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng, hard } = ctx;
    const tick = makeClock();
    const UNDER_R = 92;
    const BITE_R = hard ? 96 : 86;
    const driftMs = hard ? 3600 : 4600;
    const flickerMs = hard ? 1150 : 1350;
    const snapMs = 700;
    const biteDmg = hard ? 20 : 17;

    const lure: Pt = { x: W / 2, y: (top + H) / 2 };
    let target: Pt = { x: W / 2, y: (top + H) / 2 };
    let phase: Phase = 'drift';
    let phaseAt = -1;
    let retargetAt = 0;
    let bites = 0;
    let caught: Fighter[] = [];
    let lineSway = 0;

    const under = (f: Fighter): boolean => alive(f) && dist(f.x, f.y, lure.x, lure.y) < UNDER_R;

    /** The lure leads: it heads for a spot near whichever of you is further from it. */
    const pickTarget = (): void => {
      const p = ctx.player, n = ctx.npc;
      const far = dist(p.x, p.y, lure.x, lure.y) > dist(n.x, n.y, lure.x, lure.y) ? p : n;
      const a = rng() * Math.PI * 2;
      const d = 60 + rng() * 120;
      target = {
        x: clamp(far.x + Math.cos(a) * d, 90, W - 90),
        y: clamp(far.y + Math.sin(a) * d, top + 80, H - 70),
      };
    };

    const dart = (): void => {
      lure.x = clamp(90 + rng() * (W - 180), 90, W - 90);
      lure.y = clamp(top + 80 + rng() * (H - top - 150), top + 80, H - 70);
      pickTarget();
    };

    return {
      update(time: number) {
        const dt = tick(time);
        if (phaseAt < 0) { phaseAt = time; retargetAt = time + 1200; pickTarget(); }
        const el = time - phaseAt;
        lineSway = Math.sin(time / 700) * 0.12;
        switch (phase) {
          case 'drift': {
            // Slow, fish-like: eases toward its target, sways on the line.
            const k = Math.min(1, dt * 0.9);
            lure.x += (target.x - lure.x) * k + Math.sin(time / 380) * 0.4;
            lure.y += (target.y - lure.y) * k + Math.cos(time / 460) * 0.3;
            if (time >= retargetAt) { retargetAt = time + 1700 + rng() * 900; pickTarget(); }
            if (el >= driftMs) {
              phase = 'flicker'; phaseAt = time;
              ctx.sfx('beam-charge');
              ctx.float(lure.x, lure.y - 60, 'THE LURE FLICKERS', '#ffcf5a');
            }
            break;
          }
          case 'flicker':
            if (el >= flickerMs) {
              phase = 'snap'; phaseAt = time;
              ctx.sfx('slash');
              caught = [];
              for (const f of [ctx.player, ctx.npc]) {
                if (!alive(f) || dist(f.x, f.y, lure.x, lure.y) >= BITE_R) continue;
                caught.push(f);
                ctx.hit(f, biteDmg, f.x, f.y);
                // The bite drags you a step toward the middle of the mouth.
                const a = Math.atan2(lure.y - f.y, lure.x - f.x);
                ctx.nudge(f, Math.cos(a) * 18, Math.sin(a) * 18);
              }
              ctx.flash(lure.x, lure.y, ABY.tooth);
              if (caught.length) { ctx.sfx('hit-heavy'); ctx.float(lure.x, lure.y - 70, 'SNAP!', '#f2ecdc'); }
              else ctx.float(lure.x, lure.y - 70, 'it bites empty water', '#9fe4ff');
              bites++;
            }
            break;
          case 'snap':
            if (el >= snapMs) {
              phase = 'drift'; phaseAt = time;
              // A bite that landed knocks the lure loose; an empty bite lets it settle in place.
              if (caught.length || (hard && bites % 2 === 0)) dart();
              retargetAt = time + 900;
            }
            break;
        }
      },

      playerTakenMult: () => (phase !== 'snap' && under(ctx.npc) ? 1.4 : 1),
      npcTakenMult: () => (phase !== 'snap' && under(ctx.player) ? 1.4 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        if (phase === 'flicker') {
          const d = dist(n.x, n.y, lure.x, lure.y);
          if (d > BITE_R + 40) return null;
          const a = d < 1 ? rng() * Math.PI * 2 : Math.atan2(n.y - lure.y, n.x - lure.x);
          return { x: clamp(lure.x + Math.cos(a) * (BITE_R + 90), 60, W - 60), y: clamp(lure.y + Math.sin(a) * (BITE_R + 90), top + 50, H - 50) };
        }
        if (phase === 'drift') {
          // Fight under the light, but on the side of it facing you.
          const p = ctx.player;
          const a = Math.atan2(p.y - lure.y, p.x - lure.x);
          return { x: lure.x + Math.cos(a) * 30, y: lure.y + Math.sin(a) * 30 };
        }
        return null;
      },

      drawGround(g, time) {
        // The pool of light on the floor, warmest at its heart.
        const flick = phase === 'flicker' ? (Math.sin(time / 45) > 0 ? 0.35 : 1) : 1;
        g.fillStyle(ABY.lure, 0.08 * flick); g.fillEllipse(lure.x, lure.y + 6, UNDER_R * 2.4, UNDER_R * 1.4);
        g.fillStyle(ABY.lure, 0.12 * flick); g.fillEllipse(lure.x, lure.y + 6, UNDER_R * 1.8, UNDER_R * 1.0);
        // The edge of "under": a ring of little lit motes on the silt.
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2 + time / 2200;
          g.fillStyle(ABY.lureHot, 0.35 * flick); g.fillCircle(lure.x + Math.cos(a) * UNDER_R, lure.y + 6 + Math.sin(a) * UNDER_R * 0.58, 1.8);
        }
        if (phase === 'flicker') {
          const k = (time - phaseAt) / flickerMs;
          // The mouth rising out of the floor: wide, slack, then tightening.
          g.fillStyle(ABY.gum, 0.15 + k * 0.25); g.fillEllipse(lure.x, lure.y + 6, BITE_R * 2.1, BITE_R * 1.3);
          drawJaws(g, lure.x, lure.y + 6, BITE_R, 1 - k * 0.35, 0.45 + k * 0.5, 13);
        } else if (phase === 'snap') {
          const k = (time - phaseAt) / snapMs;
          drawJaws(g, lure.x, lure.y + 6, BITE_R, 0, 1 - k, 13);
          g.lineStyle(3, ABY.tooth, 0.6 * (1 - k)); g.strokeEllipse(lure.x, lure.y + 6, BITE_R * 2 * (1 + k * 0.3), BITE_R * 1.2 * (1 + k * 0.3));
        }
      },

      drawAir(g, time) {
        const p = ctx.player, n = ctx.npc;
        const flick = phase === 'flicker' ? (Math.sin(time / 45) > 0 ? 0.45 : 1) : 1;
        // The dark itself — your own small circle, the lure's big warm one, the foe's faint one.
        abyssDark(g, W, H, top, [
          { x: p.x, y: p.y, r: 120 },
          { x: lure.x, y: lure.y, r: 190 * flick, tint: ABY.lure },
          { x: n.x, y: n.y, r: 66 },
        ], hard ? 0.9 : 0.86);
        // Mox's eyes catch the light even in the dark, so you always know where he is.
        if (alive(n)) {
          g.fillStyle(ABY.lureHot, 0.85); g.fillCircle(n.x - 6, n.y - 8, 2.2); g.fillCircle(n.x + 6, n.y - 8, 2.2);
          g.fillStyle(ABY.lure, 0.2); g.fillCircle(n.x, n.y - 8, 14);
        }
        // The line, rising out of sight, and the thing on the end of it.
        const lx = lure.x, ly = lure.y - 46;
        const topX = lx + Math.sin(lineSway) * 200;
        g.lineStyle(1.5, ABY.lureHot, 0.35);
        g.beginPath(); g.moveTo(lx, ly);
        for (let i = 1; i <= 8; i++) {
          const t = i / 8;
          g.lineTo(lx + (topX - lx) * t + Math.sin(t * Math.PI) * 18, ly + (top - ly) * t);
        }
        g.strokePath();
        drawEsca(g, lx, ly, 8, time / 1000, flick);
        if (phase === 'flicker') {
          // Two vast pale eyes opening in the dark above the lure.
          const k = Math.min(1, (time - phaseAt) / (flickerMs * 0.6));
          for (const s of [-1, 1]) {
            const ex = lx + s * 70, ey = ly - 70;
            g.fillStyle(0xdfe8f0, 0.12 * k); g.fillEllipse(ex, ey, 52, 34 * k);
            g.fillStyle(0xdfe8f0, 0.7 * k); g.fillEllipse(ex, ey, 24, 14 * k);
            g.fillStyle(0x000000, 0.9 * k); g.fillEllipse(ex + s * 2, ey, 6, 12 * k);
          }
        }
      },

      drawHud(g) {
        // Who is under the light right now: a small lamp glyph, lit for the side that has it.
        const y = top + 14;
        const pl = under(ctx.player) && phase !== 'snap', nl = under(ctx.npc) && phase !== 'snap';
        const glyph = (x: number, on: boolean): void => {
          g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 11);
          g.fillStyle(on ? ABY.lure : 0x3a3a3a, on ? 1 : 0.8); g.fillCircle(x, y, 6);
          if (on) { g.fillStyle(ABY.lure, 0.25); g.fillCircle(x, y, 15); }
          g.lineStyle(1.5, on ? ABY.lureHot : 0x555555, 1); g.lineBetween(x, y - 6, x, y - 14);
        };
        glyph(W / 2 - 40, pl);
        glyph(W / 2 + 40, nl);
        if (phase === 'flicker') {
          g.fillStyle(ABY.tooth, 0.9);
          for (let i = 0; i < 5; i++) g.fillTriangle(W / 2 - 16 + i * 8, y - 6, W / 2 - 12 + i * 8, y - 6, W / 2 - 14 + i * 8, y + 4);
        }
      },

      destroy() { caught = []; },
    };
  },
};
