import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, BRASS_DARK, BRASS_LIT, BUOY, BUOY_DARK, DRIFT, DRIFT_DARK, DRIFT_LIT, FOAM, PILE, PILE_WET, SEA,
  SEA_DEEP, SEA_LIT, SEA_SHALLOW, WEED,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Floor Given Back — Tithe-Clerk Pennick (fortune).
 *
 * The Dry Tithe as the crown tells it: a coin per head, and the sea gives your floor back. The
 * flats are set with five stilt-floors — bare plank decks standing just above the mark. Tithe
 * coins wash up between them and either fighter can scoop them into a purse (three at most). Stand
 * on an unpaid floor with the price in your purse and, after a breath, the floor is *yours*: the
 * clerk's chalk ring goes round it in your colour.
 *
 * Every ten seconds the Gauge calls the tide. A pale sheet of water climbs the flats from the sea
 * edge (the warning), then the surge breaks over everything that is not a floor. On a floor you
 * paid for you are dry. On open sand — or on a floor nobody paid for — the surge takes you. On
 * a floor somebody *else* paid for you are a trespasser and the crown fines you double. Then every
 * floor is spent and goes back on the market.
 *
 * A hard blow knocks a coin out of a purse onto the sand. When Pennick falls below half the tithe
 * doubles: two coins a floor.
 *
 * The exploit is the clerk's own trade: buy the floor out from under him. He walks to a floor to
 * pay for it before the call — pay it first, and when the water comes he is standing on yours.
 */

const FLOOR_W = 96;
const FLOOR_H = 66;
const PICK_R = 26;
const PURSE_MAX = 3;
const PAY_S = 0.45;
const CYCLE_MS = 10000;
const WARN_MS = 2600;
const SURGE_DMG = 14;
const FINE_DMG = 24;
const COIN_EVERY_MS = 2100;
const COINS_MAX = 6;

/** A stilt-floor on the flats, and whose tithe it is standing on. */
interface Floor { x: number; y: number; owner: Fighter | null; payer: Fighter | null; pay: number; flash: number }
/** A tithe coin on the sand (or still spinning through the air after a knock). */
interface Coin { x: number; y: number; tx: number; ty: number; fly: number; born: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const span = H - top;
  const floors: Floor[] = [
    [0.2, 0.3], [0.8, 0.3], [0.5, 0.52], [0.24, 0.8], [0.76, 0.8],
  ].map(([fx, fy]) => ({ x: W * fx, y: top + span * fy, owner: null, payer: null, pay: 0, flash: 0 }));
  const purse = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const knockCd = new Map<Fighter, number>();
  let coins: Coin[] = [];
  let started = false;
  let nextSurge = 0;
  let nextCoin = 0;
  let surgeFx = -9999;
  let doubled = false;
  let npcSlowUntil = 0;

  const price = (): number => (doubled ? 2 : 1);
  const under = (f: Fighter): Floor | null =>
    floors.find((fl) => Math.abs(f.x - fl.x) < FLOOR_W / 2 && Math.abs(f.y - fl.y) < FLOOR_H / 2) ?? null;
  const onAnyFloor = (x: number, y: number): boolean =>
    floors.some((fl) => Math.abs(x - fl.x) < FLOOR_W / 2 + 18 && Math.abs(y - fl.y) < FLOOR_H / 2 + 18);

  function hurt(f: Fighter, amount: number): void {
    if (f === player) tk.hitPlayer(amount, f.x, f.y);
    else ctx.hit(f, amount, f.x, f.y);
  }

  function dropCoin(x: number, y: number, time: number, from?: Fighter): void {
    let tx = x, ty = y;
    for (let tries = 0; tries < 12; tries++) {
      tx = from ? x + (ctx.rng() - 0.5) * 160 : 60 + ctx.rng() * (W - 120);
      ty = from ? y + (ctx.rng() - 0.5) * 120 : top + 50 + ctx.rng() * (span - 100);
      tx = clamp(tx, 50, W - 50); ty = clamp(ty, top + 40, H - 40);
      if (!onAnyFloor(tx, ty)) break;
    }
    coins.push({ x, y, tx, ty, fly: from ? 0.5 : 0, born: time });
  }

  function knock(f: Fighter, amount: number): void {
    const time = ctx.scene.time.now;
    const n = purse.get(f) ?? 0;
    if (amount < 9 || n <= 0 || (knockCd.get(f) ?? 0) > time) return;
    knockCd.set(f, time + 900);
    purse.set(f, n - 1);
    dropCoin(f.x, f.y, time, f);
    ctx.sfx('money');
  }

  function surge(time: number): void {
    surgeFx = time;
    ctx.sfx('splash');
    ctx.sfx('water-jet');
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const fl = under(f);
      if (fl && fl.owner === f) {
        ctx.flash(f.x, f.y, SEA_LIT);
      } else if (fl && fl.owner) {
        hurt(f, FINE_DMG);
        ctx.sfx('judgement');
      } else {
        hurt(f, SURGE_DMG);
        if (f === player) tk.slowPlayer(0.6, 1200); else npcSlowUntil = time + 1200;
      }
    }
    for (const fl of floors) { if (fl.owner) fl.flash = 1; fl.owner = null; fl.payer = null; fl.pay = 0; }
    // The wash leaves the sand half picked clean.
    coins = coins.filter((c) => ctx.rng() < 0.5);
    nextSurge = time + CYCLE_MS;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextSurge = time + 9000;
        nextCoin = time + COIN_EVERY_MS;
        for (let i = 0; i < 3; i++) dropCoin(0, 0, time);
      }
      if (!doubled && npc.hp < npc.maxHp * 0.55) {
        doubled = true;
        ctx.banner('THE TITHE DOUBLES — two coins a floor', '#f2d58a');
        ctx.sfx('jackpot');
      }
      if (time >= nextCoin) {
        nextCoin = time + COIN_EVERY_MS;
        if (coins.length < COINS_MAX) dropCoin(0, 0, time);
      }
      for (const c of coins) {
        if (c.fly > 0) {
          c.fly = Math.max(0, c.fly - dt);
          const k = 1 - c.fly / 0.5;
          c.x += (c.tx - c.x) * Math.min(1, k * 0.4 + 0.1);
          c.y += (c.ty - c.y) * Math.min(1, k * 0.4 + 0.1);
          if (c.fly === 0) { c.x = c.tx; c.y = c.ty; }
        }
      }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        // Scoop up coins.
        coins = coins.filter((c) => {
          if (c.fly > 0 || (purse.get(f) ?? 0) >= PURSE_MAX || dist(f.x, f.y, c.x, c.y) > PICK_R + 10) return true;
          purse.set(f, (purse.get(f) ?? 0) + 1);
          ctx.sfx('money');
          return false;
        });
        // Pay for the floor you are standing on.
        const fl = under(f);
        if (fl && !fl.owner && (purse.get(f) ?? 0) >= price()) {
          if (fl.payer !== f) { fl.payer = f; fl.pay = 0; }
          fl.pay += dt / PAY_S;
          if (fl.pay >= 1) {
            fl.owner = f; fl.pay = 0; fl.payer = null;
            purse.set(f, (purse.get(f) ?? 0) - price());
            ctx.sfx('jackpot');
            fl.flash = 0.8;
          }
        }
      }
      for (const fl of floors) {
        if (fl.payer && (!alive(fl.payer) || under(fl.payer) !== fl)) { fl.payer = null; fl.pay = 0; }
        fl.flash = Math.max(0, fl.flash - dt * 1.5);
      }
      if (time >= nextSurge) surge(time);
    },

    onPlayerHurt(amount) { knock(player, amount); },
    onNpcHurt(amount) { knock(npc, amount); },
    npcSpeedMult: () => (ctx.scene.time.now < npcSlowUntil ? 0.6 : 1),

    npcSeek() {
      const toSurge = nextSurge - ctx.scene.time.now;
      const own = floors.find((fl) => fl.owner === npc);
      const n = purse.get(npc) ?? 0;
      const nearest = <T extends { x: number; y: number }>(list: T[]): T | null =>
        list.reduce<T | null>((b, p) => (!b || dist(npc.x, npc.y, p.x, p.y) < dist(npc.x, npc.y, b.x, b.y) ? p : b), null);
      if (own && toSurge < 3600) return { x: own.x, y: own.y };
      const free = floors.filter((fl) => !fl.owner);
      if (!own && n >= price() && free.length) {
        const fl = nearest(free);
        if (fl) return { x: fl.x, y: fl.y };
      }
      if (n < PURSE_MAX && (n < price() || toSurge > 5000)) {
        const c = nearest(coins.filter((k) => k.fly === 0));
        if (c && dist(npc.x, npc.y, c.x, c.y) < 420) return { x: c.x, y: c.y };
      }
      return null;
    },

    drawGround(g, time) {
      // The coming sheet: a film of grey water climbing the flats from the sea edge.
      const warnK = clamp(1 - (nextSurge - time) / WARN_MS, 0, 1);
      const sinceSurge = time - surgeFx;
      if (warnK > 0) {
        const front = H - warnK * span;
        g.fillStyle(SEA_SHALLOW, 0.16 + warnK * 0.16); g.fillRect(0, front, W, H - front);
        g.fillStyle(SEA, 0.1 + warnK * 0.12); g.fillRect(0, front + 26, W, H - front);
        for (let x = 0; x < W; x += 24) {
          const wob = Math.sin(x / 37 + time / 160) * 5;
          g.fillStyle(FOAM, 0.75); g.fillEllipse(x + 12, front + wob, 30, 7);
          g.fillStyle(SEA_LIT, 0.4); g.fillEllipse(x + 4, front + wob + 9, 18, 3);
        }
      }
      if (sinceSurge < 900) {
        const k = sinceSurge / 900;
        g.fillStyle(SEA_DEEP, 0.55 * (1 - k)); g.fillRect(0, top, W, span);
        g.fillStyle(SEA_LIT, 0.3 * (1 - k));
        for (let i = 0; i < 18; i++) g.fillEllipse((i * 97 + time * 0.05) % W, top + ((i * 61) % span), 60, 8);
      }
      // The floors: plank decks on tarred piles, chalk-ringed for whoever paid.
      for (const fl of floors) {
        const x0 = fl.x - FLOOR_W / 2, y0 = fl.y - FLOOR_H / 2;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(fl.x + 6, fl.y + FLOOR_H / 2 + 6, FLOOR_W + 10, 16);
        for (const [px, py] of [[x0 + 6, y0 + FLOOR_H], [x0 + FLOOR_W - 6, y0 + FLOOR_H], [x0 + 6, y0 + 8], [x0 + FLOOR_W - 6, y0 + 8]]) {
          g.fillStyle(PILE_WET, 1); g.fillRect(px - 5, py - 4, 10, 12);
          g.fillStyle(WEED, 0.8); g.fillRect(px - 5, py + 4, 10, 3);
        }
        g.fillStyle(DRIFT_DARK, 1); g.fillRect(x0 - 2, y0 - 2, FLOOR_W + 4, FLOOR_H + 4);
        for (let i = 0; i < 6; i++) {
          const py = y0 + i * (FLOOR_H / 6);
          g.fillStyle(i % 2 ? DRIFT : DRIFT_LIT, 1); g.fillRect(x0, py + 1, FLOOR_W, FLOOR_H / 6 - 2);
          g.fillStyle(PILE, 0.7);
          g.fillCircle(x0 + 5, py + FLOOR_H / 12, 1.2); g.fillCircle(x0 + FLOOR_W - 5, py + FLOOR_H / 12, 1.2);
          g.lineStyle(1, DRIFT_DARK, 0.5); g.lineBetween(x0 + 20 + ((i * 29) % 50), py + 3, x0 + 34 + ((i * 29) % 50), py + 4);
        }
        // Tide-mark: the bottom plank is darker, weed-greened.
        g.fillStyle(WEED, 0.35); g.fillRect(x0, y0 + FLOOR_H - 7, FLOOR_W, 7);
        if (fl.owner) {
          const c = fl.owner === player ? SEA_LIT : BUOY;
          g.lineStyle(4, c, 0.9); g.strokeRect(x0 + 4, y0 + 4, FLOOR_W - 8, FLOOR_H - 8);
          g.lineStyle(1.5, FOAM, 0.5); g.strokeRect(x0 + 8, y0 + 8, FLOOR_W - 16, FLOOR_H - 16);
          // The receipt seal, wax in the payer's colour, nailed to the boards.
          g.fillStyle(fl.owner === player ? SEA_DEEP : BUOY_DARK, 1); g.fillCircle(fl.x, fl.y, 11);
          g.fillStyle(c, 1); g.fillCircle(fl.x, fl.y, 8);
          g.lineStyle(1.5, FOAM, 0.8);
          g.beginPath(); g.arc(fl.x - 3, fl.y + 1, 4, Math.PI, 0, false); g.arc(fl.x + 4, fl.y + 1, 4, Math.PI, 0, false); g.strokePath();
        } else {
          // The price plate: a brass tag with one or two coin-holes.
          g.fillStyle(BRASS_DARK, 1); g.fillRect(fl.x - 16, fl.y - 9, 32, 18);
          g.fillStyle(BRASS, 1); g.fillRect(fl.x - 14, fl.y - 7, 28, 14);
          for (let i = 0; i < price(); i++) {
            const cx = fl.x + (price() === 1 ? 0 : i === 0 ? -6 : 6);
            g.fillStyle(PILE, 1); g.fillCircle(cx, fl.y, 4.5);
            g.lineStyle(1, BRASS_LIT, 1); g.strokeCircle(cx, fl.y, 4.5);
          }
        }
        if (fl.payer && fl.pay > 0) {
          g.lineStyle(4, fl.payer === player ? SEA_LIT : BUOY, 0.95);
          g.beginPath(); g.arc(fl.x, fl.y, 26, -Math.PI / 2, -Math.PI / 2 + fl.pay * Math.PI * 2, false); g.strokePath();
        }
        if (fl.flash > 0) { g.fillStyle(FOAM, fl.flash * 0.5); g.fillRect(x0, y0, FLOOR_W, FLOOR_H); }
      }
      // Tithe coins: stamped brass with the Queen's wave, glinting.
      for (const c of coins) {
        const lift = c.fly > 0 ? Math.sin((1 - c.fly / 0.5) * Math.PI) * 30 : 0;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(c.x, c.y + 6, 16, 5);
        const y = c.y - lift;
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(c.x, y, 8);
        g.fillStyle(BRASS, 1); g.fillCircle(c.x, y, 6.5);
        g.lineStyle(1.2, BRASS_DARK, 0.9);
        g.beginPath(); g.arc(c.x - 2.5, y + 1, 2.5, Math.PI, 0, false); g.arc(c.x + 2.5, y + 1, 2.5, Math.PI, 0, false); g.strokePath();
        const gl = (Math.sin(time / 260 + c.born) + 1) / 2;
        g.fillStyle(BRASS_LIT, 0.5 + gl * 0.5); g.fillCircle(c.x - 3, y - 3, 1.6);
      }
    },

    drawAir(g) {
      // Each fighter's purse: a little stack of coins over the head.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const n = purse.get(f) ?? 0;
        for (let i = 0; i < n; i++) {
          const y = f.y - 52 - i * 4;
          g.fillStyle(BRASS_DARK, 1); g.fillEllipse(f.x + 22, y + 1.5, 15, 6);
          g.fillStyle(BRASS, 1); g.fillEllipse(f.x + 22, y, 14, 5);
        }
      }
    },

    drawHud(g, time) {
      // The Gauge's dial: the hand sweeps to the top as the call comes round.
      const x = W / 2, y = top + 20;
      const k = clamp(1 - (nextSurge - time) / CYCLE_MS, 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 17);
      g.fillStyle(DRIFT_DARK, 1); g.fillCircle(x, y, 14);
      g.fillStyle(SEA, 1); g.beginPath(); g.slice(x, y, 13, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5, false); g.fillPath();
      g.lineStyle(2, BRASS, 1); g.strokeCircle(x, y, 14);
      const a = -Math.PI / 2 + k * Math.PI * 2;
      g.lineStyle(2.5, k > 1 - WARN_MS / CYCLE_MS ? BUOY : BRASS_LIT, 1);
      g.lineBetween(x, y, x + Math.cos(a) * 12, y + Math.sin(a) * 12);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y, 2.5);
      // Purses either side of the dial: yours left, Pennick's right; price under the dial.
      for (const [f, side] of [[player, -1], [npc, 1]] as [Fighter, number][]) {
        const n = purse.get(f) ?? 0;
        for (let i = 0; i < PURSE_MAX; i++) {
          const cx = x + side * (30 + i * 15);
          g.fillStyle(i < n ? BRASS : 0x2a2622, 1); g.fillCircle(cx, y, 6);
          g.lineStyle(1.2, f === player ? SEA_LIT : BUOY, 0.9); g.strokeCircle(cx, y, 6);
        }
      }
      for (let i = 0; i < price(); i++) {
        g.fillStyle(BRASS_LIT, 1); g.fillCircle(x - (price() - 1) * 5 + i * 10, y + 24, 3.5);
      }
    },

    destroy() {
      coins = [];
      purse.clear();
      knockCd.clear();
    },
  };
}

export const FALLEN_FLOOR_GIVEN_BACK: GimmickDef = {
  id: fallenId('tidewater', 'floor-given-back'),
  rules: 'Scoop up tithe coins and stand on a floor to pay for it. When the tide comes only your own paid floor is dry; another\'s floor fines you double.',
  make,
};
