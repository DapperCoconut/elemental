import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { crystalPoint, poly } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, FLAG, FLAG_DARK, IRON, RIND, RIND_DARK, SLATE } from '../palette';
import { alive, clamp, dist, ease, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Scratch Test — Assayer Benedek Rull, who in the King's telling kept the court's hardness scale
 * and could tell you, with one stroke of his file, exactly how far down a household would go.
 *
 * Six specimens of the hardness scale stand on plinths about the yard: talc, calcite, fluorite,
 * quartz, corundum, diamond. Each fighter starts soft as chalk. Strike the *next* specimen up
 * your scale — only the next one counts — and you can scratch it: you are that hard now. The
 * plinths are set out of order, so the climb is a route across the yard, and Rull climbs too.
 *
 * Hardness is everything: for every step you stand above the other, they take 13% more from
 * you and you take 13% less from them. And the harder fighter's blows *scratch*: a real blow
 * from a harder fighter knocks the softer one a step down (once every 2.5 s). Halfway, Rull
 * re-sorts his scale: two plinths slide and swap places every few seconds.
 */

const ID = fallenId('geode', 'scratch-test');
const PLINTH_R = 26;
const PLINTH_UP = 34;
const PER_STEP = 0.13;
const SCRATCH_MS = 2500;
const SWAP_EVERY = 7600;
const SWAP_WARN = 1100;
const SWAP_MS = 1300;

/** The six specimens: real Mohs number, body colour, and the habit they are drawn in. */
const MINERALS: { name: string; mohs: number; col: number; habit: 'flake' | 'rhomb' | 'cube' | 'point' | 'barrel' | 'octa' }[] = [
  { name: 'talc', mohs: 1, col: 0xdfe6d6, habit: 'flake' },
  { name: 'calcite', mohs: 3, col: 0xf0d6a0, habit: 'rhomb' },
  { name: 'fluorite', mohs: 4, col: 0x9a72d8, habit: 'cube' },
  { name: 'quartz', mohs: 7, col: 0xdce8f0, habit: 'point' },
  { name: 'corundum', mohs: 9, col: 0xc8304a, habit: 'barrel' },
  { name: 'diamond', mohs: 10, col: 0xf6fbff, habit: 'octa' },
];
/** Ring slots, and which slot each rank stands in — every next step is across the yard. */
const ORDER = [0, 3, 1, 4, 2, 5];

interface Plinth { idx: number; x: number; y: number; fromX: number; fromY: number; toX: number; toY: number; t: StrikeTarget; scratchedBy: { player: boolean; npc: boolean } }
interface Side { f: Fighter; rank: number; scratchedAt: number; climbedAt: number }
interface Swap { a: Plinth; b: Plinth; warnAt: number; moveAt: number; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 8;
  const ps: Side = { f: player, rank: 0, scratchedAt: -9999, climbedAt: -9999 };
  const ns: Side = { f: npc, rank: 0, scratchedAt: -9999, climbedAt: -9999 };
  let halved = false;
  let nextSwap = 0;
  let swap: Swap | null = null;

  const plinths: Plinth[] = MINERALS.map((_, idx) => {
    const slot = ORDER[idx];
    const a = -Math.PI / 2 + (slot / 6) * Math.PI * 2 + 0.3;
    const x = cx + Math.cos(a) * 340, y = cy + Math.sin(a) * 190;
    const p: Omit<Plinth, 't'> = { idx, x, y, fromX: x, fromY: y, toX: x, toY: y, scratchedBy: { player: false, npc: false } };
    const t = ctx.target({ x, y: y - PLINTH_UP, r: PLINTH_R, onStruck: (by) => strike(plinthOf(idx), by) });
    return Object.assign(p, { t });
  });
  const plinthOf = (idx: number) => plinths[idx];

  function strike(p: Plinth, by: 'player' | 'npc'): void {
    const s = by === 'player' ? ps : ns;
    if (!alive(s.f) || s.rank !== p.idx) return;
    s.rank++;
    s.climbedAt = ctx.scene.time.now;
    p.scratchedBy[by] = true;
    ctx.sfx(s.rank === MINERALS.length ? 'crystal-shatter' : 'crystal-chime');
    ctx.flash(p.x, p.y - PLINTH_UP, lit(MINERALS[p.idx].col, 0.4));
    if (s.rank === MINERALS.length) ctx.banner(by === 'player' ? 'YOU SCRATCH DIAMOND' : 'RULL SCRATCHES DIAMOND', '#f6fbff');
  }

  function scratched(s: Side, other: Side, amount: number): void {
    const time = ctx.scene.time.now;
    if (amount < 3 || other.rank <= s.rank || s.rank === 0 || time - s.scratchedAt < SCRATCH_MS) return;
    s.rank--;
    s.scratchedAt = time;
    ctx.sfx('slash');
  }

  const taken = (me: Side, other: Side) => clamp(1 + PER_STEP * (other.rank - me.rank), 0.55, 1.8);

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!halved && alive(npc) && npc.hp < npc.maxHp * 0.5) {
        halved = true;
        nextSwap = time + 1200;
        ctx.banner('RULL RE-SORTS THE SCALE', '#eed490');
        ctx.sfx('gear-turn');
      }
      if (halved && !swap && time >= nextSwap) {
        // Two plinths, chosen to upset whoever is climbing faster: their next one and another.
        const lead = ps.rank >= ns.rank ? ps : ns;
        const a = plinths[Math.min(lead.rank, plinths.length - 1)];
        let b = plinths[Math.floor(ctx.rng() * plinths.length)];
        if (b === a) b = plinths[(a.idx + 3) % plinths.length];
        swap = { a, b, warnAt: time, moveAt: time + SWAP_WARN, done: false };
        a.fromX = a.x; a.fromY = a.y; a.toX = b.x; a.toY = b.y;
        b.fromX = b.x; b.fromY = b.y; b.toX = a.x; b.toY = a.y;
        ctx.sfx('gear-turn');
      }
      if (swap) {
        const k = clamp((time - swap.moveAt) / SWAP_MS, 0, 1);
        for (const p of [swap.a, swap.b]) {
          p.x = p.fromX + (p.toX - p.fromX) * ease(k);
          p.y = p.fromY + (p.toY - p.fromY) * ease(k);
          p.t.moveTo(p.x, p.y - PLINTH_UP);
        }
        if (k >= 1) { swap = null; nextSwap = time + SWAP_EVERY; ctx.sfx('stone-slam'); }
      }
    },

    onPlayerHurt(amount) { scratched(ps, ns, amount); },
    onNpcHurt(amount) { scratched(ns, ps, amount); },
    playerTakenMult: () => taken(ps, ns),
    npcTakenMult: () => taken(ns, ps),

    destroy() { for (const p of plinths) p.t.remove(); },

    npcSeek() {
      if (!alive(npc) || !alive(player) || ns.rank >= plinths.length) return null;
      const p = plinths[ns.rank];
      // Stand just off it, on the side facing the player, so his casts reach it.
      const a = Math.atan2(player.y - p.y, player.x - p.x);
      const at = { x: p.x + Math.cos(a) * 46, y: p.y + Math.sin(a) * 46 };
      if (dist(npc.x, npc.y, at.x, at.y) < 30 && dist(npc.x, npc.y, player.x, player.y) < 260) return null;
      return { x: clamp(at.x, 60, W - 60), y: clamp(at.y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // Chalked route of each side's next step: a dotted line from them to their next plinth.
      for (const s of [ps, ns]) {
        if (!alive(s.f) || s.rank >= plinths.length) continue;
        const p = plinths[s.rank];
        const d = dist(s.f.x, s.f.y, p.x, p.y);
        const n = Math.floor(d / 22);
        g.fillStyle(s === ps ? 0xf0e8d8 : 0xffa040, 0.35);
        for (let i = 1; i < n; i++) {
          const k = i / n;
          g.fillCircle(s.f.x + (p.x - s.f.x) * k, s.f.y + (p.y - s.f.y) * k, 1.8);
        }
      }
      if (swap) {
        const k = clamp((time - swap.warnAt) / SWAP_WARN, 0, 1);
        g.lineStyle(10, FLAG_DARK, 0.25 + k * 0.2); g.lineBetween(swap.a.fromX, swap.a.fromY, swap.b.fromX, swap.b.fromY);
        g.lineStyle(2, BRASS_LIT, 0.5 + k * 0.4); g.lineBetween(swap.a.fromX, swap.a.fromY, swap.b.fromX, swap.b.fromY);
      }
      for (const p of plinths) {
        shadow(g, p.x, p.y + 2, 64, 16);
        const mine = ps.rank === p.idx, his = ns.rank === p.idx;
        if (mine || his) {
          const pulse = 0.5 + Math.sin(time / 180) * 0.3;
          g.lineStyle(2, mine ? 0xf0e8d8 : 0xffa040, pulse); g.strokeEllipse(p.x, p.y, 76 + (mine && his ? 10 : 0), 26);
        }
      }
    },

    drawAir(g, time) {
      for (const p of plinths) drawPlinth(g, p, time);
      // Each fighter's hardness worn as a little specimen chip at the shoulder.
      for (const s of [ps, ns]) {
        if (!alive(s.f) || s.rank === 0) continue;
        const m = MINERALS[s.rank - 1];
        drawSpecimen(g, s.f.x + 22, s.f.y - 52, 0.45, m.habit, m.col);
        const since = time - s.scratchedAt;
        if (since < 600) {
          g.lineStyle(2, 0xffffff, 1 - since / 600);
          g.lineBetween(s.f.x + 12, s.f.y - 60, s.f.x + 32, s.f.y - 44);
        }
      }
    },

    drawHud(g, time) {
      const y = top + 16;
      const row = (x: number, s: Side, tag: number) => {
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 14, 150, 28, 7);
        g.fillStyle(tag, 1); g.fillCircle(x, y, 4.5);
        MINERALS.forEach((m, i) => {
          const gx = x + 20 + i * 21;
          if (i < s.rank) drawSpecimen(g, gx, y + 8, 0.32, m.habit, m.col);
          else { g.lineStyle(1, 0x6a6470, 1); g.strokeRect(gx - 6, y - 6, 12, 12); }
          if (i === s.rank) { g.lineStyle(1.5, BRASS_LIT, 0.6 + Math.sin(time / 160) * 0.3); g.strokeRect(gx - 8, y - 8, 16, 16); }
        });
      };
      row(W / 2 - 170, ps, 0xd8ccb0);
      row(W / 2 + 30, ns, 0xffa040);
    },
  };
}

/** A specimen plinth: a squat slate post bound in iron, a brass plate with its Mohs notches, the mineral on top. */
function drawPlinth(g: G, p: Plinth, time: number): void {
  const m = MINERALS[p.idx];
  const { x, y } = p;
  g.fillStyle(RIND_DARK, 1); g.fillRect(x - 18, y - 30, 36, 30);
  g.fillStyle(SLATE, 1); g.fillRect(x - 16, y - 30, 30, 28);
  g.fillStyle(lit(SLATE, 0.15), 1); g.fillRect(x - 16, y - 30, 8, 28);
  g.fillStyle(IRON, 1); g.fillRect(x - 19, y - 8, 38, 4); g.fillRect(x - 19, y - 28, 38, 3);
  g.fillStyle(RIND, 1); g.fillEllipse(x, y - 31, 40, 10);
  g.fillStyle(FLAG, 1); g.fillEllipse(x, y - 32, 34, 7);
  // The brass plate: notches for the Mohs number.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 13, y - 22, 26, 10);
  g.fillStyle(BRASS, 1); g.fillRect(x - 12, y - 21, 24, 8);
  for (let i = 0; i < m.mohs; i++) {
    g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(x - 10.5 + i * 2.3, y - 20, x - 10.5 + i * 2.3, y - 14 - (i % 5 === 4 ? 0 : 2));
  }
  drawSpecimen(g, x, y - PLINTH_UP + 6, 1, m.habit, m.col);
  // Scratches left by whoever climbed it.
  if (p.scratchedBy.player) { g.lineStyle(1.5, 0xf0e8d8, 0.9); g.lineBetween(x - 9, y - 50, x + 2, y - 40); }
  if (p.scratchedBy.npc) { g.lineStyle(1.5, 0xffa040, 0.9); g.lineBetween(x + 9, y - 50, x - 1, y - 39); }
  if (m.habit === 'octa') glow(g, x, y - 46, 18, 0xffffff, 0.04 + Math.sin(time / 300) * 0.02, 3);
}

/** One mineral in its own crystal habit, its base at (x, y). */
function drawSpecimen(g: G, x: number, y: number, s: number, habit: string, col: number): void {
  const L = lit(col, 0.3), D = dim(col, 0.3);
  if (habit === 'flake') {
    // Talc: soft greasy plates stacked like a worn book.
    for (let i = 0; i < 4; i++) {
      g.fillStyle(i % 2 ? col : L, 1); g.fillEllipse(x + (i % 2 ? 2 : -2) * s, y - (4 + i * 5) * s, 26 * s, 8 * s);
      g.lineStyle(1, D, 0.6); g.strokeEllipse(x + (i % 2 ? 2 : -2) * s, y - (4 + i * 5) * s, 26 * s, 8 * s);
    }
    g.fillStyle(0xffffff, 0.45); g.fillEllipse(x - 5 * s, y - 20 * s, 8 * s, 2.5 * s);
  } else if (habit === 'rhomb') {
    // Calcite: a leaning rhombohedron, two faces showing.
    poly(g, [{ x: x - 14 * s, y }, { x: x + 6 * s, y }, { x: x + 14 * s, y: y - 18 * s }, { x: x - 6 * s, y: y - 18 * s }], col);
    poly(g, [{ x: x - 6 * s, y: y - 18 * s }, { x: x + 14 * s, y: y - 18 * s }, { x: x + 4 * s, y: y - 26 * s }, { x: x - 16 * s, y: y - 26 * s }], L);
    poly(g, [{ x: x - 14 * s, y }, { x: x - 6 * s, y: y - 18 * s }, { x: x - 16 * s, y: y - 26 * s }, { x: x - 22 * s, y: y - 8 * s }], D);
    // The doubled line seen through calcite.
    g.lineStyle(1, D, 0.7); g.lineBetween(x - 10 * s, y - 6 * s, x + 6 * s, y - 6 * s); g.lineBetween(x - 8 * s, y - 9 * s, x + 8 * s, y - 9 * s);
  } else if (habit === 'cube') {
    // Fluorite: interpenetrating cubes with a green band.
    const c = (cx: number, cy: number, r: number, k: number) => {
      poly(g, [{ x: cx - r, y: cy }, { x: cx, y: cy + r * 0.5 }, { x: cx, y: cy - r }, { x: cx - r, y: cy - r * 1.5 }], k ? col : 0x6ad8a0);
      poly(g, [{ x: cx, y: cy + r * 0.5 }, { x: cx + r, y: cy }, { x: cx + r, y: cy - r * 1.5 }, { x: cx, y: cy - r }], D);
      poly(g, [{ x: cx - r, y: cy - r * 1.5 }, { x: cx, y: cy - r }, { x: cx + r, y: cy - r * 1.5 }, { x: cx, y: cy - r * 2 }], L);
    };
    c(x - 5 * s, y - 2 * s, 10 * s, 0);
    c(x + 5 * s, y - 6 * s, 11 * s, 1);
  } else if (habit === 'point') {
    crystalPoint(g, x - 6 * s, y, 8 * s, 30 * s, -0.25, col);
    crystalPoint(g, x + 4 * s, y, 11 * s, 38 * s, 0.1, col);
  } else if (habit === 'barrel') {
    // Corundum: a hexagonal barrel, tapering at both ends, banded.
    poly(g, [{ x: x - 9 * s, y }, { x: x + 9 * s, y }, { x: x + 12 * s, y: y - 14 * s }, { x: x + 8 * s, y: y - 30 * s }, { x: x - 8 * s, y: y - 30 * s }, { x: x - 12 * s, y: y - 14 * s }], col);
    poly(g, [{ x, y }, { x: x + 9 * s, y }, { x: x + 12 * s, y: y - 14 * s }, { x: x + 8 * s, y: y - 30 * s }, { x, y: y - 30 * s }], D);
    for (let i = 1; i < 4; i++) { g.lineStyle(1, L, 0.6); g.lineBetween(x - 11 * s, y - i * 7.5 * s, x + 11 * s, y - i * 7.5 * s); }
    g.fillStyle(L, 1); g.fillEllipse(x, y - 30 * s, 16 * s, 4 * s);
  } else {
    // Diamond: a sharp octahedron, all fire.
    const t = { x, y: y - 34 * s }, b = { x, y }, l = { x: x - 13 * s, y: y - 17 * s }, r = { x: x + 13 * s, y: y - 17 * s }, m = { x: x + 3 * s, y: y - 15 * s };
    poly(g, [t, l, m], L); poly(g, [t, m, r], col); poly(g, [l, b, m], col); poly(g, [m, b, r], D);
    g.fillStyle(0xff9ad0, 0.5); g.fillTriangle(t.x, t.y, m.x, m.y, r.x, r.y - 4 * s);
    g.fillStyle(0x9ad8ff, 0.5); g.fillTriangle(l.x, l.y, b.x, b.y, m.x, m.y);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 3 * s, y - 24 * s, 1.6 * s);
  }
}

export const FALLEN_SCRATCH_TEST: GimmickDef = {
  id: ID,
  rules: 'Strike the next mineral up the hardness scale to become that hard. The harder side hits harder, takes less, and scratches the other down.',
  make,
};
