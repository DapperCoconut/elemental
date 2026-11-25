import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, mulberry, type G } from '../../../../../art/IsleArt';
import { crystalPoint, poly } from '../art';
import {
  AGATE_A, AGATE_B, AGATE_C, AGATE_D, AMETHYST, AMETHYST_DARK, AMETHYST_LIT, CHALCEDONY, IRON, RIND, RIND_DARK, RIND_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Shut Geode — Resealer Dunstan Quarle, who in the King's telling closed cracked geodes back
 * up for the Regent: whatever Gravane wanted kept, went inside, and the halves were set again.
 *
 * Two halves of a great geode lie open at either side of the yard, hollow sides facing, lined
 * with amethyst. On Quarle's call they slide together on their skids. Their shells are walls:
 * you cannot cross a rim, only leave a half by its open face. Where the two open faces meet, the
 * geode shuts — a full sphere — and whoever is inside it is crushed and held. The chalk circle
 * on the floor shows where it will shut. Get out past the tips, north or south, in time.
 *
 * Each half's tips carry an iron wedge. Strike a wedge while the halves move and that half jams
 * where it is: the other half comes all the way to meet it, and the geode shuts *there*. So jam
 * the half nearest him and let the other one bring the stone to him. He does the same to you.
 * Halfway, the halves move faster, rest shorter, and bite harder.
 */

const ID = fallenId('geode', 'shut-geode');
const R = 140;
const SHELL = 16;
const REST_GAP = 130;
const WEDGE_R = 22;
const CRUSH = 30;
const HOLD_MS = 1700;

type Phase = 'open' | 'warn' | 'closing' | 'shut' | 'opening';
interface Half { dir: 1 | -1; x: number; restX: number; jammed: boolean; wedges: StrikeTarget[]; jamAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const cy = (top + H) / 2 + 4;
  // West half: its hollow faces east (+1), its shell lies west of its flat face.
  const west: Half = { dir: 1, x: REST_GAP, restX: REST_GAP, jammed: false, wedges: [], jamAt: -9999 };
  const east: Half = { dir: -1, x: W - REST_GAP, restX: W - REST_GAP, jammed: false, wedges: [], jamAt: -9999 };
  const halves = [west, east];
  let phase: Phase = 'open';
  let phaseAt = 0;
  let started = false;
  let halved = false;
  let meetX = W / 2;
  const rngArt = mulberry(0x5e0de);
  const shellArt = Array.from({ length: 22 }, () => ({ a: rngArt(), w: 0.7 + rngArt() * 0.6, l: 0.7 + rngArt() * 0.7, c: rngArt() }));

  const speed = () => (halved ? 120 : 92);
  const openMs = () => (halved ? 3300 : 4600);
  const warnMs = () => ctx.tk.warn(1200);

  const tipY = (k: number) => cy + k * (R + 6);
  for (const h of halves) {
    for (const k of [-1, 1]) {
      h.wedges.push(ctx.target({
        x: h.x, y: tipY(k), r: WEDGE_R,
        onStruck: () => {
          if ((phase !== 'warn' && phase !== 'closing') || h.jammed) return;
          h.jammed = true; h.jamAt = ctx.scene.time.now;
          ctx.sfx('anvil');
          ctx.flash(h.x, tipY(k), 0xfff0c8);
          predict();
        },
      }));
    }
  }

  /** Where the open faces will meet, given which halves are jammed. */
  function predict(): void {
    if (west.jammed && east.jammed) meetX = (west.x + east.x) / 2;
    else if (west.jammed) meetX = west.x;
    else if (east.jammed) meetX = east.x;
    else meetX = (west.x + east.x) / 2;
  }

  /** Keep a fighter on whichever side of a half's rim they are on. */
  function wall(h: Half, f: Fighter): void {
    if (!alive(f)) return;
    // Points on the shell's side of the flat face only.
    if ((f.x - h.x) * h.dir > 4) return;
    const dx = f.x - h.x, dy = f.y - cy;
    const d = Math.hypot(dx, dy) || 0.001;
    const inner = R - SHELL - 14, outer = R + SHELL + 16;
    if (d >= inner && d < outer) {
      // Against the shell: back out to the side they are on.
      const target = d < R ? inner : outer;
      ctx.nudge(f, (dx / d) * (target - d), (dy / d) * (target - d));
    }
  }

  function setPhase(p: Phase, time: number): void { phase = p; phaseAt = time; }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; phaseAt = time; }
      if (!halved && alive(npc) && npc.hp < npc.maxHp * 0.5) {
        halved = true;
        ctx.banner('QUARLE GREASES THE SKIDS', '#c49af0');
        ctx.sfx('gear-turn');
      }
      if (phase === 'open' && time - phaseAt >= openMs()) {
        setPhase('warn', time); predict();
        ctx.sfx('stone-rise');
        ctx.banner('THE GEODE CLOSES', '#e8dcd0');
      } else if (phase === 'warn' && time - phaseAt >= warnMs()) {
        setPhase('closing', time);
      } else if (phase === 'closing') {
        const v = speed() * dt;
        if (!west.jammed) west.x = Math.min(west.x + v, east.x);
        if (!east.jammed) east.x = Math.max(east.x - v, west.x);
        if (west.jammed && east.jammed) {
          // Both jammed: the halves stick fast; nothing shuts this time.
          setPhase('opening', time);
          ctx.sfx('clang');
        } else if (east.x - west.x <= 1) {
          meetX = (west.x + east.x) / 2;
          setPhase('shut', time);
          ctx.sfx('stone-slam'); ctx.sfx('quake');
          for (const f of [player, npc]) {
            if (!alive(f) || dist(f.x, f.y, meetX, cy) > R - 6) continue;
            ctx.hit(f, Math.round(CRUSH * (halved ? 1.3 : 1)), f.x, f.y);
            ctx.stun(f, halved ? 1500 : 1200);
          }
        }
        predict();
      } else if (phase === 'shut' && time - phaseAt >= HOLD_MS) {
        setPhase('opening', time);
        ctx.sfx('stone-rise');
      } else if (phase === 'opening') {
        const v = 160 * dt;
        west.x = Math.max(west.restX, west.x - v);
        east.x = Math.min(east.restX, east.x + v);
        if (west.x <= west.restX && east.x >= east.restX) {
          west.jammed = false; east.jammed = false;
          setPhase('open', time);
        }
      }
      for (const h of halves) h.wedges.forEach((w, i) => w.moveTo(h.x, tipY(i ? 1 : -1)));
      if (phase !== 'shut') for (const h of halves) for (const f of [player, npc]) wall(h, f);
    },

    destroy() { for (const h of halves) for (const w of h.wedges) w.remove(); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      if (phase !== 'warn' && phase !== 'closing') return null;
      const inside = (p: Pt, pad: number) => dist(p.x, p.y, meetX, cy) < R + pad;
      // Out of the circle, by the open face, round the nearer tip.
      if (inside(npc, 30)) {
        const k = npc.y < cy ? -1 : 1;
        const sy = clamp(cy + k * (R + 44), top + 30, H - 30);
        for (const h of halves) {
          if ((npc.x - h.x) * h.dir < 0 && dist(npc.x, npc.y, h.x, cy) < R) {
            return { x: clamp(h.x + h.dir * 40, 60, W - 60), y: npc.y + (sy - npc.y) * 0.4 };
          }
        }
        return { x: clamp(npc.x, 60, W - 60), y: sy };
      }
      // Safe: jam the half that would bring the shut down on the player.
      for (const h of halves) {
        if (h.jammed) continue;
        if (dist(player.x, player.y, h.x, cy) > R - 20) continue;
        const k = npc.y < cy ? -1 : 1;
        return { x: clamp(h.x + (npc.x - h.x) * 0.2, 60, W - 60), y: clamp(tipY(k) + k * 30, top + 30, H - 30) };
      }
      return null;
    },

    drawGround(g, time) {
      // The skids: two worn grooves the halves ride in.
      for (const k of [-1, 1]) {
        const y = cy + k * (R - 14);
        g.lineStyle(7, dim(RIND, 0.2), 0.35); g.lineBetween(40, y, W - 40, y);
        g.lineStyle(1.5, RIND_LIT, 0.3); g.lineBetween(40, y - 3, W - 40, y - 3);
      }
      if (phase === 'warn' || phase === 'closing') {
        const k = phase === 'warn' ? clamp((time - phaseAt) / warnMs(), 0, 1) : 1;
        g.fillStyle(AMETHYST_DARK, 0.08 + k * 0.1); g.fillCircle(meetX, cy, R);
        g.lineStyle(3, 0xf6f0e8, 0.5 + k * 0.4); g.strokeCircle(meetX, cy, R);
        // Chalk hatching round the inside of the ring.
        for (let i = 0; i < 36; i++) {
          const a = (i / 36) * Math.PI * 2;
          g.lineStyle(1.5, 0xf6f0e8, 0.35 + k * 0.3);
          g.lineBetween(meetX + Math.cos(a) * (R - 14), cy + Math.sin(a) * (R - 14), meetX + Math.cos(a + 0.08) * R, cy + Math.sin(a + 0.08) * R);
        }
        // The two ways out: arrows past the tips.
        for (const s of [-1, 1]) {
          const ay = cy + s * (R + 24);
          g.lineStyle(2, 0xf6f0e8, 0.5); g.lineBetween(meetX - 12, ay - s * 8, meetX, ay + s * 4); g.lineBetween(meetX + 12, ay - s * 8, meetX, ay + s * 4);
        }
      }
    },

    drawAir(g, time) {
      if (phase === 'shut') { drawSphere(g, meetX, cy, time - phaseAt); return; }
      for (const h of halves) drawHalf(g, h, cy, shellArt, time);
    },

    drawHud(g, time) {
      // A small geode icon: two halves drawing together through the cycle.
      const x = W / 2, y = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 46, y - 13, 92, 26, 7);
      let gap = 1;
      if (phase === 'open') gap = 1;
      else if (phase === 'warn') gap = 0.85 + Math.sin(time / 60) * 0.05;
      else if (phase === 'closing') gap = clamp((east.x - west.x) / (W - REST_GAP * 2), 0, 1);
      else if (phase === 'shut') gap = 0;
      else gap = clamp((east.x - west.x) / (W - REST_GAP * 2), 0, 1);
      const o = 2 + gap * 22;
      for (const s of [-1, 1]) {
        const a0 = s < 0 ? Math.PI / 2 : -Math.PI / 2;
        g.fillStyle(RIND, 1); g.beginPath(); g.arc(x + s * o, y, 10, a0, a0 + Math.PI, false); g.closePath(); g.fillPath();
        g.fillStyle(AMETHYST, 1); g.beginPath(); g.arc(x + s * o, y, 6, a0, a0 + Math.PI, false); g.closePath(); g.fillPath();
      }
      for (const [i, h] of halves.entries()) {
        if (!h.jammed) continue;
        g.fillStyle(IRON, 1); g.fillTriangle(x + (i ? 36 : -36) - 4, y - 7, x + (i ? 36 : -36) + 4, y - 7, x + (i ? 36 : -36), y + 6);
      }
    },
  };
}

/**
 * One open half seen from above: a thick shell of rind, agate rings and a chalcedony skin, the
 * hollow lined with amethyst points leaning in, the broken face banded, and iron wedges at its tips.
 */
function drawHalf(g: G, h: Half, cy: number, art: { a: number; w: number; l: number; c: number }[], time: number): void {
  const x = h.x;
  const a0 = h.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  const arcPts = (r: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 28; i++) { const a = a0 + (i / 28) * Math.PI; pts.push({ x: x + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
    return pts;
  };
  const band = (r0: number, r1: number, col: number, alpha = 1) => {
    const outer = arcPts(r1), inner = arcPts(r0).reverse();
    poly(g, [...outer, ...inner], col, alpha);
  };
  band(R + SHELL - 4, R + SHELL + 6, RIND_DARK);
  band(R + 6, R + SHELL - 4, RIND);
  band(R + 1, R + 6, AGATE_A);
  band(R - 4, R + 1, AGATE_B);
  band(R - 8, R - 4, AGATE_C);
  band(R - 12, R - 8, AGATE_D);
  band(R - SHELL, R - 12, CHALCEDONY, 0.9);
  // Rind knobs on the outside.
  for (let i = 0; i < 9; i++) {
    const a = a0 + ((i + 0.5) / 9) * Math.PI;
    g.fillStyle(i % 2 ? RIND_LIT : RIND_DARK, 0.6); g.fillCircle(x + Math.cos(a) * (R + SHELL + 2), cy + Math.sin(a) * (R + SHELL + 2), 5);
  }
  // Amethyst points lining the hollow, leaning toward the centre.
  for (const p of art) {
    const a = a0 + (0.05 + p.a * 0.9) * Math.PI;
    const bx = x + Math.cos(a) * (R - SHELL + 2), by = cy + Math.sin(a) * (R - SHELL + 2);
    const lean = Math.atan2(-Math.sin(a), -Math.cos(a)) + Math.PI / 2;
    crystalPoint(g, bx, by, 9 * p.w, 22 * p.l, lean, p.c < 0.25 ? AMETHYST_LIT : p.c < 0.7 ? AMETHYST : AMETHYST_DARK, 0.95);
  }
  // The broken face: a straight banded edge between the tips.
  g.lineStyle(4, AGATE_B, 0.9); g.lineBetween(x, cy - R - SHELL, x, cy - R + SHELL);
  g.lineBetween(x, cy + R - SHELL, x, cy + R + SHELL);
  g.lineStyle(1.5, lit(AGATE_D, 0.3), 0.9); g.lineBetween(x - h.dir * 2, cy - R - SHELL, x - h.dir * 2, cy - R + SHELL);
  g.lineBetween(x - h.dir * 2, cy + R - SHELL, x - h.dir * 2, cy + R + SHELL);
  // Wedges at the tips: drawn ready, or driven home with a spark.
  for (const k of [-1, 1]) {
    const wy = cy + k * (R + 6);
    const driven = h.jammed;
    const off = driven ? 2 : 12;
    g.fillStyle(IRON, 1);
    g.fillTriangle(x + h.dir * off, wy - 9, x + h.dir * off, wy + 9, x + h.dir * (off - 22), wy);
    g.fillStyle(lit(IRON, 0.35), 1); g.fillRect(x + h.dir * off - (h.dir > 0 ? 0 : 4), wy - 9, 4, 18);
    if (driven) {
      const since = time - h.jamAt;
      if (since < 500) { g.lineStyle(2, 0xfff0c8, 1 - since / 500); g.strokeCircle(x, wy, 10 + since / 25); }
    } else {
      g.lineStyle(1.5, 0xfff0c8, 0.3 + Math.sin(time / 220) * 0.2); g.strokeCircle(x + h.dir * (off - 10), wy, WEDGE_R);
    }
  }
}

/** The geode shut: a whole knobbly rind dome, a seam down its middle, dust jolting off it. */
function drawSphere(g: G, x: number, cy: number, since: number): void {
  const jolt = since < 200 ? (1 - since / 200) * 5 : 0;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 8, cy + 14, R * 2.1, R * 1.9);
  g.fillStyle(RIND_DARK, 1); g.fillCircle(x, cy + jolt, R + SHELL + 4);
  g.fillStyle(RIND, 1); g.fillCircle(x - 6, cy - 6 + jolt, R + SHELL - 4);
  for (let i = 0; i < 18; i++) {
    const a = i * 2.39, r = (R - 10) * Math.sqrt((i + 0.5) / 18);
    g.fillStyle(i % 3 ? RIND_LIT : RIND_DARK, 0.5); g.fillCircle(x + Math.cos(a) * r, cy + Math.sin(a) * r + jolt, 9 + (i % 4) * 3);
  }
  g.fillStyle(lit(RIND, 0.25), 0.5); g.fillEllipse(x - R * 0.35, cy - R * 0.4 + jolt, R * 0.8, R * 0.4);
  g.lineStyle(3, AGATE_B, 0.9); g.lineBetween(x, cy - R - SHELL + jolt, x, cy + R + SHELL + jolt);
  g.lineStyle(1, AMETHYST_LIT, 0.6); g.lineBetween(x + 1.5, cy - R + jolt, x + 1.5, cy + R + jolt);
  glow(g, x, cy, R * 0.4, AMETHYST, 0.03, 2);
  if (since < 600) {
    const k = since / 600;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(0xe8e2ea, 0.6 * (1 - k)); g.fillCircle(x + Math.cos(a) * (R + 20 + k * 50), cy + Math.sin(a) * (R + 20 + k * 50), 6 + k * 8);
    }
  }
}

export const FALLEN_SHUT_GEODE: GimmickDef = {
  id: ID,
  rules: 'Two geode halves slide shut; their rims are walls. Inside the chalk ring when they meet: crushed. Strike a half\'s wedge to jam it there.',
  make,
};
