import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BONE, GOLD_THREAD, HOURGLASS, PLANK, PLANK_DARK, PLANK_LIT, ROPE, ROPE_DARK, SILK_OLD, SILK_SHADE, SPIDER, SPIDER_GOLD,
  SPIDER_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt, segDist } from '../util';

/**
 * Odds on the Hourglass — Oddsman Tibbald Scrope, who keeps the book on the spider-fights in the
 * pens behind the mills, and who in the King's telling paid his debts to the Spymaster in names.
 *
 * In the middle of the yard is the fighting pit, a ring of lashed poles, and in it two farmed
 * spiders lock jaws and shove: the red-banded one is yours, the gold-ringed one is his. A spider
 * struck by its enemy's backer is driven back a step; thrown out of the ring, it loses. The winner
 * is set loose on the loser's backer — it crouches, the line it will leap down is chalked, and it
 * leaps — while the winner's backer collects his purse. Inside the rail the fighters' legs lash
 * at anyone standing there.
 *
 * Strike his spider, from the rail or from range, and keep yours in the ring; he is at the rail
 * doing the same to yours. Halfway down the bout is fixed: his spider shoves on by itself.
 */

const ID = fallenId('web', 'pit');
const PIT_R = 118;
const SHOVE = 0.13;
const CROUCH_MS = 950;
const LEAP_MS = 260;
const LASH_MS = 560;

type Side = 'player' | 'npc';
interface Leap { from: Pt; to: Pt; at: number; side: Side; struck: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 6 };
  let push = 0; // +1: yours has thrown his out; −1: his has thrown yours
  let axis = rng() * Math.PI;
  let fixed = false;
  let leap: Leap | null = null;
  let resetAt = 0;
  const wins: Record<Side, number> = { player: 0, npc: 0 };
  let started = false;
  const lashAt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const struckAt: Record<Side, number> = { player: 0, npc: 0 };
  const flinch: Record<Side, number> = { player: -9999, npc: -9999 };

  const contact = (): Pt => ({ x: C.x + Math.cos(axis) * push * PIT_R * 0.75, y: C.y + Math.sin(axis) * push * PIT_R * 0.75 });
  /** Where each spider stands: yours behind the contact point on the −axis side, his on the +axis side. */
  function body(side: Side): Pt {
    if (leap && leap.side === side) {
      const k = clamp((tk.now - leap.at) / LEAP_MS, 0, 1);
      return { x: leap.from.x + (leap.to.x - leap.from.x) * k, y: leap.from.y + (leap.to.y - leap.from.y) * k };
    }
    const c = contact(), s = side === 'player' ? -1 : 1;
    return { x: c.x + Math.cos(axis) * s * 36, y: c.y + Math.sin(axis) * s * 36 };
  }
  const inBout = () => !leap && resetAt === 0;

  function makeSpider(side: Side): StrikeTarget {
    const p = body(side);
    return ctx.target({
      x: p.x, y: p.y, r: 22,
      onStruck: (by) => {
        if (!inBout() || by === side || tk.now - struckAt[side] < 220) return;
        struckAt[side] = tk.now;
        flinch[side] = tk.now;
        push += side === 'npc' ? SHOVE : -SHOVE;
        ctx.sfx('hit-light');
      },
    });
  }
  const spiders: Record<Side, StrikeTarget> = { player: makeSpider('player'), npc: makeSpider('npc') };

  /** A spider is thrown out: its foe crouches toward the loser's backer and leaps down a chalked line. */
  function decide(winner: Side): void {
    wins[winner]++;
    const loserBacker = winner === 'player' ? npc : player;
    const winnerBacker = winner === 'player' ? player : npc;
    ctx.heal(winnerBacker, 22);
    ctx.sfx('jackpot');
    const from = body(winner);
    const a = Math.atan2(loserBacker.y - from.y, loserBacker.x - from.x);
    const reach = Math.min(420, dist(from.x, from.y, loserBacker.x, loserBacker.y) + 60);
    const to = { x: clamp(from.x + Math.cos(a) * reach, 50, W - 50), y: clamp(from.y + Math.sin(a) * reach, top + 30, H - 30) };
    leap = { from, to, at: tk.now + CROUCH_MS, side: winner, struck: false };
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; }
      if (!fixed && npc.hp < npc.maxHp * 0.5) {
        fixed = true;
        ctx.banner('THE BOUT IS FIXED', '#ffe2a8');
        ctx.sfx('dice');
      }
      if (inBout()) {
        // The two of them circle as they shove; the bout wanders by itself, a little.
        axis += dt * 0.28;
        push += (Math.sin(time / 900) * 0.04 + (rng() - 0.5) * 0.12 - (fixed ? 0.07 : 0)) * dt;
        if (push >= 1) decide('player');
        else if (push <= -1) decide('npc');
      }
      if (leap && time >= leap.at && !leap.struck) {
        leap.struck = true;
        ctx.sfx('screech');
        const target = leap.side === 'player' ? npc : player;
        if (alive(target) && segDist(target.x, target.y, leap.from.x, leap.from.y, leap.to.x, leap.to.y) < 34) {
          if (target === player) { tk.hitPlayer(22, target.x, target.y); ctx.stun(player, 650); }
          else { ctx.hit(npc, 28, target.x, target.y); ctx.stun(npc, 650); }
        }
        resetAt = time + 2200;
      }
      if (resetAt > 0 && time >= resetAt) { resetAt = 0; leap = null; push = 0; axis = rng() * Math.PI; ctx.sfx('countdown-go'); }
      spiders.player.moveTo(body('player').x, body('player').y);
      spiders.npc.moveTo(body('npc').x, body('npc').y);
      // Inside the rail the spiders' legs lash at anyone standing there.
      for (const f of [player, npc]) {
        if (!alive(f) || dist(f.x, f.y, C.x, C.y) > PIT_R - 6 || time - (lashAt.get(f) ?? 0) < LASH_MS) continue;
        lashAt.set(f, time);
        if (f === player) tk.hitPlayer(7, f.x, f.y); else ctx.hit(npc, 9, f.x, f.y);
        const a = Math.atan2(f.y - C.y, f.x - C.x);
        ctx.nudge(f, Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.sfx('whip');
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Dodge a chalked leap down on him.
      if (leap && leap.side === 'player' && !leap.struck) {
        const a = Math.atan2(leap.to.y - leap.from.y, leap.to.x - leap.from.x);
        return { x: tk.clampX(npc.x - Math.sin(a) * 120, 60), y: tk.clampY(npc.y + Math.cos(a) * 120, 60) };
      }
      // At the rail beside your spider, striking it.
      const b = body('player');
      const a = Math.atan2(b.y - C.y, b.x - C.x);
      return { x: tk.clampX(C.x + Math.cos(a) * (PIT_R + 34), 60), y: tk.clampY(C.y + Math.sin(a) * (PIT_R + 34), 60) };
    },

    drawGround(g, time) {
      // The pit floor: trodden old silk and sawdust, a chalk ring, torn betting slips.
      g.fillStyle(dim(SILK_OLD, 0.25), 1); g.fillCircle(C.x, C.y, PIT_R);
      g.fillStyle(SILK_OLD, 0.5); g.fillCircle(C.x - 10, C.y - 8, PIT_R * 0.8);
      for (let i = 0; i < 40; i++) {
        const a = i * 2.39, r = (i * 37 % 100) / 100 * PIT_R * 0.92;
        g.fillStyle(i % 3 ? PLANK_LIT : SILK_SHADE, 0.5); g.fillRect(C.x + Math.cos(a) * r, C.y + Math.sin(a) * r, 2, 1.5);
      }
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1 + 0.4, r = PIT_R * (0.3 + (i % 3) * 0.2);
        g.fillStyle(BONE, 0.7); g.fillRect(C.x + Math.cos(a) * r - 5, C.y + Math.sin(a) * r - 3, 10, 6);
        g.lineStyle(1, HOURGLASS, 0.6); g.lineBetween(C.x + Math.cos(a) * r - 3, C.y + Math.sin(a) * r, C.x + Math.cos(a) * r + 3, C.y + Math.sin(a) * r);
      }
      g.lineStyle(2, BONE, 0.6); g.strokeCircle(C.x, C.y, PIT_R * 0.75);
      // The shove: a scuffed line where they meet.
      if (inBout()) {
        const c = contact(), n = axis + Math.PI / 2;
        g.lineStyle(3, dim(SILK_OLD, 0.5), 0.8); g.lineBetween(c.x + Math.cos(n) * 26, c.y + Math.sin(n) * 26, c.x - Math.cos(n) * 26, c.y - Math.sin(n) * 26);
      }
      for (const s of ['player', 'npc'] as Side[]) { const p = body(s); shadow(g, p.x, p.y + 8, 66, 22, 0.3); }
      // The chalked leap.
      if (leap && !leap.struck) {
        const k = clamp(1 - (leap.at - time) / CROUCH_MS, 0, 1);
        const a = Math.atan2(leap.to.y - leap.from.y, leap.to.x - leap.from.x), n = a + Math.PI / 2;
        const col = leap.side === 'player' ? GOLD_THREAD : HOURGLASS;
        g.fillStyle(col, 0.08 + k * 0.14);
        g.fillPoints([
          { x: leap.from.x + Math.cos(n) * 34, y: leap.from.y + Math.sin(n) * 34 }, { x: leap.to.x + Math.cos(n) * 34, y: leap.to.y + Math.sin(n) * 34 },
          { x: leap.to.x - Math.cos(n) * 34, y: leap.to.y - Math.sin(n) * 34 }, { x: leap.from.x - Math.cos(n) * 34, y: leap.from.y - Math.sin(n) * 34 },
        ], true);
        g.lineStyle(2, BONE, 0.4 + k * 0.5);
        g.lineBetween(leap.from.x + Math.cos(n) * 34, leap.from.y + Math.sin(n) * 34, leap.to.x + Math.cos(n) * 34, leap.to.y + Math.sin(n) * 34);
        g.lineBetween(leap.from.x - Math.cos(n) * 34, leap.from.y - Math.sin(n) * 34, leap.to.x - Math.cos(n) * 34, leap.to.y - Math.sin(n) * 34);
      }
    },

    drawAir(g, time) {
      drawRail(g, C, true);
      for (const s of ['npc', 'player'] as Side[]) {
        const p = body(s);
        const crouch = leap && leap.side === s && !leap.struck ? clamp(1 - (leap.at - time) / CROUCH_MS, 0, 1) : 0;
        const face = leap && leap.side === s ? Math.atan2(leap.to.y - leap.from.y, leap.to.x - leap.from.x) : axis + (s === 'player' ? 0 : Math.PI);
        const thrown = !!leap && leap.side !== s;
        drawFighterSpider(g, p.x, p.y, face, s, time, crouch, time - flinch[s] < 200, thrown);
      }
      drawRail(g, C, false);
    },

    drawHud(g, time) {
      // The tote board: where the shove stands, and the purses each side has collected.
      const x = W / 2, y = top + 18;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 90, y - 14, 180, 28, 6);
      g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 70, y - 4, 140, 8);
      g.fillStyle(HOURGLASS, 1); g.fillRect(x - 70, y - 4, 70 + push * 70, 8);
      g.fillStyle(SPIDER_GOLD, 1); g.fillRect(x + push * 70, y - 4, 70 - push * 70, 8);
      g.lineStyle(1.5, BONE, 1); g.lineBetween(x + push * 70, y - 8, x + push * 70, y + 8);
      for (let i = 0; i < Math.min(5, wins.player); i++) { g.fillStyle(HOURGLASS, 1); g.fillCircle(x - 82, y - 8 + i * 4, 1.8); }
      for (let i = 0; i < Math.min(5, wins.npc); i++) { g.fillStyle(SPIDER_GOLD, 1); g.fillCircle(x + 82, y - 8 + i * 4, 1.8); }
      if (fixed) { g.lineStyle(1, SPIDER_GOLD, 0.6 + Math.sin(time / 200) * 0.3); g.strokeRoundedRect(x - 90, y - 14, 180, 28, 6); }
    },

    destroy() { spiders.player.remove(); spiders.npc.remove(); },
  };
}

/** The pit's rail: lashed poles in a ring, the back half drawn behind the spiders, the front half before. */
function drawRail(g: G, C: Pt, back: boolean): void {
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const behind = Math.sin(a) < 0;
    if (behind !== back) continue;
    const x = C.x + Math.cos(a) * (PIT_R + 4), y = C.y + Math.sin(a) * (PIT_R + 4);
    const a2 = ((i + 1) / n) * Math.PI * 2;
    const x2 = C.x + Math.cos(a2) * (PIT_R + 4), y2 = C.y + Math.sin(a2) * (PIT_R + 4);
    g.fillStyle(PLANK_DARK, 1); g.fillRect(x - 3, y - 26, 6, 26);
    g.fillStyle(PLANK_LIT, 1); g.fillRect(x - 2, y - 25, 2, 22);
    g.lineStyle(3, PLANK, 1); g.lineBetween(x, y - 20, x2, y2 - 20);
    g.lineStyle(1, ROPE, 1); g.lineBetween(x - 3, y - 22, x + 3, y - 18); g.lineBetween(x - 3, y - 18, x + 3, y - 22);
    g.lineStyle(1, ROPE_DARK, 0.8); g.lineBetween(x, y - 8, x2, y2 - 8);
  }
}

/** A pit spider: legs raised to grapple, banded red (yours) or gold-ringed (his), jaws locked. */
function drawFighterSpider(g: G, x: number, y: number, a: number, side: Side, time: number, crouch: number, flinch: boolean, thrown: boolean): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  const R = (f: number, l: number): Pt => ({ x: x + ca * f - sa * l, y: y + (sa * f + ca * l) * 0.8 - 12 + crouch * 6 });
  const band = side === 'player' ? HOURGLASS : SPIDER_GOLD;
  const shake = flinch ? Math.sin(time / 15) * 3 : 0;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const raised = i === 0 && !thrown;
    const ph = Math.sin(time / 90 + i + (s > 0 ? 2 : 0)) * (raised ? 0.25 : 0.1);
    const hip = R(4 - i * 6, s * 8);
    const fa = raised ? 0.45 + ph : (1.1 + i * 0.5) + ph;
    const reach = raised ? 40 : 34 * (1 - crouch * 0.2);
    const foot = R(Math.cos(fa) * reach, s * Math.sin(fa) * reach);
    const knee = { x: (hip.x + foot.x) / 2 + shake, y: Math.min(hip.y, foot.y) - (raised ? 22 : 14) };
    g.lineStyle(3.5, SPIDER, 1); g.lineBetween(hip.x, hip.y, knee.x, knee.y);
    g.lineStyle(2.5, SPIDER, 1); g.lineBetween(knee.x, knee.y, foot.x, foot.y - (raised ? 10 : 0));
    g.fillStyle(band, 1); g.fillCircle(knee.x, knee.y, 2.4);
  }
  const ab = R(-24, 0);
  g.fillStyle(SPIDER, 1); g.fillEllipse(ab.x + shake, ab.y, 40, 32);
  g.fillStyle(SPIDER_LIT, 1); g.fillEllipse(ab.x - 6 + shake, ab.y - 6, 16, 9);
  g.lineStyle(3, band, 0.9); g.strokeEllipse(ab.x + shake, ab.y, 24, 18);
  const hd = R(6, 0);
  g.fillStyle(SPIDER, 1); g.fillEllipse(hd.x + shake, hd.y, 24, 20);
  const e = R(13, 0);
  g.fillStyle(band, 1); g.fillCircle(e.x - 3, e.y - 2, 2); g.fillCircle(e.x + 3, e.y - 2, 2);
  g.fillStyle(BONE, 1); g.fillCircle(R(18, -3).x, R(18, -3).y, 1.8); g.fillCircle(R(18, 3).x, R(18, 3).y, 1.8);
  if (crouch > 0) glow(g, x, y - 10, 40, lit(band, 0.2), 0.06 + crouch * 0.06, 3);
}

export const FALLEN_PIT: GimmickDef = {
  id: ID,
  rules: 'Two spiders shove in the pit: red is yours, gold his. Strike his to drive it back; thrown out, it loses and the winner leaps at its backer.',
  make,
};
