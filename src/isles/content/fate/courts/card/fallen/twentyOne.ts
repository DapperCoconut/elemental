import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { card, chip } from '../art';
import {
  BAIZE_DARK, BRASS, CARD_BLACK, CARD_RED, CARD_RED_LIT, CHIP_BLACK, CHIP_BLUE, GILT, GILT_DARK, GILT_LIT, IVORY,
  LAMP_GLASS, LAMP_GLASS_LIT, MAHOGANY, MAHOGANY_DARK, MAHOGANY_LIT,
} from '../palette';
import { alive, clamp, dist, shuffled, stepDt, SUITS, type Suit } from '../util';
import { fallenId } from '../../../../meteor/spec';
import { cardValue, rankCard } from './deck';

/**
 * Hit Me — Shoe-Dealer Hilarion Vosk, who in the King's telling dealt twenty-one at the House's
 * long table and never once paid out.
 *
 * A dealing shoe stands at the head of the yard and slides cards, face up, across the felt — one at
 * you, one at him, turn and turn about. Any card that reaches a fighter is *taken*: it stings, and
 * its pips go into that fighter's hand (picture cards ten, an ace one or eleven). The hand floats
 * over each fighter, its count on a rail of twenty-one notches. Make exactly **twenty-one** and the
 * hand flies at the other fighter in a burst that stuns. Go **over** and you are bust: a black chip
 * comes down on you and you are struck and stunned.
 *
 * So read every card as it comes: take the one that makes your count, step aside from the one that
 * busts you. A card goes to whoever it touches first, so stand in the way of hers. And strike a
 * card in flight to knock it at your foe — feed him the one he cannot take. Halfway down the shoe
 * deals faster.
 */

const ID = fallenId('card', 'twenty-one');
const DEAL_MS = 1300;
const DEAL_FAST_MS = 920;
const SPEED = 300;
const KNOCK_SPEED = 430;
const TAKE_R = 26;
const STING = 3;
const BLACKJACK = 26;
const BUST = 20;
const CW = 24, CH = 34;

interface Flying {
  x: number; y: number; vx: number; vy: number;
  rank: number; suit: Suit; spin: number;
  knocked: boolean; knockAt: number;
  target: StrikeTarget;
}
interface Hand { f: Fighter; cards: { rank: number; suit: Suit }[]; flashAt: number; bustAt: number; jackAt: number }
interface Burst { x: number; y: number; to: Fighter; at: number; cards: { rank: number; suit: Suit }[] }

const total = (h: Hand): number => {
  let t = 0, ace = false;
  for (const c of h.cards) { t += cardValue(c.rank); if (c.rank === 1) ace = true; }
  return ace && t + 10 === 21 ? 21 : t;
};

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const shoe = { x: W / 2, y: top + 34 };
  const flying: Flying[] = [];
  const bursts: Burst[] = [];
  const hands = new Map<Fighter, Hand>([
    [player, { f: player, cards: [], flashAt: -1e9, bustAt: -1e9, jackAt: -1e9 }],
    [npc, { f: npc, cards: [], flashAt: -1e9, bustAt: -1e9, jackAt: -1e9 }],
  ]);
  let deck: { rank: number; suit: Suit }[] = [];
  let nextDeal = 0;
  let toPlayer = true;
  let started = false;
  let fast = false;
  let now = 0;
  let shoeKick = -1e9;

  const other = (f: Fighter): Fighter => (f === player ? npc : player);
  function draw(): { rank: number; suit: Suit } {
    if (!deck.length) {
      const all: { rank: number; suit: Suit }[] = [];
      for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) all.push({ rank, suit });
      deck = shuffled(all, rng);
    }
    return deck.pop() as { rank: number; suit: Suit };
  }

  function deal(to: Fighter, time: number): void {
    if (!alive(to)) return;
    const c = draw();
    const a = Math.atan2(to.y - shoe.y, to.x - shoe.x);
    const fl: Flying = {
      x: shoe.x, y: shoe.y + 14, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED, rank: c.rank, suit: c.suit,
      spin: (rng() - 0.5) * 2, knocked: false, knockAt: -1e9,
      target: null as unknown as StrikeTarget,
    };
    fl.target = ctx.target({ x: fl.x, y: fl.y, r: 16, onStruck: (by) => knock(fl, by === 'player' ? player : npc) });
    flying.push(fl);
    shoeKick = time;
    ctx.sfx('whoosh');
  }

  function knock(fl: Flying, by: Fighter): void {
    if (now - fl.knockAt < 200 || !flying.includes(fl)) return;
    const to = other(by);
    const a = Math.atan2(to.y - fl.y, to.x - fl.x);
    fl.vx = Math.cos(a) * KNOCK_SPEED; fl.vy = Math.sin(a) * KNOCK_SPEED;
    fl.knocked = true; fl.knockAt = now;
    ctx.sfx('hit-light');
  }

  function take(fl: Flying, f: Fighter, time: number): void {
    const h = hands.get(f) as Hand;
    h.cards.push({ rank: fl.rank, suit: fl.suit });
    h.flashAt = time;
    ctx.hit(f, STING, f.x, f.y);
    const t = total(h);
    if (t === 21) {
      const o = other(f);
      h.jackAt = time;
      ctx.sfx('jackpot');
      if (alive(o)) { ctx.hit(o, BLACKJACK, o.x, o.y); ctx.stun(o, 700); }
      bursts.push({ x: f.x, y: f.y - 40, to: o, at: time, cards: h.cards.slice() });
      h.cards = [];
    } else if (t > 21) {
      h.bustAt = time;
      ctx.sfx('shield-break');
      ctx.hit(f, BUST, f.x, f.y);
      ctx.stun(f, 800);
      h.cards = [];
    } else ctx.sfx('dice');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!started) { started = true; nextDeal = time + 1300; ctx.banner('MAKE TWENTY-ONE AND IT FLIES AT HIM — GO OVER AND YOU BUST', '#f7dc84'); }
      if (!fast && npc.hp < npc.maxHp * 0.5) { fast = true; ctx.banner('THE SHOE DEALS FASTER', '#f7dc84'); ctx.sfx('status-buff'); }
      if (time >= nextDeal) {
        nextDeal = time + (fast ? DEAL_FAST_MS : DEAL_MS);
        deal(toPlayer ? player : npc, time);
        toPlayer = !toPlayer;
      }
      for (let i = flying.length - 1; i >= 0; i--) {
        const fl = flying[i];
        fl.x += fl.vx * dt; fl.y += fl.vy * dt;
        fl.target.moveTo(fl.x, fl.y);
        let gone = fl.x < -30 || fl.x > W + 30 || fl.y < top - 10 || fl.y > H + 30;
        if (!gone) {
          // Whoever it touches first takes it — a knocked card ignores the one who knocked it for a beat.
          for (const f of [player, npc]) {
            if (!alive(f) || dist(f.x, f.y, fl.x, fl.y) >= TAKE_R) continue;
            if (time - fl.knockAt < 260 && fl.knocked) continue;
            take(fl, f, time); gone = true; break;
          }
        }
        if (gone) { fl.target.remove(); flying.splice(i, 1); }
      }
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 420) bursts.splice(i, 1);
    },

    npcSeek() {
      const h = hands.get(npc) as Hand;
      const t = total(h);
      let best: Flying | null = null, bestT = Infinity;
      for (const fl of flying) {
        const sp = Math.hypot(fl.vx, fl.vy) || 1;
        const along = ((npc.x - fl.x) * fl.vx + (npc.y - fl.y) * fl.vy) / sp;
        if (along < 0) continue;
        const tt = along / sp;
        if (tt < bestT) { bestT = tt; best = fl; }
      }
      if (!best) return null;
      const sp = Math.hypot(best.vx, best.vy) || 1;
      const ux = best.vx / sp, uy = best.vy / sp;
      const along = (npc.x - best.x) * ux + (npc.y - best.y) * uy;
      const px = best.x + ux * along, py = best.y + uy * along;
      const v = cardValue(best.rank);
      const wants = t + v === 21 || (best.rank === 1 && t + 11 === 21) || t + v <= 13;
      if (wants) return { x: clamp(px, 50, W - 50), y: clamp(py, top + 50, H - 40) };
      // A card that would bust him: step off its line.
      const off = (npc.x - px) * -uy + (npc.y - py) * ux >= 0 ? 1 : -1;
      if (dist(npc.x, npc.y, px, py) < 70) return { x: clamp(npc.x - uy * 90 * off, 50, W - 50), y: clamp(npc.y + ux * 90 * off, top + 50, H - 40) };
      return null;
    },

    drawGround(g, time) {
      // The long table's felt runner down from the shoe, and the chalk insurance arc.
      g.fillStyle(BAIZE_DARK, 0.35); g.fillRect(shoe.x - 80, top, 160, 120);
      g.lineStyle(2, GILT_DARK, 0.5); g.beginPath(); g.arc(shoe.x, top - 40, 230, 0.35, Math.PI - 0.35, false); g.strokePath();
      g.lineStyle(1, GILT, 0.35); g.beginPath(); g.arc(shoe.x, top - 40, 250, 0.4, Math.PI - 0.4, false); g.strokePath();
      // Each card's path ahead of it, a faint dotted line the length of a second's slide.
      for (const fl of flying) {
        const sp = Math.hypot(fl.vx, fl.vy) || 1;
        g.fillStyle(fl.knocked ? CARD_RED_LIT : GILT, 0.35);
        for (let s = 1; s <= 8; s++) g.fillCircle(fl.x + (fl.vx / sp) * s * 32, fl.y + (fl.vy / sp) * s * 32, 1.6);
      }
      // A busted fighter's black chip, pressed into the felt.
      for (const h of hands.values()) {
        const k = (time - h.bustAt) / 900;
        if (k < 0 || k >= 1 || !alive(h.f)) continue;
        chip(g, h.f.x, h.f.y + 14, 22 * (1 - k * 0.3), CHIP_BLACK, 1 - k);
      }
      drawShoe(g, shoe.x, shoe.y, time - shoeKick);
    },

    drawAir(g, time) {
      for (const fl of flying) {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(fl.x + 3, fl.y + 6, CW, CH * 0.4);
        if (fl.knocked) glow(g, fl.x, fl.y, 22, CARD_RED_LIT, 0.12, 2);
        rankCard(g, fl.x, fl.y, CW, CH, fl.spin + Math.sin(time / 200 + fl.spin) * 0.15, fl.rank, fl.suit);
      }
      for (const h of hands.values()) if (alive(h.f)) drawHand(g, h, time);
      // Twenty-one: the whole hand flies off the fingers at the other fighter.
      for (const b of bursts) {
        if (!alive(b.to)) continue;
        const k = clamp((time - b.at) / 420, 0, 1);
        b.cards.forEach((c, i) => {
          const s = (i - (b.cards.length - 1) / 2) * 0.3;
          const x = b.x + (b.to.x - b.x) * k + Math.sin(k * Math.PI) * s * 60, y = b.y + (b.to.y - b.y) * k - Math.sin(k * Math.PI) * 30;
          rankCard(g, x, y, 18, 25, k * 9 + i, c.rank, c.suit);
        });
        if (k > 0.85) { g.lineStyle(3, GILT_LIT, (1 - k) * 6); g.strokeCircle(b.to.x, b.to.y, 22 + (k - 0.85) * 200); }
      }
    },

    destroy() { for (const fl of flying) fl.target.remove(); },
  };
}

/** A fighter's hand: the cards fanned over their head and the twenty-one-notch rail beneath. */
function drawHand(g: G, h: Hand, time: number): void {
  const t = total(h);
  const x = h.f.x, y = h.f.y - 70;
  const n = h.cards.length;
  h.cards.forEach((c, i) => {
    const a = (i - (n - 1) / 2) * 0.28;
    rankCard(g, x + Math.sin(a) * 26, y - Math.cos(a) * 8 + 8, 14, 20, a, c.rank, c.suit);
  });
  // The rail: twenty notches, the twenty-first gilt; the count fills it, amber from seventeen.
  const rw = 84, rx = x - rw / 2, ry = y + 22;
  g.fillStyle(MAHOGANY_DARK, 0.9); g.fillRoundedRect(rx - 3, ry - 3, rw + 6, 9, 3);
  const flash = clamp(1 - (time - h.flashAt) / 300, 0, 1);
  for (let i = 0; i < 21; i++) {
    const nx = rx + (i / 20) * rw;
    const on = i < t;
    const col = i === 20 ? GILT_LIT : t >= 17 ? 0xf0a040 : LAMP_GLASS_LIT;
    g.fillStyle(on ? lit(col, flash * 0.4) : dim(i === 20 ? GILT : LAMP_GLASS, 0.5), on ? 1 : 0.7);
    g.fillRect(nx - 1.4, ry - (i === 20 ? 2 : 0), 2.8, i === 20 ? 7 : 4);
  }
  const jk = (time - h.jackAt) / 600;
  if (jk >= 0 && jk < 1) { g.lineStyle(2, GILT_LIT, 1 - jk); g.strokeCircle(x, y, 20 + jk * 40); }
  const bk = (time - h.bustAt) / 600;
  if (bk >= 0 && bk < 1) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + bk;
      card(g, x + Math.cos(a) * 30 * bk, y + Math.sin(a) * 18 * bk + bk * 30, 10, 14, a * 2, { face: false, back: CHIP_BLACK, cheap: true, alpha: 1 - bk });
    }
  }
}

/** The dealing shoe: a mahogany box with a brass mouth, its deck slanting inside, the next card's lip showing. */
function drawShoe(g: G, x: number, y: number, since: number): void {
  const kick = clamp(1 - since / 160, 0, 1);
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 26, 120, 26);
  g.fillStyle(MAHOGANY_DARK, 1); g.fillRoundedRect(x - 52, y - 30, 104, 52, 6);
  g.fillStyle(MAHOGANY, 1); g.fillRoundedRect(x - 48, y - 34, 96, 50, 6);
  g.lineStyle(1, MAHOGANY_LIT, 0.8); for (let i = 0; i < 4; i++) g.lineBetween(x - 42, y - 26 + i * 10, x + 42, y - 26 + i * 10);
  // The deck inside, tilted toward the mouth.
  for (let i = 0; i < 6; i++) card(g, x - 20 + i * 3, y - 14 - i * 1.5, 20, 28, -1.2, { face: false, back: CARD_RED, cheap: true });
  // The brass mouth and the card's lip in it.
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 26, y + 6, 52, 12, 3);
  g.fillStyle(lit(BRASS, 0.4), 1); g.fillRect(x - 22, y + 7, 44, 2);
  g.fillStyle(IVORY, 1); g.fillRect(x - 16, y + 14 + kick * 8, 32, 4);
  g.fillStyle(CARD_BLACK, 0.6); g.fillRect(x - 16, y + 18 + kick * 8, 32, 1);
  // Gilt corners and a chip-blue inlay.
  for (const sx of [-1, 1]) { g.fillStyle(GILT, 1); g.fillCircle(x + sx * 44, y - 30, 3); g.fillCircle(x + sx * 44, y + 12, 3); }
  g.fillStyle(CHIP_BLUE, 1); g.fillCircle(x, y - 24, 4); g.fillStyle(CARD_RED, 1); g.fillCircle(x, y - 24, 1.6);
}

export const FALLEN_TWENTY_ONE: GimmickDef = {
  id: ID,
  rules: 'The shoe slides cards at you both; a card you touch joins your hand. Twenty-one blasts your foe; over is bust. Strike a card to knock it at him.',
  make,
};
