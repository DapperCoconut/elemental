import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, BRASS_LIT, BRUISE, BRUISE_LIT, INK, IRON_DARK, PAPER, PAPER_DARK, TIMBER, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Unredeemed — Pledge-Master Orlo Hucklebone, in the King's telling the broker of the Hock & Chain
 * who took a debtor's coat, then his boots, then his wedding ring, and never once gave one back.
 *
 * Every blow either fighter takes is half taken *in pledge*: that half is handed straight back as
 * health and hung, wrapped and ticketed, on the broker's brass rail along the top of the yard. A
 * ticket runs out; an unredeemed pledge is forfeit and hurled from its hook at its owner with
 * interest — a heavy bundle, slow enough to sidestep if you watch your tickets.
 *
 * Strike your own pledge to redeem it: the debt is simply gone. Strike *his* and you sell it out
 * from under him — it flies at him at once, with the interest on. Hucklebone haunts the rail to
 * redeem his own and sell yours. Past half the book closes: tickets run short.
 */

const ID = fallenId('shackle', 'unredeemed');
const HOOKS = 9;
const TICKET_MS = 8000;
const SHORT_TICKET_MS = 5200;
const DUE_WARN = 1300;
const INTEREST = 1.5;
const FLY_SPEED = 300;
const SOLD_SPEED = 420;
const MERGE_MS = 1100;
const BUNDLE_R = 16;

/** A pledge on the rail: whose it is, what it holds, and when it falls due. */
interface Pledge { owner: Fighter; amount: number; hook: number; bornAt: number; dueAt: number; target: StrikeTarget | null; no: number }
/** A forfeit bundle in flight toward its owner. */
interface Flight { owner: Fighter; amount: number; x: number; y: number; vx: number; vy: number; until: number; spin: number; sold: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, tk } = ctx;
  const railY = top + 34;
  const hookX = (i: number): number => 110 + (i * (W - 220)) / (HOOKS - 1);
  const pledges: Pledge[] = [];
  const flights: Flight[] = [];
  const quietUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let ticketNo = 101;
  let closed = false;
  let started = false;

  const owned = (f: Fighter): Pledge[] => pledges.filter((p) => p.owner === f);

  function drop(p: Pledge): void {
    p.target?.remove();
    p.target = null;
    const i = pledges.indexOf(p);
    if (i >= 0) pledges.splice(i, 1);
  }

  function hurl(p: Pledge, sold: boolean): void {
    const f = p.owner;
    const x = hookX(p.hook), y = railY + 26;
    const a = Math.atan2(f.y - y, f.x - x);
    const sp = sold ? SOLD_SPEED : FLY_SPEED;
    flights.push({ owner: f, amount: Math.max(2, Math.round(p.amount * INTEREST)), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, until: tk.now + 2600, spin: 0, sold });
    drop(p);
    ctx.sfx(sold ? 'money' : 'whoosh');
  }

  function pledge(f: Fighter, amount: number): void {
    const now = tk.now;
    if (amount < 3 || !alive(f) || now < (quietUntil.get(f) ?? 0)) return;
    const half = Math.round(amount * 0.5);
    // A second blow in quick succession goes into the same bundle.
    const fresh = owned(f).find((p) => now - p.bornAt < MERGE_MS);
    if (fresh) { fresh.amount += half; ctx.heal(f, half); return; }
    const used = new Set(pledges.map((p) => p.hook));
    const free = [...Array(HOOKS).keys()].filter((i) => !used.has(i));
    if (!free.length) return;
    // Your pledges hang toward your end of the rail, his toward his.
    free.sort((a, b) => Math.abs(hookX(a) - f.x) - Math.abs(hookX(b) - f.x));
    const hook = free[0];
    const p: Pledge = { owner: f, amount: half, hook, bornAt: now, dueAt: now + (closed ? SHORT_TICKET_MS : TICKET_MS), target: null, no: ticketNo++ };
    p.target = ctx.target({
      x: hookX(hook), y: railY + 26, r: BUNDLE_R,
      onStruck: (by) => {
        if (!pledges.includes(p)) return;
        const striker = by === 'player' ? player : npc;
        if (striker === p.owner) {
          ctx.float(hookX(p.hook), railY + 4, 'REDEEMED', '#f0d48a');
          ctx.sfx('jackpot');
          drop(p);
        } else {
          ctx.float(hookX(p.hook), railY + 4, 'SOLD', '#ffb0a0');
          hurl(p, true);
        }
      },
    });
    pledges.push(p);
    ctx.heal(f, half);
    ctx.sfx('chain');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('HALF OF EVERY BLOW GOES IN PLEDGE — REDEEM YOURS, SELL HIS', '#f0d48a'); }
      if (!closed && npc.hp < npc.maxHp * 0.5) {
        closed = true;
        for (const p of pledges) p.dueAt = Math.min(p.dueAt, time + SHORT_TICKET_MS);
        ctx.banner('THE BOOK IS CLOSING — TICKETS RUN SHORT', '#ffb0a0');
        ctx.sfx('boss-phase');
      }
      for (const p of [...pledges]) {
        if (!alive(p.owner)) { drop(p); continue; }
        if (time >= p.dueAt) hurl(p, false);
      }
      for (let i = flights.length - 1; i >= 0; i--) {
        const fl = flights[i];
        fl.x += fl.vx * dt; fl.y += fl.vy * dt; fl.spin += dt * 7;
        const f = fl.owner;
        if (alive(f) && dist(fl.x, fl.y, f.x, f.y) < 20 + 14) {
          quietUntil.set(f, time + 160);
          if (f === player) tk.hitPlayer(fl.amount, fl.x, fl.y); else ctx.hit(npc, fl.amount, fl.x, fl.y);
          ctx.sfx('hit-heavy');
          ctx.flash(fl.x, fl.y, BRASS_LIT);
          flights.splice(i, 1);
          continue;
        }
        if (time > fl.until || fl.y > ctx.H + 40 || fl.x < -40 || fl.x > W + 40) flights.splice(i, 1);
      }
    },

    onPlayerHurt(amount) { pledge(player, amount); },
    onNpcHurt(amount) { pledge(npc, amount); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Dodge a bundle coming for him.
      for (const fl of flights) {
        if (fl.owner !== npc) continue;
        const a = Math.atan2(fl.vy, fl.vx) + Math.PI / 2;
        return { x: clamp(npc.x + Math.cos(a) * 120, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 120, top + 60, ctx.H - 60) };
      }
      // Redeem his oldest; else go sell yours.
      const mine = owned(npc).sort((a, b) => a.dueAt - b.dueAt)[0];
      if (mine) return { x: hookX(mine.hook), y: railY + 90 };
      const yours = owned(player).sort((a, b) => a.dueAt - b.dueAt)[0];
      if (yours && npc.hp > npc.maxHp * 0.35) return { x: hookX(yours.hook), y: railY + 100 };
      return null;
    },

    drawGround(g) {
      // The rail's shadow and the shop's worn counter-line on the boards.
      g.fillStyle(0x000000, 0.18); g.fillRect(70, railY + 52, W - 140, 10);
      g.lineStyle(2, BRASS_DARK, 0.25); g.lineBetween(70, railY + 80, W - 70, railY + 80);
      for (let i = 0; i < HOOKS; i++) {
        g.lineStyle(1, PAPER_DARK, 0.18); g.strokeCircle(hookX(i), railY + 120, 9);
      }
    },

    drawAir(g, time) {
      drawRail(g, time);
      for (const p of pledges) drawPledge(g, p, time);
      for (const fl of flights) drawBundle(g, fl.x, fl.y, 1.1, fl.owner === player, fl.spin, fl.sold);
    },

    drawHud(g, time) {
      // Your tickets, bottom-left: one stub per pledge, the gold clock running down.
      const mine = owned(player).sort((a, b) => a.dueAt - b.dueAt);
      for (let i = 0; i < mine.length; i++) {
        const p = mine[i];
        const x = 22 + i * 38, y = ctx.H - 52;
        const k = clamp((p.dueAt - time) / (closed ? SHORT_TICKET_MS : TICKET_MS), 0, 1);
        const due = p.dueAt - time < DUE_WARN;
        g.fillStyle(PAPER, 0.95); g.fillRect(x, y, 30, 40);
        g.fillStyle(PAPER_DARK, 1); for (let j = 0; j < 6; j++) g.fillCircle(x + 3 + j * 5, y, 1.6);
        g.lineStyle(1, INK, 0.7); g.lineBetween(x + 4, y + 30, x + 26, y + 30); g.lineBetween(x + 4, y + 35, x + 20, y + 35);
        g.lineStyle(3, due ? 0xd83a2a : BRASS, 1);
        g.beginPath(); g.arc(x + 15, y + 14, 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        if (due && Math.floor(time / 140) % 2 === 0) { g.lineStyle(2, 0xd83a2a, 0.9); g.strokeRect(x - 2, y - 2, 34, 44); }
      }
    },
  };

  function drawRail(g: G, time: number): void {
    // Brass rail on wall brackets, a hook at every station.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(60, railY - 30, W - 120, 14);
    g.fillStyle(TIMBER, 1); g.fillRect(60, railY - 30, W - 120, 5);
    for (const x of [80, W / 2, W - 80]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x - 3, railY - 18, 6, 18); }
    g.lineStyle(5, BRASS_DARK, 1); g.lineBetween(70, railY, W - 70, railY);
    g.lineStyle(2, BRASS_LIT, 0.8); g.lineBetween(70, railY - 1.5, W - 70, railY - 1.5);
    for (let i = 0; i < HOOKS; i++) {
      const x = hookX(i);
      g.lineStyle(2.5, BRASS, 1);
      g.beginPath(); g.arc(x + 4, railY + 9, 5, Math.PI, Math.PI * 2.2, true); g.strokePath();
      g.lineBetween(x, railY, x, railY + 8);
    }
    // The Hock & Chain's three balls, swinging gently over the middle of the rail.
    const sw = Math.sin(time / 900) * 2;
    const cx = W / 2 + sw;
    g.lineStyle(2, IRON_DARK, 1); g.lineBetween(W / 2, railY - 16, cx, railY - 2);
    const balls: [number, number][] = [[cx - 12, railY + 4], [cx + 12, railY + 4], [cx, railY + 24]];
    for (const [bx, by] of balls) {
      g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(cx, railY - 2, bx, by - 8);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(bx, by, 9);
      g.fillStyle(BRASS, 1); g.fillCircle(bx - 1, by - 1, 8);
      g.fillStyle(BRASS_LIT, 0.9); g.fillCircle(bx - 3, by - 3, 2.6);
    }
  }

  function drawPledge(g: G, p: Pledge, time: number): void {
    const x = hookX(p.hook), y = railY + 26;
    const due = p.dueAt - time < DUE_WARN;
    const shake = due ? Math.sin(time / 35) * 3 : Math.sin(time / 700 + p.hook) * 1.2;
    g.lineStyle(1.5, 0x6a5a40, 1); g.lineBetween(x + 4, railY + 12, x + shake, y - 14);
    if (due) glow(g, x + shake, y, 26, 0xd83a2a, 0.08, 3);
    drawBundle(g, x + shake, y, 1, p.owner === player, 0, false);
    // The ticket: number in ink, a gold clock, a red corner once it falls due.
    const k = clamp((p.dueAt - time) / (closed ? SHORT_TICKET_MS : TICKET_MS), 0, 1);
    const tx = x + 14 + shake, ty = y - 6;
    g.fillStyle(PAPER, 1); g.fillRect(tx, ty, 18, 24);
    g.fillStyle(p.owner === player ? 0x6a8ab0 : BRUISE, 1); g.fillRect(tx, ty, 18, 5);
    g.lineStyle(1, INK, 0.8);
    for (let j = 0; j < (p.no % 4) + 1; j++) g.lineBetween(tx + 3 + j * 3, ty + 9, tx + 3 + j * 3, ty + 14);
    g.lineStyle(2, due ? 0xd83a2a : BRASS, 1);
    g.beginPath(); g.arc(tx + 9, ty + 19, 3.5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
    // How heavy: one knot per five held.
    for (let j = 0; j < Math.min(5, Math.ceil(p.amount / 5)); j++) { g.fillStyle(INK, 0.8); g.fillCircle(x - 10 + j * 5 + shake, y + 18, 1.5); }
  }

  function drawBundle(g: G, x: number, y: number, s: number, yours: boolean, spin: number, sold: boolean): void {
    const cloth = yours ? 0x5a6e8a : BRUISE;
    const clothLit = yours ? 0x8aa0c0 : BRUISE_LIT;
    shadow(g, x, y + 18 * s, 22 * s, 6 * s, 0.2);
    g.fillStyle(dim(cloth, 0.3), 1); g.fillEllipse(x, y + 2 * s, 28 * s, 24 * s);
    g.fillStyle(cloth, 1); g.fillEllipse(x - 1, y, 26 * s, 22 * s);
    // The knot and its ears, turning as it flies.
    const ex = Math.cos(spin) * 7 * s;
    g.fillStyle(clothLit, 1); g.fillTriangle(x - 2 + ex, y - 10 * s, x - 9 + ex, y - 18 * s, x + 1 + ex, y - 15 * s);
    g.fillTriangle(x + 2 + ex, y - 10 * s, x + 9 + ex, y - 18 * s, x - 1 + ex, y - 15 * s);
    g.fillStyle(dim(cloth, 0.4), 1); g.fillCircle(x + ex, y - 10 * s, 3 * s);
    // Twine round it, and what pokes out: a boot heel, a coat sleeve.
    g.lineStyle(1.5, 0xc8b080, 0.9); g.lineBetween(x - 12 * s, y, x + 12 * s, y); g.lineBetween(x, y - 10 * s, x, y + 11 * s);
    g.fillStyle(0x3a2a20, 1); g.fillRect(x + 7 * s, y + 4 * s, 6 * s, 5 * s);
    g.fillStyle(lit(cloth, 0.2), 0.8); g.fillEllipse(x - 10 * s, y + 6 * s, 7 * s, 4 * s);
    if (sold) { g.lineStyle(2, 0xd83a2a, 0.9); g.strokeCircle(x, y, 17 * s); }
  }
}

export const FALLEN_UNREDEEMED: GimmickDef = {
  id: ID,
  rules: 'Half of every blow is taken in pledge and hung on the rail. Unredeemed, it is hurled back with interest. Strike yours to redeem, his to sell.',
  make,
};
