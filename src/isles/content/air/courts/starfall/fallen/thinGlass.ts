import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, mixC, mulberry, type G } from '../../../../../art/IsleArt';
import { SF, P, alive, clamp, dist } from '../palette';
import { fallenId } from '../../../../meteor/spec';

/**
 * Thin Glass — Picker Jasper Flint, in the star's telling the crater-picker who prised fused glass
 * out of the fallen-star bowls for the Prince's charms, and sold the pickers who kept a shard.
 *
 * The fight is down in a fresh crater: one skin of black star-glass over a vein that is still
 * molten. Every blow that lands cracks the glass under whoever took it; cracks laid close together
 * deepen, and a crack three deep groans — white light in the seams, shards lifting — and gives.
 * Whoever is on it drops through into the vein: hurt, held fast in the melt, and the hole glows
 * and burns for a while before it skins over as a *scar*, thick re-fused glass that never cracks
 * again. Flint taps the glass round your feet with his pick to start the cracks for you.
 *
 * So you cannot trade blows standing still, and you want to fight on scars. The exploit is the
 * same rule: every blow you land cracks the glass under *him* — hit him where the floor is already
 * starred and he goes through. At half the vein rises: a hole that opens deepens every crack near
 * it, so the floor gives way in runs. The bot keeps off deep cracks and falls back to the scars.
 */

const ID = fallenId('starfall', 'thin-glass');
const JOIN_R = 58;
const HOLE_R = 58;
const GROAN_MS = 950;
const HEAL_MS = 8000;
const POOL_MS = 6000;
const FALL_DMG = 16;
const BURN = 6;
const TAP_EVERY = 3600;
const TAP_WARN = 750;

/** A starred crack in the glass. `level` 1–3; at 3 it groans and then gives. */
interface Crack { x: number; y: number; level: number; at: number; groanAt: number; seed: number }
/** A hole into the vein, and then a scar once it skins over. */
interface Hole { x: number; y: number; at: number; seed: number }
/** Flint's pick coming down. */
interface Tap { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const cracks: Crack[] = [];
  const holes: Hole[] = [];
  const scars: Hole[] = [];
  const taps: Tap[] = [];
  let nextTap = -1;
  let lastBurn = 0;
  let risen = false;
  let internal = false;
  let now = 0;

  const onScar = (x: number, y: number): boolean => scars.some((s) => dist(x, y, s.x, s.y) < HOLE_R);

  /** Lay a crack at a point, or deepen the one already there. */
  function crack(x: number, y: number, by = 1): void {
    if (onScar(x, y)) return;
    const near = cracks.find((c) => dist(x, y, c.x, c.y) < JOIN_R);
    if (near) {
      if (near.level >= 3) return;
      near.level = Math.min(3, near.level + by);
      near.at = now;
      if (near.level >= 3) { near.groanAt = now; ctx.sfx('crystal-chime'); }
      return;
    }
    const c: Crack = { x: tk.clampX(x, 40), y: tk.clampY(y, 40), level: Math.min(3, by), at: now, groanAt: 0, seed: Math.floor(rng() * 1e6) };
    if (c.level >= 3) c.groanAt = now;
    cracks.push(c);
    ctx.sfx('ice-shard');
  }

  /** A blow landed on someone: the glass under them takes it too. */
  const struck = (f: Fighter, amount: number): void => {
    if (internal || amount < 3 || !alive(f)) return;
    crack(f.x, f.y);
  };

  function give(c: Crack): void {
    cracks.splice(cracks.indexOf(c), 1);
    holes.push({ x: c.x, y: c.y, at: now, seed: c.seed });
    ctx.sfx('crystal-shatter');
    internal = true;
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, c.x, c.y) >= HOLE_R) continue;
      ctx.hit(f, FALL_DMG, f.x, f.y);
      ctx.root(f, 900);
      ctx.float(f.x, f.y - 46, 'THROUGH THE GLASS', '#ffb070');
    }
    internal = false;
    // Once the vein has risen, a hole deepens every crack near it: the floor goes in runs.
    if (risen) for (const o of cracks) if (o.level < 3 && dist(o.x, o.y, c.x, c.y) < 150) { o.level++; o.at = now; if (o.level >= 3) o.groanAt = now; }
  }

  return {
    update(time) {
      now = time;
      if (nextTap < 0) nextTap = time + 1500;
      if (!risen && npc.hp < npc.maxHp * 0.5) {
        risen = true;
        ctx.banner('THE VEIN RISES', '#ffb070');
        ctx.sfx('quake');
      }
      if (time >= nextTap && alive(player)) {
        nextTap = time + (risen ? TAP_EVERY - 700 : TAP_EVERY);
        const a = rng() * Math.PI * 2;
        taps.push({ x: tk.clampX(player.x + Math.cos(a) * 26, 40), y: tk.clampY(player.y + Math.sin(a) * 26, 40), at: time });
        ctx.sfx('hammer-forge');
      }
      for (let i = taps.length - 1; i >= 0; i--) {
        if (time - taps[i].at < tk.warn(TAP_WARN)) continue;
        crack(taps[i].x, taps[i].y, risen ? 2 : 1);
        ctx.sfx('clang');
        taps.splice(i, 1);
      }
      for (const c of [...cracks]) {
        if (c.level >= 3 && time - c.groanAt >= GROAN_MS) give(c);
        else if (c.level < 3 && !risen && time - c.at > HEAL_MS) cracks.splice(cracks.indexOf(c), 1);
      }
      for (let i = holes.length - 1; i >= 0; i--) {
        if (time - holes[i].at >= POOL_MS) { scars.push(holes[i]); holes.splice(i, 1); ctx.sfx('sizzle'); }
      }
      if (time - lastBurn >= 500) {
        lastBurn = time;
        internal = true;
        for (const h of holes) for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, h.x, h.y) < HOLE_R - 6) ctx.hit(f, BURN, f.x, f.y);
        internal = false;
      }
    },

    onPlayerHurt: (amount) => struck(player, amount),
    onNpcHurt: (amount) => struck(npc, amount),

    npcSeek() {
      const danger = (p: Pt): boolean =>
        cracks.some((c) => c.level >= 2 && dist(p.x, p.y, c.x, c.y) < HOLE_R + 24) || holes.some((h) => dist(p.x, p.y, h.x, h.y) < HOLE_R + 14);
      if (!danger(npc)) return null;
      // Off the deep cracks: the nearest scar if there is one, else straight away from the worst crack.
      let best: Pt | null = null, bd = Infinity;
      for (const s of scars) { const d = dist(npc.x, npc.y, s.x, s.y); if (d < bd) { bd = d; best = s; } }
      if (best && bd < 420) return { x: best.x, y: best.y };
      const worst = [...cracks, ...holes.map((h) => ({ ...h, level: 4 }))].sort((a, b) => dist(npc.x, npc.y, a.x, a.y) - dist(npc.x, npc.y, b.x, b.y))[0];
      if (!worst) return null;
      const a = Math.atan2(npc.y - worst.y, npc.x - worst.x);
      return { x: clamp(npc.x + Math.cos(a) * 160, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 160, top + 50, H - 50) };
    },

    drawGround(g, time) {
      drawBowl(g, W, H, top, time, risen);
      for (const s of scars) drawScar(g, s);
      for (const h of holes) drawHole(g, h, time);
      for (const c of cracks) drawCrack(g, c, time);
      for (const t of taps) {
        const k = clamp((time - t.at) / tk.warn(TAP_WARN), 0, 1);
        g.lineStyle(2, SF.starHot, 0.3 + k * 0.6); g.strokeCircle(t.x, t.y, 22 - k * 14);
        g.fillStyle(SF.starHot, 0.2 + k * 0.5); g.fillCircle(t.x, t.y, 3 + k * 2);
      }
    },

    drawAir(g, time) {
      // Flint's pick, raised over each tap and coming down on the count.
      for (const t of taps) {
        const k = clamp((time - t.at) / tk.warn(TAP_WARN), 0, 1);
        const lift = (1 - k * k) * 46;
        const hx = t.x + 14, hy = t.y - 18 - lift;
        g.lineStyle(4, 0x5a3a22, 1); g.lineBetween(hx, hy, hx + 30, hy - 26);
        g.fillStyle(SF.stoneDark, 1); g.fillTriangle(hx - 16, hy + 6, hx + 4, hy - 4, hx + 2, hy + 4);
        g.fillStyle(SF.silver, 1); g.fillTriangle(hx - 16, hy + 6, hx - 6, hy + 1, hx - 8, hy + 5);
        g.fillStyle(SF.stoneLit, 1); g.fillTriangle(hx + 4, hy - 4, hx + 14, hy - 10, hx + 6, hy + 2);
      }
      // Shards lifting off a groaning crack.
      for (const c of cracks) {
        if (c.level < 3) continue;
        const k = clamp((time - c.groanAt) / GROAN_MS, 0, 1);
        const rr = mulberry(c.seed + 7);
        for (let i = 0; i < 7; i++) {
          const a = rr() * Math.PI * 2, d = 10 + rr() * HOLE_R * 0.8;
          const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d - k * 14 * rr();
          g.fillStyle(SF.glassLit, 0.9); g.fillTriangle(x - 5, y + 3, x + 4, y - 5, x + 6, y + 4);
          g.lineStyle(1, SF.starHot, 0.6 * k); g.lineBetween(x - 5, y + 3, x + 4, y - 5);
        }
      }
    },

    drawHud(g) {
      // The vein gauge: how many cracks are deep, and whether the vein has risen.
      const x = 18, y = top + 10;
      const deep = cracks.filter((c) => c.level >= 2).length;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, 104, 22, 8);
      for (let i = 0; i < 6; i++) {
        g.fillStyle(i < deep ? (risen ? SF.giant : SF.giantLit) : SF.glassLit, i < deep ? 1 : 0.6);
        g.fillTriangle(x + 10 + i * 15, y + 17, x + 16 + i * 15, y + 5, x + 22 + i * 15, y + 17);
      }
    },

    destroy() { cracks.length = 0; holes.length = 0; scars.length = 0; },
  };
}

/** The crater bowl: black star-glass, the rim of thrown moonstone, the vein glowing underneath. */
function drawBowl(g: G, W: number, H: number, top: number, time: number, risen: boolean): void {
  const cx = W / 2, cy = (top + H) / 2, rx = W * 0.47, ry = (H - top) * 0.47;
  g.fillStyle(SF.stoneMid, 0.9); g.fillEllipse(cx, cy, rx * 2 + 40, ry * 2 + 34);
  g.fillStyle(SF.glass, 0.96); g.fillEllipse(cx, cy, rx * 2, ry * 2);
  // The vein under the glass: branching rivers of melt, brighter once it rises.
  const beat = 0.6 + Math.sin(time / 380) * 0.2 + (risen ? 0.3 : 0);
  const r = mulberry(2207);
  for (let i = 0; i < 9; i++) {
    let x = cx + (r() - 0.5) * rx * 0.4, y = cy + (r() - 0.5) * ry * 0.4;
    let a = r() * Math.PI * 2;
    for (let s = 0; s < 9; s++) {
      const nx = x + Math.cos(a) * 40, ny = y + Math.sin(a) * 30;
      if (((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2 > 0.9) break;
      g.lineStyle(7, SF.giantDeep, 0.35 * beat); g.lineBetween(x, y, nx, ny);
      g.lineStyle(2.5, mixC(SF.giant, SF.vein, 0.3), 0.45 * beat); g.lineBetween(x, y, nx, ny);
      x = nx; y = ny; a += (r() - 0.5) * 1.1;
    }
  }
  glow(g, cx, cy, Math.min(rx, ry) * 0.6, SF.giant, 0.025 * beat, 4);
  // The glass's own sheen.
  g.fillStyle(SF.glassLit, 0.25); g.fillEllipse(cx - rx * 0.3, cy - ry * 0.35, rx * 0.8, ry * 0.25);
  g.lineStyle(3, SF.stoneLit, 0.5); g.strokeEllipse(cx, cy, rx * 2, ry * 2);
}

/** A starred crack: one star of fractures per level, its seams lit white when it groans. */
function drawCrack(g: G, c: Crack, time: number): void {
  const rr = mulberry(c.seed);
  const groan = c.level >= 3 ? clamp((time - c.groanAt) / GROAN_MS, 0, 1) : 0;
  const col = groan > 0 ? mixC(SF.silver, SF.starHot, groan) : SF.silver;
  for (let lv = 0; lv < c.level; lv++) {
    const arms = 5 + lv * 2, len = 18 + lv * 16;
    for (let i = 0; i < arms; i++) {
      const a = rr() * Math.PI * 2, L = len * (0.6 + rr() * 0.5);
      const mx = c.x + Math.cos(a) * L * 0.55, my = c.y + Math.sin(a) * L * 0.55;
      const ex = c.x + Math.cos(a + (rr() - 0.5) * 0.5) * L, ey = c.y + Math.sin(a + (rr() - 0.5) * 0.5) * L;
      g.lineStyle(1.5 + groan * 2, col, 0.55 + lv * 0.15); g.lineBetween(c.x, c.y, mx, my); g.lineBetween(mx, my, ex, ey);
      if (lv > 0) { g.lineStyle(1, col, 0.4); g.lineBetween(mx, my, mx + Math.cos(a + 1.2) * 10, my + Math.sin(a + 1.2) * 10); }
    }
    // A ring fracture joining the arms at each depth.
    g.lineStyle(1, col, 0.3 + lv * 0.15); g.strokeCircle(c.x, c.y, len * 0.45);
  }
  if (c.level >= 2) { g.fillStyle(SF.giant, 0.15 + groan * 0.5); g.fillCircle(c.x, c.y, 6 + groan * 10); }
  if (groan > 0) { g.lineStyle(2, SF.starHot, 0.4 + groan * 0.5); g.strokeCircle(c.x, c.y, HOLE_R); }
}

/** A hole into the vein: jagged glass teeth round a pool of melt, bubbling. */
function drawHole(g: G, h: Hole, time: number): void {
  const rr = mulberry(h.seed);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, d = HOLE_R * (i % 2 ? 0.95 : 0.78 + rr() * 0.12);
    pts.push(P(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d));
  }
  g.fillStyle(SF.giantDeep, 1); g.fillPoints(pts, true, true);
  g.fillStyle(SF.giant, 0.9); g.fillCircle(h.x, h.y, HOLE_R * 0.66);
  g.fillStyle(SF.giantLit, 0.8); g.fillCircle(h.x - 6, h.y - 5, HOLE_R * 0.36);
  for (let i = 0; i < 4; i++) {
    const k = ((time / 900 + i * 0.25) % 1);
    const a = rr() * Math.PI * 2, d = rr() * HOLE_R * 0.5;
    g.lineStyle(1.5, SF.starGold, 1 - k); g.strokeCircle(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, 2 + k * 6);
  }
  g.lineStyle(2, SF.glassLit, 1); g.strokePoints(pts, true, true);
  glow(g, h.x, h.y, HOLE_R + 20, SF.giant, 0.05, 3);
}

/** A scar: the hole skinned over in thick smooth glass, a raised ridge round it. Safe ground. */
function drawScar(g: G, s: Hole): void {
  g.fillStyle(0x0e0a1e, 1); g.fillCircle(s.x, s.y, HOLE_R);
  g.lineStyle(4, SF.glassLit, 0.9); g.strokeCircle(s.x, s.y, HOLE_R - 2);
  g.lineStyle(1.5, SF.vein, 0.6); g.strokeCircle(s.x, s.y, HOLE_R - 9);
  g.fillStyle(SF.glassLit, 0.35); g.fillEllipse(s.x - 14, s.y - 16, 40, 12);
  g.fillStyle(SF.giantDeep, 0.35); g.fillCircle(s.x, s.y, 10);
}

export const FALLEN_THIN_GLASS: GimmickDef = {
  id: ID,
  rules: 'Every blow cracks the crater glass under whoever took it; three deep, it gives and drops them into the melt. Scars hold. Hit him where it\'s starred.',
  make,
};
