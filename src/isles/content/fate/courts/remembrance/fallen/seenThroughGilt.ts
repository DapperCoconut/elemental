import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  GILT, GILT_DARK, GILT_LIT, INK, SEPIA, SEPIA_DARK, SEPIA_LIT, SEPIA_PALE, TIMBER, TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist, fighterColor, stepDt } from '../util';

/**
 * Seen Through Gilt — Hanger Barnaby Quist, in the King's telling the gallery's picture-hanger,
 * who took down the portraits of the drawn the morning after the Draw and hung them again with
 * the face painted out.
 *
 * Big gilt frames stand on easels about the yard, each on a slow turntable. A frame has a front
 * (gilt, the canvas you look at) and a back (stretcher bars). Look through a frame from its
 * front and whoever stands behind it, in line, is IN the picture — FRAMED: they take more from
 * every blow, and the frame begins to paint them in. Stay framed until the portrait is finished
 * and you are HUNG: nailed still on the wall for a moment, and struck. The fan on the floor
 * behind each frame shows the space a sitter would hang in.
 *
 * The exploit: it works on Quist exactly as on you. Get him behind a frame and look at him
 * through it. Strike a frame to spin it round on its turntable — front becomes back — and a
 * frame that had you in it now has him. Past half he brings out a fourth, the turntables quicken
 * and a portrait finishes faster. The bot walks round to the front of whichever frame has you
 * behind it.
 */

const ID = fallenId('remembrance', 'seen-through-gilt');
const HALF = 48;
const TALL = 74;
const SIT_S = 2.2;
const SIT_S_LATE = 1.7;
const FRAMED_TAKEN = 1.4;
const FLIP_CD = 700;

interface Frame { x: number; y: number; ang: number; spin: number; flipAt: number; target: StrikeTarget; sitter: Fighter | null }
interface Sitter { sit: number; frame: Frame | null; hungAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const frames: Frame[] = [];
  const addFrame = (x: number, y: number, ang: number, spin: number): void => {
    const f: Frame = {
      x, y, ang, spin, flipAt: -9999, sitter: null,
      target: ctx.target({
        x, y: y - TALL / 2, r: 26, passThrough: true,
        onStruck: () => {
          if (now - f.flipAt < FLIP_CD) return;
          f.flipAt = now;
          f.ang += Math.PI;
          ctx.sfx('gear-turn');
        },
      }),
    };
    frames.push(f);
  };
  addFrame(W * 0.3, top + 180, 0.4 + rng() * 0.4, 0.22);
  addFrame(W * 0.7, top + 180, -0.5 - rng() * 0.4, -0.2);
  addFrame(W * 0.5, H - 130, 1.4 + rng() * 0.3, 0.18);
  const sitters = new Map<Fighter, Sitter>([[player, { sit: 0, frame: null, hungAt: -9999 }], [npc, { sit: 0, frame: null, hungAt: -9999 }]]);
  let late = false;
  let now = 0;

  const axis = (fr: Frame): { ux: number; uy: number; nx: number; ny: number } => {
    const ux = Math.cos(fr.ang), uy = Math.sin(fr.ang);
    return { ux, uy, nx: -uy, ny: ux };
  };
  /** Does the sight-line a→b pass through this frame's opening? */
  const through = (fr: Frame, a: Pt, b: Pt): boolean => {
    const { ux, uy } = axis(fr);
    const p = { x: fr.x - ux * HALF, y: fr.y - uy * HALF }, r = { x: ux * HALF * 2, y: uy * HALF * 2 };
    const s = { x: b.x - a.x, y: b.y - a.y };
    const den = r.x * s.y - r.y * s.x;
    if (Math.abs(den) < 1e-6) return false;
    const qp = { x: a.x - p.x, y: a.y - p.y };
    const t = (qp.x * s.y - qp.y * s.x) / den;
    const u = (qp.x * r.y - qp.y * r.x) / den;
    return t > 0.06 && t < 0.94 && u > 0 && u < 1;
  };
  const side = (fr: Frame, f: Pt): number => { const { nx, ny } = axis(fr); return (f.x - fr.x) * nx + (f.y - fr.y) * ny; };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        addFrame(W * 0.5, top + 150, rng() * Math.PI, -0.26);
        for (const fr of frames) fr.spin *= 1.5;
        ctx.banner('THE HANGING COMMITTEE SITS', '#f2d68a');
        ctx.sfx('judgement');
      }
      for (const fr of frames) { fr.ang += fr.spin * dt; fr.sitter = null; }
      const both = alive(player) && alive(npc);
      for (const [f, other] of [[player, npc], [npc, player]] as [Fighter, Fighter][]) {
        const s = sitters.get(f);
        if (!s) continue;
        s.frame = null;
        if (both && time - s.hungAt > 1500) {
          for (const fr of frames) {
            if (side(fr, f) < 0 && side(fr, other) > 0 && through(fr, other, f)) { s.frame = fr; fr.sitter = f; break; }
          }
        }
        if (s.frame) s.sit += dt / (late ? SIT_S_LATE : SIT_S);
        else s.sit = Math.max(0, s.sit - dt * 0.6);
        if (s.sit >= 1) {
          s.sit = 0;
          s.hungAt = time;
          ctx.sfx('hammer-forge');
          ctx.flash(f.x, f.y, GILT_LIT);
          if (f === player) { tk.hitPlayer(18, f.x, f.y); ctx.stun(player, 900); }
          else { ctx.hit(npc, 40, f.x, f.y); ctx.stun(npc, 1100); }
        }
      }
    },

    playerTakenMult: () => (sitters.get(player)?.frame ? FRAMED_TAKEN : 1),
    npcTakenMult: () => (sitters.get(npc)?.frame ? FRAMED_TAKEN : 1),

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const me = sitters.get(npc);
      if (me?.frame) {
        // Step out of the picture: sideways off the sight-line.
        const dx = npc.x - player.x, dy = npc.y - player.y, d = Math.hypot(dx, dy) || 1;
        return { x: tk.clampX(npc.x - (dy / d) * 120), y: tk.clampY(npc.y + (dx / d) * 120) };
      }
      let best: Pt | null = null, bestD = 420;
      for (const fr of frames) {
        if (side(fr, player) > -24) continue;
        const dx = fr.x - player.x, dy = fr.y - player.y, d = Math.hypot(dx, dy) || 1;
        const spot = { x: tk.clampX(fr.x + (dx / d) * 150), y: tk.clampY(fr.y + (dy / d) * 150) };
        const dd = dist(npc.x, npc.y, spot.x, spot.y);
        if (dd < bestD) { bestD = dd; best = spot; }
      }
      return best;
    },

    drawGround(g, time) {
      for (const fr of frames) {
        const { ux, uy, nx, ny } = axis(fr);
        // The hanging space behind the canvas: a sepia fan, warm when someone is in it.
        const hot = fr.sitter ? 0.16 + Math.sin(time / 90) * 0.04 : 0.06;
        const L = 300, spread = 0.35;
        g.fillStyle(fr.sitter ? GILT : SEPIA_DARK, hot);
        g.fillPoints([
          { x: fr.x - ux * HALF, y: fr.y - uy * HALF }, { x: fr.x + ux * HALF, y: fr.y + uy * HALF },
          { x: fr.x + ux * (HALF + L * spread) - nx * L, y: fr.y + uy * (HALF + L * spread) - ny * L },
          { x: fr.x - ux * (HALF + L * spread) - nx * L, y: fr.y - uy * (HALF + L * spread) - ny * L },
        ], true);
        // The turntable: an oak disc with a brass rim and a pointer on the front.
        g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(fr.x, fr.y + 2, 128, 64);
        g.fillStyle(TIMBER, 1); g.fillEllipse(fr.x, fr.y, 122, 58);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + fr.ang;
          g.lineStyle(1, TIMBER_LIT, 0.5); g.lineBetween(fr.x + Math.cos(a) * 40, fr.y + Math.sin(a) * 19, fr.x + Math.cos(a) * 58, fr.y + Math.sin(a) * 27);
        }
        g.lineStyle(2.5, GILT, 1); g.strokeEllipse(fr.x, fr.y, 122, 58);
        g.fillStyle(GILT_LIT, 1); g.fillCircle(fr.x + nx * 54, fr.y + ny * 25, 3.5);
      }
      for (const f of [player, npc]) {
        const s = sitters.get(f);
        if (!s || s.sit <= 0 || !alive(f)) continue;
        g.lineStyle(3, GILT_LIT, 0.85); g.beginPath(); g.arc(f.x, f.y + 4, 30, -Math.PI / 2, -Math.PI / 2 + s.sit * Math.PI * 2, false); g.strokePath();
      }
    },

    drawAir(g, time) {
      const sorted = [...frames].sort((a, b) => a.y - b.y);
      for (const fr of sorted) drawEasel(g, fr, axis(fr), time);
    },

    drawHud(g) {
      const y = top + 16;
      for (const [f, x] of [[player, W / 2 - 80], [npc, W / 2 + 80]] as [Fighter, number][]) {
        const s = sitters.get(f);
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 54, y - 12, 108, 24, 5);
        // A tiny gilt frame filling with its sitter's colour as the portrait is painted.
        g.fillStyle(GILT_DARK, 1); g.fillRect(x - 46, y - 8, 20, 16);
        g.fillStyle(SEPIA_PALE, 1); g.fillRect(x - 43, y - 5, 14, 10);
        g.fillStyle(fighterColor(f, 0xd2a448), clamp(s?.sit ?? 0, 0, 1)); g.fillCircle(x - 36, y - 1, 3); g.fillEllipse(x - 36, y + 4, 10, 5);
        g.fillStyle(0x2a241e, 1); g.fillRect(x - 20, y - 4, 66, 8);
        g.fillStyle(s?.frame ? GILT_LIT : SEPIA, 1); g.fillRect(x - 20, y - 4, 66 * clamp(s?.sit ?? 0, 0, 1), 8);
        g.lineStyle(1, GILT, 1); g.strokeRect(x - 20, y - 4, 66, 8);
      }
    },

    destroy() { for (const fr of frames) fr.target.remove(); },
  };
}

/**
 * A gilt frame standing on its easel, drawn as an upright panel over its footprint: from the
 * front the canvas (with its sitter painting in), from behind the stretcher bars and linen.
 */
function drawEasel(g: G, fr: Frame, ax: { ux: number; uy: number; nx: number; ny: number }, time: number): void {
  const { ux, uy, ny } = ax;
  const P = (s: number, z: number): Pt => ({ x: fr.x + ux * s, y: fr.y + uy * s - z });
  shadow(g, fr.x, fr.y + 4, Math.abs(ux) * HALF * 2 + 26, 16, 0.32);
  // Easel legs: two in front of the panel's foot, one raking back.
  g.lineStyle(3, TIMBER_DARK, 1);
  g.lineBetween(P(-HALF * 0.6, 0).x, P(-HALF * 0.6, 0).y + 6, P(-HALF * 0.3, TALL + 12).x, P(-HALF * 0.3, TALL + 12).y);
  g.lineBetween(P(HALF * 0.6, 0).x, P(HALF * 0.6, 0).y + 6, P(HALF * 0.3, TALL + 12).x, P(HALF * 0.3, TALL + 12).y);
  g.lineBetween(fr.x, fr.y - 4, fr.x, fr.y - TALL - 14);
  const quad = (s0: number, s1: number, z0: number, z1: number): Pt[] => [P(s0, z0), P(s1, z0), P(s1, z1), P(s0, z1)];
  const facing = ny > 0;
  const fore = Math.abs(ux);
  g.fillStyle(GILT_DARK, 1); g.fillPoints(quad(-HALF - 4, HALF + 4, 6, TALL + 4), true);
  g.fillStyle(GILT, 1); g.fillPoints(quad(-HALF - 1, HALF + 1, 9, TALL + 1), true);
  g.fillStyle(GILT_LIT, 0.8); g.fillPoints(quad(-HALF - 1, HALF + 1, TALL - 2, TALL + 1), true);
  // Carved corner bosses.
  for (const [s, z] of [[-HALF + 1, 11], [HALF - 1, 11], [HALF - 1, TALL - 1], [-HALF + 1, TALL - 1]]) {
    const c = P(s, z); g.fillStyle(GILT_LIT, 1); g.fillCircle(c.x, c.y, 3);
  }
  if (facing) {
    g.fillStyle(SEPIA_PALE, 1); g.fillPoints(quad(-HALF + 8, HALF - 8, 16, TALL - 8), true);
    g.fillStyle(SEPIA_LIT, 0.5); g.fillPoints(quad(-HALF + 8, HALF - 8, 16, 26), true);
    if (fr.sitter) {
      const col = fighterColor(fr.sitter, 0xd2a448);
      const a = 0.55 + Math.sin(time / 110) * 0.15;
      const sh = P(0, 26), hd = P(0, 48);
      g.fillStyle(dim(col, 0.2), a); g.fillEllipse(sh.x, sh.y, 40 * fore + 4, 20);
      g.fillStyle(col, a); g.fillEllipse(hd.x, hd.y, 18 * fore + 2, 18);
      g.fillStyle(INK, a); g.fillCircle(hd.x - 3 * fore, hd.y - 1, 1.2); g.fillCircle(hd.x + 3 * fore, hd.y - 1, 1.2);
      glow(g, P(0, 40).x, P(0, 40).y, 50, GILT_LIT, 0.05, 3);
    } else {
      g.lineStyle(1, SEPIA, 0.7); g.strokePoints(quad(-HALF + 12, HALF - 12, 20, TALL - 12), true);
    }
    // The brass nameplate, blank.
    const np = P(0, 12);
    g.fillStyle(GILT_DARK, 1); g.fillRect(np.x - 10 * fore - 2, np.y - 3, 20 * fore + 4, 6);
  } else {
    // From behind: brown linen, the stretcher's cross-bars, the hanging wire.
    g.fillStyle(0x8a6a48, 1); g.fillPoints(quad(-HALF + 6, HALF - 6, 12, TALL - 4), true);
    g.lineStyle(4, TIMBER_LIT, 1);
    const a1 = P(-HALF + 8, 14), b1 = P(HALF - 8, TALL - 6), a2 = P(HALF - 8, 14), b2 = P(-HALF + 8, TALL - 6);
    g.lineBetween(a1.x, a1.y, b1.x, b1.y); g.lineBetween(a2.x, a2.y, b2.x, b2.y);
    const w0 = P(-HALF + 14, TALL - 18), w1 = P(HALF - 14, TALL - 18), wt = P(0, TALL + 2);
    g.lineStyle(1, 0xc0b8a8, 0.9); g.lineBetween(w0.x, w0.y, wt.x, wt.y); g.lineBetween(wt.x, wt.y, w1.x, w1.y);
  }
}

export const FALLEN_SEEN_THROUGH_GILT: GimmickDef = {
  id: ID,
  rules: 'Seen through a frame\'s front, whoever stands behind it is framed: they take more, and when the portrait is done, are hung. Strike a frame to turn it.',
  make,
};
