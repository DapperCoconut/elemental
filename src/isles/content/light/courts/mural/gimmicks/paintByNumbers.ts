import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { CANVAS, GOLD, GOLD_DARK, GOLD_LIT, SIDE_NPC, SIDE_PLAYER, ULTRA_DARK } from '../palette';
import { alive, centroid, clamp, dist, inPoly } from '../util';

/**
 * Paint by Numbers — Apprentice Dab.
 *
 * The yard floor is a paint-by-numbers board: eight outlined regions, each with its number
 * painted in its middle. Dab is an apprentice and a gambler — he rolls a gilt die to choose
 * which number is next, the region flashes, then opens: whoever stands in it alone fills it with
 * their colour (both in it, and the brush stalls). A region in your colour heals you while you
 * stand in it, and burns the other fighter standing in it. Overpaint a region and it changes
 * hands. Every fourth roll is gilded — claim that one for a burst of health.
 *
 * The die is honest, which Dab finds very upsetting. Read the flash, get there first, and stand
 * between him and his own colours.
 */

type SideId = 'player' | 'npc';
const COL: Record<SideId, number> = { player: SIDE_PLAYER, npc: SIDE_NPC };

interface Cell {
  poly: Pt[];
  c: Pt;
  num: number;
  owner: SideId | null;
  /** Progress of the side painting it right now (0..1). */
  fill: number;
  painter: SideId | null;
  /** Painted strokes for texture, fixed per cell. */
  seed: number;
}

/** A painted numeral in seven strokes — the board's own hand. */
const SEGS: Record<number, number[]> = {
  0: [0, 1, 2, 4, 5, 6], 1: [2, 5], 2: [0, 2, 3, 4, 6], 3: [0, 2, 3, 5, 6], 4: [1, 2, 3, 5],
  5: [0, 1, 3, 5, 6], 6: [0, 1, 3, 4, 5, 6], 7: [0, 2, 5], 8: [0, 1, 2, 3, 4, 5, 6], 9: [0, 1, 2, 3, 5, 6],
};
function numeral(g: G, x: number, y: number, n: number, s: number, color: number, a: number): void {
  const w = 7 * s, h = 7 * s;
  const L: [number, number, number, number][] = [
    [-w, -h * 2, w, -h * 2], [-w, -h * 2, -w, 0], [w, -h * 2, w, 0], [-w, 0, w, 0], [-w, 0, -w, h * 2], [w, 0, w, h * 2], [-w, h * 2, w, h * 2],
  ];
  g.lineStyle(2.6 * s, color, a);
  for (const i of SEGS[n] ?? []) { const [a0, b0, a1, b1] = L[i]; g.lineBetween(x + a0, y + b0, x + a1, y + b1); }
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  // An irregular 4×2 grid: interior corners jittered so the regions look hand-drawn.
  const COLS = 4, ROWS = 2;
  const x0 = 34, x1 = W - 34, y0 = top + 18, y1 = H - 22;
  const corner: Pt[][] = [];
  for (let r = 0; r <= ROWS; r++) {
    corner.push([]);
    for (let c = 0; c <= COLS; c++) {
      const edgeX = c === 0 || c === COLS, edgeY = r === 0 || r === ROWS;
      corner[r].push({
        x: x0 + ((x1 - x0) * c) / COLS + (edgeX ? 0 : (rng() - 0.5) * 90),
        y: y0 + ((y1 - y0) * r) / ROWS + (edgeY ? 0 : (rng() - 0.5) * 80),
      });
    }
  }
  const nums = [1, 2, 3, 4, 5, 6, 7, 8].sort(() => rng() - 0.5);
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const poly = [corner[r][c], corner[r][c + 1], corner[r + 1][c + 1], corner[r + 1][c]];
    cells.push({ poly, c: centroid(poly), num: nums[cells.length], owner: null, fill: 0, painter: null, seed: rng() * 100 });
  }

  const ROLL_GAP = ctx.hard ? 1400 : 1900;
  const WARN = 1250;
  const OPEN = ctx.hard ? 4800 : 5600;
  const FILL_S = 1.6;
  let rolls = 0;
  let rollAt = 0;
  let current: Cell | null = null;
  let openAt = 0;
  let closeAt = 0;
  let gilded = false;
  let shown = -1;
  let started = false;
  const tick = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  const sideOf = (f: Fighter): SideId => (f === player ? 'player' : 'npc');
  const fighterOf = (s: SideId) => (s === 'player' ? player : npc);
  const cellAt = (x: number, y: number) => cells.find((c) => inPoly(x, y, c.poly)) ?? null;

  function roll(time: number): void {
    rolls++;
    gilded = rolls % 4 === 0;
    // An honest die: any number but the one just played.
    const pool = cells.filter((c) => c !== current);
    current = pool[Math.floor(rng() * pool.length)];
    current.fill = 0; current.painter = null;
    openAt = time + WARN;
    closeAt = openAt + OPEN;
    shown = -1;
    ctx.sfx('dice');
    if (alive(npc)) ctx.float(npc.x, npc.y - 56, gilded ? `GILT ${current.num}!` : `ROLLED ${current.num}!`, gilded ? '#fff0a0' : '#ffd090');
  }

  function claim(cell: Cell, side: SideId, time: number): void {
    const was = cell.owner;
    cell.owner = side;
    cell.fill = 0; cell.painter = null;
    const f = fighterOf(side);
    ctx.flash(cell.c.x, cell.c.y, COL[side]);
    ctx.sfx(was && was !== side ? 'slime-splat' : 'sparkle');
    ctx.float(cell.c.x, cell.c.y - 20, was && was !== side ? 'OVERPAINTED' : `${cell.num} PAINTED`, side === 'player' ? '#8af0ff' : '#ffc070');
    if (gilded && cell === current) { ctx.heal(f, ctx.hard ? 12 : 15); ctx.sfx('jackpot'); }
    closeAt = Math.min(closeAt, time + 350);
  }

  return {
    update(time, dt) {
      if (!started) { started = true; rollAt = time + 900; }
      if (!current || time > closeAt) {
        if (current && time > closeAt) { current.fill = 0; current.painter = null; current = null; rollAt = time + ROLL_GAP; }
        if (time >= rollAt) roll(time);
      }
      // The open region fills for whoever stands in it alone.
      if (current && time >= openAt && time <= closeAt) {
        if (shown < 0) { shown = time; ctx.sfx('countdown-go'); }
        const inP = alive(player) && inPoly(player.x, player.y, current.poly);
        const inN = alive(npc) && inPoly(npc.x, npc.y, current.poly);
        const who: SideId | null = inP && !inN ? 'player' : inN && !inP ? 'npc' : null;
        if (who && current.owner !== who) {
          if (current.painter && current.painter !== who) {
            current.fill -= (dt / FILL_S) * 1.6;
            if (current.fill <= 0) { current.fill = 0; current.painter = who; }
          } else {
            current.painter = who;
            current.fill += dt / FILL_S;
            if (current.fill >= 1) claim(current, who, time);
          }
        }
      }
      // Owned regions: heal the owner, burn the other.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (time < (tick.get(f) ?? 0)) continue;
        const cell = cellAt(f.x, f.y);
        if (!cell || !cell.owner) continue;
        tick.set(f, time + 600);
        if (cell.owner === sideOf(f)) ctx.heal(f, ctx.hard ? 1 : 1.5);
        else { ctx.hit(f, ctx.hard ? 4 : 3, f.x, f.y); }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      if (current && time <= closeAt && current.owner !== 'npc') return current.c;
      // Hurt: home to his own colour. Otherwise: stand in his colour near you, or by you.
      const mine = cells.filter((c) => c.owner === 'npc');
      if (mine.length && (npc.hp / npc.maxHp < 0.6 || rng() < 0.02)) {
        mine.sort((a, b) => dist(a.c.x, a.c.y, player.x, player.y) - dist(b.c.x, b.c.y, player.x, player.y));
        return mine[0].c;
      }
      return { x: clamp(player.x + Math.cos(time / 1500) * 210, 60, W - 60), y: clamp(player.y + Math.sin(time / 1500) * 150, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The board: primed canvas, regions in colour once painted, lines in ultramarine ink.
      g.fillStyle(CANVAS, 0.5); g.fillRect(x0, y0, x1 - x0, y1 - y0);
      for (const cell of cells) {
        if (cell.owner) {
          const c = COL[cell.owner];
          g.fillStyle(c, 0.42); g.fillPoints(cell.poly, true);
          // Brushwork inside: short parallel strokes, as a careful apprentice lays them.
          for (let i = 0; i < 16; i++) {
            const px = cell.c.x + Math.cos(cell.seed + i * 2.3) * (20 + (i * 13) % 90);
            const py = cell.c.y + Math.sin(cell.seed + i * 2.3) * (14 + (i * 7) % 60);
            if (!inPoly(px, py, cell.poly)) continue;
            g.lineStyle(5, i % 2 ? lit(c, 0.25) : dim(c, 0.15), 0.4); g.lineBetween(px - 12, py + 4, px + 12, py - 4);
          }
        }
        // Painting in progress: the region filling from its middle.
        if (cell === current && cell.painter && cell.fill > 0) {
          const k = cell.fill;
          const scaled = cell.poly.map((p) => ({ x: cell.c.x + (p.x - cell.c.x) * k, y: cell.c.y + (p.y - cell.c.y) * k }));
          g.fillStyle(COL[cell.painter], 0.55); g.fillPoints(scaled, true);
        }
        // Rolled: the outline flashes; open: it glows gold (gilt) or white.
        if (cell === current) {
          const warn = time < openAt;
          const pulse = 0.5 + Math.sin(time / (warn ? 70 : 180)) * 0.5;
          if (warn) { g.lineStyle(6, gilded ? GOLD_LIT : 0xffffff, 0.3 + pulse * 0.5); g.strokePoints(cell.poly, true); }
          else {
            g.fillStyle(gilded ? GOLD_LIT : 0xffffff, 0.1 + pulse * 0.08); g.fillPoints(cell.poly, true);
            g.lineStyle(5, gilded ? GOLD : 0xffffff, 0.8); g.strokePoints(cell.poly, true);
            // The open window running out: a ring round the number.
            const k = clamp((closeAt - time) / OPEN, 0, 1);
            g.lineStyle(3, gilded ? GOLD : 0xffffff, 0.8);
            g.beginPath(); g.arc(cell.c.x, cell.c.y, 34, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          }
        }
        g.lineStyle(3, ULTRA_DARK, 0.7); g.strokePoints(cell.poly, true);
        g.lineStyle(1, 0xffffff, 0.3); g.strokePoints(cell.poly, true);
        // The number in the middle.
        const nc = cell.owner ? 0xffffff : ULTRA_DARK;
        numeral(g, cell.c.x, cell.c.y, cell.num, 1.6, nc, cell.owner ? 0.7 : 0.55);
      }
    },

    drawAir(g, time) {
      // Dab's die, tumbling over his head while he rolls; landing on the number.
      if (current && time < openAt && alive(npc)) {
        const k = clamp(1 - (openAt - time) / WARN, 0, 1);
        const x = npc.x + 28, y = npc.y - 70 - Math.sin(k * Math.PI) * 26;
        const spin = (1 - k) * 12;
        const s = 11;
        if (gilded) glow(g, x, y, 22, GOLD_LIT, 0.08, 3);
        g.fillStyle(GOLD_DARK, 1); g.fillRect(x - s + 2, y - s + 2, s * 2, s * 2);
        g.fillStyle(gilded ? GOLD : 0xfaf4e6, 1); g.fillRect(x - s, y - s, s * 2, s * 2);
        g.lineStyle(1.5, GOLD_DARK, 1); g.strokeRect(x - s, y - s, s * 2, s * 2);
        const face = k > 0.85 ? current.num : 1 + (Math.floor(spin * 3) % 8);
        const pipN = ((face - 1) % 6) + 1;
        const pips: [number, number][] = [[0, 0], [-1, -1], [1, 1], [-1, 1], [1, -1], [-1, 0], [1, 0]];
        const use: number[][] = [[0], [1, 2], [0, 1, 2], [1, 2, 3, 4], [0, 1, 2, 3, 4], [1, 2, 3, 4, 5, 6]];
        for (const i of use[pipN - 1]) { g.fillStyle(ULTRA_DARK, 1); g.fillCircle(x + pips[i][0] * 6, y + pips[i][1] * 6, 1.8); }
        if (face > 6) numeral(g, x, y, face, 0.5, 0xd8507e, 1);
      }
      // Who is healing where: a soft upward glitter in your own colour, scorch in the other's.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const cell = cellAt(f.x, f.y);
        if (!cell || !cell.owner) continue;
        const own = cell.owner === sideOf(f);
        for (let i = 0; i < 4; i++) {
          const ph = (time / 700 + i / 4) % 1;
          if (own) { g.fillStyle(0xffffff, 0.7 * (1 - ph)); g.fillCircle(f.x - 12 + i * 8, f.y + 10 - ph * 40, 2); }
          else { g.fillStyle(COL[cell.owner], 0.7 * (1 - ph)); g.fillTriangle(f.x - 14 + i * 9, f.y + 14 - ph * 26, f.x - 10 + i * 9, f.y + 14 - ph * 26, f.x - 12 + i * 9, f.y + 4 - ph * 26); }
        }
      }
    },

    drawHud(g) {
      // Regions held per side: two rows of eight swatches.
      const pc = cells.filter((c) => c.owner === 'player').length;
      const nc = cells.filter((c) => c.owner === 'npc').length;
      for (let i = 0; i < 8; i++) {
        g.fillStyle(i < pc ? SIDE_PLAYER : 0x000000, i < pc ? 1 : 0.35); g.fillRect(18 + i * 11, top + 8, 9, 9);
        g.fillStyle(i < nc ? SIDE_NPC : 0x000000, i < nc ? 1 : 0.35); g.fillRect(W - 27 - i * 11, top + 8, 9, 9);
      }
    },
  };
}

export const PAINT_BY_NUMBERS: GimmickDef = {
  id: 'mural-paint-by-numbers',
  rules: 'Dab rolls which numbered region opens next. Stand in it alone to paint it your colour: your colour heals you and burns your foe. Gilt rolls heal.',
  make,
};
