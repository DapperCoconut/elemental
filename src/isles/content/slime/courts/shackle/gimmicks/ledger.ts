import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { chainLinks, debtBell, padlock, sagPoints, tallyMarks } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, INK, INK_RED, IRON, IRON_DARK, IRON_LIT, PAPER, PAPER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Debtor's Ledger — Clerk Arrears.
 *
 * The Great Ledger stands open at the head of the yard, and every blow either fighter takes is
 * written in it as debt — a tally stroke for every few points, your page on the left, Arrears's
 * on the right. The debt-bell rings on a count (the last three seconds tick aloud). At the bell
 * the books are read:
 *
 * • whoever **owes more** is chained to the spot where they stand, and takes blows harder;
 * • the other **collects** — every blow they land on the chained debtor heals them for part of it;
 * • the books are then closed, and the debtor carries a fifth of the difference forward — interest.
 *
 * Coin purses drop on the flags now and then. Walk over one to pay down your debt. Arrears goes for
 * them whenever he is behind — get there first, or make him owe.
 */

const PURSE_R = 28;
const PAY = 9;
const STROKE = 4;

interface Purse { x: number; y: number; at: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const BELL_MS = ctx.hard ? 9500 : 11000;
  const CHAIN_MS = ctx.hard ? 3000 : 2600;
  const COLLECT = 0.35;
  const LEDGER = { x: W / 2, y: top + 58 };
  const BELL = { x: W / 2 + 150, y: top + 96 };
  const debt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const purses: Purse[] = [];
  const paid: { x: number; y: number; at: number }[] = [];
  let nextBell = 0;
  let lastTick = -1;
  let rungAt = -9999;
  let chained: Fighter | null = null;
  let chainUntil = 0;
  let chainAt = { x: 0, y: 0 };
  let nextPurse = 0;
  let started = false;
  let scratchAt = -9999;
  let scratchSide = 0;

  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  function ring(time: number): void {
    rungAt = time;
    ctx.sfx('countdown-go');
    const pd = debt.get(player) ?? 0, nd = debt.get(npc) ?? 0;
    const diff = Math.abs(pd - nd);
    if (diff < 3 || !alive(player) || !alive(npc)) {
      ctx.banner('THE BOOKS BALANCE', '#f0e0b0');
    } else {
      const debtor = pd > nd ? player : npc;
      chained = debtor;
      chainUntil = time + CHAIN_MS;
      chainAt = { x: debtor.x, y: debtor.y };
      ctx.root(debtor, CHAIN_MS);
      ctx.sfx('chain');
      ctx.banner(debtor === player ? 'YOU OWE MORE — CHAINED TO THE SPOT' : 'ARREARS OWES MORE — COLLECT!', debtor === player ? '#ffb0a0' : '#d8f0a0');
      debt.set(other(debtor), 0);
      debt.set(debtor, Math.round(diff * 0.2));
      if (diff * 0.2 >= 1) ctx.float(debtor.x, debtor.y - 60, `+${Math.round(diff * 0.2)} INTEREST`, '#ffb0a0');
      return;
    }
    debt.set(player, 0); debt.set(npc, 0);
  }

  function owe(f: Fighter, amount: number): void {
    if (amount <= 0) return;
    debt.set(f, (debt.get(f) ?? 0) + amount);
    scratchAt = ctx.scene.time.now;
    scratchSide = f === player ? -1 : 1;
  }

  function collect(creditor: Fighter, debtor: Fighter, amount: number): void {
    if (chained !== debtor || ctx.scene.time.now >= chainUntil || !alive(creditor)) return;
    const h = Math.max(1, Math.round(amount * COLLECT));
    ctx.heal(creditor, h);
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        nextBell = time + BELL_MS;
        nextPurse = time + 2500;
        ctx.banner('EVERY HIT IS DEBT — AT THE BELL, THE DEBTOR IS CHAINED', '#f0e0b0');
      }
      // The count.
      const left = nextBell - time;
      const sec = Math.ceil(left / 1000);
      if (sec <= 3 && sec >= 1 && sec !== lastTick) { lastTick = sec; ctx.sfx('countdown-tick'); }
      if (time >= nextBell) { nextBell = time + BELL_MS; lastTick = -1; ring(time); }
      if (chained && time >= chainUntil) chained = null;
      // The clerk's float: coin purses dropped on the flags.
      if (time >= nextPurse) {
        nextPurse = time + (ctx.hard ? 3000 : 3600);
        if (purses.length < 2) {
          purses.push({ x: 90 + rng() * (W - 180), y: top + 170 + rng() * (H - top - 240), at: time, seed: rng() * 6 });
          ctx.sfx('money');
        }
      }
      for (let i = purses.length - 1; i >= 0; i--) {
        const p = purses[i];
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, p.x, p.y) > PURSE_R) continue;
          const d = debt.get(f) ?? 0;
          debt.set(f, Math.max(0, d - PAY));
          ctx.float(p.x, p.y - 30, `-${Math.min(d, PAY)} PAID`, f === player ? '#f0d48a' : '#d8f0a0');
          ctx.sfx('jackpot');
          paid.push({ x: p.x, y: p.y, at: time });
          purses.splice(i, 1);
          break;
        }
      }
      while (paid.length && time - paid[0].at > 700) paid.shift();
    },

    onPlayerHurt(amount) { owe(player, amount); collect(npc, player, amount); },
    onNpcHurt(amount) { owe(npc, amount); collect(player, npc, amount); },

    playerTakenMult() { return chained === player && ctx.scene.time.now < chainUntil ? 1.3 : 1; },
    npcTakenMult() { return chained === npc && ctx.scene.time.now < chainUntil ? 1.3 : 1; },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = ctx.scene.time.now;
      // You are chained: he comes to collect.
      if (chained === player && time < chainUntil) return { x: player.x + (npc.x < player.x ? -60 : 60), y: player.y };
      // Behind on the books: go for the nearest purse.
      if ((debt.get(npc) ?? 0) >= (debt.get(player) ?? 0) && purses.length) {
        let best = purses[0];
        for (const p of purses) if (dist(p.x, p.y, npc.x, npc.y) < dist(best.x, best.y, npc.x, npc.y)) best = p;
        return { x: best.x, y: best.y };
      }
      return null;
    },

    drawGround(g, time) {
      // Purses on the flags.
      for (const p of purses) {
        const bob = Math.sin(time / 300 + p.seed) * 1.5;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x, p.y + 8, 24, 7);
        glow(g, p.x, p.y, 26, BRASS_LIT, 0.04, 2);
        g.fillStyle(0x6a3a22, 1); g.fillEllipse(p.x, p.y + bob, 22, 18);
        g.fillStyle(0x8a5232, 1); g.fillEllipse(p.x - 3, p.y - 2 + bob, 12, 9);
        g.lineStyle(2, BRASS, 1); g.lineBetween(p.x - 6, p.y - 8 + bob, p.x + 6, p.y - 8 + bob);
        g.fillStyle(0x6a3a22, 1); g.fillTriangle(p.x - 5, p.y - 8 + bob, p.x + 5, p.y - 8 + bob, p.x, p.y - 15 + bob);
        for (let i = 0; i < 3; i++) { g.fillStyle(BRASS_LIT, 1); g.fillEllipse(p.x - 12 + i * 10, p.y + 9, 7, 3); }
        g.lineStyle(1, BRASS_LIT, 0.4 + Math.sin(time / 200 + p.seed) * 0.2); g.strokeCircle(p.x, p.y, PURSE_R);
      }
      for (const c of paid) {
        const k = (time - c.at) / 700;
        for (let i = 0; i < 6; i++) { g.fillStyle(BRASS_LIT, 1 - k); g.fillCircle(c.x + Math.cos(i) * k * 30, c.y - k * 30 + Math.sin(i) * 6 + k * k * 30, 2.5); }
      }
      // The debtor's ring in the flags, and the chain to it.
      if (chained && time < chainUntil) {
        g.lineStyle(3, IRON, 1); g.strokeCircle(chainAt.x, chainAt.y + 16, 8);
        g.fillStyle(IRON_DARK, 1); g.fillCircle(chainAt.x, chainAt.y + 16, 4);
      }
    },

    drawAir(g, time) {
      // The Ledger on its frame: two pages of tallies, and a scratch of the quill as each debt goes in.
      const { x, y } = LEDGER;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 52, 300, 20);
      g.fillStyle(IRON_DARK, 1); g.fillRect(x - 110, y + 10, 6, 44); g.fillRect(x + 104, y + 10, 6, 44);
      g.fillStyle(0x3a1a20, 1); g.fillRoundedRect(x - 146, y - 30, 292, 66, 6);
      for (const side of [-1, 1]) {
        const px = side < 0 ? x - 140 : x + 2;
        g.fillStyle(side < 0 ? PAPER : lit(PAPER, 0.06), 1); g.fillRect(px, y - 26, 138, 58);
        g.lineStyle(0.8, PAPER_DARK, 1); for (let r = 0; r < 6; r++) g.lineBetween(px + 4, y - 18 + r * 9, px + 134, y - 18 + r * 9);
        g.lineStyle(1, INK_RED, 0.6); g.lineBetween(px + 22, y - 26, px + 22, y + 32);
        // Whose page: a little seal.
        g.fillStyle(side < 0 ? 0x5a9ad8 : 0xd85a5a, 1); g.fillCircle(px + 11, y - 15, 6);
        const f = side < 0 ? player : npc;
        const strokes = Math.min(44, Math.floor((debt.get(f) ?? 0) / STROKE));
        for (let row = 0; row < 3; row++) {
          const n = clamp(strokes - row * 15, 0, 15);
          if (n > 0) tallyMarks(g, px + 30, y - 22 + row * 17, n, row === 2 ? INK_RED : INK, 0.9, 1);
        }
      }
      g.lineStyle(2, PAPER_DARK, 1); g.lineBetween(x, y - 26, x, y + 32);
      // The quill, scratching on the side that just took debt.
      const sx = x + scratchSide * 70 + Math.sin(time / 40) * (time - scratchAt < 300 ? 5 : 0);
      const sy = y + (time - scratchAt < 300 ? 0 : -10);
      g.lineStyle(1.6, 0xf4f0e6, 1); g.lineBetween(sx, sy, sx + 16, sy - 36);
      g.lineStyle(4, 0xf4f0e6, 0.6); g.lineBetween(sx + 6, sy - 12, sx + 14, sy - 32);
      // Chains on the covers.
      chainLinks(g, sagPoints(x - 146, y - 6, x - 196, y + 50, 6, 4), 8, IRON, 1.6);
      chainLinks(g, sagPoints(x + 146, y - 6, x + 196, y + 50, 6, 4), 8, IRON, 1.6);
      padlock(g, x, y + 40, 1, BRASS);
      // Who owes more right now: a red thumb-tab on that page's edge.
      const pd = debt.get(player) ?? 0, nd = debt.get(npc) ?? 0;
      if (Math.abs(pd - nd) >= 3) {
        const tx = pd > nd ? x - 146 : x + 146;
        g.fillStyle(INK_RED, 0.9 + Math.sin(time / 150) * 0.1); g.fillRect(tx - 5, y - 12, 10, 20);
      }
      // The debt-bell, swinging when it rings, with the count round it.
      const swing = time - rungAt < 1200 ? Math.sin((time - rungAt) / 90) * (1 - (time - rungAt) / 1200) * 0.8 : 0;
      debtBell(g, BELL.x, BELL.y, 0.6, swing);
      const k = clamp(1 - (nextBell - time) / BELL_MS, 0, 1);
      g.lineStyle(3, k > 0.72 ? 0xffb0a0 : BRASS, 0.85);
      g.beginPath(); g.arc(BELL.x, BELL.y - 40, 24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      if (time - rungAt < 700) {
        const q = (time - rungAt) / 700;
        for (let i = 0; i < 3; i++) { g.lineStyle(2, BRASS_LIT, (1 - q) * 0.8); g.strokeCircle(BELL.x, BELL.y - 40, 20 + q * 60 + i * 12); }
      }
      // The debtor chained to the floor ring.
      if (chained && time < chainUntil && alive(chained)) {
        const f = chained;
        const pts = sagPoints(chainAt.x, chainAt.y + 16, f.x, f.y + 12, 4, 4);
        chainLinks(g, pts, 7, IRON_LIT, 1.6);
        const q = clamp((chainUntil - time) / CHAIN_MS, 0, 1);
        g.lineStyle(3, BRASS_DARK, 0.9);
        g.beginPath(); g.arc(f.x, f.y - 58, 9, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2, false); g.strokePath();
        // The creditor's open palm over the debtor: collecting.
        const c = other(f);
        if (alive(c)) { g.fillStyle(BRASS_LIT, 0.5 + Math.sin(time / 120) * 0.2); g.fillCircle(c.x, c.y - 52, 4); }
      }
    },
  };
}

export const LEDGER_GIMMICK: GimmickDef = {
  id: 'shackle-ledger',
  rules: 'Every hit taken is written as debt. At the bell, whoever owes more is chained to the spot while the other collects. Coin purses pay debt down.',
  make,
};
