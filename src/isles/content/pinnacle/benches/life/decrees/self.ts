import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { GREEN, OBS } from '../art';
import { WHO, type Who, alive, clamp, dist, fighterOf, stepDt } from './util';

/**
 * Decree of Self — Councilor Osric Pallor, Seat of Bone (marrow).
 *
 * Pallor wrote the clause that made a pruned family *part of the hedge*: the graft takes, the
 * body forgets it was ever anyone else. His decree is the body's oldest law — self and not-self.
 * The glass floor is a mosaic of cells, and the cells take the tissue of whoever stands on them:
 * stand still a moment and a cell turns yours (green); his turn his (violet). On your own tissue
 * you knit — three health a second. On his you are FOREIGN, and everything lands 25% harder.
 * Taking his ground back takes twice as long as claiming bare glass.
 *
 * Marrow perfected sits in a fortress of its own cells and lets them work. He will hold his
 * ground; take it from under him, or draw him off it onto yours.
 */

const CELL = 48;
const CLAIM_PER_S = 1.5;
const REACH = 40;
const KNIT_PER_S = 3;
const FOREIGN = 1.25;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const cols = Math.ceil(W / CELL);
  const rows = Math.ceil((H - top) / CELL);
  /** −1 his … +1 yours, per cell. */
  const v = new Float32Array(cols * rows);
  /** When each cell last turned, for the flare. */
  const turned = new Float64Array(cols * rows).fill(-9999);
  const knitAcc: Record<Who, number> = { player: 0, npc: 0 };
  const sign: Record<Who, number> = { player: 1, npc: -1 };
  let rejectedAt: Record<Who, number> = { player: -9999, npc: -9999 };
  const now = () => ctx.scene.time.now;

  const cellAt = (x: number, y: number): number => {
    const c = clamp(Math.floor(x / CELL), 0, cols - 1), r = clamp(Math.floor((y - top) / CELL), 0, rows - 1);
    return r * cols + c;
  };
  const owner = (i: number): Who | null => (v[i] > 0.5 ? 'player' : v[i] < -0.5 ? 'npc' : null);
  const standing = (w: Who): Who | null => { const f = fighterOf(ctx, w); return owner(cellAt(f.x, f.y)); };
  const foreign = (w: Who): boolean => standing(w) === (w === 'player' ? 'npc' : 'player');

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        // Claim every cell whose middle is within reach of the body.
        const c0 = Math.floor((f.x - REACH) / CELL), c1 = Math.floor((f.x + REACH) / CELL);
        const r0 = Math.floor((f.y - top - REACH) / CELL), r1 = Math.floor((f.y - top + REACH) / CELL);
        for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
          for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) {
            const cx = c * CELL + CELL / 2, cy = top + r * CELL + CELL / 2;
            if (dist(cx, cy, f.x, f.y) > REACH) continue;
            const i = r * cols + c;
            const before = owner(i);
            v[i] = clamp(v[i] + sign[w] * CLAIM_PER_S * (ctx.hard && w === 'npc' ? 1.15 : 1) * dt, -1, 1);
            if (owner(i) !== before && owner(i) === w) turned[i] = time;
          }
        }
        // Knit on your own ground.
        if (standing(w) === w && f.hp < f.maxHp) {
          knitAcc[w] += KNIT_PER_S * dt;
          if (knitAcc[w] >= 1.5) { ctx.heal(f, Math.floor(knitAcc[w])); knitAcc[w] -= Math.floor(knitAcc[w]); }
        } else knitAcc[w] = 0;
        if (foreign(w) && time - rejectedAt[w] > 2500) {
          rejectedAt = { ...rejectedAt, [w]: time };
          ctx.float(f.x, f.y - 56, 'FOREIGN', w === 'player' ? '#d8b0ff' : '#b8ff9a');
          ctx.sfx('status-debuff');
        }
      }
    },

    playerTakenMult() { return foreign('player') ? FOREIGN : 1; },
    npcTakenMult() { return foreign('npc') ? FOREIGN : 1; },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const here = standing('npc');
      // He holds his own ground; off it, he goes for the nearest of his cells toward you.
      if (here === 'npc' && dist(n.x, n.y, p.x, p.y) < 420) return null;
      let best: Pt | null = null, bs = Infinity;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const cx = c * CELL + CELL / 2, cy = top + r * CELL + CELL / 2;
          if (cy < top + 30 || cy > H - 30) continue;
          // His own cells, or bare glass he can claim; never yours unless he means to take it.
          const own = v[i] < -0.5 ? 0 : v[i] < 0.5 ? 60 : 140;
          const s = dist(cx, cy, n.x, n.y) * 0.6 + Math.abs(dist(cx, cy, p.x, p.y) - 220) * 0.8 + own;
          if (s < bs) { bs = s; best = { x: cx, y: cy }; }
        }
      }
      return best;
    },

    drawGround(g, time) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const a = Math.abs(v[i]);
          if (a < 0.08) continue;
          const mine = v[i] > 0;
          const col = mine ? GREEN.leaf : OBS.seam;
          const lit = mine ? GREEN.vineLit : OBS.seamLit;
          const x = c * CELL, y = top + r * CELL;
          const owned = a > 0.5;
          // A cell: membrane, cytoplasm, a nucleus off-centre — the tissue showing through the glass.
          const pulse = 0.5 + 0.5 * Math.sin(time / 600 + i * 0.7);
          g.fillStyle(col, (owned ? 0.2 : 0.08) * a + pulse * 0.03);
          g.fillRoundedRect(x + 3, y + 3, CELL - 6, CELL - 6, 14);
          g.lineStyle(owned ? 1.6 : 1, lit, (owned ? 0.55 : 0.25) * a);
          g.strokeRoundedRect(x + 3, y + 3, CELL - 6, CELL - 6, 14);
          if (owned) {
            const nx = x + CELL / 2 + Math.sin(i * 3.1) * 7, ny = y + CELL / 2 + Math.cos(i * 2.3) * 6;
            g.fillStyle(lit, 0.45 * a); g.fillCircle(nx, ny, 5);
            g.fillStyle(0xffffff, 0.3 * a); g.fillCircle(nx - 1.5, ny - 1.5, 1.6);
          }
          const flare = (time - turned[i]) / 500;
          if (flare >= 0 && flare < 1) { g.lineStyle(2.5, 0xffffff, 0.6 * (1 - flare)); g.strokeRoundedRect(x + 3 - flare * 4, y + 3 - flare * 4, CELL - 6 + flare * 8, CELL - 6 + flare * 8, 14); }
        }
      }
    },

    drawAir(g, time) {
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        const st = standing(w);
        if (st === w && f.hp < f.maxHp) {
          // Knitting: threads of the body's own colour lacing up round it.
          const col = w === 'player' ? GREEN.vineLit : OBS.seamLit;
          for (let k = 0; k < 4; k++) {
            const ph = ((time / 900) + k / 4) % 1;
            g.lineStyle(1.5, col, 0.7 * (1 - ph));
            g.beginPath(); g.arc(f.x, f.y + 10 - ph * 40, 14 + k * 2, Math.PI * (0.1 + k * 0.4), Math.PI * (0.7 + k * 0.4), false); g.strokePath();
          }
        } else if (st && st !== w) {
          // Foreign: the floor's cells crowd in on the body, spiky.
          const col = st === 'player' ? GREEN.leaf : OBS.seam;
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * Math.PI * 2 + time / 500;
            const r0 = 26 + Math.sin(time / 90 + k) * 3;
            g.fillStyle(col, 0.85);
            g.fillTriangle(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0, f.x + Math.cos(a + 0.18) * (r0 + 10), f.y + Math.sin(a + 0.18) * (r0 + 10), f.x + Math.cos(a + 0.36) * r0, f.y + Math.sin(a + 0.36) * r0);
          }
        }
      }
    },

    drawHud(g) {
      // How much of the floor each body has taken.
      let mine = 0, his = 0;
      for (let i = 0; i < v.length; i++) { if (v[i] > 0.5) mine++; else if (v[i] < -0.5) his++; }
      const cx = W / 2, y = top + 16, w = 300;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(cx - w / 2 - 6, y - 9, w + 12, 18, 8);
      g.fillStyle(GREEN.leaf, 0.95); g.fillRect(cx - w / 2, y - 4, (w * mine) / v.length, 8);
      g.fillStyle(OBS.seam, 0.95); g.fillRect(cx + w / 2 - (w * his) / v.length, y - 4, (w * his) / v.length, 8);
      g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(cx, y - 7, cx, y + 7);
    },
  };
}

export const DECREE_SELF: GimmickDef = {
  id: 'bench-life-self',
  rules: 'The floor takes the tissue of whoever stands on it. On your own you knit (+3/s). On his you are FOREIGN and take 25% more. Taking his back is slow.',
  make,
};
