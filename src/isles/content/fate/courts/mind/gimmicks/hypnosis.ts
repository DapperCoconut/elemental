import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { spiralDisc } from '../art';
import { EBONY, GILT, GILT_DARK, IVORY, MIND, MIND_LIT, VELVET, VELVET_DARK } from '../palette';
import { alive, clamp, stepDt, wrapAngle } from '../util';

/**
 * Hypnosis — Mesmerist Swoon.
 *
 * A great spiral wheel is bracketed to one wall of the theatre and spins in bursts. While it
 * spins, whoever *faces* it fills a swoon meter; full, they are held — swaying on the spot,
 * eyes gone to spirals, softer to hit — until the spell breaks.
 *
 * The player faces where they aim; Swoon faces whoever he is walking at. So don't aim at the
 * wheel — and get between it and him, so that when he turns to you he is looking straight into
 * it. He knows the trick too: he will try to stand between you and the wheel so that aiming at
 * him means staring into it. Between spins the wheel rolls to another wall (its next bracket
 * shows a ghost of it first).
 */

const SLOTS: Pt[] = [{ x: 480, y: 128 }, { x: 40, y: 368 }, { x: 920, y: 368 }, { x: 480, y: 606 }];
const R = 46;
const HELD_MS = 1300;
const IMMUNE_MS = 1900;

interface Swoon { meter: number; heldUntil: number; immuneUntil: number; gazing: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const SPIN = ctx.hard ? 5000 : 4500;
  const REST = ctx.hard ? 2000 : 2600;
  const ROLL = 700;
  const FILL = ctx.hard ? 74 : 60;
  const CONE = ctx.hard ? 0.56 : 0.5;
  const swoons = new Map<Fighter, Swoon>([[player, mk()], [npc, mk()]]);
  let slot = 0, nextSlot = 1, prevSlot = 0;
  let spinUntil = 0, restUntil = 0, rollFrom = 0;
  let angle = 0, spinSpeed = 0;
  let started = false;
  function mk(): Swoon { return { meter: 0, heldUntil: 0, immuneUntil: 0, gazing: false }; }

  const pos = (time: number): Pt => {
    // Rolling between brackets.
    if (time < rollFrom + ROLL && rollFrom > 0) {
      const k = clamp((time - rollFrom) / ROLL, 0, 1);
      const a = SLOTS[prevSlot], b = SLOTS[slot];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    return SLOTS[slot];
  };
  const spinning = (time: number) => time < spinUntil;

  const facesWheel = (f: Fighter, w: Pt) => Math.abs(wrapAngle(ctx.facing(f) - Math.atan2(w.y - f.y, w.x - f.x))) < CONE;

  function pickNext(): number {
    let n = slot;
    while (n === slot) n = Math.floor(rng() * SLOTS.length);
    return n;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        slot = 0; nextSlot = pickNext();
        spinUntil = time + 1200 + SPIN;
        restUntil = spinUntil + REST;
        ctx.banner('DON\'T LOOK AT THE WHEEL', '#e2ccff');
      }
      if (!spinning(time) && time >= restUntil) {
        prevSlot = slot; slot = nextSlot; nextSlot = pickNext();
        rollFrom = time;
        spinUntil = time + ROLL + SPIN;
        restUntil = spinUntil + REST;
        ctx.sfx('gear-turn');
      }
      const on = spinning(time) && time > rollFrom + ROLL;
      spinSpeed += ((on ? 7 : 0.4) - spinSpeed) * Math.min(1, dt * 3);
      angle += spinSpeed * dt;
      const w = pos(time);
      for (const [f, s] of swoons) {
        if (!alive(f)) continue;
        const held = time < s.heldUntil;
        s.gazing = on && !held && time >= s.immuneUntil && facesWheel(f, w);
        if (held) {
          // Swaying: a slow drift toward the wheel.
          const a = Math.atan2(w.y - f.y, w.x - f.x);
          ctx.nudge(f, Math.cos(a) * 26 * dt + Math.sin(time / 180) * 0.6, Math.sin(a) * 26 * dt);
          continue;
        }
        s.meter = clamp(s.meter + (s.gazing ? FILL : -38) * dt, 0, 100);
        if (s.meter >= 100) {
          s.meter = 0;
          s.heldUntil = time + HELD_MS;
          s.immuneUntil = time + HELD_MS + IMMUNE_MS;
          ctx.stun(f, HELD_MS);
          ctx.float(f.x, f.y - 50, 'MESMERISED', '#e2ccff');
          ctx.sfx('hush');
        }
      }
    },

    playerTakenMult() { return ctx.scene.time.now < (swoons.get(player)?.heldUntil ?? 0) ? 1.25 : 1; },
    npcTakenMult() { return ctx.scene.time.now < (swoons.get(npc)?.heldUntil ?? 0) ? 1.25 : 1; },

    npcSeek() {
      if (!alive(player)) return null;
      // Stand between you and the wheel: to aim at him, you must look into it.
      const w = SLOTS[spinning(ctx.scene.time.now) ? slot : nextSlot];
      const dx = w.x - player.x, dy = w.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(240, Math.max(80, d - 110));
      return { x: clamp(player.x + (dx / d) * k, 60, W - 60), y: clamp(player.y + (dy / d) * k, top + 50, H - 40) };
    },

    drawGround(g, time) {
      const w = pos(time);
      // Rings rippling out across the boards while it spins.
      if (spinning(time) && time > rollFrom + ROLL) {
        for (let i = 0; i < 5; i++) {
          const ph = ((time / 900) + i / 5) % 1;
          g.lineStyle(3, i % 2 ? MIND : IVORY, 0.22 * (1 - ph)); g.strokeCircle(w.x, w.y, R + ph * 420);
        }
      }
      // The next bracket, ghosted in during the rest.
      if (!spinning(time)) {
        const n = SLOTS[nextSlot];
        const k = clamp(1 - (restUntil - time) / 1200, 0, 1);
        if (k > 0) { g.lineStyle(2, MIND_LIT, 0.2 + k * 0.4); g.strokeCircle(n.x, n.y, R + 4); spiralDisc(g, n.x, n.y, R, angle, 0.15 * k); }
      }
    },

    drawAir(g, time) {
      const w = pos(time);
      const on = spinning(time) && time > rollFrom + ROLL;
      // The bracket and the wheel.
      g.fillStyle(EBONY, 1); g.fillRect(w.x - 6, w.y - 6, 12, 12);
      if (on) glow(g, w.x, w.y, R * 2, MIND, 0.05, 3);
      spiralDisc(g, w.x, w.y, R, angle, 1);
      g.lineStyle(2, GILT_DARK, 1); g.strokeCircle(w.x, w.y, R + 6);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + angle * 0.1; g.fillStyle(GILT, 1); g.fillCircle(w.x + Math.cos(a) * (R + 8), w.y + Math.sin(a) * (R + 8), 2); }
      for (const [f, s] of swoons) {
        if (!alive(f)) continue;
        // Gazing: a pale line from their eyes into the spiral.
        if (s.gazing) { g.lineStyle(1.5, MIND_LIT, 0.25 + s.meter / 250); g.lineBetween(f.x, f.y - 16, w.x, w.y); }
        // Held: spiral eyes and a swaying ring of stars.
        if (time < s.heldUntil) {
          for (const k of [-1, 1]) spiralDisc(g, f.x + k * 7, f.y - 44, 5, -time / 120, 0.9);
          for (let i = 0; i < 4; i++) {
            const a = time / 300 + (i / 4) * Math.PI * 2;
            g.fillStyle(i % 2 ? MIND_LIT : IVORY, 0.9); g.fillCircle(f.x + Math.cos(a) * 22, f.y - 58 + Math.sin(a) * 6, 2.2);
          }
        } else if (s.meter > 60) {
          g.lineStyle(2, VELVET, 0.6); g.strokeEllipse(f.x, f.y - 44, 18, 6);
        }
      }
    },

    drawHud(g) {
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const s = swoons.get(f);
        if (!s) continue;
        const w = 120, x0 = d > 0 ? x : x - w, y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        const fw = (w * s.meter) / 100;
        g.fillStyle(s.meter > 70 ? MIND_LIT : MIND, 0.95); g.fillRoundedRect(d > 0 ? x0 : x0 + w - fw, y, Math.max(2, fw), 8, 4);
        g.fillStyle(VELVET_DARK, 1);
        spiralDisc(g, d > 0 ? x0 + w + 12 : x0 - 12, y + 4, 6, s.meter / 10, 1);
      }
    },
  };
}

export const HYPNOSIS: GimmickDef = {
  id: 'mind-hypnosis',
  rules: 'While the spiral wheel spins, whoever faces it is slowly mesmerised and held. Aim away from it, and turn Swoon to face it.',
  make,
};
