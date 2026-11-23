import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, FOE_TINT, HONEY, PLAYER_TINT, SEAL_RED, WAX, WAX_SHADE, WICK, WOOD, dist, flame } from '../art';

/**
 * By the Inch — Auctioneer Vell, who in the King's telling sells off the houses of everyone who
 * came up short, by the old Candlewick custom: a pin is pushed into a lit candle an inch below the
 * flame, and the lot goes to whoever bid last when the pin drops.
 *
 * Lots come up on the floor one at a time. Every blow on a lot is a bid. A gilt lot (a strongbox)
 * makes its buyer's blows bite harder for a while; a debt lot (a red-sealed writ) is collected from
 * its buyer — stunned and fined. Whatever the lot, the gavel comes down on it as the pin drops, so
 * close bidders must step away in time. The exploit: Vell's own blows bid too, and a lot standing
 * between you and her catches her shots — put the debts in her line of fire as the flame nears the
 * pin. Halfway, the Crown bids: two lots at once, one of each, on a shorter inch.
 */

const INCH_MS = 5600;
const INCH_LATE_MS = 4600;
const GAP_MS = 1500;
const GAVEL_WARN_MS = 800;
const GAVEL_R = 74;
const GAVEL_DAMAGE = 16;
const LOT_R = 28;
const BOUGHT_MS = 6000;
const BOUGHT_TAKEN = 1.45;
const BOUGHT_HEAL = 10;
const DEBT_DAMAGE = 14;
const DEBT_STUN_MS = 1000;

type LotKind = 'gilt' | 'debt';

/** One lot on the floor and its bidding. */
interface Lot { x: number; y: number; kind: LotKind; target: StrikeTarget; bidder: Fighter | null; bids: number; bidFlash: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const fieldTop = top + 50;
  let lots: Lot[] = [];
  /** Inch window of the current sale (scene ms); 0 between sales. */
  let saleStart = 0;
  let saleEnd = 0;
  let nextSaleAt = 1800;
  let gavelArmed = false;
  let crownBids = false;
  let announced = false;
  let gavelAt: Pt[] = [];
  let gavelFellAt = -9999;
  /** Buyer's boon: until when each side's blows bite harder. */
  const boughtUntil = new Map<Fighter, number>();

  const openSpot = (avoid: Pt[]): Pt => {
    let best: Pt = { x: W / 2, y: H / 2 + 40 };
    let bestScore = -1;
    for (let i = 0; i < 14; i++) {
      const p = { x: 110 + rng() * (W - 220), y: fieldTop + 40 + rng() * (H - fieldTop - 110) };
      const score = Math.min(dist(p.x, p.y, ctx.player.x, ctx.player.y), dist(p.x, p.y, ctx.npc.x, ctx.npc.y),
        ...avoid.map((a) => dist(p.x, p.y, a.x, a.y) * 0.8));
      if (score > bestScore) { bestScore = score; best = p; }
      if (score > 180) break;
    }
    return best;
  };

  const addLot = (kind: LotKind, at: Pt): void => {
    const lot: Lot = {
      x: at.x, y: at.y, kind, bidder: null, bids: 0, bidFlash: -9999,
      target: ctx.target({
        x: at.x, y: at.y - 14, r: LOT_R,
        onStruck(by) {
          lot.bidder = by === 'player' ? ctx.player : ctx.npc;
          lot.bids++;
          lot.bidFlash = ctx.scene.time.now;
          ctx.sfx('money');
        },
      }),
    };
    lots.push(lot);
  };

  const openSale = (time: number): void => {
    const inch = crownBids ? INCH_LATE_MS : INCH_MS;
    saleStart = time; saleEnd = time + inch; gavelArmed = false;
    const first = openSpot([]);
    if (crownBids) {
      addLot('gilt', first);
      addLot('debt', openSpot([first]));
    } else {
      addLot(rng() < 0.5 ? 'gilt' : 'debt', first);
    }
    ctx.sfx('dice');
  };

  const settle = (lot: Lot, time: number): void => {
    const buyer = lot.bidder;
    lot.target.remove();
    if (!buyer || !buyer.active || buyer.hp <= 0) return;
    if (lot.kind === 'gilt') {
      boughtUntil.set(buyer, time + BOUGHT_MS);
      ctx.heal(buyer, BOUGHT_HEAL);
      ctx.flash(buyer.x, buyer.y, HONEY);
      ctx.sfx('jackpot');
    } else {
      ctx.hit(buyer, DEBT_DAMAGE, buyer.x, buyer.y);
      ctx.stun(buyer, DEBT_STUN_MS);
      ctx.flash(buyer.x, buyer.y, SEAL_RED);
      ctx.sfx('judgement');
    }
  };

  const takenFor = (f: Fighter): number => {
    const foe = f === ctx.player ? ctx.npc : ctx.player;
    return ctx.scene.time.now < (boughtUntil.get(foe) ?? 0) ? BOUGHT_TAKEN : 1;
  };

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('LOTS SOLD BY THE INCH', '#ffe2a8'); }
      if (!crownBids && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        crownBids = true;
        ctx.banner('THE CROWN BIDS — TWO LOTS', '#ff9a8a');
        ctx.sfx('boss-phase');
      }
      if (saleStart === 0 && time >= nextSaleAt) openSale(time);
      if (saleStart > 0 && !gavelArmed && time >= saleEnd - GAVEL_WARN_MS) {
        gavelArmed = true;
        gavelAt = lots.map((l) => ({ x: l.x, y: l.y }));
        for (const p of gavelAt) {
          ctx.tk.spawnZone({ x: p.x, y: p.y, radius: GAVEL_R, warnMs: GAVEL_WARN_MS, damage: GAVEL_DAMAGE });
        }
      }
      if (saleStart > 0 && time >= saleEnd) {
        ctx.sfx('hammer-forge');
        gavelFellAt = time;
        // The gavel is the house's: it falls on Vell too, if she lingers at the lot.
        for (const p of gavelAt) {
          if (dist(p.x, p.y, ctx.npc.x, ctx.npc.y) < GAVEL_R + 10) ctx.hit(ctx.npc, GAVEL_DAMAGE, ctx.npc.x, ctx.npc.y);
        }
        for (const l of lots) settle(l, time);
        lots = [];
        saleStart = 0;
        nextSaleAt = time + GAP_MS;
      }
    },

    playerTakenMult() { return takenFor(ctx.player); },
    npcTakenMult() { return takenFor(ctx.npc); },

    npcSeek(): Pt | null {
      if (saleStart === 0) return null;
      const n = ctx.npc;
      const left = saleEnd - ctx.scene.time.now;
      // The gavel is coming: clear every lot.
      if (left < GAVEL_WARN_MS + 250) {
        const near = lots.find((l) => dist(l.x, l.y, n.x, n.y) < GAVEL_R + 40);
        if (near) {
          const a = Math.atan2(n.y - near.y, n.x - near.x);
          return { x: near.x + Math.cos(a) * (GAVEL_R + 70), y: near.y + Math.sin(a) * (GAVEL_R + 70) };
        }
        return null;
      }
      // A debt she holds, or one within reach of her blows: get well away from it.
      for (const l of lots) {
        if (l.kind !== 'debt') continue;
        if (dist(l.x, l.y, n.x, n.y) < 150) {
          const a = Math.atan2(n.y - l.y, n.x - l.x);
          return { x: l.x + Math.cos(a) * 200, y: l.y + Math.sin(a) * 200 };
        }
      }
      // Late in the inch, a gilt lot not hers: go and bid on it.
      const gilt = lots.find((l) => l.kind === 'gilt' && l.bidder !== n);
      if (gilt && left < 2600) {
        const a = Math.atan2(n.y - gilt.y, n.x - gilt.x);
        return { x: gilt.x + Math.cos(a) * 60, y: gilt.y + Math.sin(a) * 60 };
      }
      return null;
    },

    drawGround(g, time) {
      // Each lot stands on a little auction rug with the lot number's tally in brass tacks.
      for (const l of lots) {
        g.fillStyle(dim(WOOD, 0.2), 0.55); g.fillEllipse(l.x, l.y + 4, 92, 36);
        g.lineStyle(2, l.kind === 'gilt' ? HONEY : SEAL_RED, 0.55); g.strokeEllipse(l.x, l.y + 4, 92, 36);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle(BRASS, 0.8); g.fillCircle(l.x + Math.cos(a) * 42, l.y + 4 + Math.sin(a) * 15, 1.6);
        }
        // The last bidder's paddle colour as a ring under the lot.
        if (l.bidder) {
          const c = l.bidder === ctx.player ? PLAYER_TINT : FOE_TINT;
          g.lineStyle(3, c, 0.75); g.strokeEllipse(l.x, l.y + 4, 70, 26);
        }
      }
      // The fallen gavel's dent.
      const since = time - gavelFellAt;
      if (since < 600) {
        for (const p of gavelAt) {
          const k = since / 600;
          g.lineStyle(4, dim(WOOD, 0.3), 1 - k); g.strokeEllipse(p.x, p.y, GAVEL_R * 2 * (0.6 + k * 0.5), GAVEL_R * 1.2 * (0.6 + k * 0.5));
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const l of lots) {
        const bob = Math.sin(t * 2 + l.x) * 1.5;
        if (l.kind === 'gilt') strongbox(g, l.x, l.y + bob, t);
        else debtWrit(g, l.x, l.y + bob, t);
        // A paddle raised over the lot for a beat after each bid.
        const since = time - l.bidFlash;
        if (since < 380 && l.bidder) {
          const c = l.bidder === ctx.player ? PLAYER_TINT : FOE_TINT;
          const py = l.y - 62 - (1 - since / 380) * 8;
          g.lineStyle(2.5, dim(WOOD, 0.1), 1); g.lineBetween(l.x + 20, py + 26, l.x + 20, py + 8);
          g.fillStyle(c, 1); g.fillCircle(l.x + 20, py, 9);
          g.fillStyle(0xffffff, 0.9); g.fillCircle(l.x + 20, py, 4);
        }
      }
      // The gavel itself, swinging down over each lot in the last beat of the inch.
      if (saleStart > 0 && gavelArmed) {
        const k = Math.min(1, 1 - (saleEnd - time) / GAVEL_WARN_MS);
        for (const p of gavelAt) {
          const a = -1.2 + k * k * 1.2;
          const hx = p.x - 50, hy = p.y - 80;
          const ex = hx + Math.cos(a) * 60, ey = hy + Math.sin(a) * 60 + 50;
          g.lineStyle(5, dim(WOOD, 0.15), 1); g.lineBetween(hx, hy, ex, ey);
          g.fillStyle(WOOD, 1); g.fillRoundedRect(ex - 16, ey - 10, 32, 20, 5);
          g.fillStyle(BRASS, 1); g.fillRect(ex - 16, ey - 3, 4, 6); g.fillRect(ex + 12, ey - 3, 4, 6);
        }
      }
    },

    drawHud(g, time) {
      // The auction candle: a tall taper on a brass stick with inch marks and the pin through it.
      const cx = W - 70, base = 300;
      const inch = crownBids ? INCH_LATE_MS : INCH_MS;
      const left = saleStart > 0 ? Math.max(0, (saleEnd - time) / inch) : 1;
      const tall = 170;
      const pinY = base - 30;
      const topY = pinY - tall * left;
      g.fillStyle(0x000000, 0.4); g.fillRoundedRect(cx - 34, 96, 68, base - 84, 10);
      g.fillStyle(dim(BRASS, 0.3), 1); g.fillEllipse(cx, base, 46, 12);
      g.fillStyle(BRASS, 1); g.fillRect(cx - 4, base - 30, 8, 30);
      g.fillStyle(WAX_SHADE, 1); g.fillRect(cx - 9, topY, 18, pinY - topY + 2);
      g.fillStyle(WAX, 1); g.fillRect(cx - 7, topY, 12, pinY - topY + 2);
      g.lineStyle(1, dim(WAX_SHADE, 0.3), 0.8);
      for (let y = pinY - 20; y > topY; y -= 20) g.lineBetween(cx - 9, y, cx - 3, y);
      // The pin, through the candle an inch above the stick; it glints red as the flame nears it.
      const near = left < 0.2 && saleStart > 0;
      g.lineStyle(2, near && Math.floor(time / 100) % 2 ? 0xff5040 : 0xdcdcdc, 1); g.lineBetween(cx - 16, pinY - 6, cx + 16, pinY - 6);
      g.fillStyle(SEAL_RED, 1); g.fillCircle(cx - 16, pinY - 6, 3);
      if (saleStart > 0) {
        g.lineStyle(1.5, WICK, 1); g.lineBetween(cx, topY, cx, topY - 6);
        flame(g, cx, topY - 5, 6, time / 1000, 2, 0.06);
      }
      // Under the candle: the lots in play, as tiny strongboxes / writs, each with its bidder's dot.
      lots.forEach((l, i) => {
        const x = cx - 14 + i * 28, y = base + 26;
        g.fillStyle(l.kind === 'gilt' ? HONEY : 0xf0e6cc, 1); g.fillRect(x - 8, y - 6, 16, 12);
        g.fillStyle(l.kind === 'gilt' ? dim(HONEY, 0.4) : SEAL_RED, 1); g.fillCircle(x, y, 3.2);
        if (l.bidder) { g.fillStyle(l.bidder === ctx.player ? PLAYER_TINT : FOE_TINT, 1); g.fillCircle(x, y + 13, 3.5); }
      });
      // A gold band under whichever side holds a bought boon.
      for (const [f, y] of [[ctx.player, base + 52], [ctx.npc, base + 62]] as [Fighter, number][]) {
        const until = boughtUntil.get(f) ?? 0;
        if (time >= until) continue;
        g.fillStyle(f === ctx.player ? PLAYER_TINT : FOE_TINT, 0.9);
        g.fillRect(cx - 28, y, 56 * ((until - time) / BOUGHT_MS), 5);
      }
    },

    destroy() {
      for (const l of lots) l.target.remove();
      lots = [];
    },
  };
}

/** A gilt lot: an iron-banded strongbox, lid ajar, honey-gold glinting out. */
function strongbox(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number): void {
  shadow(g, x, y + 2, 50, 12, 0.3);
  g.fillStyle(dim(WOOD, 0.25), 1); g.fillRect(x - 20, y - 26, 40, 26);
  g.fillStyle(WOOD, 1); g.fillRect(x - 19, y - 25, 38, 13);
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 20, y - 18, 40, 3); g.fillRect(x - 12, y - 26, 3, 26); g.fillRect(x + 9, y - 26, 3, 26);
  // The lid, propped open, and the gold inside catching the light.
  g.fillStyle(lit(WOOD, 0.1), 1); g.fillTriangle(x - 20, y - 26, x + 20, y - 26, x + 16, y - 40);
  g.fillStyle(HONEY, 1); g.fillEllipse(x, y - 27, 34, 8);
  for (let i = 0; i < 4; i++) {
    g.fillStyle(lit(HONEY, 0.3), 1); g.fillCircle(x - 10 + i * 7, y - 29 - (i % 2) * 2, 3);
  }
  const glint = (Math.sin(t * 3) + 1) / 2;
  g.fillStyle(0xffffff, glint * 0.8); g.fillCircle(x + 6, y - 31, 1.8);
  g.fillStyle(BRASS, 1); g.fillRect(x - 3, y - 15, 6, 7);
  g.fillStyle(0x140e0a, 1); g.fillCircle(x, y - 12, 1.2);
}

/** A debt lot: a rolled writ on a little stand, its red wax seal dripping, a black tally ribbon. */
function debtWrit(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number): void {
  shadow(g, x, y + 2, 44, 10, 0.3);
  g.lineStyle(2.5, dim(WOOD, 0.2), 1); g.lineBetween(x - 14, y, x - 8, y - 16); g.lineBetween(x + 14, y, x + 8, y - 16);
  g.fillStyle(0xf0e6cc, 1); g.fillRoundedRect(x - 22, y - 30, 44, 14, 7);
  g.fillStyle(0xd8ccae, 1); g.fillEllipse(x - 22, y - 23, 8, 14); g.fillEllipse(x + 22, y - 23, 8, 14);
  g.lineStyle(1, 0x8a7a60, 0.8);
  for (let i = 0; i < 4; i++) g.lineBetween(x - 14 + i * 7, y - 27, x - 10 + i * 7, y - 19);
  g.fillStyle(0x1a1416, 1); g.fillRect(x - 3, y - 30, 6, 22);
  const drip = 4 + ((t * 1.5) % 1) * 6;
  g.fillStyle(dim(SEAL_RED, 0.2), 1); g.fillCircle(x, y - 22, 8);
  g.fillStyle(SEAL_RED, 1); g.fillCircle(x, y - 23, 7);
  g.fillRoundedRect(x + 2, y - 20, 3, drip, 1.5);
  g.lineStyle(1.2, lit(SEAL_RED, 0.3), 1); g.strokeCircle(x, y - 23, 4);
}

export const AUCTION: GimmickDef = {
  id: fallenId('candlewick', 'auction'),
  rules: 'Lots sold by the inch: every blow on a lot is a bid. Gilt boxes empower the buyer; red writs are collected from them. Mind the gavel.',
  make,
};
