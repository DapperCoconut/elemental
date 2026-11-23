import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { nib, strikeLine } from '../art';
import { INK, INK_SOFT, PAPER_LIT, RED, RED_LIT } from '../palette';
import { alive, chord, clamp, dist, lineDist, stepDt } from '../util';

/**
 * Redacted — Censor Blackline.
 *
 * The Censor reads the room the way he reads a proof. Every few seconds his red pen rules a line
 * straight across the floor, through wherever you are standing, the nib travelling end to end
 * with the wet red line behind it. When the line is finished a black redaction bar comes down on
 * it: whoever is under the bar is *redacted* — silenced for a beat, a black bar over the mouth —
 * and the bar lies there for a few seconds afterwards, censoring any shot that tries to cross it.
 *
 * The pen is a real thing in the room. Strike the nib while it is still ruling and it skids:
 * the line swerves to run through the Censor instead, and his own bar comes down on him. He
 * knows the trick too — strike it near him and it swerves back through you. And a lying bar
 * censors his shots as surely as yours: put one between you and read in peace.
 */

const HALF = 30;
const BAR_MS = 4600;
const LAND_WARN = 380;
const NIB_R = 22;

interface Mark {
  /** A point the line runs through, and its angle. */
  x: number; y: number; a: number;
  /** Chord across the room (recomputed on a swerve). */
  x0: number; y0: number; x1: number; y1: number;
  penAt: number; penMs: number;
  /** 0..1 of the chord already ruled. */
  prog: number;
  landAt: number;
  barUntil: number;
  swerved: boolean;
  dealt: boolean;
  nib: StrikeTarget | null;
  seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const marks: Mark[] = [];
  const every = ctx.hard ? 2900 : 3600;
  const penMs = ctx.hard ? 1050 : 1300;
  const silenceMs = ctx.hard ? 2200 : 1800;
  let next = 0;
  let started = false;
  /** Who is wearing a bar over the mouth, and until when (for the art). */
  const gagged = new Map<Fighter, number>();
  let censoredFx: { x: number; y: number; at: number }[] = [];

  const rechord = (m: Mark) => {
    const c = chord(m.x, m.y, m.a, 30, top + 20, W - 30, H - 20);
    m.x0 = c[0]; m.y0 = c[1]; m.x1 = c[2]; m.y1 = c[3];
  };
  const nibPos = (m: Mark) => ({ x: m.x0 + (m.x1 - m.x0) * m.prog, y: m.y0 + (m.y1 - m.y0) * m.prog });

  function rule(time: number): void {
    const angles = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4];
    const a = angles[Math.floor(rng() * angles.length)];
    const m: Mark = {
      x: player.x + (rng() - 0.5) * 30, y: player.y + (rng() - 0.5) * 30, a,
      x0: 0, y0: 0, x1: 0, y1: 0, penAt: time, penMs, prog: 0,
      landAt: 0, barUntil: 0, swerved: false, dealt: false, nib: null, seed: rng() * 100,
    };
    rechord(m);
    // Start from the end nearer the Censor: the pen comes from his desk.
    if (dist(m.x1, m.y1, npc.x, npc.y) < dist(m.x0, m.y0, npc.x, npc.y)) {
      [m.x0, m.y0, m.x1, m.y1] = [m.x1, m.y1, m.x0, m.y0];
    }
    const p = nibPos(m);
    m.nib = ctx.target({
      x: p.x, y: p.y, r: NIB_R,
      onStruck: (by) => {
        if (m.swerved || m.prog >= 1) return;
        m.swerved = true;
        const onto = by === 'player' ? npc : player;
        // Keep the slant, move the line through the other fighter, carry on from the nib.
        const here = nibPos(m);
        m.x = onto.x; m.y = onto.y;
        const c = chord(m.x, m.y, m.a, 30, top + 20, W - 30, H - 20);
        const fwd = dist(here.x, here.y, c[0], c[1]) < dist(here.x, here.y, c[2], c[3]);
        [m.x0, m.y0, m.x1, m.y1] = fwd ? [c[0], c[1], c[2], c[3]] : [c[2], c[3], c[0], c[1]];
        m.prog = Math.min(m.prog, 0.5);
        ctx.float(here.x, here.y - 30, by === 'player' ? 'THE PEN SKIDS!' : 'RE-RULED', '#f05a5a');
        ctx.sfx('snap-back');
      },
    });
    marks.push(m);
    ctx.sfx('slash');
  }

  function redact(f: Fighter, m: Mark, time: number): void {
    if (!alive(f) || lineDist(f.x, f.y, m.x, m.y, m.a) > HALF + 14) return;
    ctx.silence(f, silenceMs);
    ctx.hit(f, ctx.hard ? 8 : 6, f.x, f.y);
    gagged.set(f, time + silenceMs);
    ctx.float(f.x, f.y - 50, '[REDACTED]', '#ffffff');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; next = time + 1400; }
      if (time >= next && alive(player)) { next = time + every; rule(time); }

      for (let i = marks.length - 1; i >= 0; i--) {
        const m = marks[i];
        if (m.prog < 1) {
          m.prog = Math.min(1, m.prog + dt * 1000 / m.penMs);
          const p = nibPos(m);
          m.nib?.moveTo(p.x, p.y);
          if (m.prog >= 1) {
            m.nib?.remove(); m.nib = null;
            m.landAt = time + LAND_WARN;
            m.barUntil = m.landAt + BAR_MS;
            ctx.sfx('whoosh');
          }
          continue;
        }
        if (!m.dealt && time >= m.landAt) {
          m.dealt = true;
          ctx.sfx('stone-slam');
          redact(player, m, time);
          redact(npc, m, time);
        }
        if (m.dealt && time < m.barUntil) {
          // A lying bar censors every shot that tries to cross it.
          const len = dist(m.x0, m.y0, m.x1, m.y1);
          for (let d = 0; d <= len; d += HALF * 1.6) {
            const sx = m.x0 + ((m.x1 - m.x0) * d) / len, sy = m.y0 + ((m.y1 - m.y0) * d) / len;
            for (const s of ctx.shotsNear(sx, sy, HALF + 8)) {
              if (lineDist(s.x, s.y, m.x, m.y, m.a) > HALF) continue;
              s.block();
              if (censoredFx.length < 12) censoredFx.push({ x: s.x, y: s.y, at: time });
            }
          }
        }
        if (time > m.barUntil && m.dealt) marks.splice(i, 1);
      }
      censoredFx = censoredFx.filter((c) => time - c.at < 600);
      for (const [f, until] of gagged) if (time > until) gagged.delete(f);
    },

    npcSeek() {
      // Step out from under any line that is being ruled or is about to land on him.
      for (const m of marks) {
        if (m.dealt) continue;
        const d = lineDist(npc.x, npc.y, m.x, m.y, m.a);
        if (d < HALF + 60) {
          const nx = -Math.sin(m.a), ny = Math.cos(m.a);
          const side = (npc.x - m.x) * nx + (npc.y - m.y) * ny >= 0 ? 1 : -1;
          return { x: clamp(npc.x + nx * side * 140, 60, W - 60), y: clamp(npc.y + ny * side * 140, top + 50, H - 40) };
        }
      }
      // Otherwise read from a lectern's distance, behind a lying bar if there is one.
      const bar = marks.find((m) => m.dealt);
      if (bar) {
        const nx = -Math.sin(bar.a), ny = Math.cos(bar.a);
        const ps = (player.x - bar.x) * nx + (player.y - bar.y) * ny >= 0 ? 1 : -1;
        return { x: clamp(player.x - nx * ps * 260, 60, W - 60), y: clamp(player.y - ny * ps * 220, top + 50, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 250, 60, W - 60), y: clamp(player.y + Math.sin(a) * 220, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const m of marks) {
        const len = dist(m.x0, m.y0, m.x1, m.y1);
        const ux = (m.x1 - m.x0) / (len || 1), uy = (m.y1 - m.y0) / (len || 1);
        if (m.prog < 1 || time < m.landAt) {
          // The ruler's guide: a faint dotted red rule the whole way across.
          for (let d = 0; d < len; d += 14) {
            g.fillStyle(RED, 0.25); g.fillCircle(m.x0 + ux * d, m.y0 + uy * d, 1.6);
          }
          // Margins of the bar-to-be.
          const nx = -uy, ny = ux;
          g.lineStyle(1, RED, 0.22);
          g.lineBetween(m.x0 + nx * HALF, m.y0 + ny * HALF, m.x1 + nx * HALF, m.y1 + ny * HALF);
          g.lineBetween(m.x0 - nx * HALF, m.y0 - ny * HALF, m.x1 - nx * HALF, m.y1 - ny * HALF);
          // The wet red line behind the nib.
          const p = nibPos(m);
          strikeLine(g, m.x0, m.y0, p.x, p.y, 4, 0.95);
          if (m.prog >= 1) {
            // The bar's shadow falling onto the line.
            const k = clamp(1 - (m.landAt - time) / LAND_WARN, 0, 1);
            g.lineStyle(HALF * 2 * (0.4 + k * 0.6), INK, 0.15 + k * 0.35);
            g.lineBetween(m.x0, m.y0, m.x1, m.y1);
          }
          continue;
        }
        // The bar itself: black, edges a little ragged, a gloss down its length; fades at the end.
        const fade = clamp((m.barUntil - time) / 500, 0, 1);
        const slam = clamp((time - m.landAt) / 160, 0, 1);
        const nx = -uy, ny = ux;
        const hw = HALF * (1.25 - slam * 0.25);
        g.lineStyle(hw * 2 + 6, 0x000000, 0.2 * fade); g.lineBetween(m.x0 + 3, m.y0 + 5, m.x1 + 3, m.y1 + 5);
        g.lineStyle(hw * 2, INK, 0.96 * fade); g.lineBetween(m.x0, m.y0, m.x1, m.y1);
        for (let d = 8; d < len; d += 11) {
          const j = Math.sin(d * 0.37 + m.seed) * 3;
          g.fillStyle(INK, fade);
          g.fillCircle(m.x0 + ux * d + nx * (hw + j * 0.5), m.y0 + uy * d + ny * (hw + j * 0.5), 2.5);
          g.fillCircle(m.x0 + ux * d - nx * (hw - j * 0.5), m.y0 + uy * d - ny * (hw - j * 0.5), 2.2);
        }
        g.lineStyle(3, INK_SOFT, 0.7 * fade);
        g.lineBetween(m.x0 + nx * hw * 0.5, m.y0 + ny * hw * 0.5, m.x1 + nx * hw * 0.5, m.y1 + ny * hw * 0.5);
        // The red line still showing at the bar's ends, where the ink ran out from under it.
        strikeLine(g, m.x0 - ux * 10, m.y0 - uy * 10, m.x0 + ux * 6, m.y0 + uy * 6, 4, 0.8 * fade);
        if (slam < 1) {
          g.lineStyle(4, PAPER_LIT, (1 - slam) * 0.8);
          g.lineBetween(m.x0 + nx * (hw + 8), m.y0 + ny * (hw + 8), m.x1 + nx * (hw + 8), m.y1 + ny * (hw + 8));
          g.lineBetween(m.x0 - nx * (hw + 8), m.y0 - ny * (hw + 8), m.x1 - nx * (hw + 8), m.y1 - ny * (hw + 8));
        }
      }
    },

    drawAir(g, time) {
      // The pen, riding its line.
      for (const m of marks) {
        if (m.prog >= 1) continue;
        const p = nibPos(m);
        const a = Math.atan2(m.y1 - m.y0, m.x1 - m.x0);
        const lift = 6 + Math.sin(time / 60) * 1.5;
        g.fillStyle(0x000000, 0.2); g.fillEllipse(p.x + 10, p.y + 6, 40, 10);
        nib(g, p.x, p.y - lift, 26, a - 0.6);
        if (!m.swerved) { g.lineStyle(1.5, RED_LIT, 0.4 + Math.sin(time / 120) * 0.3); g.strokeCircle(p.x, p.y, NIB_R); }
      }
      // A black bar over the mouth of anyone redacted.
      for (const [f, until] of gagged) {
        if (!alive(f)) continue;
        const k = clamp((until - time) / 300, 0, 1);
        g.fillStyle(INK, 0.95 * k); g.fillRect(f.x - 15, f.y - 6, 30, 9);
        g.fillStyle(INK_SOFT, 0.8 * k); g.fillRect(f.x - 15, f.y - 6, 30, 2);
      }
      // Shots dying on a bar.
      for (const c of censoredFx) {
        const k = (time - c.at) / 600;
        g.fillStyle(INK, 1 - k); g.fillRect(c.x - 10 - k * 6, c.y - 4, 20 + k * 12, 8);
        g.lineStyle(1.5, RED, 1 - k); g.strokeRect(c.x - 12 - k * 6, c.y - 6, 24 + k * 12, 12);
      }
    },
  };
}

export const REDACTED: GimmickDef = {
  id: 'libretto-redacted',
  rules: 'The red pen rules a line through you, then a black bar lands on it: whoever is under it is silenced. Lying bars censor shots. Strike the nib to swerve the line through the Censor.',
  make,
};
