import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { dustPuff, rollingBoulder, screeFlow, shard, strataFace } from '../art';
import { CHALK, DUST, DUST_LIT, GRANITE, GRANITE_DARK, SANDSTONE, SANDSTONE_DARK } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Landslide — Scree-Runner Talus.
 *
 * The yard is the scree slope under the mesa face, and it never stops moving: everywhere below
 * the ledge the loose stone slides downhill, carrying fighters with it, faster in the runs where
 * it is deepest. At the foot it banks up knee-deep and slows you. Down four chalk-marked lanes
 * boulders come bounding off the ledge — the lane rumbles and dust trickles over the lip first —
 * and flatten whatever is in their way.
 *
 * The ledge along the top is the high ground: no scree, no boulders. But it is rotten rock, and
 * every moment a fighter stands on a stretch of it, that stretch crumbles a little more, until it
 * gives way and goes down the slope with whoever was on it. Talus runs scree the way other men
 * run stairs, and he will take the ledge from under you if you let him.
 */

const SEGMENTS = 6;
const SHELF_H = 92;
const SLIDE = 52;
const RUN_SLIDE = 105;
const CRUMBLE_PER_S = 0.3;
const REBUILD_MS = 7000;
const LANE_HALF = 26;
const ROCK_R = 26;
const ROCK_V = 430;

interface Seg { x0: number; x1: number; hp: number; fellAt: number }
interface Rock { lane: number; warnAt: number; rollAt: number; y: number; hit: Set<Fighter>; spin: number; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const shelfY = top + SHELF_H;
  const segW = W / SEGMENTS;
  const segs: Seg[] = Array.from({ length: SEGMENTS }, (_, i) => ({ x0: i * segW, x1: (i + 1) * segW, hp: 1, fellAt: -99999 }));
  const lanes = [W * 0.17, W * 0.39, W * 0.61, W * 0.83];
  const rocks: Rock[] = [];
  const runs = [{ x: W * 0.28, w: 110 }, { x: W * 0.72, w: 110 }];
  const puffs: { x: number; y: number; at: number }[] = [];
  const debris: { x: number; y: number; vy: number; at: number; spin: number }[] = [];
  const every = ctx.hard ? 2000 : 2600;
  let nextRock = 0;
  let nextRuns = 0;
  let started = false;
  let lastLane = -1;

  const segOf = (x: number) => segs[clamp(Math.floor(x / segW), 0, SEGMENTS - 1)];
  const onShelf = (f: Fighter) => f.y < shelfY && segOf(f.x).hp > 0;
  const inRun = (x: number) => runs.some((r) => Math.abs(x - r.x) < r.w / 2);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextRock = time + 1600; nextRuns = time + 8000; }
      // The runs wander every few seconds.
      if (time >= nextRuns) {
        nextRuns = time + 8000;
        for (const r of runs) r.x = clamp(r.x + (rng() - 0.5) * 260, 80, W - 80);
      }
      // The ledge crumbles under feet and rebuilds when it has had time to settle.
      for (const s of segs) {
        if (s.hp <= 0 && time - s.fellAt > REBUILD_MS) { s.hp = 1; }
      }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (f.y < shelfY) {
          const s = segOf(f.x);
          if (s.hp > 0) {
            s.hp -= CRUMBLE_PER_S * dt;
            if (s.hp <= 0) {
              s.hp = 0; s.fellAt = time;
              ctx.sfx('quake');
              ctx.float((s.x0 + s.x1) / 2, shelfY - 40, 'THE LEDGE GIVES', '#e8d2a8');
              for (let i = 0; i < 10; i++) debris.push({ x: s.x0 + rng() * segW, y: top + rng() * SHELF_H, vy: 60 + rng() * 120, at: time, spin: rng() * 6 });
              // Whoever stood on it goes down with it.
              for (const g of [player, npc]) {
                if (alive(g) && g.y < shelfY && g.x >= s.x0 && g.x < s.x1) {
                  ctx.nudge(g, 0, 90);
                  if (g === player) tk.hitPlayer(6, g.x, g.y); else ctx.hit(g, 6, g.x, g.y);
                }
              }
            }
            continue;
          }
        }
        // On the slope: the scree carries you downhill.
        const v = (inRun(f.x) ? RUN_SLIDE : SLIDE) * (f.y > H - 90 ? 0.3 : 1);
        ctx.nudge(f, 0, v * dt);
      }
      // Boulders down the lanes.
      if (time >= nextRock) {
        nextRock = time + every;
        let lane = Math.floor(rng() * lanes.length);
        if (lane === lastLane) lane = (lane + 1 + Math.floor(rng() * 3)) % lanes.length;
        // Every third boulder comes down the lane the player is nearest — a reason to keep moving.
        if (rng() < 0.35) lane = lanes.reduce((b, x, i) => (Math.abs(x - player.x) < Math.abs(lanes[b] - player.x) ? i : b), 0);
        lastLane = lane;
        const warn = tk.warn(1100);
        rocks.push({ lane, warnAt: time, rollAt: time + warn, y: shelfY - 10, hit: new Set(), spin: 0, done: false });
        ctx.sfx('quake');
      }
      for (const r of rocks) {
        if (r.done || time < r.rollAt) continue;
        if (r.y === shelfY - 10) ctx.sfx('rock-throw');
        r.y += ROCK_V * dt;
        r.spin += (ROCK_V / ROCK_R) * dt;
        const x = lanes[r.lane];
        for (const f of [player, npc]) {
          if (!alive(f) || r.hit.has(f) || onShelf(f)) continue;
          if (Math.abs(f.x - x) < LANE_HALF + 18 && Math.abs(f.y - r.y) < ROCK_R + 16) {
            r.hit.add(f);
            if (f === player) tk.hitPlayer(14, f.x, f.y); else ctx.hit(f, 14, f.x, f.y);
            ctx.nudge(f, f.x < x ? -50 : 50, 60);
            ctx.stun(f, 320);
            ctx.sfx('hit-heavy');
          }
        }
        if (r.y > H + ROCK_R) { r.done = true; puffs.push({ x, y: H - 30, at: time }); }
      }
      for (let i = rocks.length - 1; i >= 0; i--) if (rocks[i].done) rocks.splice(i, 1);
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.y += d.vy * dt; d.vy += 500 * dt; d.spin += dt * 8;
        if (time - d.at > 1400) debris.splice(i, 1);
      }
      while (puffs.length && time - puffs[0].at > 700) puffs.shift();
    },

    playerSpeedMult() { return alive(player) && player.y > H - 90 ? 0.7 : 1; },
    npcSpeedMult() { return alive(npc) && npc.y > H - 90 ? 0.7 : 1; },

    npcSeek() {
      // A sound stretch of ledge, away from yours.
      const now = ctx.scene.time.now;
      let best: Seg | null = null, bs = -Infinity;
      for (const s of segs) {
        if (s.hp < 0.35) continue;
        const cx = (s.x0 + s.x1) / 2;
        const sc = s.hp * 200 + Math.min(300, Math.abs(cx - player.x)) - Math.abs(cx - npc.x) * 0.3;
        if (sc > bs) { bs = sc; best = s; }
      }
      // Off a live lane first.
      for (const r of rocks) {
        const x = lanes[r.lane];
        if (now < r.rollAt + 1200 && Math.abs(npc.x - x) < LANE_HALF + 40 && !onShelf(npc)) {
          return { x: clamp(npc.x + (npc.x < x ? -110 : 110), 60, W - 60), y: npc.y };
        }
      }
      if (best) return { x: (best.x0 + best.x1) / 2, y: top + SHELF_H * 0.5 };
      return null;
    },

    drawGround(g, time) {
      // The lanes: chalk arrows down the slope, flaring while a boulder is coming.
      lanes.forEach((x, i) => {
        const live = rocks.some((r) => r.lane === i && !r.done);
        const warnK = rocks.reduce((m, r) => (r.lane === i && time < r.rollAt ? Math.max(m, (time - r.warnAt) / Math.max(1, r.rollAt - r.warnAt)) : m), 0);
        g.fillStyle(live ? 0xffd8a0 : 0x000000, live ? 0.06 + warnK * 0.14 : 0.06);
        g.fillRect(x - LANE_HALF, shelfY, LANE_HALF * 2, H - shelfY);
        for (let y = shelfY + 40; y < H - 40; y += 70) {
          g.lineStyle(2, CHALK, live ? 0.5 + warnK * 0.5 : 0.35);
          g.lineBetween(x - 9, y - 8, x, y + 2); g.lineBetween(x + 9, y - 8, x, y + 2); g.lineBetween(x, y - 18, x, y + 2);
        }
      });
      // The scree's runs sliding, and the general creep.
      screeFlow(g, { x: 0, y: shelfY, w: W, h: H - shelfY }, time / 1000, SLIDE, 50, 3);
      for (const r of runs) {
        g.fillStyle(GRANITE_DARK, 0.12); g.fillRect(r.x - r.w / 2, shelfY, r.w, H - shelfY);
        screeFlow(g, { x: r.x - r.w / 2, y: shelfY, w: r.w, h: H - shelfY }, time / 1000, RUN_SLIDE, 18, 7);
      }
      // The ledge: sound stone, cracking as it is stood on, a gap of falling scree where it went.
      for (const s of segs) {
        if (s.hp <= 0) {
          const k = clamp((time - s.fellAt) / REBUILD_MS, 0, 1);
          g.fillStyle(GRANITE_DARK, 0.5); g.fillRect(s.x0, top, segW, SHELF_H);
          screeFlow(g, { x: s.x0, y: top, w: segW, h: SHELF_H }, time / 1000, 140, 14, Math.floor(s.x0));
          // Settling back: the stone re-knits from the cliff down.
          g.fillStyle(SANDSTONE, 0.8 * k); g.fillRect(s.x0, top, segW, SHELF_H * k * 0.4);
          continue;
        }
        strataFace(g, s.x0, top, segW, SHELF_H, () => ((s.x0 * 13 + 7) % 97) / 97);
        g.fillStyle(SANDSTONE_DARK, 1); g.fillRect(s.x0, shelfY - 6, segW, 6);
        g.fillStyle(DUST_LIT, 0.4); g.fillRect(s.x0, shelfY - 8, segW, 2);
        // Cracks by how far gone it is.
        const cracks = Math.floor((1 - s.hp) * 6);
        for (let k = 0; k < cracks; k++) {
          const cx = s.x0 + 20 + ((k * 53) % (segW - 40));
          g.lineStyle(2, dim(SANDSTONE_DARK, 0.4), 0.9);
          g.lineBetween(cx, shelfY - 4, cx - 6, shelfY - 30); g.lineBetween(cx - 6, shelfY - 30, cx + 4, shelfY - 52);
        }
        if (s.hp < 0.35) {
          g.lineStyle(2, 0xffd8a0, 0.3 + Math.abs(Math.sin(time / 90)) * 0.4); g.strokeRect(s.x0 + 2, top + 2, segW - 4, SHELF_H - 4);
        }
      }
      // The bank at the foot.
      g.fillStyle(GRANITE, 0.18); g.fillRect(0, H - 90, W, 90);
      for (let x = 0; x < W; x += 28) { g.fillStyle(SANDSTONE, 0.25); g.fillEllipse(x + 14, H - 88, 30, 10); }
    },

    drawAir(g, time) {
      for (const r of rocks) {
        const x = lanes[r.lane];
        if (time < r.rollAt) {
          // Dust trickling over the lip, and the boulder rocking at the edge.
          const k = (time - r.warnAt) / Math.max(1, r.rollAt - r.warnAt);
          for (let i = 0; i < 6; i++) {
            const ph = ((time / 300) + i / 6) % 1;
            g.fillStyle(DUST, 0.6 * (1 - ph)); g.fillCircle(x - 14 + i * 6, shelfY + ph * 40, 2);
          }
          rollingBoulder(g, x + Math.sin(time / 50) * 3 * k, shelfY - 16, ROCK_R * 0.9, Math.sin(time / 80) * 0.3);
          continue;
        }
        // Bounding: it hops as it rolls.
        const hop = Math.abs(Math.sin((r.y - shelfY) / 60)) * 18;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(x, r.y + ROCK_R * 0.8, ROCK_R * 2, ROCK_R * 0.5);
        rollingBoulder(g, x, r.y - hop, ROCK_R, r.spin);
      }
      for (const p of puffs) dustPuff(g, p.x, p.y, (time - p.at) / 700, 40);
      for (const d of debris) shard(g, d.x, d.y, 4, d.spin, d.spin % 2 > 1 ? SANDSTONE : GRANITE);
      // Knee-deep at the foot: scree over the fighters' boots.
      for (const f of [player, npc]) {
        if (!alive(f) || f.y < H - 90) continue;
        for (let i = 0; i < 5; i++) { g.fillStyle(i % 2 ? GRANITE : SANDSTONE, 0.9); g.fillEllipse(f.x - 16 + i * 8, f.y + 16, 10, 6); }
      }
    },
  };
}

export const LANDSLIDE: GimmickDef = {
  id: 'stonehold-landslide',
  rules: 'The scree slides downhill, carrying you with it; boulders bound down the marked lanes. The ledge along the top is safe — but it crumbles under whoever stands on it.',
  make,
};
