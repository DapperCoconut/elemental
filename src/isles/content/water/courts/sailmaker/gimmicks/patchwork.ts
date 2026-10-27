import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { CANVAS, CANVAS_OLD, CHALK, PLAYER_TINT, needle, patch, spool, stitches } from '../art';

/**
 * Patchwork — Quilter Mends's floor.
 *
 * The floor is a quilt in the making: a grid of squares, bare canvas to begin with. Both
 * fighters sew. Stand still on a bare square and you stitch your own patch onto it (blue); Mends
 * sews hers (rose) from wherever she stands — she has needles in both hands and sews faster than
 * you ever will, sometimes right under your feet. A square of your colour mends you while you
 * stand on it; a square of hers stings. And the reverse holds for her.
 *
 * You can rip her squares up: stand on one long enough and it tears back to bare canvas — and
 * every patch you rip gives you its thread, so your next sew is almost instant. Four squares of
 * one colour in a two-by-two block are *quilted* together: they cannot be ripped, and they mend
 * or sting harder.
 *
 * She sews faster; you tear faster. Win the floor by ripping, not by racing her needle.
 */

const COLS = 8;
const ROWS = 5;
const SEW_MS = 1600;
const SEW_SPOOL_MS = 380;
const RIP_MS = 1100;
const NPC_RIP_MS = 1700;
const NPC_SEW_EVERY_MS = 1150;
const NPC_SEW_HARD_MS = 880;
const NPC_STITCH_MS = 700;
const MAX_NPC_PATCHES = 14;
const HEAL_PER_S = 3.2;
const STING_PER_S = 4.2;
const QUILT_MULT = 1.5;
const TICK_MS = 500;
const MAX_SPOOLS = 3;
const FOE_ROSE = 0xd85a7a;
const MINE_BLUE = 0x5a9ad8;

/** 0 bare, 1 the player's, 2 Mends's. */
type Owner = 0 | 1 | 2;

interface Cell {
  c: number; r: number;
  x: number; y: number;
  owner: Owner;
  quilted: boolean;
  /** Mends's needle is stitching this square (lands at `stitchAt`). */
  stitchAt: number;
  stitchFrom: number;
  /** Seed for the patch's look. */
  shade: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const x0 = 60, y0 = top + 26;
  const cw = (W - 120) / COLS, ch = (H - y0 - 22) / ROWS;
  const sewEvery = ctx.hard ? NPC_SEW_HARD_MS : NPC_SEW_EVERY_MS;

  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push({ c, r, x: x0 + cw * (c + 0.5), y: y0 + ch * (r + 0.5), owner: 0, quilted: false, stitchAt: 0, stitchFrom: 0, shade: rng() });
    }
  }
  const at = (c: number, r: number): Cell | null => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? null : cells[r * COLS + c]);
  const cellOf = (f: Fighter): Cell | null => {
    const c = Math.floor((f.x - x0) / cw), r = Math.floor((f.y + 12 - y0) / ch);
    return at(c, r);
  };

  let announced = false;
  let nextSewAt = 1500;
  let spools = 0;
  /** Player's work in progress: the cell and when they started on it. */
  let pWork: { cell: Cell; since: number } | null = null;
  let nWork: { cell: Cell; since: number } | null = null;
  const tickAt = new Map<Fighter, number>();
  const healAcc = new Map<Fighter, number>();

  const requilt = (): void => {
    for (const cell of cells) cell.quilted = false;
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const block = [at(c, r)!, at(c + 1, r)!, at(c, r + 1)!, at(c + 1, r + 1)!];
        const o = block[0].owner;
        if (o !== 0 && block.every((b) => b.owner === o)) for (const b of block) b.quilted = true;
      }
    }
  };

  const setOwner = (cell: Cell, o: Owner): void => {
    const wasQuilted = cells.filter((q) => q.quilted).length;
    cell.owner = o;
    cell.stitchAt = 0;
    requilt();
    if (cells.filter((q) => q.quilted).length > wasQuilted) {
      ctx.float(cell.x, cell.y - 30, 'QUILTED', o === 1 ? '#a8d4ff' : '#ffb0c4');
      ctx.sfx('sparkle');
    }
  };

  const count = (o: Owner): number => cells.filter((q) => q.owner === o).length;

  /** Mends picks a square: often right under you, otherwise near her or bridging her quilt. */
  const pickForMends = (): Cell | null => {
    const p = ctx.player, n = ctx.npc;
    const under = cellOf(p);
    if (under && under.owner === 0 && under.stitchAt === 0 && rng() < 0.45) return under;
    const bare = cells.filter((q) => q.owner === 0 && q.stitchAt === 0);
    if (!bare.length) return null;
    // Score: close to her, adjacent to her own patches (to quilt), a little toward you.
    let best: Cell | null = null, bs = -Infinity;
    for (const q of bare) {
      let s = -Math.hypot(q.x - n.x, q.y - n.y) * 0.6 - Math.hypot(q.x - p.x, q.y - p.y) * 0.25 + rng() * 60;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(q.c + dc, q.r + dr)?.owner === 2) s += 70;
      if (s > bs) { bs = s; best = q; }
    }
    return best;
  };

  const standEffect = (f: Fighter, time: number, dt: number): void => {
    if (!f.active || f.hp <= 0) return;
    const cell = cellOf(f);
    if (!cell || cell.owner === 0) return;
    const mine: Owner = f === ctx.player ? 1 : 2;
    const mult = cell.quilted ? QUILT_MULT : 1;
    if (cell.owner === mine) {
      const acc = (healAcc.get(f) ?? 0) + HEAL_PER_S * mult * dt;
      if (acc >= 1) { const w = Math.floor(acc); ctx.heal(f, w); healAcc.set(f, acc - w); } else healAcc.set(f, acc);
    } else if (time - (tickAt.get(f) ?? 0) >= TICK_MS) {
      tickAt.set(f, time);
      ctx.hit(f, STING_PER_S * mult * (TICK_MS / 1000), f.x, f.y);
    }
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('MIND THE QUILT', '#ffd0dc'); }
      const p = ctx.player, n = ctx.npc;

      // The player's needle: sew bare squares, rip hers.
      const pc = cellOf(p);
      if (!pc || (pWork && pWork.cell !== pc)) pWork = null;
      if (pc && pc.owner !== 1 && !(pc.owner === 2 && pc.quilted)) {
        if (!pWork) pWork = { cell: pc, since: time };
        const need = pc.owner === 0 ? (spools > 0 ? SEW_SPOOL_MS : SEW_MS) : RIP_MS;
        if (time - pWork.since >= need) {
          if (pc.owner === 0) {
            if (spools > 0) spools--;
            setOwner(pc, 1);
            ctx.sfx('stab');
            ctx.float(pc.x, pc.y - 26, 'SEWN', '#a8d4ff');
          } else {
            setOwner(pc, 0);
            spools = Math.min(MAX_SPOOLS, spools + 1);
            ctx.sfx('slash');
            ctx.float(pc.x, pc.y - 26, 'RIPPED', '#ffd27a');
          }
          pWork = null;
        }
      }

      // Mends's own needle at her feet: she rips your squares when she has to.
      const nc = cellOf(n);
      if (!nc || (nWork && nWork.cell !== nc)) nWork = null;
      if (nc && nc.owner === 1 && !nc.quilted) {
        if (!nWork) nWork = { cell: nc, since: time };
        if (time - nWork.since >= NPC_RIP_MS) {
          setOwner(nc, 0);
          ctx.float(nc.x, nc.y - 26, 'UNPICKED', '#ffb0c4');
          ctx.sfx('slash');
          nWork = null;
        }
      }

      // Mends's flying needles: a square stitched from afar on a clock.
      if (time >= nextSewAt) {
        nextSewAt = time + sewEvery * (0.85 + rng() * 0.3);
        if (count(2) < MAX_NPC_PATCHES) {
          const q = pickForMends();
          if (q) { q.stitchFrom = time; q.stitchAt = time + NPC_STITCH_MS; ctx.sfx('whoosh'); }
        }
      }
      for (const q of cells) {
        if (q.stitchAt && time >= q.stitchAt) {
          if (q.owner === 0) setOwner(q, 2); else q.stitchAt = 0;
        }
      }

      standEffect(p, time, dt);
      standEffect(n, time, dt);
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      // Hurt: stand on her own colour to mend.
      if (n.hp / n.maxHp < 0.55) {
        const mine = cells.filter((q) => q.owner === 2);
        if (mine.length) {
          mine.sort((a, b) => Math.hypot(a.x - n.x, a.y - n.y) - Math.hypot(b.x - n.x, b.y - n.y));
          return { x: mine[0].x, y: mine[0].y - 12 };
        }
      }
      // The player is winning the floor: go and unpick the nearest of their loose squares.
      if (count(1) > count(2)) {
        const theirs = cells.filter((q) => q.owner === 1 && !q.quilted);
        if (theirs.length) {
          theirs.sort((a, b) => Math.hypot(a.x - n.x, a.y - n.y) - Math.hypot(b.x - n.x, b.y - n.y));
          return { x: theirs[0].x, y: theirs[0].y - 12 };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The quilt base: bare canvas squares with chalked seams.
      g.fillStyle(dim(CANVAS_OLD, 0.25), 1); g.fillRect(x0 - 6, y0 - 6, cw * COLS + 12, ch * ROWS + 12);
      for (const q of cells) {
        const bx = q.x - cw / 2, by = q.y - ch / 2;
        if (q.owner === 0) {
          g.fillStyle(q.shade < 0.5 ? CANVAS : dim(CANVAS, 0.06), 0.9); g.fillRect(bx + 2, by + 2, cw - 4, ch - 4);
        } else {
          const col = q.owner === 1 ? MINE_BLUE : FOE_ROSE;
          const shade = q.shade < 0.33 ? lit(col, 0.12) : q.shade < 0.66 ? col : dim(col, 0.12);
          patch(g, q.x, q.y, cw - 6, ch - 6, shade, 0.95, q.owner === 1 ? 0xe8f2ff : 0xfff0f4);
          // A little motif so the two colours read apart by shape too: diamonds vs. hearts-of-rose.
          if (q.owner === 1) {
            g.fillStyle(lit(col, 0.35), 0.8);
            g.fillTriangle(q.x, q.y - 12, q.x + 10, q.y, q.x, q.y + 12); g.fillTriangle(q.x, q.y - 12, q.x - 10, q.y, q.x, q.y + 12);
          } else {
            g.fillStyle(lit(col, 0.3), 0.8);
            for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; g.fillCircle(q.x + Math.cos(a) * 7, q.y + Math.sin(a) * 7, 4.5); }
            g.fillStyle(dim(col, 0.25), 0.9); g.fillCircle(q.x, q.y, 3.5);
          }
        }
        // Quilted blocks get a heavy outline stitch.
        if (q.quilted) {
          g.lineStyle(3, q.owner === 1 ? 0xe8f2ff : 0xfff0f4, 0.75 + 0.2 * Math.sin(t * 3));
          g.strokeRect(bx + 3, by + 3, cw - 6, ch - 6);
        }
      }
      // Seams.
      for (let c = 0; c <= COLS; c++) stitches(g, x0 + c * cw, y0, x0 + c * cw, y0 + ch * ROWS, CHALK, 1.2, 6, 5, 0.55);
      for (let r = 0; r <= ROWS; r++) stitches(g, x0, y0 + r * ch, x0 + cw * COLS, y0 + r * ch, CHALK, 1.2, 6, 5, 0.55);

      // Work in progress: a stitch line running round the square's border.
      const progress = (cell: Cell, k: number, color: number): void => {
        const bx = cell.x - cw / 2 + 5, by = cell.y - ch / 2 + 5, w = cw - 10, h = ch - 10;
        const per = 2 * (w + h);
        let left = per * Math.min(1, k);
        const edges: [number, number, number, number][] = [[bx, by, bx + w, by], [bx + w, by, bx + w, by + h], [bx + w, by + h, bx, by + h], [bx, by + h, bx, by]];
        for (const [ax, ay, ex, ey] of edges) {
          const len = Math.hypot(ex - ax, ey - ay);
          const use = Math.min(len, left);
          if (use <= 0) break;
          stitches(g, ax, ay, ax + (ex - ax) * (use / len), ay + (ey - ay) * (use / len), color, 2.4, 6, 3, 0.95);
          left -= use;
        }
      };
      if (pWork) {
        const need = pWork.cell.owner === 0 ? (spools > 0 ? SEW_SPOOL_MS : SEW_MS) : RIP_MS;
        progress(pWork.cell, (time - pWork.since) / need, pWork.cell.owner === 0 ? 0xa8d4ff : 0xffd27a);
      }
      if (nWork) progress(nWork.cell, (time - nWork.since) / NPC_RIP_MS, 0xffb0c4);
      for (const q of cells) {
        if (!q.stitchAt) continue;
        const k = (time - q.stitchFrom) / Math.max(1, q.stitchAt - q.stitchFrom);
        g.fillStyle(FOE_ROSE, 0.12 + k * 0.25); g.fillRect(q.x - cw / 2 + 3, q.y - ch / 2 + 3, cw - 6, ch - 6);
        progress(q, k, FOE_ROSE);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // Mends's flying needles, trailing rose thread from her hands to the square.
      const n = ctx.npc;
      for (const q of cells) {
        if (!q.stitchAt) continue;
        const k = Math.min(1, (time - q.stitchFrom) / Math.max(1, q.stitchAt - q.stitchFrom));
        const nx = n.x + (q.x - n.x) * Math.min(1, k * 1.6), ny = n.y - 10 + (q.y - n.y + 10) * Math.min(1, k * 1.6) - Math.sin(Math.min(1, k * 1.6) * Math.PI) * 40;
        g.lineStyle(1.2, FOE_ROSE, 0.7); g.lineBetween(n.x, n.y - 10, nx, ny);
        const a = k < 0.62 ? Math.atan2(q.y - n.y, q.x - n.x) : t * 18;
        needle(g, nx, ny, a, 18);
      }
      // The player's spools of ripped thread, floating at the shoulder.
      const p = ctx.player;
      for (let i = 0; i < spools; i++) spool(g, p.x - 26 + i * 10, p.y - 36, 3.2, FOE_ROSE);
      // A thimble-glint over whoever stands on their own colour.
      for (const f of [p, n]) {
        const cell = cellOf(f);
        if (!cell || cell.owner === 0) continue;
        const mine: Owner = f === p ? 1 : 2;
        if (cell.owner === mine) {
          g.fillStyle(0x9df5a8, 0.5 + 0.3 * Math.sin(t * 6)); g.fillCircle(f.x + 16, f.y - 38, 3);
        } else if (Math.floor(time / 120) % 2 === 0) {
          g.lineStyle(2, mine === 1 ? FOE_ROSE : MINE_BLUE, 0.8); g.strokeCircle(f.x, f.y + 10, 22);
        }
      }
    },

    drawHud(g) {
      const mine = count(1), hers = count(2), total = COLS * ROWS;
      const bw = 300, bx = W / 2 - bw / 2, by = top + 8;
      g.fillStyle(0x1a1418, 0.7); g.fillRoundedRect(bx - 4, by - 4, bw + 8, 16, 6);
      g.fillStyle(CANVAS, 0.5); g.fillRect(bx, by, bw, 8);
      g.fillStyle(PLAYER_TINT, 0.95); g.fillRect(bx, by, bw * (mine / total), 8);
      g.fillStyle(FOE_ROSE, 0.95); g.fillRect(bx + bw - bw * (hers / total), by, bw * (hers / total), 8);
      for (let i = 0; i < MAX_SPOOLS; i++) {
        g.fillStyle(i < spools ? FOE_ROSE : 0x3a3036, 0.95); g.fillCircle(bx - 16 - i * 12, by + 4, 4);
      }
    },
  };
}

export const PATCHWORK: GimmickDef = {
  id: 'sailmaker-patchwork',
  rules: 'Stand still to sew blue squares; yours mend you, her rose ones sting. Stand on hers to RIP them — and sew faster after.',
  make,
};
