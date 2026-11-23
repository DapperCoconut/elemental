import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { CARD_BLACK, GILT, GILT_LIT, IVORY, IVORY_SHADE, die, lotToken, playingCard } from './art';

/**
 * The House's treasures: the Croupier-King's rigged drum (his artifact), and three charms found
 * on its floors — a stray roulette ball off the Roulette Floor, one of Bones Mallory's loaded dice
 * from the Dice Stair, and an ace that Quillon forgot up a sleeve in the Card Gallery.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};
const TAU = Math.PI * 2;

// ── art-lucan: The Rigged Drum ───────────────────────────────────────

/**
 * The great drum from the Draw Halls, small enough now to carry, and rigged at last in your
 * favour. Every 8s it calls a Lot over your foe: a number from 1 to 6, shown as a die. Land that
 * many hits on them within 4.5s and the number is drawn — 20 damage and they are stunned 0.8s.
 * It never calls the same number twice running, and when you are below half health it calls
 * low (1–3). That is what a rigged drum is for.
 */
const riggedDrum: ItemScriptFactory = (ctx) => {
  const EVERY = 8000;
  const WINDOW = 4500;
  let nextAt = 0;
  let called = 0;
  let calledAt = 0;
  let hits = 0;
  let last = 0;
  let drawnAt = 0;
  const call = (time: number) => {
    const p = ctx.player;
    const low = p.hp < p.maxHp * 0.5;
    let n = 1 + Math.floor(ctx.rng() * (low ? 3 : 6));
    if (n === last) n = (n % (low ? 3 : 6)) + 1;
    last = n;
    called = n;
    calledAt = time;
    hits = 0;
    ctx.float(ctx.npc.x, ctx.npc.y - 80, `LOT ${n}`, '#ffe08a');
    ctx.sfx('dice');
  };
  return {
    update(time) {
      if (nextAt === 0) nextAt = time + 3000;
      if (!alive(ctx, 'npc') || !alive(ctx, 'player')) return;
      if (!called && time >= nextAt) call(time);
      if (called && time > calledAt + WINDOW) {
        ctx.float(ctx.npc.x, ctx.npc.y - 70, 'NOT DRAWN', '#a89878');
        called = 0;
        nextAt = time + EVERY - WINDOW;
      }
    },
    onHitDealt() {
      if (!called || !alive(ctx, 'npc')) return;
      hits += 1;
      if (hits < called) return;
      const n = ctx.npc;
      const now = ctx.scene.time.now;
      ctx.hit(n, 20, n.x, n.y);
      ctx.stun(n, 800);
      ctx.float(n.x, n.y - 80, `DRAWN — ${called}`, '#ffe08a');
      ctx.flash(n.x, n.y, GILT_LIT);
      ctx.sfx('jackpot');
      called = 0;
      drawnAt = now;
      nextAt = now + EVERY - WINDOW;
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (called && alive(ctx, 'npc')) {
        const left = Math.max(1, called - hits);
        const k = Math.max(0, 1 - (time - calledAt) / WINDOW);
        // The die over them counts down the hits still owed; a ring of gilt is the time left.
        die(g, n.x, n.y - 78, 22, left, Math.sin(time / 180) * 0.1, 1, true);
        g.lineStyle(2, GILT, 0.8);
        g.beginPath(); g.arc(n.x, n.y - 78, 20, -Math.PI / 2, -Math.PI / 2 + k * TAU, false); g.strokePath();
      }
      const dk = (time - drawnAt) / 600;
      if (drawnAt > 0 && dk < 1) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          lotToken(g, n.x + Math.cos(a) * dk * 50, n.y - 40 + Math.sin(a) * dk * 30 - dk * 20, 5, 1 - dk);
        }
      }
      // A little brass drum turning at your hip.
      const p = ctx.player;
      if (!alive(ctx, 'player')) return;
      const x = p.x + 24, y = p.y - 6;
      g.lineStyle(1.5, GILT, 0.9); g.strokeCircle(x, y, 7);
      g.lineBetween(x + Math.cos(time / 200) * 7, y + Math.sin(time / 200) * 3, x - Math.cos(time / 200) * 7, y - Math.sin(time / 200) * 3);
    },
  };
};

// ── charm-house-lucky-ball ───────────────────────────────────────────

/**
 * A roulette ball that rolled off the great wheel and never stopped. It runs a track round you
 * (70px out), and when it rolls over the foe it bowls them: 6 damage, at most once every 1.2s.
 * Every hit you take spins it faster for 2s.
 */
const luckyBall: ItemScriptFactory = (ctx) => {
  const R = 70;
  let a = 0;
  let boostUntil = 0;
  let lastBowl = 0;
  return {
    update(time, dt) {
      if (!alive(ctx, 'player')) return;
      a += dt * (time < boostUntil ? 6 : 3.2);
      const p = ctx.player, n = ctx.npc;
      const bx = p.x + Math.cos(a) * R, by = p.y + Math.sin(a) * R * 0.7;
      if (alive(ctx, 'npc') && time - lastBowl > 1200 && Math.hypot(n.x - bx, n.y - by) < 30) {
        lastBowl = time;
        ctx.hit(n, 6, n.x, n.y);
        ctx.float(n.x, n.y - 50, 'BOWLED', '#f2e8d0');
        ctx.sfx('hit-light');
      }
    },
    onHitTaken() { boostUntil = ctx.scene.time.now + 2000; },
    drawGround(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      g.lineStyle(1, GILT, 0.18 + (time < boostUntil ? 0.2 : 0)); g.strokeEllipse(p.x, p.y, R * 2, R * 1.4);
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      for (let i = 3; i >= 0; i--) {
        const aa = a - i * 0.18;
        const x = p.x + Math.cos(aa) * R, y = p.y + Math.sin(aa) * R * 0.7;
        if (i > 0) { g.fillStyle(IVORY, 0.12 * (4 - i)); g.fillCircle(x, y, 6); continue; }
        g.fillStyle(IVORY_SHADE, 1); g.fillCircle(x, y, 6);
        g.fillStyle(IVORY, 1); g.fillCircle(x - 1, y - 1, 5);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 2, y - 2, 1.6);
      }
      void time;
    },
  };
};

// ── charm-house-loaded-die ───────────────────────────────────────────

/**
 * One of Bones Mallory's dice — weighted, the way all his were. Every cast you make rolls it. A
 * six refunds 1.5s of that ability's cooldown. A one is snake-eye: your next hit deals 8 more.
 * It is loaded: after four rolls without a six, the next one is a six.
 */
const loadedDie: ItemScriptFactory = (ctx) => {
  let dry = 0;
  let shown = 0;
  let shownAt = 0;
  let snake = false;
  return {
    onCast(abilityId) {
      let n = 1 + Math.floor(ctx.rng() * 6);
      if (dry >= 4) n = 6;
      dry = n === 6 ? 0 : dry + 1;
      shown = n;
      shownAt = ctx.scene.time.now;
      if (n === 6) {
        ctx.refund(abilityId, 1500);
        ctx.float(ctx.player.x, ctx.player.y - 64, 'SIX', '#ffe08a');
        ctx.sfx('dice');
      } else if (n === 1) {
        snake = true;
        ctx.float(ctx.player.x, ctx.player.y - 64, 'SNAKE-EYE', '#ff8a8a');
        ctx.sfx('dice');
      }
    },
    onHitDealt() {
      if (!snake || !alive(ctx, 'npc')) return;
      snake = false;
      const n = ctx.npc;
      ctx.hit(n, 8, n.x, n.y);
      ctx.float(n.x, n.y - 54, '+8', '#ff8a8a');
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const k = (time - shownAt) / 900;
      if (shown && k < 1) {
        const tumble = Math.max(0, 1 - k * 3);
        die(g, p.x - 26, p.y - 52 - tumble * 10, 16, tumble > 0 ? 1 + (Math.floor(time / 60) % 6) : shown, tumble * 3, 1 - Math.max(0, k - 0.7) * 3);
      }
      if (snake) { g.fillStyle(0xc8202e, 0.6 + Math.sin(time / 90) * 0.3); g.fillCircle(p.x + 20, p.y - 40, 4); }
    },
  };
};

// ── charm-house-ace-sleeve ───────────────────────────────────────────

/**
 * The ace of spades Quillon kept up his sleeve and forgot. Once a fight, the first hit that takes
 * you below 30% health brings it out: that hit is healed back (up to 30), and the ace is thrown —
 * the foe takes the same.
 */
const aceSleeve: ItemScriptFactory = (ctx) => {
  let used = false;
  let thrownAt = 0;
  let from = { x: 0, y: 0 };
  return {
    onHitTaken(amount) {
      const p = ctx.player;
      if (used || !alive(ctx, 'player') || p.hp >= p.maxHp * 0.3) return;
      used = true;
      const back = Math.min(30, Math.round(amount));
      ctx.heal(p, back);
      ctx.float(p.x, p.y - 64, 'ACE UP THE SLEEVE', '#f2e8d0');
      ctx.sfx('slash');
      thrownAt = ctx.scene.time.now;
      from = { x: p.x, y: p.y };
      if (alive(ctx, 'npc')) { const n = ctx.npc; ctx.hit(n, back, n.x, n.y); ctx.flash(n.x, n.y, 0xffffff); }
    },
    drawAir(g, time) {
      const k = (time - thrownAt) / 360;
      if (thrownAt > 0 && k < 1) {
        const n = ctx.npc;
        playingCard(g, from.x + (n.x - from.x) * k, from.y - 30 + (n.y - from.y) * k, 26, 36, k * 12, { suit: 'spade', pips: 1 });
      }
      if (!used && alive(ctx, 'player')) {
        // A corner of the card showing at the cuff.
        const p = ctx.player;
        g.fillStyle(IVORY, 0.9); g.fillRect(p.x - 26, p.y - 8, 6, 8);
        g.fillStyle(CARD_BLACK, 1); g.fillCircle(p.x - 23, p.y - 5, 1.5);
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const HOUSE_ITEMS: IsleItemDef[] = [
  {
    id: 'art-lucan', name: 'The Rigged Drum', emoji: '🎰', kind: 'artifact', isle: 'fate',
    flavor: 'The great drum from the Draw Halls, shrunk to fit a hand. Its false bottom is still in it. It is on your side now.',
    script: 'art-lucan', effect: { maxHp: 25 },
    scriptText: [
      'Every 8s it calls a Lot (1–6) over your foe. Land that many hits in 4.5s: 20 damage and a 0.8s stun.',
      'It never calls the same number twice running, and below half health it only calls 1–3.',
    ],
  },
  {
    id: 'charm-house-lucky-ball', name: 'The Runaway Ball', emoji: '⚪', kind: 'charm', isle: 'fate', sell: 260,
    flavor: 'It came off the great wheel one night and simply kept rolling. Nobody on the Roulette Floor will touch it.',
    script: 'charm-house-lucky-ball',
    scriptText: ['A ball runs a track round you. Rolling over the foe bowls them for 6 (once per 1.2s). Hits on you spin it faster.'],
  },
  {
    id: 'charm-house-loaded-die', name: "Mallory's Loaded Die", emoji: '🎲', kind: 'charm', isle: 'fate', sell: 280,
    flavor: 'Yellowed ivory, heavier on one side than it ought to be. You do not want to ask what it is carved from.',
    script: 'charm-house-loaded-die',
    scriptText: ['Each cast rolls it: a six refunds 1.5s of that cooldown, a one adds 8 to your next hit. Never four misses in a row.'],
  },
  {
    id: 'charm-house-ace-sleeve', name: 'Ace Up the Sleeve', emoji: '♠️', kind: 'charm', isle: 'fate', sell: 300,
    flavor: 'Quillon\'s ace of spades, with his ink nick in the corner. He kept it up his cuff for the King and forgot it there.',
    script: 'charm-house-ace-sleeve', effect: { maxHp: 8 },
    scriptText: ['Once a fight: the first hit to drop you under 30% is healed back (max 30) and the foe takes the same.'],
  },
];

export const HOUSE_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-lucan': riggedDrum,
  'charm-house-lucky-ball': luckyBall,
  'charm-house-loaded-die': loadedDie,
  'charm-house-ace-sleeve': aceSleeve,
};
