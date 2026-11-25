import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { GILT, GILT_DARK, INK, IRON, LEAD, LEAD_LIT, OAK, OAK_DARK, OAK_LIT, PAPER_DARK, RED, RED_LIT } from '../palette';
import { alive, clamp, stepDt } from '../util';
import { proofSlip } from './common';

/**
 * Full Measure — Compositor Tobiah Quoin, who sets the Score in lead for the Press Hall.
 *
 * The yard is his galley, ruled into lines of type ten sorts wide. He sets whole formes of type —
 * blocks of three and four sorts tied with page cord — and slides them down the galley a line at
 * a time; a pale proof of where each will come to rest lies on the floor ahead of it. Whoever a
 * sliding forme reaches is shoved down a line, and against standing type they are crushed. Type
 * that has come to rest stands: a wall for bodies and shots.
 *
 * A line full of type is justified and lifted out, and the lines above close down. But a fighter
 * standing in the last gaps of a line is a missing letter: the quoins drive in at both ends, and
 * whoever is still standing in that line when they lock it up is set into it. Strike a sliding
 * forme to knock it a sort along, away from you — leave the last gap where he stands. Past half
 * he sets two formes at once.
 */

const COLS = 10, ROWS = 8;
const STEP_MS = 560;
const LOCK_MS = 900;
const SHAPES: [number, number][][] = [
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
];
/** Reversed capitals, as type reads on the face of a sort: strokes in a unit box. */
const GLYPHS: number[][][] = [
  [[0.8, 1, 0.5, 0], [0.5, 0, 0.2, 1], [0.7, 0.62, 0.3, 0.62]],
  [[0.8, 0, 0.8, 1], [0.8, 0, 0.2, 0], [0.8, 0.5, 0.35, 0.5], [0.8, 1, 0.2, 1]],
  [[0.5, 0, 0.5, 1], [0.15, 0, 0.85, 0]],
  [[0.2, 0, 0.2, 1], [0.8, 0, 0.8, 1], [0.2, 0.5, 0.8, 0.5]],
  [[0.8, 0, 0.8, 1], [0.8, 0, 0.2, 1], [0.2, 0, 0.2, 1]],
  [[0.8, 0, 0.8, 1], [0.8, 0, 0.3, 0], [0.3, 0, 0.3, 0.5], [0.3, 0.5, 0.8, 0.5], [0.55, 0.5, 0.2, 1]],
  [[0.8, 0, 0.8, 1], [0.8, 1, 0.2, 1]],
];

interface Forme { col: number; row: number; cells: [number, number][]; nextStep: number; t: StrikeTarget; shiftedAt: number; seed: number }
interface LockUp { row: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const CW = W / COLS, RH = (H - top) / ROWS;
  /** The galley: 0 = empty, otherwise a glyph seed + 1. */
  const grid: number[][] = Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
  const formes: Forme[] = [];
  const locks: LockUp[] = [];
  let started = false;
  let half = false;
  let nextSet = 0;
  let lifted: { row: number; at: number } | null = null;

  const cellOf = (f: Fighter): [number, number] => [clamp(Math.floor(f.x / CW), 0, COLS - 1), clamp(Math.floor((f.y - top) / RH), 0, ROWS - 1)];
  const filled = (c: number, r: number): boolean => r >= 0 && (r >= ROWS || c < 0 || c >= COLS || grid[r][c] > 0);
  const fits = (fm: Forme, col: number, row: number): boolean => fm.cells.every(([dc, dr]) => !filled(col + dc, row + dr));
  const centreOf = (col: number, row: number, cells: [number, number][]): Pt => {
    let sx = 0, sy = 0;
    for (const [dc, dr] of cells) { sx += (col + dc + 0.5) * CW; sy += top + (row + dr + 0.5) * RH; }
    return { x: sx / cells.length, y: sy / cells.length };
  };
  const centre = (fm: Forme): Pt => centreOf(fm.col, fm.row, fm.cells);
  const landing = (fm: Forme): number => { let r = fm.row; while (fits(fm, fm.col, r + 1)) r++; return r; };
  /** Gaps left in a row, and which fighters stand in them. */
  function gapsOf(r: number): { gaps: number; inGaps: Fighter[] } {
    const gaps = grid[r].filter((v) => v === 0).length;
    const inGaps = [player, npc].filter((f) => { if (!alive(f)) return false; const [c, rr] = cellOf(f); return rr === r && grid[r][c] === 0; });
    return { gaps, inGaps };
  }

  function setForme(time: number, over: Fighter): void {
    const cells = SHAPES[Math.floor(rng() * SHAPES.length)];
    const wide = Math.max(...cells.map(([c]) => c)) + 1, tall = Math.max(...cells.map(([, r]) => r)) + 1;
    const col = clamp(cellOf(over)[0] - Math.floor(wide / 2), 0, COLS - wide);
    if (!cells.every(([dc, dr]) => !filled(col + dc, dr))) {
      // The galley is full to the head: he pies the top three lines and starts again.
      for (let r = 0; r < 3; r++) grid[r].fill(0);
      ctx.sfx('crystal-shatter');
    }
    const c = centreOf(col, -tall, cells);
    const fm: Forme = { col, row: -tall, cells, nextStep: time + STEP_MS, shiftedAt: 0, seed: rng() * 100, t: ctx.target({
      x: c.x, y: Math.max(top + 14, c.y), r: 34,
      onStruck: (by) => {
        const now = ctx.scene.time.now;
        if (now - fm.shiftedAt < 260) return;
        const f = by === 'player' ? player : npc;
        const dir = centre(fm).x >= f.x ? 1 : -1;
        if (fits(fm, fm.col + dir, Math.max(0, fm.row)) && fm.cells.every(([dc]) => fm.col + dc + dir >= 0 && fm.col + dc + dir < COLS)) {
          fm.col += dir; fm.shiftedAt = now;
          ctx.sfx('clang');
        }
      },
    }) };
    formes.push(fm);
    ctx.sfx('gear-turn');
  }

  function step(fm: Forme, time: number): boolean {
    if (!fits(fm, fm.col, fm.row + 1)) {
      // Comes to rest: it is standing type now.
      for (const [dc, dr] of fm.cells) if (fm.row + dr >= 0) grid[fm.row + dr][fm.col + dc] = 1 + Math.floor(rng() * GLYPHS.length);
      fm.t.remove();
      ctx.sfx('stone-slam');
      return false;
    }
    fm.row++;
    // Whoever the forme reaches is shoved down a line — or crushed against standing type.
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f)) continue;
      const [c, r] = cellOf(f);
      if (!fm.cells.some(([dc, dr]) => fm.col + dc === c && fm.row + dr === r)) continue;
      if (!filled(c, r + 1) && !fm.cells.some(([dc, dr]) => fm.col + dc === c && fm.row + dr === r + 1)) {
        ctx.nudge(f, 0, RH);
        ctx.hit(f, 8, f.x, f.y);
      } else {
        ctx.hit(f, 16, f.x, f.y);
        ctx.stun(f, 500);
        const side = f.x < (fm.col + 0.5 * (Math.max(...fm.cells.map(([x]) => x)) + 1)) * CW ? -1 : 1;
        ctx.nudge(f, side * CW, 0);
        ctx.sfx('hit-heavy');
      }
    }
    fm.nextStep = time + STEP_MS;
    return true;
  }

  /** Clear full lines; lock up any line whose last gaps are fighters. */
  function checkLines(time: number): void {
    for (let r = ROWS - 1; r >= 0; r--) {
      const { gaps, inGaps } = gapsOf(r);
      if (gaps === 0) {
        grid.splice(r, 1);
        grid.unshift(new Array<number>(COLS).fill(0));
        for (let i = locks.length - 1; i >= 0; i--) { if (locks[i].row === r) locks.splice(i, 1); else if (locks[i].row < r) locks[i].row++; }
        lifted = { row: r, at: time };
        ctx.sfx('clang');
        r++;
        continue;
      }
      const locking = locks.find((l) => l.row === r);
      if (inGaps.length >= gaps && !locking) { locks.push({ row: r, at: time + LOCK_MS }); ctx.sfx('trap-set'); }
    }
    for (let i = locks.length - 1; i >= 0; i--) {
      const l = locks[i];
      const { gaps, inGaps } = gapsOf(l.row);
      if (gaps === 0 || inGaps.length < gaps) { locks.splice(i, 1); continue; }
      if (time < l.at) continue;
      for (const f of inGaps) { ctx.hit(f, 18, f.x, f.y); ctx.stun(f, 700); ctx.flash(f.x, f.y, RED); }
      ctx.sfx('trap-snap');
      locks.splice(i, 1);
      // Set into the line: its gaps are filled with spacing, and the line is lifted out next frame.
      for (let c = 0; c < COLS; c++) if (grid[l.row][c] === 0) grid[l.row][c] = 1 + Math.floor(rng() * GLYPHS.length);
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        nextSet = time + 1400;
        // A half-set galley: the foot lines already part-composed.
        for (const [r, gaps] of [[ROWS - 1, 2], [ROWS - 2, 4]] as [number, number][]) {
          for (let c = 0; c < COLS; c++) grid[r][c] = 1 + Math.floor(rng() * GLYPHS.length);
          for (let k = 0; k < gaps; k++) grid[r][Math.floor(rng() * COLS)] = 0;
        }
      }
      if (!half && npc.hp < npc.maxHp * 0.5) half = true;
      if (formes.length === 0 && time >= nextSet && alive(npc)) {
        setForme(time, player);
        if (half) setForme(time, npc);
      }
      for (let i = formes.length - 1; i >= 0; i--) {
        const fm = formes[i];
        if (time < fm.nextStep) continue;
        if (!step(fm, time)) { formes.splice(i, 1); nextSet = time + 900; }
      }
      for (const fm of formes) { const c = centre(fm); fm.t.moveTo(c.x, Math.max(top + 14, c.y)); }
      checkLines(time);
      if (lifted && time - lifted.at > 600) lifted = null;

      // Standing type is a wall: bodies are pushed back out of it, shots stop in it.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (!grid[r][c]) continue;
          const x0 = c * CW - 14, x1 = (c + 1) * CW + 14, y0 = top + r * RH - 14, y1 = top + (r + 1) * RH + 14;
          if (f.x <= x0 || f.x >= x1 || f.y <= y0 || f.y >= y1) continue;
          const pen = [f.x - x0, x1 - f.x, f.y - y0, y1 - f.y];
          const m = Math.min(...pen);
          if (m === pen[0]) ctx.nudge(f, -m, 0); else if (m === pen[1]) ctx.nudge(f, m, 0);
          else if (m === pen[2]) ctx.nudge(f, 0, -m); else ctx.nudge(f, 0, m);
        }
      }
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) for (const s of ctx.shotsNear((c + 0.5) * CW, top + (r + 0.5) * RH, 34)) s.block();
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      // Knock a forme toward the stranger from its far side.
      const fm = formes[0];
      if (fm) {
        const c = centre(fm);
        if (c.y > top + 30 && c.y < H - 80 && Math.abs(c.x - player.x) > CW * 0.8) {
          return { x: clamp(c.x + Math.sign(c.x - player.x) * 70, 50, W - 50), y: clamp(c.y, top + 40, H - 40) };
        }
      }
      // Otherwise stand clear: off type, out of tight lines, out from under the formes.
      let best: Pt = { x: npc.x, y: npc.y }, bestScore = Infinity;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (grid[r][c]) continue;
        const x = (c + 0.5) * CW, y = top + (r + 0.5) * RH;
        let score = Math.abs(Math.hypot(x - player.x, y - player.y) - 220);
        if (grid[r].filter((v) => v === 0).length <= 2) score += 900;
        for (const f of formes) if (f.cells.some(([dc]) => f.col + dc === c)) score += 300;
        if (score < bestScore) { bestScore = score; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // The galley's brass rules between the lines.
      for (let r = 1; r < ROWS; r++) { g.lineStyle(1, GILT_DARK, 0.25); g.lineBetween(0, top + r * RH, W, top + r * RH); }
      // Lines being locked up: the band burns red, the quoins drive in from both ends.
      for (const l of locks) {
        const k = clamp(1 - (l.at - time) / LOCK_MS, 0, 1);
        const y = top + l.row * RH;
        g.fillStyle(RED, 0.12 + 0.18 * k); g.fillRect(0, y, W, RH);
        for (const side of [-1, 1]) {
          const x = side < 0 ? 4 + k * 34 : W - 4 - k * 34;
          g.fillStyle(OAK_DARK, 1); g.fillTriangle(x, y + 6, x, y + RH - 6, x - side * 30, y + RH / 2);
          g.fillStyle(OAK_LIT, 1); g.fillTriangle(x, y + 10, x, y + RH / 2, x - side * 22, y + RH / 2);
          g.fillStyle(IRON, 1); g.fillCircle(x - side * 8, y + RH / 2, 3);
        }
      }
      // A proof of where each forme will come to rest.
      for (const fm of formes) {
        const lr = landing(fm);
        for (const [dc, dr] of fm.cells) {
          const x = (fm.col + dc) * CW, y = top + (lr + dr) * RH;
          if (lr + dr < 0) continue;
          g.fillStyle(PAPER_DARK, 0.16); g.fillRect(x + 4, y + 4, CW - 8, RH - 8);
          g.lineStyle(1.5, INK, 0.35);
          for (let k = 0; k < CW - 8; k += 10) { g.lineBetween(x + 4 + k, y + 4, x + 9 + k, y + 4); g.lineBetween(x + 4 + k, y + RH - 4, x + 9 + k, y + RH - 4); }
        }
      }
      // Standing type.
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) sort(g, c * CW, top + r * RH, CW, RH, grid[r][c] - 1, 0);
      if (lifted) {
        const k = clamp((time - lifted.at) / 600, 0, 1);
        g.fillStyle(LEAD_LIT, 0.5 * (1 - k)); g.fillRect(0, top + lifted.row * RH - k * 30, W, RH);
      }
    },

    drawAir(g, time) {
      for (const fm of formes) {
        const glow = 0.15 + Math.sin(time / 140) * 0.05;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [dc, dr] of fm.cells) {
          const x = (fm.col + dc) * CW, y = top + (fm.row + dr) * RH;
          if (y + RH < top) continue;
          sort(g, x, y, CW, RH, Math.floor(fm.seed + dc * 3 + dr * 5) % GLYPHS.length, glow);
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + CW); y1 = Math.max(y1, y + RH);
        }
        if (x0 === Infinity) continue;
        // Page cord round the forme, knotted at the corner.
        g.lineStyle(2, 0xd8c8a0, 0.9); g.strokeRect(x0 + 3, y0 + 3, x1 - x0 - 6, y1 - y0 - 6);
        g.lineStyle(1, OAK_DARK, 0.6); g.strokeRect(x0 + 5, y0 + 5, x1 - x0 - 10, y1 - y0 - 10);
        g.fillStyle(0xd8c8a0, 1); g.fillCircle(x1 - 6, y0 + 6, 3.5);
        g.lineStyle(1.5, 0xd8c8a0, 1); g.lineBetween(x1 - 6, y0 + 6, x1 + 6, y0 - 4); g.lineBetween(x1 - 6, y0 + 6, x1 + 2, y0 + 12);
      }
    },

    drawHud(g) {
      const x = W / 2, y = top + 4;
      proofSlip(g, x, y, 128, 34);
      // The galley in little: standing type, the formes, any line being locked.
      const cw = 9, rh = 3.2, gx = x - (COLS * cw) / 2 + 6, gy = y + 4;
      g.fillStyle(OAK_DARK, 0.25); g.fillRect(gx - 1, gy - 1, COLS * cw + 2, ROWS * rh + 2);
      for (let r = 0; r < ROWS; r++) {
        if (locks.some((l) => l.row === r)) { g.fillStyle(RED_LIT, 0.6); g.fillRect(gx, gy + r * rh, COLS * cw, rh); }
        for (let c = 0; c < COLS; c++) if (grid[r][c]) { g.fillStyle(LEAD, 1); g.fillRect(gx + c * cw + 0.5, gy + r * rh + 0.3, cw - 1, rh - 0.6); }
      }
      for (const fm of formes) for (const [dc, dr] of fm.cells) {
        if (fm.row + dr < 0) continue;
        g.fillStyle(GILT, 1); g.fillRect(gx + (fm.col + dc) * cw + 0.5, gy + (fm.row + dr) * rh + 0.3, cw - 1, rh - 0.6);
      }
    },

    destroy() { for (const fm of formes) fm.t.remove(); },
  };
}

/** One sort seen from above: the lead body, its nick, and the reversed letter standing proud on its face. */
function sort(g: G, x: number, y: number, w: number, h: number, glyph: number, glow: number): void {
  g.fillStyle(0x000000, 0.25); g.fillRect(x + 5, y + 7, w - 6, h - 6);
  g.fillStyle(IRON, 1); g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(LEAD, 1); g.fillRect(x + 3, y + 3, w - 6, h - 12);
  g.fillStyle(LEAD_LIT, 0.5 + glow); g.fillRect(x + 3, y + 3, w - 6, 3);
  // The nick down the body's front, so the compositor knows which way is up.
  g.fillStyle(IRON, 1); g.fillRect(x + 3, y + h - 12, w - 6, 3);
  g.fillStyle(OAK, 0.6); g.fillRect(x + 3, y + h - 8, w - 6, 5);
  // The face: the letter, reversed, inked black with a sheen.
  const gx = x + w * 0.3, gy = y + 10, gw = w * 0.4, gh = h - 30;
  g.lineStyle(5, INK, 1);
  for (const [ax, ay, bx, by] of GLYPHS[glyph]) g.lineBetween(gx + ax * gw, gy + ay * gh, gx + bx * gw, gy + by * gh);
  g.lineStyle(1.5, LEAD_LIT, 0.45);
  for (const [ax, ay, bx, by] of GLYPHS[glyph]) g.lineBetween(gx + ax * gw - 1, gy + ay * gh - 1, gx + bx * gw - 1, gy + by * gh - 1);
}

export const FALLEN_FULL_MEASURE: GimmickDef = {
  id: fallenId('libretto', 'full-measure'),
  rules: 'Formes of type slide down the galley; set type is a wall. Stand in a line\'s last gaps and you are locked into it. Strike a forme to knock it along.',
  make,
};
