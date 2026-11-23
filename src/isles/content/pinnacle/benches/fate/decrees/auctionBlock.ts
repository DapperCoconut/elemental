import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, slab, seam } from '../../../../../art/PinnacleArt';
import { glow } from '../../../../../art/IsleArt';
import { chipStack, drape, emblem, glyphs } from '../art';
import { CSS_LOT, CSS_NPC, CSS_PLAYER, FELT, FELT_GLOW, IVORY, IVORY_DIM, ROUGE, ROUGE_LIT, SIDE_NPC, SIDE_PLAYER } from '../palette';
import { type Who, alive, clamp, other, shuffled } from '../util';

/**
 * Seat of the Purse — Councilor Crassus Tallow, who wrote the Wager-Tithe.
 *
 * DECREE OF THE AUCTION BLOCK. Nothing on this floor is given; everything is sold. Every few
 * seconds a lot is raised over the auction block in the middle of the floor — the Crown's Ear,
 * a Gilded Hide, the Loser's Hours, a Bailiff, the House's Purse — and bidding opens. A bid is a
 * blow: every point of damage struck on the block is a point bid, stacked in chips beside it,
 * and when the gavel falls the higher stack takes the lot. The loser's chips are kept by the
 * House. Every blow you put on the block is a blow you did not put on your foe — and the
 * councilor, a perfected purse, bids heavily and early. Snipe.
 */

type Icon = 'crown' | 'hide' | 'hours' | 'bailiff' | 'purse';
interface Lot { name: string; icon: Icon; text: string }

const LOTS: Lot[] = [
  { name: 'THE CROWN\'S EAR', icon: 'crown', text: '+35% damage, 6s' },
  { name: 'A GILDED HIDE', icon: 'hide', text: '-40% damage taken, 6s' },
  { name: 'THE LOSER\'S HOURS', icon: 'hours', text: 'your cooldowns run fast, theirs slow, 5s' },
  { name: 'A BAILIFF', icon: 'bailiff', text: 'the loser is seized and struck' },
  { name: 'THE HOUSE\'S PURSE', icon: 'purse', text: 'healed 22' },
];

const pt = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** A lot's icon in its glass case. */
function lotIcon(g: Phaser.GameObjects.Graphics, icon: Icon, x: number, y: number, s: number, a = 1): void {
  g.lineStyle(2, IVORY, a);
  switch (icon) {
    case 'crown':
      g.fillStyle(IVORY_DIM, a);
      g.fillPoints([pt(x - s, y + s * 0.6), pt(x - s, y - s * 0.4), pt(x - s * 0.5, y + s * 0.05), pt(x, y - s * 0.7), pt(x + s * 0.5, y + s * 0.05), pt(x + s, y - s * 0.4), pt(x + s, y + s * 0.6)], true);
      g.strokePoints([pt(x - s, y + s * 0.6), pt(x - s, y - s * 0.4), pt(x - s * 0.5, y + s * 0.05), pt(x, y - s * 0.7), pt(x + s * 0.5, y + s * 0.05), pt(x + s, y - s * 0.4), pt(x + s, y + s * 0.6)], true);
      g.fillStyle(ROUGE_LIT, a); g.fillCircle(x, y + s * 0.2, s * 0.16);
      break;
    case 'hide':
      g.fillStyle(FELT, a);
      g.fillPoints([pt(x - s * 0.8, y - s * 0.7), pt(x + s * 0.8, y - s * 0.7), pt(x + s * 0.7, y + s * 0.2), pt(x, y + s * 0.85), pt(x - s * 0.7, y + s * 0.2)], true);
      g.strokePoints([pt(x - s * 0.8, y - s * 0.7), pt(x + s * 0.8, y - s * 0.7), pt(x + s * 0.7, y + s * 0.2), pt(x, y + s * 0.85), pt(x - s * 0.7, y + s * 0.2)], true);
      g.lineBetween(x, y - s * 0.6, x, y + s * 0.7);
      break;
    case 'hours':
      emblem(g, 'hourglass', x, y, s * 0.8, IVORY, a);
      break;
    case 'bailiff':
      for (let i = 0; i < 3; i++) { g.strokeEllipse(x - s * 0.6 + i * s * 0.6, y + (i % 2 ? 3 : -3), s * 0.75, s * 0.45); }
      g.fillStyle(ROUGE, a); g.fillCircle(x + s * 0.9, y + s * 0.5, s * 0.22);
      break;
    case 'purse':
      g.fillStyle(FELT, a); g.fillEllipse(x, y + s * 0.15, s * 1.6, s * 1.3);
      g.strokeEllipse(x, y + s * 0.15, s * 1.6, s * 1.3);
      g.lineBetween(x - s * 0.35, y - s * 0.45, x + s * 0.35, y - s * 0.45);
      g.fillStyle(IVORY, a); g.fillTriangle(x - s * 0.3, y - s * 0.5, x + s * 0.3, y - s * 0.5, x, y - s * 0.85);
      break;
  }
}

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const BX = ctx.W / 2, BY = (ctx.top + ctx.H) / 2 + 20;
  const BID_MS = ctx.hard ? 4000 : 4600;
  const REST_MS = ctx.hard ? 2600 : 3200;
  const BOON_MS = 6000;

  const bids: Record<Who, number> = { player: 0, npc: 0 };
  const shown: Record<Who, number> = { player: 0, npc: 0 };
  const ear: Record<Who, number> = { player: 0, npc: 0 };
  const hide: Record<Who, number> = { player: 0, npc: 0 };
  const hours: Record<Who, number> = { player: 0, npc: 0 };
  let deck: Lot[] = [];
  let lot: Lot = LOTS[0];
  let lotNo = 0;
  let state: 'idle' | 'bid' | 'rest' = 'idle';
  let at = 0;
  let lastTick = 0;
  let gavelAt = -9999;
  let soldTo: Who | null = null;
  const now = () => ctx.scene.time.now;
  const fighter = (w: Who) => (w === 'player' ? ctx.player : ctx.npc);

  const block: StrikeTarget = ctx.target({
    x: BX, y: BY - 22, r: 40,
    onStruck: (by, amount) => {
      if (state !== 'bid') return;
      const v = Math.max(1, Math.round(amount));
      bids[by] += v;
      ctx.sfx('money');
    },
  });

  const offer = (time: number): void => {
    if (!deck.length) deck = shuffled(LOTS, ctx.rng);
    lot = deck.pop()!;
    lotNo++;
    bids.player = 0; bids.npc = 0;
    state = 'bid';
    at = time + BID_MS;
    soldTo = null;
    ctx.banner(`LOT ${lotNo}: ${lot.name} — ${lot.text}. BIDDING IS OPEN`, CSS_LOT);
    ctx.sfx('holy-chord');
  };

  const hammer = (time: number): void => {
    gavelAt = time;
    state = 'rest';
    at = time + REST_MS;
    ctx.sfx('judgement');
    if (bids.player === bids.npc) { ctx.banner('NO SALE — THE HOUSE KEEPS THE LOT', '#d8d0f0'); return; }
    const w: Who = bids.player > bids.npc ? 'player' : 'npc';
    const l = other(w);
    soldTo = w;
    ctx.banner(`SOLD — TO ${w === 'player' ? 'YOU' : 'THE COUNCILOR'}, FOR ${bids[w]}`, w === 'player' ? CSS_PLAYER : CSS_NPC);
    const wf = fighter(w), lf = fighter(l);
    switch (lot.icon) {
      case 'crown': ear[w] = time + BOON_MS; break;
      case 'hide': hide[w] = time + BOON_MS; break;
      case 'hours': hours[w] = time + 5000; break;
      case 'bailiff':
        if (alive(lf)) {
          ctx.root(lf, 1600);
          ctx.hit(lf, ctx.hard ? 17 : 14, lf.x, lf.y);
          ctx.float(lf.x, lf.y - 52, 'SEIZED', w === 'player' ? CSS_PLAYER : CSS_NPC);
          ctx.sfx('chain');
        }
        break;
      case 'purse':
        if (alive(wf)) { ctx.heal(wf, 22); ctx.sfx('heal'); }
        break;
    }
  };

  const takenMult = (w: Who): number => {
    const t = now();
    let m = 1;
    if (t < ear[other(w)]) m *= 1.35;
    if (t < hide[w]) m *= 0.6;
    return m;
  };
  const rate = (w: Who): number => {
    const t = now();
    if (t < hours[w]) return 1.8;
    if (t < hours[other(w)]) return 0.6;
    return 1;
  };

  return {
    update(time, dt) {
      for (const w of ['player', 'npc'] as Who[]) shown[w] += (bids[w] - shown[w]) * clamp(dt * 8, 0, 1);
      if (!alive(ctx.player) || !alive(ctx.npc)) return;
      if (state === 'idle') { if (at === 0) at = time + 2600; if (time >= at) offer(time); return; }
      if (state === 'bid') {
        const left = at - time;
        if (left < 1300 && time - lastTick > 420) { lastTick = time; ctx.sfx('countdown-tick'); }
        if (time >= at) hammer(time);
        return;
      }
      if (state === 'rest' && time >= at) offer(time);
    },
    playerTakenMult() { return takenMult('player'); },
    npcTakenMult() { return takenMult('npc'); },
    playerCooldownRate() { return rate('player'); },
    npcCooldownRate() { return rate('npc'); },
    npcSeek() {
      if (state !== 'bid') return null;
      // It bids to win, and it bids when it is not already well ahead.
      if (bids.npc > bids.player + 14) return null;
      const n = ctx.npc;
      return { x: BX + (n.x < BX ? -72 : 72), y: BY + 34 };
    },
    drawGround(g, time) {
      const t = time / 1000;
      // The block: a stepped obsidian dais under a rouge drape, a felt square on top.
      g.fillStyle(0x000000, 0.4); g.fillEllipse(BX, BY + 10, 190, 40);
      slab(g, BX, BY + 6, 170, 16);
      slab(g, BX, BY - 10, 120, 34);
      drape(g, BX, BY - 44, 124, 26, t);
      g.fillStyle(FELT, 1); g.fillRect(BX - 50, BY - 52, 100, 10);
      g.lineStyle(1, FELT_GLOW, 0.6); g.strokeRect(BX - 50, BY - 52, 100, 10);
      // The lectern and its gavel, off to the side: it swings when the lot is sold.
      const lx = BX + 98, ly = BY - 4;
      slab(g, lx, ly, 26, 46);
      const swing = clamp((time - gavelAt) / 260, 0, 1);
      const ang = -1.2 + Math.sin(swing * Math.PI) * 1.4;
      const hx = lx + Math.cos(ang) * 30, hy = ly - 54 + Math.sin(ang) * 30;
      g.lineStyle(3, OBS.facet, 1); g.lineBetween(lx, ly - 54, hx, hy);
      g.fillStyle(OBS.sheen, 1); g.fillRect(hx - 9, hy - 6, 18, 12);
      g.lineStyle(1, OBS.edge, 0.7); g.strokeRect(hx - 9, hy - 6, 18, 12);
      if (time - gavelAt < 400) glow(g, lx, ly - 50, 30, IVORY, 0.06 * (1 - (time - gavelAt) / 400), 3);
      // The bids, stacked in chips: felt on your side, rouge on theirs.
      for (const w of ['player', 'npc'] as Who[]) {
        const sx = BX + (w === 'player' ? -112 : 112);
        const n = Math.min(22, Math.ceil(shown[w] / 4));
        const col = w === 'player' ? FELT : ROUGE;
        for (let c = 0; c < 2; c++) {
          const h = Math.max(0, n - c * 11);
          if (h > 0) chipStack(g, sx + (c ? (w === 'player' ? -22 : 22) : 0), BY + 8, Math.min(11, h), col, 9);
        }
        const won = soldTo === w && state === 'rest';
        glyphs(g, String(Math.round(shown[w])), sx, BY + 32, 11, won ? 0xffffff : w === 'player' ? SIDE_PLAYER : SIDE_NPC, 1, 1.8);
      }
      seam(g, [{ x: BX - 60, y: BY + 14 }, { x: BX - 30, y: BY + 22 }, { x: BX + 4, y: BY + 16 }], 1, 0.5);
    },
    drawAir(g, time) {
      const t = time / 1000;
      // The lot, raised over the block in a floating glass case.
      if (state === 'bid' || (state === 'rest' && time - gavelAt < 900)) {
        const sold = state === 'rest';
        const k = sold ? clamp((time - gavelAt) / 900, 0, 1) : 0;
        let cx = BX, cy = BY - 108 + Math.sin(t * 2) * 4;
        if (sold && soldTo) { const f = fighter(soldTo); cx = BX + (f.x - BX) * k; cy = cy + (f.y - 40 - cy) * k; }
        const a = sold ? 1 - k * 0.6 : 1;
        glow(g, cx, cy, 44, IVORY, 0.03 * a, 3);
        g.fillStyle(OBS.glass, 0.85 * a); g.fillRoundedRect(cx - 32, cy - 30, 64, 60, 8);
        g.lineStyle(1.4, OBS.edge, 0.8 * a); g.strokeRoundedRect(cx - 32, cy - 30, 64, 60, 8);
        g.fillStyle(0xffffff, 0.08 * a); g.fillTriangle(cx - 30, cy - 28, cx + 4, cy - 28, cx - 30, cy + 10);
        lotIcon(g, lot.icon, cx, cy, 18, a);
        if (!sold) {
          // The lot number on a little ivory tag hung from the case.
          g.lineStyle(1, IVORY_DIM, 0.8); g.lineBetween(cx + 26, cy + 26, cx + 34, cy + 40);
          g.fillStyle(IVORY, 1); g.fillRect(cx + 26, cy + 38, 20, 14);
          glyphs(g, String(lotNo), cx + 36, cy + 45, 8, OBS.glass, 1, 1.3);
        }
      }
      // Boons being worn.
      const tnow = now();
      for (const w of ['player', 'npc'] as Who[]) {
        const f = fighter(w);
        if (!alive(f)) continue;
        if (tnow < ear[w]) lotIcon(g, 'crown', f.x, f.y - 50, 8, 0.9);
        if (tnow < hide[w]) { g.lineStyle(2, FELT_GLOW, 0.5 + 0.2 * Math.sin(t * 8)); g.strokeCircle(f.x, f.y, 30); }
        if (tnow < hours[w]) lotIcon(g, 'hours', f.x - 26, f.y - 40, 7, 0.9);
      }
    },
    drawHud(g, time) {
      if (state !== 'bid') return;
      const cx = ctx.W / 2, y = ctx.top + 6;
      const k = clamp((at - time) / BID_MS, 0, 1);
      g.fillStyle(0x07060d, 0.85); g.fillRoundedRect(cx - 150, y, 300, 20, 8);
      g.lineStyle(1.2, OBS.edge, 0.6); g.strokeRoundedRect(cx - 150, y, 300, 20, 8);
      g.fillStyle(k < 0.28 ? ROUGE_LIT : IVORY_DIM, 1); g.fillRoundedRect(cx - 140, y + 6, 280 * k, 8, 3);
      g.fillStyle(SIDE_PLAYER, 1); g.fillCircle(cx - 160, y + 10, 5);
      g.fillStyle(SIDE_NPC, 1); g.fillCircle(cx + 160, y + 10, 5);
    },
    destroy() { block.remove(); },
  };
};

export const DECREE_AUCTION_BLOCK: GimmickDef = {
  id: 'bench-fate-auction-block',
  rules: 'Lots are raised over the block. Every blow struck on the block is a bid; the higher stack takes the lot when the gavel falls.',
  make,
};
