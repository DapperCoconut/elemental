import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { cardStrip, segText } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, CARD, FAULT, IRON, IRON_DARK, MASK_DARK, MASK_DEEP, NIXIE, SILK } from '../palette';
import { alive, bits, clamp, stepDt } from '../util';

/**
 * Punch Cards — Clerk Hollerith.
 *
 * Hollerith's mill floor is laid with feed lanes, and down them, out of the slots in the walls,
 * the Tabulator's cards come sliding: great buff strips the width of a lane, each punched with a
 * household's reckoning — a byte of holes, column by column. A card feeds at a steady walk.
 *
 * Stand on card as it feeds and you are *carried* with it and *cut* by its edge; ride it all the
 * way to the reader slot at the far wall and the reader takes a bite. The punched holes are safe —
 * stand in a hole and the card slides past round you. Between the lanes run narrow steel rails
 * where you can stand on nothing at all. The foe is paper and knows it: she rides holes. So can you.
 */

const LANES = 5;
const LANE_H = 84;
const COL_W = 80;
const COLS = 12;

interface Card {
  lane: number;
  dir: 1 | -1;
  /** Leading-edge x. */
  x: number;
  speed: number;
  value: number;
  holes: boolean[];
  warnAt: number;
  enterAt: number;
  read: Set<Fighter>;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const laneY = (i: number) => top + 54 + i * ((H - top - 54 - 40) / (LANES - 1));
  const rails: number[] = [];
  for (let i = 0; i < LANES - 1; i++) rails.push((laneY(i) + laneY(i + 1)) / 2);
  const cards: Card[] = [];
  const lastCut = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const SPEED = ctx.hard ? 140 : 112;
  const CUT = ctx.hard ? 5 : 4;
  const WARN = 1300;
  const LEN = COLS * COL_W;
  let nextCard = 0;
  let started = false;

  function feed(time: number): void {
    const busy = new Set(cards.map((c) => c.lane));
    const free = Array.from({ length: LANES }, (_, i) => i).filter((i) => !busy.has(i));
    if (!free.length) return;
    // Prefer a lane near someone, so the floor is never idle under the fight.
    const near = free.filter((i) => [player, npc].some((f) => Math.abs(f.y - laneY(i)) < 80));
    const pool = near.length && rng() < 0.7 ? near : free;
    const lane = pool[Math.floor(rng() * pool.length)];
    const dir: 1 | -1 = lane % 2 === 0 ? 1 : -1;
    // A byte of holes: never all solid, never all holes. Each column is one bit.
    let value = 0;
    while (value === 0 || value === 0xfff) value = Math.floor(rng() * 0xfff);
    const holes = Array.from({ length: COLS }, (_, k) => ((value >> k) & 1) === 1);
    cards.push({ lane, dir, x: dir > 0 ? 0 : W, speed: SPEED, value, holes, warnAt: time, enterAt: time + WARN, read: new Set() });
    ctx.sfx('reload');
  }

  /** The card's span and whether x on it is a hole. Columns run back from the leading edge. */
  const span = (c: Card) => (c.dir > 0 ? { x0: c.x - LEN, x1: c.x } : { x0: c.x, x1: c.x + LEN });
  function onCard(c: Card, x: number, y: number): 'card' | 'hole' | null {
    if (Math.abs(y - laneY(c.lane)) > LANE_H / 2 - 4) return null;
    const { x0, x1 } = span(c);
    if (x < x0 || x > x1) return null;
    const back = c.dir > 0 ? c.x - x : x - c.x;
    const col = Math.floor(back / COL_W);
    if (col < 0 || col >= COLS) return null;
    // A hole is a column with an 8px lip of card at each side.
    const inCol = back - col * COL_W;
    return c.holes[col] && inCol > 10 && inCol < COL_W - 10 ? 'hole' : 'card';
  }
  /** Hole centres (world x) on a card, for the bot. */
  const holeXs = (c: Card): number[] => c.holes.flatMap((h, k) => (h ? [c.dir > 0 ? c.x - (k + 0.5) * COL_W : c.x + (k + 0.5) * COL_W] : []));

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextCard = time + 600; }
      if (time >= nextCard) {
        nextCard = time + (ctx.hard ? 2100 : 2700);
        if (cards.length < 3) feed(time);
      }
      for (let i = cards.length - 1; i >= 0; i--) {
        const c = cards[i];
        if (time < c.enterAt) continue;
        c.x += c.dir * c.speed * dt;
        const { x0, x1 } = span(c);
        if ((c.dir > 0 && x0 > W) || (c.dir < 0 && x1 < 0)) { cards.splice(i, 1); continue; }
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const on = onCard(c, f.x, f.y);
          if (on !== 'card') continue;
          // Carried with the feed.
          ctx.nudge(f, c.dir * c.speed * dt, 0);
          // Cut by the edge, on a beat.
          if (time - (lastCut.get(f) ?? 0) > 520) {
            lastCut.set(f, time);
            ctx.hit(f, CUT, f.x, f.y);
            ctx.sfx('slash');
          }
          // The reader at the far wall takes a bite out of anyone carried into it.
          const atReader = c.dir > 0 ? f.x > W - 70 : f.x < 70;
          if (atReader && !c.read.has(f)) {
            c.read.add(f);
            ctx.hit(f, CUT * 2 + 4, f.x, f.y);
            ctx.stun(f, 420);
            const ry = f.y < laneY(c.lane) ? -56 : 56;
            ctx.nudge(f, -c.dir * 40, ry);
            ctx.float(f.x, f.y - 40, 'READ ' + bits(c.value, 12).slice(0, 4), '#ffb070');
            ctx.sfx('stab');
          }
        }
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      // On a lane with a card coming or feeding: ride a hole, or step to the nearest rail.
      for (const c of cards) {
        if (Math.abs(npc.y - laneY(c.lane)) > LANE_H / 2 + 10) continue;
        const { x0, x1 } = span(c);
        const reach = time() < c.enterAt ? (c.dir > 0 ? npc.x < 160 : npc.x > W - 160) : npc.x > x0 - 60 && npc.x < x1 + 60;
        if (!reach) continue;
        const hs = holeXs(c).filter((hx) => hx > 60 && hx < W - 60);
        let best: number | null = null;
        for (const hx of hs) if (best === null || Math.abs(hx - npc.x) < Math.abs(best - npc.x)) best = hx;
        if (best !== null && Math.abs(best - npc.x) < 140 && time() >= c.enterAt) {
          // Lead the hole a little — it moves.
          return { x: best + c.dir * 18, y: laneY(c.lane) };
        }
        let rail = rails[0];
        for (const r of rails) if (Math.abs(r - npc.y) < Math.abs(rail - npc.y)) rail = r;
        return { x: npc.x, y: rail };
      }
      // Otherwise shadow the player from the nearest rail.
      let rail = rails[0];
      for (const r of rails) if (Math.abs(r - player.y) < Math.abs(rail - player.y)) rail = r;
      const side = npc.x < player.x ? -1 : 1;
      return { x: clamp(player.x + side * 200, 70, W - 70), y: rail } as Pt;
    },

    drawGround(g, t) {
      // The lane beds: dark channels with roller lines, the feed slot and the reader at the ends.
      for (let i = 0; i < LANES; i++) {
        const y = laneY(i);
        const dir = i % 2 === 0 ? 1 : -1;
        g.fillStyle(MASK_DEEP, 0.85); g.fillRect(0, y - LANE_H / 2 - 4, W, LANE_H + 8);
        g.fillStyle(MASK_DARK, 1); g.fillRect(0, y - LANE_H / 2, W, LANE_H);
        for (let x = 40; x < W; x += 60) { g.fillStyle(IRON, 0.5); g.fillRect(x, y - LANE_H / 2 + 4, 4, LANE_H - 8); }
        // Chevrons showing the feed direction.
        for (let x = 80; x < W - 40; x += 160) {
          const cx = (((x + t * 0.03 * dir) % W) + W) % W;
          g.lineStyle(2, SILK, 0.12);
          g.lineBetween(cx, y - 14, cx + dir * 14, y); g.lineBetween(cx + dir * 14, y, cx, y + 14);
        }
        const feedX = dir > 0 ? 0 : W, readX = dir > 0 ? W : 0;
        // Feed slot: brass rollers in the wall.
        g.fillStyle(BRASS_DARK, 1); g.fillRect(feedX - 14, y - LANE_H / 2 - 6, 28, LANE_H + 12);
        for (let k = 0; k < 4; k++) { g.fillStyle(BRASS, 1); g.fillCircle(feedX, y - LANE_H / 2 + 10 + k * 21, 8); g.fillStyle(BRASS_LIT, 0.6); g.fillCircle(feedX - 2, y - LANE_H / 2 + 8 + k * 21, 3); }
        // Reader: a steel jaw of brushes and a lamp.
        g.fillStyle(IRON_DARK, 1); g.fillRect(readX - 18, y - LANE_H / 2 - 6, 36, LANE_H + 12);
        for (let k = 0; k < 12; k++) { g.lineStyle(1.5, lit(IRON, 0.3), 0.8); g.lineBetween(readX - dir * 18, y - LANE_H / 2 + 4 + k * 7, readX - dir * 6, y - LANE_H / 2 + 6 + k * 7); }
        g.fillStyle(NIXIE, 0.85); g.fillCircle(readX - dir * 4, y - LANE_H / 2 - 2, 3);
      }
      // The rails between lanes.
      for (const r of rails) {
        g.fillStyle(IRON_DARK, 1); g.fillRect(0, r - 5, W, 10);
        g.fillStyle(IRON, 1); g.fillRect(0, r - 4, W, 6);
        g.fillStyle(lit(IRON, 0.35), 0.8); g.fillRect(0, r - 4, W, 1.5);
      }
      // Cards: the warning glow at the slot, then the strip itself.
      for (const c of cards) {
        const y = laneY(c.lane);
        if (t < c.enterAt) {
          const k = clamp((t - c.warnAt) / WARN, 0, 1);
          const fx = c.dir > 0 ? 0 : W;
          g.fillStyle(CARD, 0.08 + k * 0.18); g.fillRect(c.dir > 0 ? fx : fx - 160 * k, y - LANE_H / 2, 160 * k, LANE_H);
          g.lineStyle(2, FAULT, 0.3 + 0.5 * Math.abs(Math.sin(t / 90))); g.strokeRect(0, y - LANE_H / 2, W, LANE_H);
          continue;
        }
        const { x0 } = span(c);
        const holes = c.holes.flatMap((h, k) => (h ? [{ x: c.dir > 0 ? c.x - (k + 1) * COL_W + 10 : c.x + k * COL_W + 10, w: COL_W - 20 }] : []));
        cardStrip(g, x0, y - LANE_H / 2 + 4, LEN, LANE_H - 8, holes);
        // The card's reckoning printed along it: the household number in the Tabulator's numerals.
        const label = bits(c.value, 12);
        for (let k = 0; k < COLS; k++) {
          const cx = c.dir > 0 ? c.x - (k + 0.5) * COL_W : c.x + (k + 0.5) * COL_W;
          if (cx < -20 || cx > W + 20) continue;
          segText(g, cx - 3, y - LANE_H / 2 + 7, label[COLS - 1 - k], 8, 0x6a3a2a, 0.6);
        }
      }
    },

    drawHud(g) {
      // A strip along the top showing which lanes are feeding.
      const x = W - 150, y = top + 6;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, 140, 16, 6);
      for (let i = 0; i < LANES; i++) {
        const c = cards.find((q) => q.lane === i);
        g.fillStyle(c ? (time() < c.enterAt ? FAULT : CARD) : 0x2a2a2a, 1);
        g.fillRect(x + 8 + i * 26, y + 4, 22, 8);
      }
    },
  };

  function time(): number { return ctx.scene.time.now; }
}

export const PUNCH_CARDS: GimmickDef = {
  id: 'circuit-punch-cards',
  rules: 'Punched cards feed down the lanes. On card you are carried and cut, and the reader bites at the wall. Stand in the holes, or on the rails between.',
  make,
};
