import type {
  BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { glow, mulberry } from '../../../../art/IsleArt';
import { card, cardHouse, die, pip } from './art';
import { CARD_RED, COOKIE, COOKIE_DARK, GILT, GILT_LIT, IVORY, MOTLEY_GREEN, MOTLEY_PURPLE, BELL } from './palette';
import { alive, clamp, dist, type Suit } from './util';

/**
 * The Card Court's goods: Corvina Sleeve's four charms and her rice flour, Prince Ante's wild
 * card, the baize pond's two fish, and the five dishes of *The Fortune Cookie*. Every charm is a
 * card-sharp's thing that plays one of the court's own games in your favour — the ace kept back,
 * the die that decides, the house that stands while you stand still, the hand that pays when it
 * fills. Scripts are registered below under their item ids.
 */

const ISLE = 'fate';

export const CHARM_ACE = 'card-charm-sleeve-ace';
export const CHARM_DIE = 'card-charm-lucky-die';
export const CHARM_WEIGHT = 'card-charm-paperweight';
export const CHARM_HAND = 'card-charm-gamblers-hand';
export const ART_ANTE = 'art-ante';

export const FISH_ANGLER = 'fish-ace-angler';
export const FISH_SOLE = 'fish-spade-sole';
export const FISHERY = 'card-pond';

export const FLOUR = 'card-rice-flour';
export const FOOD_COOKIES = 'card-food-fortune-cookies';
export const FOOD_CROUTE = 'card-food-angler-en-croute';
export const FOOD_TURNOVER = 'card-food-sole-turnover';
export const FOOD_PIE = 'card-food-lot-pie';
export const FOOD_SURPRISE = 'card-food-joker-surprise';
export const BAKERY_ID = 'card-cookie';

/** Tosswater sea fish the Fortune Cookie bakes with. */
const FISH_LOTFISH = 'fish-lotfish';
const FISH_DAB = 'fish-dice-dab';
const FISH_JACK = 'fish-joker-jack';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Ace up the Sleeve ────────────────────────────────────────────────
// An ace waits in your sleeve, ready every 14s. Take a blow of 8 or more while it is ready and you
// play it: heal back 60% of that blow, and the ace flicks into your foe for 10.

const sleeveAce: ItemScriptFactory = (ctx) => {
  const READY_MS = 14000;
  let T = 0;
  let readyAt = 0;
  let playedAt = -9999;
  let flickFrom = { x: 0, y: 0 };
  return {
    update(time) { T = time; },
    onHitTaken(amount) {
      if (amount < 8 || T < readyAt || !live(ctx)) return;
      readyAt = T + READY_MS;
      playedAt = T;
      flickFrom = { x: ctx.player.x, y: ctx.player.y - 20 };
      ctx.heal(ctx.player, Math.round(amount * 0.6));
      if (foeLive(ctx)) ctx.hit(ctx.npc, 10, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.player.x, ctx.player.y - 50, 'ACE!', '#f5eedb');
      ctx.sfx('slash');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (time >= readyAt) {
        // The ace's corner peeking out at your cuff, a glint running along it.
        const x = p.x + 22, y = p.y - 8;
        card(g, x, y, 9, 13, 0.6, { face: true, suit: 'spade', rank: 1, cheap: true });
        const ph = (time / 900) % 1;
        g.fillStyle(0xffffff, 0.6 * Math.sin(ph * Math.PI)); g.fillCircle(x - 3 + ph * 6, y - 5 + ph * 10, 1.4);
      } else {
        // The ace coming back up the sleeve: a thin arc filling.
        const k = clamp(1 - (readyAt - time) / READY_MS, 0, 1);
        g.lineStyle(1.5, IVORY, 0.4); g.beginPath(); g.arc(p.x + 22, p.y - 8, 7, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      const k = (time - playedAt) / 300;
      if (k >= 0 && k < 1 && foeLive(ctx)) {
        const x = flickFrom.x + (ctx.npc.x - flickFrom.x) * k, y = flickFrom.y + (ctx.npc.y - 20 - flickFrom.y) * k;
        card(g, x, y, 12, 17, k * 14, { face: true, suit: 'spade', rank: 1, cheap: true });
      }
    },
  };
};

// ── Lucky Die ────────────────────────────────────────────────────────
// Every 7s the die tumbles at your shoulder and lands on a face. Your next ability (not your basic
// attack) within 4s plays it: 1 heal 5 · 2 a quick step · 3 a bolt for 8 · 4 +20% damage for 3s ·
// 5 stun a foe within 220px · 6 that ability's cooldown refunded 3s.

const luckyDie: ItemScriptFactory = (ctx) => {
  const ROLL_EVERY = 7000, ROLL_MS = 700, HOLD_MS = 4000;
  let T = 0;
  let rollAt = 0;
  let face = 1;
  let spent = true;
  let started = false;
  let playFx = -9999, playedFace = 1;
  return {
    update(time) {
      T = time;
      if (!started) { started = true; rollAt = time + 1500; }
      if (time >= rollAt) {
        rollAt = time + ROLL_EVERY;
        face = 1 + Math.floor(ctx.rng() * 6);
        spent = false;
        ctx.sfx('dice');
      }
    },
    onCast(abilityId, slot) {
      if (slot === 'click' || spent || !live(ctx)) return;
      const landed = rollAt - ROLL_EVERY + ROLL_MS;
      if (T < landed || T > landed + HOLD_MS) return;
      spent = true;
      playFx = T; playedFace = face;
      const p = ctx.player, n = ctx.npc;
      switch (face) {
        case 1: ctx.heal(p, 5); break;
        case 2: ctx.boostSpeed(1.25, 2500); break;
        case 3: if (foeLive(ctx)) ctx.hit(n, 8, n.x, n.y); break;
        case 4: ctx.boostDamage(1.2, 3000); break;
        case 5: if (foeLive(ctx) && dist(p.x, p.y, n.x, n.y) < 220) ctx.stun(n, 450); break;
        case 6: ctx.refund(abilityId, 3000); break;
      }
      ctx.float(p.x, p.y - 52, ['', 'ONE: MEND', 'TWO: STEP', 'THREE: BOLT', 'FOUR: STRENGTH', 'FIVE: STUN', 'SIX: AGAIN'][face], '#f5eedb');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const since = time - (rollAt - ROLL_EVERY);
      const x = p.x - 26, y = p.y - 40;
      if (since >= 0 && since < ROLL_MS) {
        // Tumbling: a hop and a spin, faces flicking.
        const k = since / ROLL_MS;
        die(g, x, y - Math.sin(k * Math.PI) * 14, 6, 1 + (Math.floor(time / 70) % 6), k * 9, 1);
      } else {
        const ready = !spent && since < ROLL_MS + HOLD_MS;
        if (ready) glow(g, x, y, 12, GILT_LIT, 0.08, 2);
        die(g, x, y, 6, face, 0.2, ready ? 1 : 0.45);
      }
      const k = (time - playFx) / 500;
      if (k >= 0 && k < 1) { g.lineStyle(2, GILT_LIT, 1 - k); g.strokeCircle(x, y, 8 + k * 20); for (let i = 0; i < playedFace; i++) { const a = (i / playedFace) * Math.PI * 2; g.fillStyle(IVORY, 1 - k); g.fillCircle(x + Math.cos(a) * (10 + k * 22), y + Math.sin(a) * (10 + k * 22), 2); } }
    },
  };
};

// ── Paperweight Brooch ───────────────────────────────────────────────
// Stand still and a little house of cards builds at your feet, a storey every 1.1s, four at most.
// Move and it comes down — at your foe, if they are within 170px: 4 a storey, and a shove at four.

const paperweight: ItemScriptFactory = (ctx) => {
  const STOREY_MS = 1100;
  let T = 0;
  let lastX = 0, lastY = 0;
  let stillSince = 0;
  let storeys = 0;
  let nextStorey = 0;
  let started = false;
  let fall: { x: number; y: number; at: number; n: number; a: number } | null = null;
  return {
    update(time) {
      T = time;
      if (!live(ctx)) return;
      const p = ctx.player;
      if (!started) { started = true; lastX = p.x; lastY = p.y; stillSince = time; }
      const moved = dist(p.x, p.y, lastX, lastY) > 6;
      if (moved) {
        if (storeys > 0) {
          const n = ctx.npc;
          const a = Math.atan2(n.y - lastY, n.x - lastX);
          fall = { x: lastX, y: lastY, at: time, n: storeys, a };
          if (foeLive(ctx) && dist(lastX, lastY, n.x, n.y) < 170) {
            ctx.hit(n, storeys * 4, n.x, n.y);
            if (storeys >= 4) ctx.nudge(n, Math.cos(a) * 50, Math.sin(a) * 50);
            ctx.sfx('crystal-shatter');
          }
        }
        storeys = 0;
        lastX = p.x; lastY = p.y;
        stillSince = time;
        nextStorey = time + STOREY_MS;
        return;
      }
      if (time - stillSince > 200 && storeys < 4 && time >= nextStorey) {
        storeys++;
        nextStorey = time + STOREY_MS;
        ctx.sfx('clang');
      }
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      if (storeys > 0) cardHouse(g, lastX + 26, lastY + 18, 30, storeys, mulberry(7), 'dome');
      if (fall) {
        const k = (time - fall.at) / 500;
        if (k >= 1) { fall = null; return; }
        for (let i = 0; i < 4 + fall.n * 3; i++) {
          const b = fall.a + (i / (4 + fall.n * 3) - 0.5) * 1.2;
          const d = k * (40 + fall.n * 30);
          card(g, fall.x + 26 + Math.cos(b) * d, fall.y + 10 + Math.sin(b) * d, 6, 9, b + k * 8, { face: i % 2 === 0, suit: 'heart', rank: 1, cheap: true, alpha: 1 - k });
        }
      }
    },
  };
};

// ── Gambler's Hand ───────────────────────────────────────────────────
// Each ability you cast (not your basic attack) deals you a card: E hearts, R diamonds, F clubs,
// Q a wild joker. Three cards and the hand plays: three of a suit — 18 to your foe; a pair — +25%
// damage for 4s; all different — each of the three abilities refunded 1.5s.

const SLOT_SUIT: Record<string, Suit | 'wild'> = { e: 'heart', r: 'diamond', f: 'club', q: 'wild' };

const gamblersHand: ItemScriptFactory = (ctx) => {
  let hand: { suit: Suit | 'wild'; id: string }[] = [];
  let played: { at: number; kind: 'three' | 'pair' | 'run'; cards: (Suit | 'wild')[] } | null = null;
  let T = 0;
  return {
    update(time) { T = time; },
    onCast(abilityId, slot) {
      if (!slot || !(slot in SLOT_SUIT) || !live(ctx)) return;
      hand.push({ suit: SLOT_SUIT[slot], id: abilityId });
      if (hand.length < 3) return;
      const suits = hand.filter((c) => c.suit !== 'wild').map((c) => c.suit as Suit);
      const wild = 3 - suits.length;
      const counts = new Map<Suit, number>();
      for (const s of suits) counts.set(s, (counts.get(s) ?? 0) + 1);
      const most = Math.max(0, ...counts.values()) + wild;
      const p = ctx.player, n = ctx.npc;
      let kind: 'three' | 'pair' | 'run';
      if (most >= 3) {
        kind = 'three';
        if (foeLive(ctx)) ctx.hit(n, 18, n.x, n.y);
        ctx.float(p.x, p.y - 56, 'THREE OF A KIND', '#f7dc84');
        ctx.sfx('jackpot');
      } else if (most === 2) {
        kind = 'pair';
        ctx.boostDamage(1.25, 4000);
        ctx.float(p.x, p.y - 56, 'A PAIR', '#f5eedb');
        ctx.sfx('status-buff');
      } else {
        kind = 'run';
        for (const c of hand) ctx.refund(c.id, 1500);
        ctx.float(p.x, p.y - 56, 'ALL SUITS', '#9ad8d0');
        ctx.sfx('sparkle');
      }
      played = { at: T, kind, cards: hand.map((c) => c.suit) };
      hand = [];
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const draw = (cards: (Suit | 'wild')[], lift: number, a: number) => cards.forEach((s, i) => {
        const x = p.x - 12 + i * 12, y = p.y - 58 - lift - Math.abs(i - 1) * -2;
        if (s === 'wild') card(g, x, y, 10, 14, (i - 1) * 0.25, { face: true, joker: true, alpha: a, cheap: true });
        else card(g, x, y, 10, 14, (i - 1) * 0.25, { face: true, suit: s, rank: 1, alpha: a, cheap: true });
      });
      if (played) {
        const k = (time - played.at) / 700;
        if (k >= 1) played = null;
        else {
          if (played.kind === 'three') glow(g, p.x, p.y - 58, 30, GILT_LIT, 0.1 * (1 - k), 3);
          draw(played.cards, k * 26, 1 - k);
        }
      }
      if (hand.length) draw(hand.map((c) => c.suit), 0, 0.95);
      // Empty slots: faint outlines where the rest of the hand goes.
      for (let i = hand.length; i < 3; i++) { g.lineStyle(1, IVORY, 0.25); g.strokeRect(p.x - 17 + i * 12, p.y - 65, 10, 14); }
    },
  };
};

// ── Ante's Wild Card (artifact) ──────────────────────────────────────
// The joker keeps a copy of the hardest blow you have taken in the last 6s. Every 12s your next
// hit throws it: the copy lands on your foe at 70% (6 at least, 24 at most).

const wildCard: ItemScriptFactory = (ctx) => {
  const READY_MS = 12000, MEMORY_MS = 6000;
  let T = 0;
  let readyAt = 4000;
  let copy = 0, copyAt = -9999;
  let thrown: { at: number; x: number; y: number } | null = null;
  let throwing = false;
  return {
    update(time) { T = time; if (time - copyAt > MEMORY_MS) copy = 0; },
    onHitTaken(amount) { if (amount > copy) { copy = amount; copyAt = T; } },
    onHitDealt() {
      if (throwing || T < readyAt || !live(ctx) || !foeLive(ctx)) return;
      const dmg = clamp(Math.round(copy * 0.7), 6, 24);
      readyAt = T + READY_MS;
      throwing = true;
      try { ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y - 24); } finally { throwing = false; }
      thrown = { at: T, x: ctx.player.x, y: ctx.player.y - 40 };
      ctx.float(ctx.npc.x, ctx.npc.y - 56, `WILD ${dmg}`, '#f2d040');
      ctx.sfx('chaos');
      copy = 0;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const ready = time >= readyAt;
      const x = p.x + 24, y = p.y - 44 + Math.sin(time / 400) * 2;
      if (ready) {
        if (copy > 0) glow(g, x, y, 12 + Math.min(copy, 24) * 0.5, BELL, 0.07, 2);
        card(g, x, y, 11, 16, Math.sin(time / 600) * 0.15, { face: true, joker: true, cheap: true });
      } else {
        card(g, x, y, 11, 16, 0, { face: false, back: MOTLEY_PURPLE, cheap: true, alpha: 0.5 });
      }
      if (thrown && foeLive(ctx)) {
        const k = (time - thrown.at) / 320;
        if (k >= 1) thrown = null;
        else card(g, thrown.x + (ctx.npc.x - thrown.x) * k, thrown.y + (ctx.npc.y - 24 - thrown.y) * k, 13, 18, k * 12, { face: true, joker: true, cheap: true });
      }
    },
  };
};

// ── The Fortune Cookie's scripted dishes ─────────────────────────────

/** Fortune Cookies: every 12s you crack one — a heal, a strength or a quick step, read off the slip. */
const fortuneCookies: ItemScriptFactory = (ctx) => {
  let next = 0;
  let started = false;
  let crackAt = -9999;
  return {
    update(time) {
      if (!started) { started = true; next = time + 5000; }
      if (time < next || !live(ctx)) return;
      next = time + 12000;
      crackAt = time;
      const p = ctx.player;
      const k = Math.floor(ctx.rng() * 3);
      if (k === 0) { ctx.heal(p, 6); ctx.float(p.x, p.y - 50, 'FORTUNE: YOU WILL MEND', '#f6cc86'); }
      else if (k === 1) { ctx.boostDamage(1.2, 3000); ctx.float(p.x, p.y - 50, 'FORTUNE: YOU WILL STRIKE TRUE', '#f6cc86'); }
      else { ctx.boostSpeed(1.25, 3000); ctx.float(p.x, p.y - 50, 'FORTUNE: A JOURNEY, SOON', '#f6cc86'); }
      ctx.sfx('snap-back');
    },
    drawAir(g, time) {
      const k = (time - crackAt) / 700;
      if (k < 0 || k >= 1 || !live(ctx)) return;
      const p = ctx.player, x = p.x, y = p.y - 34 - k * 10;
      for (const s of [-1, 1]) {
        g.fillStyle(COOKIE_DARK, 1 - k); g.fillEllipse(x + s * (6 + k * 10), y + k * 14, 12, 8);
        g.fillStyle(COOKIE, 1 - k); g.fillEllipse(x + s * (6 + k * 10), y - 1 + k * 14, 11, 7);
      }
      g.fillStyle(IVORY, 1 - k); g.fillRect(x - 8, y - 4 - k * 12, 16, 4);
      g.fillStyle(CARD_RED, 1 - k); g.fillRect(x - 5, y - 3 - k * 12, 2, 2); g.fillRect(x + 1, y - 3 - k * 12, 2, 2);
    },
  };
};

/** Joker Surprise: when you are hit, a 22% chance a jack-in-the-box springs out at your foe for 7. */
const jokerSurprise: ItemScriptFactory = (ctx) => {
  let T = 0;
  let readyAt = 0;
  let popAt = -9999;
  return {
    update(time) { T = time; },
    onHitTaken() {
      if (T < readyAt || !live(ctx) || ctx.rng() > 0.22) return;
      readyAt = T + 2500;
      popAt = T;
      if (foeLive(ctx) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 220) ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y);
      else ctx.heal(ctx.player, 3);
      ctx.sfx('boing');
    },
    drawAir(g, time) {
      const k = (time - popAt) / 600;
      if (k < 0 || k >= 1 || !live(ctx)) return;
      const p = ctx.player;
      const h = Math.sin(Math.min(1, k * 2.5) * Math.PI * 0.5) * 30;
      g.lineStyle(1.5, GILT, 1 - k);
      for (let i = 0; i < 5; i++) g.lineBetween(p.x + 18, p.y - 10 - (i / 5) * h, p.x + 26, p.y - 10 - ((i + 0.5) / 5) * h);
      g.fillStyle(0xf0c8a8, 1 - k); g.fillCircle(p.x + 22, p.y - 14 - h, 5);
      g.fillStyle(MOTLEY_PURPLE, 1 - k); g.fillTriangle(p.x + 16, p.y - 16 - h, p.x + 22, p.y - 16 - h, p.x + 14, p.y - 26 - h);
      g.fillStyle(MOTLEY_GREEN, 1 - k); g.fillTriangle(p.x + 22, p.y - 16 - h, p.x + 28, p.y - 16 - h, p.x + 30, p.y - 26 - h);
      pip(g, p.x + 22, p.y - 6, 3, 'diamond', CARD_RED, 1 - k);
    },
  };
};

export const CARD_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_ACE, name: 'Ace up the Sleeve', emoji: '♠️', kind: 'charm', price: 520, isle: ISLE,
    flavor: 'An ace of spades sewn into a cuff on a loop of silk. Every sharp on the Rail keeps one. Most never play it.',
    script: CHARM_ACE,
    scriptText: [
      'An ace waits in your sleeve, ready every 14s.',
      'Take a blow of 8+ while it is ready: heal back 60% of that blow, and the ace flicks into your foe for 10.',
    ],
  },
  {
    id: CHARM_DIE, name: 'Lucky Die', emoji: '🎲', kind: 'charm', price: 680, isle: ISLE,
    flavor: 'An ivory die, true-weighted, the one pip on its ace inked red. Corvina swears it has never been loaded. It has.',
    script: CHARM_DIE,
    scriptText: [
      'Every 7s the die rolls at your shoulder. Your next ability within 4s of it landing plays the face:',
      '1 heal 5 · 2 a quick step · 3 a bolt for 8 · 4 +20% damage 3s · 5 stun a near foe · 6 that cooldown −3s.',
    ],
  },
  {
    id: CHARM_WEIGHT, name: 'Paperweight Brooch', emoji: '🔮', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'A millefiori dome no bigger than a thumbnail, made by Bertil Weight for a child whose house blew down.',
    effect: { maxHp: 5 },
    script: CHARM_WEIGHT,
    scriptText: [
      'Stand still and a little house of cards builds at your feet: a storey every 1.1s, four at most.',
      'Move and it falls at your foe if within 170px: 4 damage a storey, and a shove at four storeys.',
    ],
  },
  {
    id: CHARM_HAND, name: 'Gambler\'s Hand', emoji: '🃏', kind: 'charm', price: 980, isle: ISLE,
    flavor: 'A glove with three cards stitched into its palm, red, red, black. It belonged to a man who never folded.',
    script: CHARM_HAND,
    scriptText: [
      'Each ability you cast deals you a card: E hearts, R diamonds, F clubs, Q a wild joker.',
      'At three: three of a suit hits your foe for 18; a pair gives +25% damage 4s; all different refunds each 1.5s.',
    ],
  },
  {
    id: ART_ANTE, name: 'Ante\'s Wild Card', emoji: '🤡', kind: 'artifact', isle: ISLE,
    flavor: 'The Prince\'s joker, soft from his pocket. He drew it every time he needed it. It was never in the deck.',
    effect: { maxHp: 12 },
    script: ART_ANTE,
    scriptText: [
      'The joker keeps a copy of the hardest blow you took in the last 6s.',
      'Every 12s your next hit throws it back: 70% of that blow to your foe (6 to 24).',
    ],
  },
  // The baize pond.
  {
    id: FISH_SOLE, name: 'Spade Sole', emoji: '🐟', kind: 'fish', sell: 30, isle: ISLE,
    flavor: 'A flat black-backed sole shaped like a spade, its back patterned like a card\'s lattice. Fortune-tellers read the scales.',
    effect: { damageTakenMult: 0.97 },
  },
  {
    id: FISH_ANGLER, name: 'Ace Angler', emoji: '🐡', kind: 'fish', sell: 70, isle: ISLE,
    flavor: 'A gaping angler whose lure is a white fin like the corner of a card, one red pip on it. It fishes for gamblers.',
    effect: { critChance: 0.04 },
  },
  // Corvina's flour.
  {
    id: FLOUR, name: 'Rice Flour', emoji: '🌾', kind: 'material', price: 16, sell: 6, isle: ISLE,
    flavor: 'Fine white rice flour from the terraces, the kind fortune cookies fold from. Corvina keeps a sack for Biscotta.',
  },
  // The Fortune Cookie.
  {
    id: FOOD_COOKIES, name: 'Fortune Cookies', emoji: '🥠', kind: 'food', sell: 34, isle: ISLE,
    flavor: 'A paper bag of hot fortune cookies, each one folded round a slip. Biscotta writes the slips herself, these days.',
    script: FOOD_COOKIES,
    scriptText: ['Every 12s you crack a cookie: heal 6, or +20% damage 3s, or a quick step 3s — as the slip says.'],
  },
  {
    id: FOOD_CROUTE, name: 'Ace Angler en Croûte', emoji: '🥐', kind: 'food', sell: 96, isle: ISLE,
    flavor: 'A whole ace angler baked in a crust with its lure left poking out the top, like a card up a sleeve.',
    effect: { damageMult: 1.06, critChance: 0.03, maxHp: 6 },
  },
  {
    id: FOOD_TURNOVER, name: 'Spade Sole Turnover', emoji: '🥟', kind: 'food', sell: 60, isle: ISLE,
    flavor: 'Two soles folded into a rice-flour pastry cut in the shape of a spade. Eaten on the Rail between hands.',
    effect: { maxHp: 12, damageTakenMult: 0.96 },
  },
  {
    id: FOOD_PIE, name: 'Lot-Number Pie', emoji: '🥧', kind: 'food', sell: 52, isle: ISLE,
    flavor: 'Tosswater lotfish under a crust stamped with a number, so every slice is somebody\'s. Never your own.',
    effect: { regenPerSecond: 0.6, maxHp: 8 },
  },
  {
    id: FOOD_SURPRISE, name: 'Joker Surprise', emoji: '🎁', kind: 'food', sell: 64, isle: ISLE,
    flavor: 'A dice dab and a joker jack baked in a box-shaped loaf. Cut it carefully. Something inside is on a spring.',
    script: FOOD_SURPRISE,
    scriptText: ['When you are hit: a 22% chance a jack-in-the-box springs at your foe for 7 (at most every 2.5s).'],
  },
];

export const CARD_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_ACE]: sleeveAce,
  [CHARM_DIE]: luckyDie,
  [CHARM_WEIGHT]: paperweight,
  [CHARM_HAND]: gamblersHand,
  [ART_ANTE]: wildCard,
  [FOOD_COOKIES]: fortuneCookies,
  [FOOD_SURPRISE]: jokerSurprise,
};

export const CARD_SHOPS: ShopDef[] = [
  { id: 'card-shop', name: 'Sleeve & Deck', stock: [CHARM_WEIGHT, CHARM_ACE, CHARM_DIE, CHARM_HAND, FLOUR], buys: true },
];

export const CARD_BAKERIES: BakeryDef[] = [{
  id: BAKERY_ID,
  name: 'The Fortune Cookie',
  recipes: [
    { id: 'card-r-fortune-cookies', name: 'Fortune Cookies', inputs: [{ item: FLOUR, count: 2 }], coins: 24, output: FOOD_COOKIES, makes: 2 },
    { id: 'card-r-angler-croute', name: 'Ace Angler en Croûte', inputs: [{ item: FISH_ANGLER, count: 1 }, { item: FLOUR, count: 1 }], coins: 40, output: FOOD_CROUTE },
    { id: 'card-r-sole-turnover', name: 'Spade Sole Turnover', inputs: [{ item: FISH_SOLE, count: 2 }, { item: FLOUR, count: 1 }], coins: 30, output: FOOD_TURNOVER },
    { id: 'card-r-lot-pie', name: 'Lot-Number Pie', inputs: [{ item: FISH_LOTFISH, count: 2 }, { item: FLOUR, count: 1 }], coins: 28, output: FOOD_PIE },
    {
      id: 'card-r-joker-surprise', name: 'Joker Surprise',
      inputs: [{ item: FISH_JACK, count: 1 }, { item: FISH_DAB, count: 1 }, { item: FLOUR, count: 1 }], coins: 36, output: FOOD_SURPRISE,
    },
  ],
}];

export const CARD_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Baize Pond', kind: 'pond' }];

export const CARD_FISH: FishDef[] = [
  { id: FISH_SOLE, fisheries: [FISHERY], weight: 6, fight: 2, size: [12, 32] },
  { id: FISH_ANGLER, fisheries: [FISHERY], weight: 2, fight: 4, size: [18, 46] },
];
