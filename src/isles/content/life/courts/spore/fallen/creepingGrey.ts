import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from '../gimmicks/shared';
import { live, SIDES } from '../gimmicks/shared';
import type { G } from '../../../../../art/IsleArt';
import { dim, lit } from '../../../../../art/IsleArt';
import { MOSS_DARK, PEAT_LIT, SPORE } from '../palette';
import { dist } from '../sporeArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Creeping Grey — Blightwife Smut.
 *
 * The bog's patches of mushroom ground are worked plot by plot, and a plot that takes the grey
 * mould yields nothing at the Scales. In the King's telling Smut walked the plots of families who
 * complained, and the grey came up where she had trodden — so they came up short, and were pruned.
 *
 * The floor is plots. Where Smut walks, the grey takes; each grey plot thickens through three
 * stages and, thick, creeps into a neighbour now and then. Standing on thick grey sickens you (a
 * slow, steady tick). Any fighter who **dashes** across the grey scours the plots they pass clean.
 * When a patch of thick grey grows to a dozen plots it **sporulates**: the whole patch flickers,
 * then bursts in a sheet — everyone on it is hurt and the ground is left bare a while. It hurts
 * her as much as you: walk her onto a patch about to go.
 *
 * Halfway down, the grey starts to *know you*: where it creeps, it creeps toward the player.
 */

const ID = fallenId('spore', 'creeping-grey');
const CELL = 48;
const STAGE_MS = 1300;
const CREEP_MS = 700;
const SICK_MS = 550;
const SPORULATE_AT = 12;
const FLICKER_MS = 1100;
const BARE_MS = 4200;
const MAX_GREY = 80;
const GREY = 0x9aa39a;
const GREY_LIT = 0xd6ddd2;
const BLIGHT = 0xb6ff6a;

interface Plot { stage: number; next: number; bare: number; burst: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);
  const cols = Math.floor(W / CELL);
  const rows = Math.floor((H - top) / CELL);
  const ox = (W - cols * CELL) / 2;
  const grid: Plot[] = Array.from({ length: cols * rows }, (_, i) => ({ stage: 0, next: 0, bare: 0, burst: 0, seed: (i * 7919) % 97 }));
  const cx = (i: number): number => ox + (i % cols) * CELL + CELL / 2;
  const cy = (i: number): number => top + Math.floor(i / cols) * CELL + CELL / 2;
  const cellAt = (x: number, y: number): number => {
    const c = Math.floor((x - ox) / CELL), r = Math.floor((y - top) / CELL);
    return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  };
  const nbrs = (i: number): number[] => {
    const c = i % cols, r = Math.floor(i / cols), out: number[] = [];
    if (c > 0) out.push(i - 1); if (c < cols - 1) out.push(i + 1);
    if (r > 0) out.push(i - cols); if (r < rows - 1) out.push(i + cols);
    return out;
  };
  let creepAt = ctx.scene.time.now + CREEP_MS;
  const sickAt = { p: 0, n: 0 };
  let greyCount = 0;
  let biggest = 0;
  const knows = (): boolean => ctx.npc.hp < ctx.npc.maxHp * 0.5;

  const seed = (i: number, time: number): void => {
    if (i < 0) return;
    const p = grid[i];
    if (p.stage > 0 || p.burst > 0 || time < p.bare || greyCount >= MAX_GREY) return;
    p.stage = 1; p.next = time + STAGE_MS;
  };

  /** Flood-fill the thick patches; any of a dozen plots or more starts to flicker. */
  const findPatches = (time: number): void => {
    const seen = new Uint8Array(grid.length);
    biggest = 0;
    for (let i = 0; i < grid.length; i++) {
      if (seen[i] || grid[i].stage < 3 || grid[i].burst) continue;
      const patch: number[] = [];
      const stack = [i];
      seen[i] = 1;
      while (stack.length) {
        const j = stack.pop() as number;
        patch.push(j);
        for (const q of nbrs(j)) if (!seen[q] && grid[q].stage >= 3 && !grid[q].burst) { seen[q] = 1; stack.push(q); }
      }
      biggest = Math.max(biggest, patch.length);
      if (patch.length >= SPORULATE_AT) {
        for (const j of patch) grid[j].burst = time + FLICKER_MS;
        ctx.sfx('sizzle');
      }
    }
  };

  const sporulate = (time: number): void => {
    let any = false;
    const hitSide = { p: false, n: false };
    for (let i = 0; i < grid.length; i++) {
      const p = grid[i];
      if (!p.burst || time < p.burst) continue;
      any = true;
      for (const k of SIDES) {
        const f = fOf(k);
        if (live(f) && cellAt(f.x, f.y) === i) hitSide[k] = true;
      }
      p.stage = 0; p.burst = 0; p.bare = time + BARE_MS;
    }
    if (!any) return;
    ctx.sfx('explosion-medium');
    if (hitSide.p) tk.hitPlayer(13, ctx.player.x, ctx.player.y);
    if (hitSide.n) ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y);
  };

  return {
    update(time) {
      // Her footprints take.
      const n = ctx.npc;
      if (live(n)) seed(cellAt(n.x, n.y), time);
      // Stages thicken; thick plots creep.
      greyCount = 0;
      for (const p of grid) {
        if (p.stage > 0) greyCount++;
        if (p.stage > 0 && p.stage < 3 && time >= p.next) { p.stage++; p.next = time + STAGE_MS; }
      }
      if (time >= creepAt) {
        creepAt = time + CREEP_MS;
        const thick = grid.map((p, i) => (p.stage >= 3 && !p.burst ? i : -1)).filter((i) => i >= 0);
        if (thick.length) {
          const from = thick[Math.floor(ctx.rng() * thick.length)];
          const open = nbrs(from).filter((q) => grid[q].stage === 0);
          if (open.length) {
            const p = ctx.player;
            const to = knows()
              ? open.sort((a, b) => dist(cx(a), cy(a), p.x, p.y) - dist(cx(b), cy(b), p.x, p.y))[0]
              : open[Math.floor(ctx.rng() * open.length)];
            seed(to, time);
          }
        }
        findPatches(time);
      }
      sporulate(time);
      // Scouring: a dash across the grey wipes the plot underfoot and the four round it.
      for (const k of SIDES) {
        const f = fOf(k);
        if (!live(f) || !ctx.dashing(f)) continue;
        const i = cellAt(f.x, f.y);
        if (i < 0) continue;
        for (const q of [i, ...nbrs(i)]) {
          if (grid[q].stage > 0 && !grid[q].burst) { grid[q].stage = 0; grid[q].bare = time + 1200; }
        }
      }
      // The sickness of thick grey, on its own clock.
      for (const k of SIDES) {
        const f = fOf(k);
        const i = live(f) ? cellAt(f.x, f.y) : -1;
        if (i < 0 || grid[i].stage < 3) continue;
        if (time < sickAt[k]) continue;
        sickAt[k] = time + SICK_MS;
        if (k === 'p') tk.hitPlayer(3, f.x, f.y); else ctx.hit(f, 3, f.x, f.y);
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const here = cellAt(n.x, n.y);
      // Off a flickering or thick plot, to the nearest clean one.
      if (here >= 0 && (grid[here].burst || grid[here].stage >= 3)) {
        let best = -1, bd = 1e9;
        for (let i = 0; i < grid.length; i++) {
          if (grid[i].stage > 0 || grid[i].burst) continue;
          const d = dist(cx(i), cy(i), n.x, n.y);
          if (d < bd) { bd = d; best = i; }
        }
        if (best >= 0) return { x: cx(best), y: cy(best) };
      }
      // Otherwise she walks a loop round the player, laying grey in a ring about them.
      const t = ctx.scene.time.now / 1400;
      return {
        x: Phaser.Math.Clamp(p.x + Math.cos(t) * 170, 50, W - 50),
        y: Phaser.Math.Clamp(p.y + Math.sin(t) * 130, top + 40, H - 40),
      };
    },

    drawGround(g, time) {
      for (let i = 0; i < grid.length; i++) {
        const p = grid[i];
        const x = cx(i), y = cy(i);
        if (time < p.bare && p.stage === 0) {
          // Bare: scorched peat, crazed.
          g.fillStyle(dim(PEAT_LIT, 0.4), 0.55); g.fillRect(x - CELL / 2 + 2, y - CELL / 2 + 2, CELL - 4, CELL - 4);
          g.lineStyle(1, PEAT_LIT, 0.5); g.lineBetween(x - 12, y - 6, x + 4, y + 2); g.lineBetween(x + 4, y + 2, x + 10, y + 14);
          continue;
        }
        if (p.stage === 0) continue;
        mould(g, x, y, p, time);
      }
      // The plot grid is faintly scored on the moss, so the creep reads as plots.
      g.lineStyle(1, MOSS_DARK, 0.25);
      for (let c = 0; c <= cols; c++) g.lineBetween(ox + c * CELL, top, ox + c * CELL, top + rows * CELL);
      for (let r = 0; r <= rows; r++) g.lineBetween(ox, top + r * CELL, ox + cols * CELL, top + r * CELL);
    },

    drawHud(g) {
      // The biggest thick patch against the dozen that sporulates.
      const x = W / 2 - 78, y = 106;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 8, y - 6, 172, 20, 6);
      for (let i = 0; i < SPORULATE_AT; i++) {
        const on = i < biggest;
        g.fillStyle(on ? GREY_LIT : 0x2a2e2a, 1); g.fillRect(x + i * 11, y, 9, 9);
        if (on) { g.fillStyle(BLIGHT, 0.5); g.fillCircle(x + i * 11 + 4.5, y + 4.5, 2); }
      }
      if (knows()) { g.lineStyle(2, BLIGHT, 0.9); g.strokeCircle(x + SPORULATE_AT * 11 + 12, y + 4, 6); g.fillStyle(BLIGHT, 1); g.fillCircle(x + SPORULATE_AT * 11 + 12, y + 4, 2); }
    },
  };
}

/**
 * One plot of grey mould: stage 1 a few pale fluff-stars, stage 2 a spreading felt with threads
 * reaching for the plot's edge, stage 3 a thick grey pelt standing up in tufts with a sick
 * green-white glow at its heart. A flickering plot pulses bright on the way to bursting.
 */
function mould(g: G, x: number, y: number, p: Plot, time: number): void {
  const s = p.seed;
  const flick = p.burst ? 0.5 + 0.5 * Math.sin(time / 45) : 0;
  if (p.stage >= 2) {
    g.fillStyle(dim(GREY, 0.45), 0.5 + 0.15 * p.stage); g.fillRoundedRect(x - CELL / 2 + 3, y - CELL / 2 + 3, CELL - 6, CELL - 6, 10);
    g.lineStyle(1, GREY, 0.6);
    for (let i = 0; i < 6; i++) {
      const a = s + i * 1.05;
      g.lineBetween(x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a + 0.3) * 22, y + Math.sin(a + 0.3) * 22);
    }
  }
  const tufts = p.stage === 1 ? 3 : p.stage === 2 ? 7 : 12;
  for (let i = 0; i < tufts; i++) {
    const tx = x + Math.sin(s * 1.3 + i * 2.7) * 16, ty = y + Math.cos(s * 0.7 + i * 1.9) * 16;
    const r = p.stage === 3 ? 5 + (i % 3) : 3;
    g.fillStyle(GREY, 0.85); g.fillCircle(tx, ty, r);
    g.fillStyle(GREY_LIT, 0.9); g.fillCircle(tx - 1, ty - 1, r * 0.55);
    if (p.stage === 3) {
      // Standing hairs on the thick pelt, each with a pin-head of spore.
      g.lineStyle(1, GREY_LIT, 0.7); g.lineBetween(tx, ty, tx + Math.sin(time / 600 + i) * 2, ty - 6);
      g.fillStyle(SPORE, 0.7); g.fillCircle(tx + Math.sin(time / 600 + i) * 2, ty - 6, 1);
    }
  }
  if (p.stage === 3) {
    g.fillStyle(BLIGHT, 0.08 + 0.05 * Math.sin(time / 400 + s) + flick * 0.3); g.fillCircle(x, y, 14 + flick * 8);
  }
  if (p.burst) {
    g.lineStyle(2, lit(BLIGHT, 0.3), 0.4 + 0.5 * flick); g.strokeRect(x - CELL / 2 + 2, y - CELL / 2 + 2, CELL - 4, CELL - 4);
  }
}

export const FALLEN_CREEPING_GREY: GimmickDef = {
  id: ID,
  rules: 'The grey takes where she walks and creeps; thick grey sickens. A patch of twelve bursts — dash to scour it, and walk her onto one about to go.',
  make,
};
