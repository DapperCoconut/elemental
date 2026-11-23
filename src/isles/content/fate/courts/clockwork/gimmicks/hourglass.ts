import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { hourglass } from '../art';
import { BRASS, BRASS_DARK, IRON_DARK, SAND, SAND_DARK, SAND_LIT } from '../palette';
import { alive, clamp, dist, ease, otherOf } from '../util';

/**
 * Hourglass — Sandman Grain.
 *
 * A great hourglass hangs on chains over the floor, its sand running out of the neck into a heap
 * that spreads as the glass empties. The sand is time: whoever *holds* the heap — the first one
 * standing in it — has their cooldowns run nearly twice as fast, and the other fighter's run slow.
 * Step in second and you only wade (slowed, and your clock still crawls); push the holder off and
 * the heap is yours.
 *
 * When the top bulb runs dry the glass turns over and swings to a new spot, its outline drawn there
 * a couple of seconds before. Anyone still on the old heap when it turns is buried to the knees —
 * held fast and scraped. Grain is a desert man and goes for the next spot early. Beat him to it.
 */

const RUN_MS = 12000;
const TURN_WARN = 2200;
const MOVE_MS = 650;
const FAST = 1.8;
const SLOW = 0.6;
const BURY_MS = 750;
const BURY_DMG = 6;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const stations: Pt[] = [
    { x: W * 0.24, y: top + 170 }, { x: W * 0.76, y: top + 170 }, { x: W * 0.5, y: (top + H) / 2 + 40 },
    { x: W * 0.24, y: H - 110 }, { x: W * 0.76, y: H - 110 },
  ];
  const runMs = ctx.hard ? RUN_MS * 0.82 : RUN_MS;
  let at = 2;
  let next = -1;
  let runStart = -1;
  let moveFrom: Pt | null = null;
  let moveAt = 0;
  let holder: Fighter | null = null;
  let warned = false;
  const buried: { x: number; y: number; at: number }[] = [];

  const pos = (): Pt => stations[at];
  const fill = (time: number) => clamp(1 - (time - runStart) / runMs, 0, 1);
  const heapR = (time: number) => 46 + (1 - fill(time)) * 70;
  const inHeap = (f: Fighter, time: number) => alive(f) && dist(f.x, f.y, pos().x, pos().y) < heapR(time) && time - moveAt > MOVE_MS;

  function pickNext(): number {
    const opts = stations.map((_, i) => i).filter((i) => i !== at);
    return opts[Math.floor(rng() * opts.length)] ?? 0;
  }

  return {
    update(time) {
      if (runStart < 0) { runStart = time; moveAt = time - MOVE_MS; ctx.banner('THE SAND IS RUNNING', '#fae4b0'); }
      // Who holds the heap.
      const pIn = inHeap(player, time), nIn = inHeap(npc, time);
      if (holder && !inHeap(holder, time)) holder = null;
      if (!holder) {
        const newHolder = pIn && !nIn ? player : nIn && !pIn ? npc : null;
        if (newHolder) { holder = newHolder; ctx.float(newHolder.x, newHolder.y - 48, newHolder === player ? 'YOU HOLD THE SAND' : 'GRAIN HOLDS THE SAND', '#fae4b0'); ctx.sfx('time-warp'); }
      }
      // The turn.
      if (!warned && time >= runStart + runMs - TURN_WARN) {
        warned = true;
        next = pickNext();
        ctx.banner('THE GLASS WILL TURN', '#fae4b0');
        ctx.sfx('clock-tick');
      }
      if (time >= runStart + runMs) {
        for (const f of [player, npc]) {
          if (!inHeap(f, time)) continue;
          ctx.root(f, BURY_MS);
          ctx.hit(f, BURY_DMG, f.x, f.y);
          ctx.float(f.x, f.y - 46, 'BURIED', '#e6c88a');
          buried.push({ x: f.x, y: f.y, at: time });
        }
        moveFrom = { ...pos() };
        at = next >= 0 ? next : pickNext();
        next = -1;
        moveAt = time;
        runStart = time;
        holder = null;
        warned = false;
        ctx.sfx('stone-slam');
      }
      for (let i = buried.length - 1; i >= 0; i--) if (time - buried[i].at > BURY_MS + 300) buried.splice(i, 1);
    },

    playerCooldownRate() { return holder === player ? FAST : holder === npc ? SLOW : 1; },
    npcCooldownRate() { return holder === npc ? FAST : holder === player ? SLOW : 1; },
    playerSpeedMult() { return inHeap(player, ctx.scene.time.now) && holder !== player ? 0.78 : 1; },
    npcSpeedMult() { return inHeap(npc, ctx.scene.time.now) && holder !== npc ? 0.78 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      // The next spot as soon as it shows; otherwise the heap, unless the player holds it — then
      // wait on its rim to push in when they step off.
      if (next >= 0) return stations[next];
      const p = pos();
      if (holder === player && alive(player)) {
        const a = Math.atan2(npc.y - p.y, npc.x - p.x);
        return { x: clamp(p.x + Math.cos(a) * (heapR(ctx.scene.time.now) + 40), 60, W - 60), y: clamp(p.y + Math.sin(a) * (heapR(ctx.scene.time.now) + 40), top + 50, H - 50) };
      }
      return p;
    },

    drawGround(g, time) {
      const p = pos();
      const settling = time - moveAt < MOVE_MS;
      if (!settling) {
        const r = heapR(time);
        // The heap: rings of sand darker at the rim, a bright cone where the thread lands.
        g.fillStyle(SAND_DARK, 0.55); g.fillEllipse(p.x, p.y + 4, r * 2.1, r * 1.7);
        g.fillStyle(SAND, 0.75); g.fillEllipse(p.x, p.y, r * 2, r * 1.6);
        for (let k = 1; k < 4; k++) { g.lineStyle(1.5, SAND_DARK, 0.35); g.strokeEllipse(p.x, p.y, r * 2 * (k / 4), r * 1.6 * (k / 4)); }
        g.fillStyle(SAND_LIT, 0.9); g.fillEllipse(p.x, p.y - 2, 24, 14);
        // Rippled grains blowing outward.
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + time / 3000;
          const ph = ((time / 1200) + i * 0.17) % 1;
          g.fillStyle(SAND_LIT, 0.6 * (1 - ph)); g.fillCircle(p.x + Math.cos(a) * r * ph, p.y + Math.sin(a) * r * 0.8 * ph, 1.5);
        }
        // Who holds it: the rim glows in their colour.
        if (holder) { g.lineStyle(3, holder === player ? 0x8ad0ff : 0xff9a6a, 0.6 + Math.sin(time / 150) * 0.2); g.strokeEllipse(p.x, p.y, r * 2 + 6, r * 1.6 + 6); }
        // The turn's warning: the rim ticks round like a clock running out.
        if (next >= 0) {
          const k = clamp((runStart + runMs - time) / TURN_WARN, 0, 1);
          g.lineStyle(4, 0xff6a3a, 0.7);
          g.beginPath(); g.arc(p.x, p.y, r + 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
      // The next spot, outlined.
      if (next >= 0) {
        const q = stations[next];
        const pulse = 0.4 + Math.sin(time / 120) * 0.2;
        g.lineStyle(2, SAND_LIT, pulse); g.strokeEllipse(q.x, q.y, 100, 80);
        g.fillStyle(SAND, 0.12); g.fillEllipse(q.x, q.y, 100, 80);
        g.lineStyle(1.5, SAND_LIT, pulse);
        for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + time / 500; g.lineBetween(q.x + Math.cos(a) * 60, q.y + Math.sin(a) * 48, q.x + Math.cos(a) * 74, q.y + Math.sin(a) * 58); }
      }
      // Old heaps slumping where someone was buried.
      for (const b of buried) {
        const k = (time - b.at) / (BURY_MS + 300);
        g.fillStyle(SAND_DARK, 0.7 * (1 - k)); g.fillEllipse(b.x, b.y + 12, 54, 22);
        g.fillStyle(SAND, 0.8 * (1 - k)); g.fillEllipse(b.x, b.y + 8, 44, 16);
      }
      // Chain shadows to wherever the glass hangs.
      g.fillStyle(0x000000, 0.16); g.fillEllipse(p.x + 10, p.y + 6, 60, 16);
    },

    drawAir(g, time) {
      const p = pos();
      // The glass: on its way across (turning end over end), or hanging over its heap.
      let gx = p.x, gy = p.y - 50, flip = 0;
      if (moveFrom && time - moveAt < MOVE_MS) {
        const k = ease((time - moveAt) / MOVE_MS);
        gx = moveFrom.x + (p.x - moveFrom.x) * k;
        gy = moveFrom.y - 50 + (p.y - moveFrom.y) * k - Math.sin(k * Math.PI) * 60;
        flip = k;
      }
      const f = flip > 0 ? 1 - flip : fill(time);
      // Chains up to the top edge.
      for (const k of [-1, 1]) {
        g.lineStyle(2, IRON_DARK, 0.8);
        g.lineBetween(gx + k * 30, gy - 120, gx + k * 60, top);
      }
      g.fillStyle(BRASS_DARK, 1); g.fillRect(gx - 34, gy - 124, 68, 6);
      // The hourglass itself; turning over is a squash through its waist.
      const squash = flip > 0 ? Math.abs(Math.cos(flip * Math.PI)) : 1;
      if (squash > 0.15) hourglass(g, gx, gy, 120 * squash, f, flip === 0, time / 1000, BRASS);
      else { g.fillStyle(BRASS, 1); g.fillRect(gx - 36, gy - 10, 72, 10); }
      // The thread of sand falling to the heap.
      if (flip === 0 && f > 0) {
        g.lineStyle(2, SAND, 0.9); g.lineBetween(gx, gy - 10, p.x, p.y - 4);
        for (let i = 0; i < 5; i++) { const ph = ((time / 500) + i / 5) % 1; g.fillStyle(SAND_LIT, 1); g.fillCircle(gx + Math.sin(i) * 1.5, gy - 10 + ph * (p.y - gy + 6), 1.4); }
      }
      // Sand pouring over the holder: their clock is running fast.
      if (holder && alive(holder)) {
        for (let i = 0; i < 6; i++) {
          const ph = ((time / 400) + i / 6) % 1;
          g.fillStyle(lit(SAND, 0.4), 0.8 * (1 - ph)); g.fillCircle(holder.x - 14 + i * 6, holder.y - 50 + ph * 30, 1.4);
        }
        g.fillStyle(dim(BRASS, 0.2), 1); g.fillTriangle(holder.x - 6, holder.y - 58, holder.x + 6, holder.y - 58, holder.x, holder.y - 50);
        g.fillTriangle(holder.x - 6, holder.y - 42, holder.x + 6, holder.y - 42, holder.x, holder.y - 50);
        g.fillStyle(SAND, 1); g.fillTriangle(holder.x - 4, holder.y - 43, holder.x + 4, holder.y - 43, holder.x, holder.y - 48);
        // And a slow little clock over the other.
        const o = otherOf(holder, player, npc);
        if (alive(o)) { g.lineStyle(1.5, 0xa8a8a0, 0.8); g.strokeCircle(o.x, o.y - 52, 7); g.lineBetween(o.x, o.y - 52, o.x + Math.cos(time / 1400) * 5, o.y - 52 + Math.sin(time / 1400) * 5); }
      }
      for (const b of buried) {
        const k = (time - b.at) / (BURY_MS + 300);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(SAND_LIT, 1 - k); g.fillCircle(b.x + Math.cos(a) * k * 40, b.y - 10 - Math.sin(k * Math.PI) * 20 + Math.sin(a) * k * 16, 2); }
      }
    },
  };
}

export const HOURGLASS: GimmickDef = {
  id: 'clockwork-hourglass',
  rules: 'Whoever holds the sand heap first has fast cooldowns, the other slow. When the glass empties it turns and moves — anyone left on the old heap is buried.',
  make,
};
