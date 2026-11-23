import type { BakeryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { BRASS, BRASS_DARK, BRASS_LIT, BUST, CARD_BLACK, CARD_RED, CHIPS, GILT, GILT_LIT, IVORY, PIP, chip, die, pips } from './art';

/**
 * Tosswater's goods: Peg Halfpenny's four charms, Silas Longodds's two tackle charms, Felix
 * Tumble's chalk (a quest reward, never sold), two counter foods, and the five meals the Lucky Loaf
 * bakes.
 *
 * Every script keeps its own clock (scene `time`, never the frame `dt`), draws what it is doing on
 * the fighter it belongs to, and says so out loud when it fires. Thornwild's charms were about a
 * garden's habits; these are about a gambling town's — a number that comes up if you count to it,
 * a stake you win only by answering at once, a die that loads itself with your bruises, a rake that
 * gathers what falls off the table, and a caller's honest tally.
 */

const near = (ax: number, ay: number, bx: number, by: number, r: number): boolean =>
  (ax - bx) * (ax - bx) + (ay - by) * (ay - by) <= r * r;

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── Charm: The Called Number ─────────────────────────────────────────

/**
 * A brass Lot with no number stamped on it — the drum calls one each time. A number from 2 to 6
 * hangs over the foe as a face of pips. Count your landed hits up to it: the hit that makes the
 * number pays out 12 more, and a new number is called. Hits closer than 0.25s count once.
 */
const calledNumber: ItemScriptFactory = (ctx) => {
  const draw = (): number => 2 + Math.floor(ctx.rng() * 5);
  let number = draw();
  let count = 0;
  let lastCount = -9999;
  let calledAt = -9999;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (!alive(ctx, 'npc') || now - lastCount < 250) return;
      lastCount = now;
      count++;
      if (count >= number) {
        ctx.hit(ctx.npc, 12);
        ctx.sfx('jackpot');
        ctx.float(ctx.npc.x, ctx.npc.y - 58, `NUMBER ${number} UP! +12`, '#f6e09a');
        ctx.flash(ctx.npc.x, ctx.npc.y, GILT);
        count = 0;
        number = draw();
        calledAt = now;
      }
    },
    drawAir(g, time) {
      if (!alive(ctx, 'npc')) return;
      const n = ctx.npc;
      const x = n.x, y = n.y - 64;
      const pop = Math.max(0, 1 - (time - calledAt) / 400);
      const r = 11 + pop * 5;
      // The brass Lot on its chain, the called number on it as pips.
      g.lineStyle(1, 0x8a8478, 0.9); g.lineBetween(x, y - r - 6, x, y - r);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y + 1, r);
      g.fillStyle(BRASS, 1); g.fillCircle(x, y, r);
      g.lineStyle(1, BRASS_LIT, 0.8); g.strokeCircle(x, y, r * 0.78);
      pips(g, x, y, r * 0.42, number, 1.7, PIP);
      // Progress: one gilt bead per hit counted, round the rim.
      for (let k = 0; k < number; k++) {
        const a = -Math.PI / 2 + (k / number) * Math.PI * 2;
        g.fillStyle(k < count ? GILT_LIT : 0x3a3428, k < count ? 1 : 0.6);
        g.fillCircle(x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5), 2.2);
      }
      if (count === number - 1) {
        g.lineStyle(1.5, GILT_LIT, 0.4 + Math.sin(time / 90) * 0.3); g.strokeCircle(x, y, r + 9);
      }
    },
  };
};

// ── Charm: Double-or-Nothing Chip ────────────────────────────────────

/**
 * A single red chip, nicked at the edge where somebody bit it. When a hit of 3 or more lands on you
 * the chip is staked and spins over your head for 2 seconds. Land a hit on the foe before it falls
 * and you win the pot: half the hit you took comes back as health (max 10) and lands on the foe as
 * well. Let it fall and it is nothing. One stake a second.
 */
const doubleOrNothing: ItemScriptFactory = (ctx) => {
  const WINDOW = 2000;
  let stakedAt = -9999;
  let pot = 0;
  let resultAt = -9999;
  let won = false;
  return {
    update(time) {
      if (pot > 0 && time - stakedAt > WINDOW) {
        pot = 0; won = false; resultAt = time;
        ctx.float(ctx.player.x, ctx.player.y - 56, 'NOTHING', '#a8a0a0');
      }
    },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 3 || pot > 0 || now - resultAt < 1000 || !alive(ctx, 'player')) return;
      pot = Math.min(10, Math.max(2, Math.round(amount / 2)));
      stakedAt = now;
      ctx.sfx('dice');
    },
    onHitDealt() {
      if (pot <= 0 || !alive(ctx, 'npc')) return;
      const now = ctx.scene.time.now;
      ctx.heal(ctx.player, pot);
      ctx.hit(ctx.npc, pot);
      ctx.sfx('money');
      ctx.float(ctx.player.x, ctx.player.y - 56, `DOUBLE! +${pot}`, '#f6e09a');
      pot = 0; won = true; resultAt = now;
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (pot > 0) {
        const left = 1 - (time - stakedAt) / WINDOW;
        const spin = Math.abs(Math.cos(time / 60));
        const y = p.y - 52 - Math.sin((1 - left) * Math.PI) * 14;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x, p.y - 30, 14 * spin + 2, 3);
        g.fillStyle(0x7a1a22, 1); g.fillEllipse(p.x, y + 1, 18 * spin + 2, 18);
        g.fillStyle(CARD_RED, 1); g.fillEllipse(p.x, y, 18 * spin + 1, 17);
        g.fillStyle(IVORY, 0.9);
        for (let k = 0; k < 4; k++) g.fillRect(p.x - 1 + Math.cos(k * 1.57) * 6 * spin, y - 1 + Math.sin(k * 1.57) * 6, 2.2 * spin + 0.4, 2.2);
        // The time left, as an arc.
        g.lineStyle(2, GILT, 0.8);
        g.beginPath(); g.arc(p.x, y, 13, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      } else if (won && time - resultAt < 500) {
        const q = (time - resultAt) / 500;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          g.fillStyle(GILT_LIT, 1 - q); g.fillCircle(p.x + Math.cos(a) * (10 + q * 30), p.y - 52 + Math.sin(a) * (10 + q * 20), 2);
        }
      }
    },
  };
};

// ── Charm: Loaded Die ────────────────────────────────────────────────

/**
 * One of the House's own dice, drilled and weighted with shot — and turned against it. It rolls
 * over your head every 4 seconds. Every hit you take loads it one face higher (to 6). While it
 * shows 4, 5 or 6, hits you land add 3, 6 or 9. A hit landed on a 6 spends the load and it rolls
 * low again.
 */
const loadedDie: ItemScriptFactory = (ctx) => {
  const ROLL = 4000;
  let face = 1 + Math.floor(ctx.rng() * 6);
  let rolledAt = -1;
  let lastBonus = -9999;
  let bumpAt = -9999;
  return {
    update(time) {
      if (rolledAt < 0) rolledAt = time;
      if (time - rolledAt >= ROLL) {
        face = 1 + Math.floor(ctx.rng() * 6);
        rolledAt = time;
        ctx.sfx('dice');
      }
    },
    onHitTaken() {
      if (face < 6) { face++; bumpAt = ctx.scene.time.now; }
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (face < 4 || now - lastBonus < 300 || !alive(ctx, 'npc')) return;
      lastBonus = now;
      const add = (face - 3) * 3;
      ctx.hit(ctx.npc, add);
      ctx.float(ctx.npc.x, ctx.npc.y - 50, `LOADED ${face} +${add}`, face === 6 ? '#f6e09a' : '#f0e8d2');
      if (face === 6) {
        ctx.sfx('jackpot');
        face = 1;
        rolledAt = now;
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      const since = time - rolledAt;
      const tumble = since < 300 ? Math.sin((since / 300) * Math.PI) * 10 : 0;
      const hot = face >= 4;
      const s = 13 + (time - bumpAt < 220 ? 3 : 0);
      die(g, p.x, p.y - 42 - tumble, s, face, ((face + 1) % 6) + 1, ((face + 2) % 6) + 1, face === 6 ? GILT_LIT : IVORY, PIP);
      if (hot) {
        g.lineStyle(1.5, face === 6 ? GILT_LIT : CARD_RED, 0.35 + Math.sin(time / 120) * 0.15);
        g.strokeCircle(p.x + 2, p.y - 42 - s / 2 - tumble, s * 0.95);
      }
      // A lead bead per load point taken, under the die.
      if (time - bumpAt < 600) {
        const q = (time - bumpAt) / 600;
        g.fillStyle(0x6a6a72, 1 - q); g.fillCircle(p.x - 10, p.y - 40 + q * 10, 2.5);
      }
    },
  };
};

// ── Charm: Croupier's Rake ───────────────────────────────────────────

/**
 * A croupier's rake, the long-handled sort, cut down to a walking-stick. Hits you land knock chips
 * off the foe (one every 0.7s, six on the floor at most, gone after 9s). Walk over a chip to rake
 * it in: +2 health and it goes on your stack. At five chips stacked, your next landed hit cashes
 * the stack in for 18.
 */
const croupiersRake: ItemScriptFactory = (ctx) => {
  const LIFE = 9000;
  const chips: { x: number; y: number; born: number; c: number }[] = [];
  let lastDrop = -9999;
  let stack = 0;
  let cashedAt = -9999;
  let rakedAt = -9999;
  return {
    update(time) {
      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        if (time - c.born > LIFE) { chips.splice(i, 1); continue; }
        if (stack < 5 && alive(ctx, 'player') && near(ctx.player.x, ctx.player.y + 14, c.x, c.y, 28)) {
          chips.splice(i, 1);
          stack++;
          rakedAt = time;
          ctx.heal(ctx.player, 2);
          ctx.sfx('money');
          if (stack === 5) ctx.float(ctx.player.x, ctx.player.y - 56, 'STACKED — CASH IN', '#f6e09a');
        }
      }
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (!alive(ctx, 'npc')) return;
      if (stack >= 5) {
        ctx.hit(ctx.npc, 18);
        ctx.sfx('jackpot');
        ctx.float(ctx.npc.x, ctx.npc.y - 56, 'CASHED IN +18', '#f6e09a');
        ctx.flash(ctx.npc.x, ctx.npc.y, GILT);
        stack = 0;
        cashedAt = now;
        return;
      }
      if (now - lastDrop < 700 || chips.length >= 6) return;
      lastDrop = now;
      const a = ctx.rng() * Math.PI * 2;
      chips.push({
        x: Math.max(40, Math.min(ctx.W - 40, ctx.npc.x + Math.cos(a) * 34)),
        y: Math.max(110, Math.min(ctx.H - 40, ctx.npc.y + 16 + Math.sin(a) * 20)),
        born: now, c: CHIPS[Math.floor(ctx.rng() * CHIPS.length)],
      });
    },
    drawGround(g, time) {
      for (const c of chips) {
        const age = time - c.born;
        const fade = age > LIFE - 1500 ? (LIFE - age) / 1500 : 1;
        const bounce = age < 300 ? Math.sin((age / 300) * Math.PI) * 8 : 0;
        chip(g, c.x, c.y - bounce, 7, c.c, fade);
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      // The stack at your hip.
      for (let k = 0; k < stack; k++) {
        const y = p.y - 2 - k * 3;
        g.fillStyle(k % 2 ? CARD_BLACK : CARD_RED, 1); g.fillEllipse(p.x + 24, y, 12, 5);
        g.fillStyle(IVORY, 0.8); g.fillRect(p.x + 22, y - 1, 1.5, 2); g.fillRect(p.x + 26, y - 1, 1.5, 2);
      }
      if (stack >= 5) { g.lineStyle(1.5, GILT_LIT, 0.4 + Math.sin(time / 100) * 0.3); g.strokeCircle(p.x + 24, p.y - 8, 12); }
      if (time - rakedAt < 300) {
        const q = (time - rakedAt) / 300;
        g.lineStyle(2, 0x6a4a2a, 1 - q); g.lineBetween(p.x + 8, p.y + 4, p.x + 30 - q * 10, p.y + 14);
      }
      if (time - cashedAt < 500) {
        const q = (time - cashedAt) / 500;
        for (let k = 0; k < 5; k++) {
          g.fillStyle(CHIPS[k], 1 - q);
          g.fillEllipse(ctx.npc.x + (k - 2) * 10 * (1 + q), ctx.npc.y - 30 - q * 30 - Math.abs(k - 2) * 4, 9, 4);
        }
      }
    },
  };
};

// ── Charm: Joker's Lure ──────────────────────────────────────────────

/**
 * A fishing lure painted as a jester, three little bells on its hooks. Every 6 seconds, if the
 * foe is 90–300px away, it casts itself: a line whips out, and 0.3s later the foe is snagged,
 * reeled 46px toward you and nicked for 4.
 */
const jokersLure: ItemScriptFactory = (ctx) => {
  const EVERY = 6000;
  const FLY = 300;
  let last = -1;
  let castAt = -9999;
  let from = { x: 0, y: 0 };
  let landed = true;
  return {
    update(time) {
      if (last < 0) last = time;
      if (!alive(ctx, 'npc') || !alive(ctx, 'player')) return;
      if (landed && time - last >= EVERY) {
        const d = Math.hypot(ctx.npc.x - ctx.player.x, ctx.npc.y - ctx.player.y);
        if (d > 90 && d < 300) {
          last = time; castAt = time; landed = false;
          from = { x: ctx.player.x, y: ctx.player.y - 20 };
          ctx.sfx('whip');
        }
      }
      if (!landed && time - castAt >= FLY) {
        landed = true;
        const dx = ctx.player.x - ctx.npc.x, dy = ctx.player.y - ctx.npc.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        ctx.nudge(ctx.npc, (dx / d) * 46, (dy / d) * 46);
        ctx.hit(ctx.npc, 4);
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'SNAGGED', '#f0c8c8');
      }
    },
    drawAir(g, time) {
      const since = time - castAt;
      if (since > FLY + 350) return;
      const q = Math.min(1, since / FLY);
      const tx = from.x + (ctx.npc.x - from.x) * q, ty = from.y + (ctx.npc.y - 20 - from.y) * q - Math.sin(q * Math.PI) * 40;
      const fade = since > FLY ? 1 - (since - FLY) / 350 : 1;
      g.lineStyle(1, 0xe8e0c8, 0.8 * fade); g.lineBetween(ctx.player.x + 10, ctx.player.y - 24, tx, ty);
      // The jester lure: motley body, three belled points.
      g.fillStyle(CARD_RED, fade); g.fillEllipse(tx, ty, 10, 6);
      g.fillStyle(0x2e9a5a, fade); g.fillEllipse(tx + 3, ty, 5, 6);
      for (let k = -1; k <= 1; k++) { g.fillStyle(GILT_LIT, fade); g.fillCircle(tx - 6, ty + k * 4, 1.6); }
    },
  };
};

// ── Charm: Marlin Bill ───────────────────────────────────────────────

/**
 * The bill of a jackpot marlin, gilt-tipped, on a lanyard. The marlin is a long-range fish. A hit
 * you land on a foe farther than 160px away adds 1 for every 40px beyond that, up to +8. Close
 * work earns nothing extra. Hits closer together than 0.25s count once.
 */
const marlinBill: ItemScriptFactory = (ctx) => {
  let last = -9999;
  let shownAt = -9999;
  let shown = 0;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (now - last < 250 || !alive(ctx, 'npc')) return;
      const d = Math.hypot(ctx.npc.x - ctx.player.x, ctx.npc.y - ctx.player.y);
      if (d <= 160) return;
      last = now;
      const add = Math.min(8, Math.floor((d - 160) / 40) + 1);
      ctx.hit(ctx.npc, add);
      shown = add; shownAt = now;
      if (add >= 6) ctx.float(ctx.npc.x, ctx.npc.y - 50, `LONG SHOT +${add}`, '#f6e09a');
    },
    drawGround(g, time) {
      const p = ctx.player;
      if (!alive(ctx, 'npc')) return;
      const d = Math.hypot(ctx.npc.x - p.x, ctx.npc.y - p.y);
      // The 160px mark as a dashed gilt ring, brightening when the foe is past it.
      const far = d > 160;
      g.lineStyle(1, GILT, far ? 0.28 : 0.1);
      for (let k = 0; k < 24; k += 2) {
        const a0 = (k / 24) * Math.PI * 2 + time / 4000, a1 = ((k + 1) / 24) * Math.PI * 2 + time / 4000;
        g.beginPath(); g.arc(p.x, p.y + 10, 160, a0, a1, false); g.strokePath();
      }
      if (time - shownAt < 300) {
        const q = (time - shownAt) / 300;
        g.lineStyle(2 + shown * 0.3, GILT_LIT, 1 - q); g.lineBetween(p.x, p.y, ctx.npc.x, ctx.npc.y);
      }
    },
  };
};

// ── Charm: The Caller's Chalk (quest reward) ─────────────────────────

/**
 * The stick of chalk Felix Tumble kept his tallies with — twenty-two years of honest counting. Each
 * hit you land chalks a stroke over the foe (one per 0.3s). Four strokes and the fifth across: the
 * gate closes, and you heal 6 and the foe takes 6. Count honestly.
 */
const callersChalk: ItemScriptFactory = (ctx) => {
  let strokes = 0;
  let last = -9999;
  let gateAt = -9999;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (now - last < 300 || !alive(ctx, 'npc')) return;
      last = now;
      strokes++;
      if (strokes >= 5) {
        strokes = 0;
        gateAt = now;
        ctx.heal(ctx.player, 6);
        ctx.hit(ctx.npc, 6);
        ctx.sfx('clock-tick');
        ctx.float(ctx.npc.x, ctx.npc.y - 60, 'TALLIED', '#f0f0e8');
      }
    },
    drawAir(g, time) {
      if (!alive(ctx, 'npc')) return;
      const x = ctx.npc.x - 12, y = ctx.npc.y - 70;
      const gate = time - gateAt < 500;
      const n = gate ? 5 : strokes;
      const a = gate ? 1 - (time - gateAt) / 500 : 0.9;
      g.lineStyle(2, 0xf0f0e8, a);
      for (let k = 0; k < Math.min(4, n); k++) g.lineBetween(x + k * 6, y, x + k * 6 + 1, y + 14);
      if (n >= 5) g.lineBetween(x - 3, y + 11, x + 22, y + 3);
    },
  };
};

// ── Meal: Lotfish Loaf ───────────────────────────────────────────────

/**
 * A Draw-eve loaf, lotfish baked through it, with a brass button hidden in the crumb. Next fight:
 * the first time you fall under half health you bite on the button — +14 health and a burst of
 * speed (+15% for 2s).
 */
const lotfishLoaf: ItemScriptFactory = (ctx) => {
  let found = false;
  let foundAt = -9999;
  return {
    update(time) {
      const p = ctx.player;
      if (found || !alive(ctx, 'player') || p.hp >= p.maxHp * 0.5) return;
      found = true; foundAt = time;
      ctx.heal(p, 14);
      ctx.boostSpeed(1.15, 2000);
      ctx.sfx('sparkle');
      ctx.float(p.x, p.y - 56, 'FOUND THE BUTTON! +14', '#f6e09a');
    },
    drawAir(g, time) {
      if (time - foundAt > 700) return;
      const q = (time - foundAt) / 700;
      const p = ctx.player;
      g.fillStyle(BRASS, 1 - q); g.fillCircle(p.x, p.y - 44 - q * 20, 5);
      g.fillStyle(BRASS_DARK, 1 - q); for (let k = 0; k < 4; k++) g.fillCircle(p.x - 1.5 + (k % 2) * 3, p.y - 45.5 - q * 20 + Math.floor(k / 2) * 3, 0.9);
    },
  };
};

// ── Meal: Wishbone Pie ───────────────────────────────────────────────

/**
 * A Draw-eve pie with a wishbone set upright in the crust. Next fight, whoever draws first blood
 * pulls the long half. If you land the first hit: +15% damage for 6s. If the foe hits first, the
 * wish is yours anyway — that first hit comes back as health (max 12).
 */
const wishbonePie: ItemScriptFactory = (ctx) => {
  let pulled = false;
  let pulledAt = -9999;
  let mine = false;
  return {
    onHitDealt() {
      if (pulled) return;
      pulled = true; mine = true; pulledAt = ctx.scene.time.now;
      ctx.boostDamage(1.15, 6000);
      ctx.sfx('status-buff');
      ctx.float(ctx.player.x, ctx.player.y - 56, 'LONG HALF — WISH!', '#f6e09a');
    },
    onHitTaken(amount) {
      if (pulled) return;
      pulled = true; mine = false; pulledAt = ctx.scene.time.now;
      const back = Math.min(12, Math.max(1, Math.round(amount)));
      ctx.heal(ctx.player, back);
      ctx.float(ctx.player.x, ctx.player.y - 56, `WISHED BACK +${back}`, '#f0e8d2');
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!pulled) {
        // The whole bone, standing up out of your pack.
        g.lineStyle(2.5, IVORY, 0.9);
        g.lineBetween(p.x + 14, p.y - 22, p.x + 18, p.y - 38); g.lineBetween(p.x + 22, p.y - 22, p.x + 18, p.y - 38);
        return;
      }
      if (time - pulledAt > 800) return;
      const q = (time - pulledAt) / 800;
      g.lineStyle(2.5, IVORY, 1 - q);
      g.lineBetween(p.x + 14 - q * 10, p.y - 22 - q * 10, p.x + 18 - q * 10, p.y - 38 - q * 10);
      g.lineBetween(p.x + 22 + q * 12, p.y - 22 - q * 6, p.x + 20 + q * 12, p.y - 30 - q * 6);
      if (mine) { g.lineStyle(1.5, GILT_LIT, 1 - q); g.strokeCircle(p.x, p.y, 26 + q * 16); }
    },
  };
};

// ── Meal: Joker Bake ─────────────────────────────────────────────────

/**
 * Joker jack and chip chub baked under a crust with a grinning face cut in it. Next fight: each
 * hit you take has a one-in-four chance that the joker laughs it off — it comes back as health (max
 * 12). The joker laughs at most once every 3s.
 */
const jokerBake: ItemScriptFactory = (ctx) => {
  let lastLaugh = -9999;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (now - lastLaugh < 3000 || !alive(ctx, 'player') || ctx.rng() >= 0.25) return;
      lastLaugh = now;
      const back = Math.min(12, Math.max(1, Math.round(amount)));
      ctx.heal(ctx.player, back);
      ctx.sfx('boing');
      ctx.float(ctx.player.x, ctx.player.y - 56, `HA! +${back}`, '#f0c8c8');
    },
    drawAir(g, time) {
      if (time - lastLaugh > 700) return;
      const q = (time - lastLaugh) / 700;
      const p = ctx.player;
      const x = p.x - 20, y = p.y - 50 - q * 12;
      // The jester's cap, tossed up: three points, three bells.
      g.fillStyle(CARD_RED, 1 - q); g.fillTriangle(x - 8, y, x, y, x - 10, y - 10);
      g.fillStyle(0x2e9a5a, 1 - q); g.fillTriangle(x - 4, y, x + 4, y, x, y - 12);
      g.fillStyle(CARD_BLACK, 1 - q); g.fillTriangle(x, y, x + 8, y, x + 10, y - 10);
      g.fillStyle(GILT_LIT, 1 - q); g.fillCircle(x - 10, y - 10, 1.6); g.fillCircle(x, y - 12, 1.6); g.fillCircle(x + 10, y - 10, 1.6);
    },
  };
};

// ── Meal: Red or Black ───────────────────────────────────────────────

/**
 * Wager wrasse with Card Court angler, split down the middle: one side glazed in redcurrant, one
 * in squid ink. Next fight your colour turns every 4s. On red, hits you land add 4. On black, hits
 * you take are blunted by 4 (it comes back as health).
 */
const redOrBlack: ItemScriptFactory = (ctx) => {
  const TURN = 4000;
  let red = ctx.rng() < 0.5;
  let turnedAt = -1;
  let lastAdd = -9999;
  return {
    update(time) {
      if (turnedAt < 0) turnedAt = time;
      if (time - turnedAt >= TURN) { red = !red; turnedAt = time; }
    },
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (!red || now - lastAdd < 250 || !alive(ctx, 'npc')) return;
      lastAdd = now;
      ctx.hit(ctx.npc, 4);
    },
    onHitTaken(amount) {
      if (red || !alive(ctx, 'player')) return;
      ctx.heal(ctx.player, Math.min(4, Math.max(1, Math.round(amount))));
    },
    drawGround(g, time) {
      const p = ctx.player;
      const left = 1 - (time - turnedAt) / TURN;
      g.lineStyle(3, red ? CARD_RED : CARD_BLACK, 0.55);
      g.beginPath(); g.arc(p.x, p.y + 14, 24, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      g.lineStyle(1, red ? 0xf0a0a0 : 0x8a8a9a, 0.4); g.strokeEllipse(p.x, p.y + 14, 52, 18);
    },
  };
};

// ── Meal: Jackpot Steak ──────────────────────────────────────────────

/**
 * A steak off the jackpot marlin, grilled over coals with a glaze of the mint's gilded ide. Next
 * fight a seven-wedge wheel turns at your feet; every hit you land lights a wedge (one per 0.25s),
 * and the seventh pays the jackpot: 22 to the foe and 10 health to you.
 */
const jackpotSteak: ItemScriptFactory = (ctx) => {
  let lit = 0;
  let last = -9999;
  let paidAt = -9999;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (now - last < 250 || !alive(ctx, 'npc')) return;
      last = now;
      lit++;
      if (lit >= 7) {
        lit = 0; paidAt = now;
        ctx.hit(ctx.npc, 22);
        ctx.heal(ctx.player, 10);
        ctx.sfx('jackpot');
        ctx.float(ctx.player.x, ctx.player.y - 60, 'JACKPOT!', '#f6e09a');
        ctx.flash(ctx.npc.x, ctx.npc.y, GILT);
      }
    },
    drawGround(g, time) {
      const p = ctx.player;
      const paid = time - paidAt < 600;
      for (let k = 0; k < 7; k++) {
        const a0 = -Math.PI / 2 + (k / 7) * Math.PI * 2 + time / 3000, a1 = a0 + (Math.PI * 2) / 7 - 0.08;
        g.fillStyle(paid || k < lit ? GILT_LIT : k % 2 ? CARD_RED : CARD_BLACK, paid ? 0.6 * (1 - (time - paidAt) / 600) : k < lit ? 0.45 : 0.18);
        g.slice(p.x, p.y + 14, 22, a0, a1, false); g.fillPath();
      }
      g.fillStyle(BUST, 0.3); g.fillCircle(p.x, p.y + 14, 5);
    },
  };
};

// ── Item table ───────────────────────────────────────────────────────

export const PORT_ITEMS: IsleItemDef[] = [
  // Odds & Ends
  {
    id: 'charm-tosswater-called-number', name: 'The Called Number', emoji: '🔢', kind: 'charm', price: 420, isle: 'fate',
    flavor: 'A blank brass Lot. Peg swears the number on it changes when you are not looking. She is right.',
    script: 'charm-tosswater-called-number',
    scriptText: [
      'A number from 2 to 6 hangs over the foe. Count your landed hits to it: that hit pays +12,',
      'and a new number is called.',
    ],
  },
  {
    id: 'charm-tosswater-double-or-nothing', name: 'Double-or-Nothing Chip', emoji: '🔴', kind: 'charm', price: 560, isle: 'fate',
    flavor: 'One red chip, bitten at the edge. Somebody tested it for gold once. It was not gold. It was nerve.',
    script: 'charm-tosswater-double-or-nothing', effect: { maxHp: 6 },
    scriptText: [
      'A hit of 3+ on you stakes the chip for 2s. Land a hit before it falls: half the hit taken',
      'comes back as health (max 10) and lands on the foe too. Miss it: nothing.',
    ],
  },
  {
    id: 'charm-tosswater-loaded-die', name: 'Loaded Die', emoji: '🎲', kind: 'charm', price: 780, isle: 'fate',
    flavor: 'Drilled, filled with shot and sealed — the House\'s own trick. It favours whoever has been hurt most.',
    script: 'charm-tosswater-loaded-die',
    scriptText: [
      'Rolls over your head every 4s. Each hit you take loads it a face higher. On 4/5/6 your hits add',
      '+3/+6/+9. A hit landed on a 6 spends the load.',
    ],
  },
  {
    id: 'charm-tosswater-croupiers-rake', name: 'Croupier\'s Rake', emoji: '🪮', kind: 'charm', price: 1050, isle: 'fate',
    flavor: 'A House rake cut down to a walking-stick. It still reaches for anything that falls off a table.',
    script: 'charm-tosswater-croupiers-rake', effect: { damageTakenMult: 0.97 },
    scriptText: [
      'Your hits knock chips off the foe (6 on the floor, 9s). Walk over one: +2 health and it stacks.',
      'At 5 stacked, your next hit cashes in for +18.',
    ],
  },
  // The Long Shot
  {
    id: 'charm-tosswater-jokers-lure', name: 'Joker\'s Lure', emoji: '🃏', kind: 'charm', price: 380, isle: 'fate',
    flavor: 'A lure painted as a jester, bells on its hooks. Silas uses it for joker jacks. They find it insulting.',
    script: 'charm-tosswater-jokers-lure',
    scriptText: ['Every 6s, a foe 90–300px away is snagged: reeled 46px toward you and nicked for 4.'],
  },
  {
    id: 'charm-tosswater-marlin-bill', name: 'Marlin Bill', emoji: '🗡️', kind: 'charm', price: 640, isle: 'fate',
    flavor: 'A jackpot marlin\'s bill, tipped in gilt. The marlin hits from far off. So, now, do you.',
    script: 'charm-tosswater-marlin-bill', effect: { critChance: 0.02 },
    scriptText: ['Hits you land on a foe beyond 160px add +1 per 40px past it (max +8).'],
  },
  // Quest reward
  {
    id: 'charm-tosswater-callers-chalk', name: 'The Caller\'s Chalk', emoji: '🖍️', kind: 'charm', isle: 'fate',
    flavor: 'Felix Tumble\'s tally chalk, worn to a stub by twenty-two years of counting what the drum would not.',
    script: 'charm-tosswater-callers-chalk', effect: { critChance: 0.02 },
    scriptText: ['Each hit you land chalks a stroke over the foe. Every fifth closes the gate: +6 health, 6 to the foe.'],
  },
  // Counter food
  {
    id: 'food-tosswater-hot-chips', name: 'Hot Chips', emoji: '🍟', kind: 'food', price: 40, sell: 10, isle: 'fate',
    flavor: 'Potato chips in a paper cone, salt and vinegar. The only chips in Tosswater the House cannot rake in.',
    effect: { shieldHp: 10 },
  },
  {
    id: 'food-tosswater-draw-tea', name: 'Draw-Day Tea', emoji: '🍵', kind: 'food', price: 55, sell: 14, isle: 'fate',
    flavor: 'Brewed black and strong enough to stand a spoon in. Tosswater drinks it while the numbers go up.',
    effect: { regenPerSecond: 0.25, speedMult: 1.04 },
  },
  // The Lucky Loaf's meals
  {
    id: 'meal-tosswater-lotfish-loaf', name: 'Lotfish Loaf', emoji: '🍞', kind: 'food', sell: 14, isle: 'fate',
    flavor: 'A Draw-eve loaf with lotfish baked through it — and, somewhere in the crumb, a brass button.',
    script: 'meal-tosswater-lotfish-loaf', effect: { maxHp: 7 },
    scriptText: ['Next fight: the first time you fall under half health you find the button: +14 health, +15% speed 2s.'],
  },
  {
    id: 'meal-tosswater-wishbone-pie', name: 'Wishbone Pie', emoji: '🥧', kind: 'food', sell: 20, isle: 'fate',
    flavor: 'Lotfish and dice dab under a lattice, a wishbone stood upright in the crust for whoever pulls first.',
    script: 'meal-tosswater-wishbone-pie', effect: { regenPerSecond: 0.3 },
    scriptText: ['Next fight: land the first hit for +15% damage 6s — or, hit first, have that hit back as health (max 12).'],
  },
  {
    id: 'meal-tosswater-joker-bake', name: 'Joker Bake', emoji: '🤡', kind: 'food', sell: 30, isle: 'fate',
    flavor: 'Joker jack and chip chub under a crust with a grin cut in it. It looks at you. It is still grinning.',
    script: 'meal-tosswater-joker-bake', effect: { shieldHp: 10 },
    scriptText: ['Next fight: a hit you take has a 1-in-4 chance to be laughed off — back as health (max 12, every 3s).'],
  },
  {
    id: 'meal-tosswater-red-or-black', name: 'Red or Black', emoji: '🐠', kind: 'food', sell: 34, isle: 'fate',
    flavor: 'Wager wrasse and baize-pond angler, split down the spine: one half redcurrant glaze, one half squid ink.',
    script: 'meal-tosswater-red-or-black', effect: { damageMult: 1.02 },
    scriptText: ['Next fight: your colour turns every 4s. Red: hits you land add +4. Black: hits you take are blunted by 4.'],
  },
  {
    id: 'meal-tosswater-jackpot-steak', name: 'Jackpot Steak', emoji: '🥩', kind: 'food', sell: 60, isle: 'fate',
    flavor: 'A marlin steak grilled over coals and glazed with gilded ide from the mint\'s pool. It gleams on the plate.',
    script: 'meal-tosswater-jackpot-steak', effect: { maxHp: 10, damageMult: 1.03 },
    scriptText: ['Next fight: every 7th hit you land pays the jackpot — 22 to the foe and +10 health to you.'],
  },
];

export const PORT_SCRIPTS: Record<string, ItemScriptFactory> = {
  'charm-tosswater-called-number': calledNumber,
  'charm-tosswater-double-or-nothing': doubleOrNothing,
  'charm-tosswater-loaded-die': loadedDie,
  'charm-tosswater-croupiers-rake': croupiersRake,
  'charm-tosswater-jokers-lure': jokersLure,
  'charm-tosswater-marlin-bill': marlinBill,
  'charm-tosswater-callers-chalk': callersChalk,
  'meal-tosswater-lotfish-loaf': lotfishLoaf,
  'meal-tosswater-wishbone-pie': wishbonePie,
  'meal-tosswater-joker-bake': jokerBake,
  'meal-tosswater-red-or-black': redOrBlack,
  'meal-tosswater-jackpot-steak': jackpotSteak,
};

export const PORT_SHOPS: ShopDef[] = [
  {
    id: 'tosswater-store', name: 'Odds & Ends', buys: true,
    stock: [
      'charm-tosswater-called-number', 'charm-tosswater-double-or-nothing', 'charm-tosswater-loaded-die',
      'charm-tosswater-croupiers-rake', 'food-tosswater-hot-chips', 'food-tosswater-draw-tea',
    ],
  },
  {
    id: 'tosswater-tackle', name: 'The Long Shot', buys: true,
    stock: ['rod-fortune', 'rod-iron', 'rod-driftwood', 'charm-tosswater-jokers-lure', 'charm-tosswater-marlin-bill'],
  },
];

export const PORT_BAKERIES: BakeryDef[] = [
  {
    id: 'tosswater-bakery', name: 'The Lucky Loaf',
    recipes: [
      {
        id: 'recipe-tosswater-lotfish-loaf', name: 'Lotfish Loaf', coins: 14, output: 'meal-tosswater-lotfish-loaf', makes: 2,
        inputs: [{ item: 'fish-lotfish', count: 3 }],
      },
      {
        id: 'recipe-tosswater-wishbone-pie', name: 'Wishbone Pie', coins: 18, output: 'meal-tosswater-wishbone-pie',
        inputs: [{ item: 'fish-lotfish', count: 2 }, { item: 'fish-dice-dab', count: 1 }],
      },
      {
        id: 'recipe-tosswater-joker-bake', name: 'Joker Bake', coins: 28, output: 'meal-tosswater-joker-bake',
        inputs: [{ item: 'fish-joker-jack', count: 1 }, { item: 'fish-chip-chub', count: 1 }],
      },
      {
        id: 'recipe-tosswater-red-or-black', name: 'Red or Black', coins: 32, output: 'meal-tosswater-red-or-black',
        inputs: [{ item: 'fish-wager-wrasse', count: 1 }, { item: 'fish-ace-angler', count: 2 }],
      },
      {
        id: 'recipe-tosswater-jackpot-steak', name: 'Jackpot Steak', coins: 44, output: 'meal-tosswater-jackpot-steak',
        inputs: [{ item: 'fish-jackpot-marlin', count: 1 }, { item: 'fish-ingot-ide', count: 1 }],
      },
    ],
  },
];
