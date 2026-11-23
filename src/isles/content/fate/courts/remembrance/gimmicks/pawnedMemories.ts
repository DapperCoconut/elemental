import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { memoryBottle } from '../art';
import { GILT, MEM_AMBER, MEM_ROSE, RECALL, RECALL_LIT, SEPIA_DEEP, SEPIA_LIT, SEPIA_PALE, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Pawned Memories — Pawnbroker Hock.
 *
 * Hock's back room: glass shelves round three walls. Every blow either fighter takes is drawn off
 * and corked into a bottle on the nearest empty shelf, labelled with what it did — amber bottles
 * hold blows the *foe* took, rose bottles blows *you* took. Strike a bottle (any attack, any
 * shot) and it breaks: the memory plays back as a streak of sepia light that flies to where its
 * victim is standing *now* and lands the blow again. So break the amber ones, and keep Hock off
 * the rose ones — he goes for them, and every so often he redeems the fattest pledge on his
 * shelves himself, the bottle rattling first. A streak flies straight and lands where it was
 * aimed: step off the spot and it shatters on the floor.
 */

const MAX_FILL = 24;
const CORK_GAP_MS = 600;
const FLIGHT_MS = 620;
const LAND_R = 46;

interface Bottle {
  slot: number;
  victim: 'player' | 'npc';
  amount: number;
  bornAt: number;
  target: StrikeTarget;
  /** Hock is about to redeem this one: it rattles until then. */
  redeemAt: number;
}

interface Streak { x0: number; y0: number; x1: number; y1: number; at: number; victim: 'player' | 'npc'; amount: number; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  /** Shelf slots: along the back wall, then down both side walls. */
  const slots: Pt[] = [];
  for (let i = 0; i < 6; i++) slots.push({ x: 130 + i * 140, y: top + 40 });
  for (const y of [250, 400, 550]) { slots.push({ x: 46, y }); slots.push({ x: W - 46, y }); }
  const bottles: Bottle[] = [];
  const streaks: Streak[] = [];
  let lastCork = -9999;
  /** Our own playback damage is not corked again (no bottle of a bottle). */
  let replaying = false;
  const redeemEvery = ctx.hard ? 8000 : 10000;
  const REDEEM_WARN = 1300;
  let nextRedeem = 0;
  let started = false;
  let now = 0;

  const fighterOf = (v: 'player' | 'npc'): Fighter => (v === 'player' ? player : npc);

  function freeSlot(near: Fighter): number {
    const used = new Set(bottles.map((b) => b.slot));
    let best = -1, bd = Infinity;
    slots.forEach((s, i) => {
      if (used.has(i)) return;
      const d = dist(s.x, s.y, near.x, near.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function cork(victim: 'player' | 'npc', amount: number): void {
    if (replaying || amount < 3 || now - lastCork < CORK_GAP_MS) return;
    const f = fighterOf(victim);
    let slot = freeSlot(f);
    if (slot < 0) {
      // Shelves full: the oldest pledge lapses and goes to the Lethe; this one takes its place.
      const old = bottles.filter((b) => b.redeemAt === 0).sort((a, b) => a.bornAt - b.bornAt)[0];
      if (!old) return;
      slot = old.slot;
      old.target.remove();
      bottles.splice(bottles.indexOf(old), 1);
    }
    lastCork = now;
    const s = slots[slot];
    const b: Bottle = {
      slot, victim, amount: Math.min(MAX_FILL, Math.round(amount)), bornAt: now, redeemAt: 0,
      target: ctx.target({ x: s.x, y: s.y, r: 18, onStruck: () => breakBottle(b) }),
    };
    bottles.push(b);
    ctx.float(s.x, s.y - 30, 'PLEDGED', victim === 'npc' ? '#f6b84a' : '#f08aa8');
  }

  function breakBottle(b: Bottle): void {
    const i = bottles.indexOf(b);
    if (i < 0) return;
    bottles.splice(i, 1);
    b.target.remove();
    const s = slots[b.slot];
    const v = fighterOf(b.victim);
    streaks.push({ x0: s.x, y0: s.y, x1: v.x, y1: v.y, at: now, victim: b.victim, amount: b.amount, done: false });
    ctx.flash(s.x, s.y, b.victim === 'npc' ? MEM_AMBER : MEM_ROSE);
    ctx.sfx('crystal-shatter');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      now = time;
      if (!started) {
        started = true;
        nextRedeem = time + redeemEvery;
        // The shop is never empty: two old pledges on the shelves already, one each.
        cork('npc', 10); lastCork = -9999; cork('player', 10); lastCork = -9999;
      }
      // Hock redeems the fattest pledge against you.
      if (time >= nextRedeem - REDEEM_WARN && !bottles.some((b) => b.redeemAt > 0)) {
        const mine = bottles.filter((b) => b.victim === 'player').sort((a, b) => b.amount - a.amount)[0];
        if (mine) {
          mine.redeemAt = time + REDEEM_WARN;
          ctx.banner('HOCK REDEEMS A PLEDGE', '#f08aa8');
          ctx.sfx('money');
        } else nextRedeem = time + redeemEvery;
      }
      for (const b of [...bottles]) {
        if (b.redeemAt > 0 && time >= b.redeemAt) { nextRedeem = time + redeemEvery; breakBottle(b); }
      }
      // Streaks land.
      for (const s of streaks) {
        if (s.done || time - s.at < FLIGHT_MS) continue;
        s.done = true;
        const v = fighterOf(s.victim);
        if (alive(v) && dist(v.x, v.y, s.x1, s.y1) < LAND_R) {
          replaying = true;
          const n = Math.round(s.amount * (ctx.hard ? 1 : 0.9));
          if (s.victim === 'player') ctx.tk.hitPlayer(n, v.x, v.y); else ctx.hit(v, n, v.x, v.y);
          replaying = false;
          ctx.float(v.x, v.y - 48, 'REMEMBERED', s.victim === 'npc' ? '#f6b84a' : '#f08aa8');
          ctx.sfx('hit-heavy');
        } else {
          ctx.float(s.x1, s.y1 - 20, 'forgotten', '#dcc6a0');
          ctx.sfx('crystal-chime');
        }
      }
      for (let i = streaks.length - 1; i >= 0; i--) if (streaks[i].done && time - streaks[i].at > FLIGHT_MS + 500) streaks.splice(i, 1);
    },

    onPlayerHurt(amount) { cork('player', amount); },
    onNpcHurt(amount) { cork('npc', amount); },

    npcSeek() {
      // Hock goes for the bottles that remember hurting you, nearest first.
      let best: Pt | null = null, bd = Infinity;
      for (const b of bottles) {
        if (b.victim !== 'player') continue;
        const s = slots[b.slot];
        const d = dist(s.x, s.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = s; }
      }
      if (best) {
        // Stand just off the shelf, inside the room.
        const ix = clamp(best.x, 90, W - 90), iy = clamp(best.y + 40, top + 70, H - 60);
        return { x: ix, y: iy };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 210, 80, W - 80), y: clamp(player.y + Math.sin(a) * 180, top + 60, H - 50) };
    },

    drawGround(g) {
      // Glass shelves on iron brackets along the three walls.
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(60, top + 42, W - 120, 6);
      g.fillStyle(TIMBER_LIT, 1); g.fillRect(60, top + 40, W - 120, 3);
      for (let x = 70; x < W - 60; x += 140) { g.fillStyle(0x2a2420, 1); g.fillRect(x, top + 44, 3, 14); }
      for (const x of [46, W - 46]) {
        for (const y of [250, 400, 550]) {
          g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 24, y + 2, 48, 5);
          g.fillStyle(TIMBER, 1); g.fillRect(x - 24, y, 48, 3);
        }
      }
      // Empty slots: a ring in the dust where a bottle stood.
      const used = new Set(bottles.map((b) => b.slot));
      slots.forEach((s, i) => { if (!used.has(i)) { g.lineStyle(1, SEPIA_LIT, 0.35); g.strokeEllipse(s.x, s.y + 1, 14, 5); } });
      // Where each streak will land: a shrinking sepia ring.
      for (const s of streaks) {
        if (s.done) continue;
        const k = clamp((now - s.at) / FLIGHT_MS, 0, 1);
        g.lineStyle(2, s.victim === 'npc' ? MEM_AMBER : MEM_ROSE, 0.4 + k * 0.4);
        g.strokeCircle(s.x1, s.y1, LAND_R * (1.4 - k * 0.4));
        g.fillStyle(SEPIA_DEEP, 0.12 + k * 0.12); g.fillCircle(s.x1, s.y1, LAND_R);
      }
    },

    drawAir(g, time) {
      for (const b of bottles) {
        const s = slots[b.slot];
        const col = b.victim === 'npc' ? MEM_AMBER : MEM_ROSE;
        const age = clamp((time - b.bornAt) / 400, 0, 1);
        const rattle = b.redeemAt > 0 ? Math.sin(time / 30) * 3 * clamp(1 - (b.redeemAt - time) / REDEEM_WARN, 0.3, 1) : 0;
        const sc = (0.9 + b.amount / MAX_FILL * 0.6) * (0.4 + age * 0.6);
        memoryBottle(g, s.x + rattle, s.y, sc * 1.4, col, 0.6 + 0.4 * Math.sin(time / 300 + b.slot), time / 1000);
        // The ticket: how hard the blow was.
        g.fillStyle(SEPIA_PALE, 0.95); g.fillRect(s.x + 10, s.y - 22, 18, 10);
        g.fillStyle(col, 1); g.fillRect(s.x + 11, s.y - 21, 3, 8);
        for (let k = 0; k < Math.min(4, Math.ceil(b.amount / 6)); k++) { g.fillStyle(SEPIA_DEEP, 1); g.fillRect(s.x + 16 + k * 3, s.y - 19, 2, 4); }
        if (b.redeemAt > 0) { g.lineStyle(2, MEM_ROSE, 0.5 + Math.sin(time / 60) * 0.3); g.strokeCircle(s.x, s.y - 14, 22); }
      }
      // Streaks: a sepia ribbon of the blow in flight, a ghostly fist at its head.
      for (const s of streaks) {
        const k = clamp((time - s.at) / FLIGHT_MS, 0, 1);
        const col = s.victim === 'npc' ? MEM_AMBER : MEM_ROSE;
        if (!s.done) {
          const hx = s.x0 + (s.x1 - s.x0) * k, hy = s.y0 + (s.y1 - s.y0) * k - Math.sin(k * Math.PI) * 60;
          for (let i = 0; i < 10; i++) {
            const kk = Math.max(0, k - i * 0.035);
            const tx = s.x0 + (s.x1 - s.x0) * kk, ty = s.y0 + (s.y1 - s.y0) * kk - Math.sin(kk * Math.PI) * 60;
            g.fillStyle(i % 2 ? RECALL : SEPIA_LIT, 0.5 * (1 - i / 10)); g.fillCircle(tx, ty, 8 - i * 0.6);
          }
          glow(g, hx, hy, 18, col, 0.08, 3);
          g.fillStyle(lit(col, 0.4), 0.95); g.fillCircle(hx, hy, 7);
          g.fillStyle(RECALL_LIT, 0.9);
          for (let f = 0; f < 4; f++) g.fillCircle(hx - 4 + f * 2.6, hy - 6, 1.8);
        } else {
          const e = clamp((time - s.at - FLIGHT_MS) / 500, 0, 1);
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            g.fillStyle(dim(col, 0.1), 1 - e); g.fillTriangle(s.x1 + Math.cos(a) * (8 + e * 34), s.y1 + Math.sin(a) * (8 + e * 34), s.x1 + Math.cos(a + 0.2) * (4 + e * 24), s.y1 + Math.sin(a + 0.2) * (4 + e * 24), s.x1 + Math.cos(a - 0.2) * (4 + e * 24), s.y1 + Math.sin(a - 0.2) * (4 + e * 24));
          }
        }
      }
    },

    drawHud(g) {
      // The ledger: amber pledges (blows Hock took) against rose ones (blows you took).
      const amber = bottles.filter((b) => b.victim === 'npc').reduce((n, b) => n + b.amount, 0);
      const rose = bottles.filter((b) => b.victim === 'player').reduce((n, b) => n + b.amount, 0);
      const x = W / 2, y = top + 8;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 130, y - 2, 260, 14, 6);
      const tot = Math.max(1, amber + rose);
      g.fillStyle(MEM_AMBER, 0.95); g.fillRoundedRect(x - 126, y + 1, 252 * (amber / tot), 8, 4);
      g.fillStyle(MEM_ROSE, 0.95); g.fillRoundedRect(x - 126 + 252 * (amber / tot), y + 1, Math.max(2, 252 * (rose / tot)), 8, 4);
      g.lineStyle(1, GILT, 0.8); g.strokeRoundedRect(x - 130, y - 2, 260, 14, 6);
    },

    destroy() {
      for (const b of bottles) b.target.remove();
      bottles.length = 0;
      streaks.length = 0;
    },
  };
}

export const PAWNED_MEMORIES: GimmickDef = {
  id: 'remembrance-pawned-memories',
  rules: 'Every blow is bottled on the shelves. Strike a bottle and it plays the blow back at whoever it hit. Break the amber ones; Hock goes for the rose.',
  make,
};
