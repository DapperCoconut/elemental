import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BONE, BRUISE_LIT, DEW, DROP, DROP_GLINT, DROP_WATER, GAS, GOLD_THREAD, SILK, SILK_DARK, SILK_LIT, SILK_OLD, SILK_SHADE,
} from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Laddered Silk — Darner Quiddy Ravelin, who mends the Sheet, and who in the King's telling took
 * her hook to the rows under the passed-over and let them run.
 *
 * The Sheet is knitted, row on row, and knitted silk ladders: pull a loose end and the row runs,
 * stitch after stitch, faster than anyone can walk, opening a slot of nothing across the yard
 * with only the bare cross-threads left spanning it like the rungs of a ladder. Step into an open
 * row and you go through — caught on the rungs, held, hurt — and are hauled out at the nearest
 * whole silk. A dash carries you over a run. The darners' needles close each row again behind.
 *
 * Quiddy pulls the row you stand on, from its far end, so you see the run coming: step up or
 * down a row. The exploit is the loose ends: tufts of frayed silk stick out of the hem at either
 * side, and striking one runs *its* row — run the one he is standing on. Halfway down she starts
 * on the warp as well, and the columns run top to bottom.
 */

const ID = fallenId('web', 'laddered');
const CELL = 48;
const WARN_MS = 900;
const RUN_SPEED = 5.6; // cells per second ≈ 270 px/s
const FALL_MS = 850;
const IMMUNE_MS = 1500;

interface Run { kind: 'row' | 'col'; idx: number; fromEnd: boolean; startAt: number; front: number; done: boolean }
interface Tuft { side: -1 | 1; row: number; t: StrikeTarget; movedAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const y0 = top + 8;
  const rows = Math.floor((H - y0 - 4) / CELL);
  const cols = Math.ceil(W / CELL);
  const open: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  const runs: Run[] = [];
  const immune = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const fellAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  let warp = false;
  let nextPull = 0;
  let pulls = 0;
  let started = false;

  const rowOf = (y: number) => clamp(Math.floor((y - y0) / CELL), 0, rows - 1);
  const colOf = (x: number) => clamp(Math.floor(x / CELL), 0, cols - 1);
  const centre = (r: number, c: number): Pt => ({ x: c * CELL + CELL / 2, y: y0 + r * CELL + CELL / 2 });
  const reweaveMs = () => (warp ? 7800 : 6400);
  const isOpen = (r: number, c: number) => open[r][c] > 0;
  const pending = (kind: 'row' | 'col', idx: number) => runs.some((u) => !u.done && u.kind === kind && u.idx === idx);

  function pull(kind: 'row' | 'col', idx: number, fromEnd: boolean, warnMs: number): void {
    if (pending(kind, idx)) return;
    runs.push({ kind, idx, fromEnd, startAt: tk.now + warnMs, front: 0, done: false });
    ctx.sfx('whip');
  }

  const tufts: Tuft[] = ([-1, 1, -1, 1] as (-1 | 1)[]).map((side, i) => {
    const row = Math.floor(((i + 0.5) / 4) * rows);
    const tuft: Tuft = { side, row, movedAt: 0, t: null as unknown as StrikeTarget };
    const p = tuftAt(tuft);
    tuft.t = ctx.target({
      x: p.x, y: p.y, r: 15, passThrough: true,
      onStruck: () => {
        if (tk.now - tuft.movedAt < 400) return;
        pull('row', tuft.row, tuft.side > 0, 550);
        // The end is spent; another frays loose elsewhere along the hem.
        tuft.movedAt = tk.now;
        tuft.row = (tuft.row + 2 + Math.floor(rng() * (rows - 3))) % rows;
        const q = tuftAt(tuft);
        tuft.t.moveTo(q.x, q.y);
      },
    });
    return tuft;
  });
  function tuftAt(t: Tuft): Pt { return { x: t.side < 0 ? 18 : W - 18, y: y0 + t.row * CELL + CELL / 2 }; }

  function fall(f: Fighter, time: number): void {
    immune.set(f, time + IMMUNE_MS);
    fellAt.set(f, time);
    ctx.stun(f, FALL_MS);
    if (f === player) tk.hitPlayer(14, f.x, f.y); else ctx.hit(npc, 19, f.x, f.y);
    ctx.sfx('splash');
    // Hauled out at the nearest whole silk.
    const r0 = rowOf(f.y), c0 = colOf(f.x);
    let best: Pt | null = null, bd = Infinity;
    for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) {
      const r = r0 + dr, c = c0 + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols || isOpen(r, c) || pending('row', r)) continue;
      const p = centre(r, c);
      const d = Math.hypot(p.x - f.x, p.y - f.y);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) ctx.nudge(f, best.x - f.x, best.y - f.y);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPull = time + 2200; }
      if (!warp && npc.hp < npc.maxHp * 0.5) {
        warp = true;
        ctx.banner('SHE TAKES THE HOOK TO THE WARP', '#ddd4f0');
        ctx.sfx('snap-back');
      }
      // Quiddy pulls the row you stand on — from its far end — and later your column too.
      if (time >= nextPull && alive(player)) {
        pulls++;
        nextPull = time + (warp ? 3000 : 3800);
        const useCol = warp && pulls % 2 === 0;
        if (useCol) pull('col', colOf(player.x), player.y < (y0 + rows * CELL / 2), WARN_MS);
        else pull('row', rowOf(player.y), player.x < W / 2, WARN_MS);
      }
      // Runs: stitch after stitch drops.
      for (const u of runs) {
        if (u.done || time < u.startAt) continue;
        const len = u.kind === 'row' ? cols : rows;
        const before = Math.floor(u.front);
        u.front = Math.min(len, u.front + RUN_SPEED * dt);
        for (let k = before; k < Math.floor(u.front); k++) {
          const at = u.fromEnd ? len - 1 - k : k;
          if (u.kind === 'row') open[u.idx][at] = time; else open[at][u.idx] = time;
        }
        if (u.front >= len) { u.done = true; ctx.sfx('snap-back'); }
      }
      for (let i = runs.length - 1; i >= 0; i--) if (runs[i].done) runs.splice(i, 1);
      // The darners close each stitch again behind.
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (open[r][c] > 0 && time - open[r][c] > reweaveMs()) open[r][c] = 0;
      // Through the rungs: whoever walks onto open silk falls. A dash carries you over.
      for (const f of [player, npc]) {
        if (!alive(f) || time < (immune.get(f) ?? 0) || ctx.dashing(f) || ctx.isAirborne(f)) continue;
        if (isOpen(rowOf(f.y), colOf(f.x))) fall(f, time);
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      // A loose end on the player's row: go and strike it.
      const pr = rowOf(player.y);
      const t = tufts.find((u) => u.row === pr);
      if (t && !pending('row', pr)) {
        const p = tuftAt(t);
        if (Math.abs(npc.x - p.x) < 420) return { x: clamp(p.x - t.side * 46, 50, W - 50), y: p.y };
      }
      // Otherwise stand on whole silk, off any row or column about to run, a good cast away from you.
      let best: Pt | null = null, bs = -Infinity;
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 250, 50, W - 50), y = clamp(player.y + Math.sin(a) * 190, y0 + 20, H - 30);
        const r = rowOf(y), c = colOf(x);
        let s = -Math.hypot(x - npc.x, y - npc.y) * 0.3;
        if (isOpen(r, c)) s -= 1000;
        if (pending('row', r) || pending('col', c)) s -= 600;
        if (r === pr) s -= 200;
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // The knit: a stitch-chain along every row.
      for (let r = 0; r < rows; r++) {
        const y = y0 + r * CELL;
        g.lineStyle(1, SILK_SHADE, 0.35); g.lineBetween(0, y, W, y);
        for (let x = 6; x < W; x += 12) { g.lineStyle(1, SILK_LIT, 0.16); g.strokeEllipse(x, y + CELL / 2, 9, 14); }
      }
      // Open stitches: the drop, the mire glinting far below, and the bare rungs across.
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (!isOpen(r, c)) continue;
        const x = c * CELL, y = y0 + r * CELL;
        const left = reweaveMs() - (time - open[r][c]);
        g.fillStyle(DROP, 1); g.fillRect(x, y + 4, CELL, CELL - 8);
        g.fillStyle(DROP_WATER, 0.9); g.fillRect(x + 6, y + 14, CELL - 12, CELL - 24);
        g.fillStyle(DROP_GLINT, 0.4 + Math.sin(time / 300 + c) * 0.2); g.fillRect(x + 10 + (r * 7 % 20), y + 20, 8, 1.5);
        g.fillStyle(GAS, 0.06); g.fillRect(x, y + 4, CELL, CELL - 8);
        // Rungs: the cross-threads a ladder leaves behind.
        for (let k = 0; k < 4; k++) { g.lineStyle(1, SILK_LIT, 0.55); g.lineBetween(x + 6 + k * 12, y + 4, x + 6 + k * 12 + 1, y + CELL - 4); }
        // Curled stitch ends hanging off the lips.
        g.lineStyle(1.5, SILK_OLD, 0.9);
        for (const yy of [y + 4, y + CELL - 4]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 8 + k * 16, yy, 3, 0, Math.PI, yy > y + CELL / 2); g.strokePath(); }
        // A darning needle at work on the stitches about to close.
        if (left < 900) {
          const k = 1 - left / 900;
          const nx = x + 6 + k * (CELL - 12), ny = y + CELL / 2 + Math.sin(time / 60) * 10;
          g.lineStyle(1, GOLD_THREAD, 0.8); g.beginPath(); g.moveTo(x + 4, y + 8);
          for (let i = 0; i <= 6; i++) g.lineTo(x + 4 + (nx - x - 4) * (i / 6), i % 2 ? y + CELL - 8 : y + 8);
          g.strokePath();
          g.lineStyle(2, BONE, 1); g.lineBetween(nx - 6, ny - 3, nx + 6, ny + 3);
        }
      }
      // Pending runs: the pulled thread drawn taut down the row, glinting.
      for (const u of runs) {
        const k = clamp(1 - (u.startAt - time) / WARN_MS, 0, 1);
        if (u.kind === 'row') {
          const y = y0 + u.idx * CELL;
          g.lineStyle(2, BRUISE_LIT, 0.25 + k * 0.45); g.strokeRect(0, y + 2, W, CELL - 4);
          const fx = u.fromEnd ? W - u.front * CELL : u.front * CELL;
          drawFront(g, fx, y + CELL / 2, u.fromEnd ? -1 : 1, 0, time, time >= u.startAt);
        } else {
          const x = u.idx * CELL;
          g.lineStyle(2, BRUISE_LIT, 0.25 + k * 0.45); g.strokeRect(x + 2, y0, CELL - 4, rows * CELL);
          const fy = u.fromEnd ? y0 + rows * CELL - u.front * CELL : y0 + u.front * CELL;
          drawFront(g, x + CELL / 2, fy, 0, u.fromEnd ? -1 : 1, time, time >= u.startAt);
        }
      }
    },

    drawAir(g, time) {
      for (const t of tufts) drawTuft(g, tuftAt(t), t.side, time);
      // Caught on the rungs: threads round the fallen one's legs while they're held.
      for (const f of [player, npc]) {
        const k = (time - (fellAt.get(f) ?? -9999)) / FALL_MS;
        if (k < 0 || k > 1 || !alive(f)) continue;
        for (let i = 0; i < 5; i++) { g.lineStyle(1, SILK_LIT, 0.8 * (1 - k)); g.lineBetween(f.x - 18 + i * 9, f.y + 8, f.x - 14 + i * 7, f.y - 18); }
        g.lineStyle(2, SILK_LIT, 0.6 * (1 - k)); g.strokeEllipse(f.x, f.y + 4, 46, 16);
      }
    },

    drawHud(g, time) {
      // Quiddy's hook: fills toward her next pull. A ladder icon counts open stitches.
      const x = W / 2, y = top + 18;
      const k = clamp(1 - (nextPull - time) / (warp ? 3000 : 3800), 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 60, y - 14, 120, 28, 6);
      g.lineStyle(2.5, BONE, 1); g.beginPath(); g.arc(x - 40, y - 2, 6, Math.PI, Math.PI * 2.3, false); g.strokePath();
      g.lineBetween(x - 34, y - 1, x - 34, y + 9);
      g.fillStyle(SILK_DARK, 1); g.fillRect(x - 24, y - 3, 60, 6);
      g.fillStyle(BRUISE_LIT, 1); g.fillRect(x - 24, y - 3, 60 * k, 6);
      let n = 0;
      for (const row of open) for (const v of row) if (v > 0) n++;
      const rungs = Math.min(6, Math.ceil(n / 6));
      g.lineStyle(1.5, SILK_LIT, 1); g.lineBetween(x + 42, y - 10, x + 42, y + 10); g.lineBetween(x + 54, y - 10, x + 54, y + 10);
      for (let i = 0; i < rungs; i++) g.lineBetween(x + 42, y - 9 + i * 3.6, x + 54, y - 9 + i * 3.6);
    },

    destroy() { for (const t of tufts) t.t.remove(); },
  };
}

/** The running front: a bright knot unpicking itself, the loosened thread curling up behind it. */
function drawFront(g: G, x: number, y: number, ux: number, uy: number, time: number, live: boolean): void {
  const wob = Math.sin(time / 40) * 3;
  if (live) {
    g.lineStyle(1.5, SILK_LIT, 0.9); g.beginPath(); g.moveTo(x, y);
    for (let i = 1; i < 9; i++) g.lineTo(x - ux * i * 5 + Math.sin(time / 50 + i) * 4 * (uy ? 1 : 0), y - uy * i * 5 - i * 2.5 + Math.cos(time / 50 + i) * 3 * (ux ? 1 : 0));
    g.strokePath();
    g.fillStyle(BRUISE_LIT, 1); g.fillCircle(x + wob * uy, y + wob * ux, 4);
    glow(g, x, y, 18, BRUISE_LIT, 0.08, 3);
  } else {
    g.fillStyle(BRUISE_LIT, 0.5 + Math.sin(time / 70) * 0.4); g.fillCircle(x, y, 3);
  }
}

/** A loose end fraying out of the hem: a tuft of pale silk with a dew bead, stirring in the draught. */
function drawTuft(g: G, p: Pt, side: number, time: number): void {
  g.fillStyle(dim(SILK, 0.3), 1); g.fillEllipse(p.x, p.y + 2, 18, 8);
  for (let i = 0; i < 6; i++) {
    const a = -side * 0.2 + (i - 2.5) * 0.28 + Math.sin(time / 300 + i) * 0.12;
    const len = 14 + (i % 3) * 5;
    g.lineStyle(1.2, i % 2 ? SILK_LIT : SILK_OLD, 1);
    g.beginPath(); g.moveTo(p.x, p.y);
    g.lineTo(p.x - side * Math.cos(a) * len * 0.5, p.y + Math.sin(a) * len * 0.5 - 4);
    g.lineTo(p.x - side * Math.cos(a) * len, p.y + Math.sin(a) * len - 2);
    g.strokePath();
  }
  g.fillStyle(DEW, 0.9); g.fillCircle(p.x - side * 12, p.y - 3, 1.6);
  g.lineStyle(1, GOLD_THREAD, 0.5); g.strokeCircle(p.x, p.y, 12);
}

export const FALLEN_LADDERED: GimmickDef = {
  id: ID,
  rules: 'She pulls your row and it ladders across the yard: walk onto an open row and you fall through. Dash over. Strike a loose end to run its row.',
  make,
};
