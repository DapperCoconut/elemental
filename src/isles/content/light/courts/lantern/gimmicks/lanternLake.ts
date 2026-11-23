import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { paperBoat, soulLantern, soulWisp } from '../art';
import { FOE, LAKE, LAKE_DEEP, LAKE_LIT, MINE, SOUL, SOUL_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Lantern Lake — Lantern-Diver Glimmer.
 *
 * The fight is waist-deep in the shallows of the Lantern Lake, where three channels of current
 * carry paper boats across, each with a soul-lantern on its deck. Wade up to a boat and touch its
 * lantern to free the soul: it orbits you, and the next blow that lands on you, it takes — the hit
 * is mostly soaked, and the soul flies off at whoever struck you as a homing wisp. Up to three.
 *
 * Glimmer collects them too, and she is a diver: every few seconds she ducks under and surfaces
 * beside the lantern boat furthest from you, in a splash that hurts anyone she comes up next to.
 * Freeing souls is a race — and a soul on her is a wisp coming back at you, so take hers first by
 * striking her before she has used them, or keep three of your own.
 */

const LANES = 3;
const BOAT_R = 30;
const ORBIT_R = 36;
const GRACE_MS = 320;
const SPLASH_R = 74;

interface Boat { x: number; y: number; vx: number; lane: number; lantern: boolean; sinkAt: number; seed: number }
interface Hold { souls: number; lastSpent: number; spin: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const MAX = 3;
  const laneY = Array.from({ length: LANES }, (_, i) => top + 90 + (i * (H - top - 150)) / (LANES - 1));
  const boats: Boat[] = [];
  const holds = new Map<Fighter, Hold>([[player, { souls: 0, lastSpent: -9999, spin: 0 }], [npc, { souls: 0, lastSpent: -9999, spin: Math.PI }]]);
  const spawnEvery = ctx.hard ? 1700 : 2200;
  const diveEvery = ctx.hard ? 7200 : 9000;
  const DIVE_WARN = 950;
  let nextBoat = 0;
  let nextDive = 0;
  let diveTo: { x: number; y: number; at: number } | null = null;
  let splashFx: { x: number; y: number; at: number }[] = [];
  let started = false;
  let now = 0;

  function spawnBoat(atX?: number): void {
    const lane = Math.floor(rng() * LANES);
    const dir = lane % 2 === 0 ? 1 : -1;
    const speed = (ctx.hard ? 70 : 56) + rng() * 18;
    boats.push({
      x: atX ?? (dir > 0 ? -30 : W + 30), y: laneY[lane] + (rng() - 0.5) * 18, vx: dir * speed, lane,
      lantern: true, sinkAt: 0, seed: rng() * 10,
    });
  }

  /** Free the soul from a boat into a fighter's keeping. */
  function take(f: Fighter, b: Boat): void {
    const h = holds.get(f);
    if (!h || h.souls >= MAX) return;
    b.lantern = false;
    b.sinkAt = now + 2600;
    h.souls++;
    ctx.float(b.x, b.y - 40, f === player ? 'SOUL FREED' : 'GLIMMER TAKES IT', f === player ? '#ffe2a0' : '#d8c8ff');
    ctx.sfx('sparkle');
  }

  /** A soul takes a blow for its keeper and flies at the other fighter. */
  function spend(f: Fighter): void {
    const h = holds.get(f);
    if (!h || h.souls <= 0 || now - h.lastSpent < GRACE_MS) return;
    h.souls--;
    h.lastSpent = now;
    const other = f === player ? npc : player;
    const a = Math.atan2(other.y - f.y, other.x - f.x);
    const dmg = ctx.hard ? 11 : 9;
    if (f === player) tk.spawnBullet({ x: f.x, y: f.y - 10, angle: a, speed: 300, damage: dmg, r: 8, turn: 3.2, lifeMs: 2600, color: SOUL_LIT, hits: [npc] });
    else tk.spawnBullet({ x: f.x, y: f.y - 10, angle: a, speed: 260, damage: dmg - 2, r: 8, turn: 2.4, lifeMs: 2600, color: SOUL });
    ctx.float(f.x, f.y - 50, 'THE SOUL TAKES IT', '#bfe6ff');
    ctx.sfx('wings');
  }

  const takenMult = (f: Fighter): number => {
    const h = holds.get(f);
    if (!h) return 1;
    return h.souls > 0 || now - h.lastSpent < GRACE_MS ? 0.25 : 1;
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!started) {
        started = true;
        nextBoat = time + 400;
        nextDive = time + diveEvery;
        for (let i = 0; i < 3; i++) spawnBoat(W * (0.2 + i * 0.3));
      }
      if (time >= nextBoat) {
        nextBoat = time + spawnEvery;
        if (boats.filter((b) => b.lantern).length < (ctx.hard ? 7 : 6)) spawnBoat();
      }
      for (let i = boats.length - 1; i >= 0; i--) {
        const b = boats[i];
        b.x += b.vx * dt;
        b.y += Math.sin(time / 700 + b.seed) * 6 * dt;
        if (b.x < -60 || b.x > W + 60 || (b.sinkAt && time > b.sinkAt)) { boats.splice(i, 1); continue; }
        if (!b.lantern) continue;
        for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, b.x, b.y - 10) < BOAT_R + 8) { take(f, b); break; }
      }
      for (const [, h] of holds) h.spin += dt * 2.4;

      // Glimmer's dive.
      if (!diveTo && time >= nextDive - DIVE_WARN && alive(npc) && alive(player)) {
        let best: Boat | null = null;
        let bd = -1;
        for (const b of boats) {
          if (!b.lantern || b.x < 60 || b.x > W - 60) continue;
          const d = dist(b.x, b.y, player.x, player.y);
          if (d > bd) { bd = d; best = b; }
        }
        const tx = best ? best.x + best.vx * (DIVE_WARN / 1000) : clamp(W - player.x, 80, W - 80);
        const ty = best ? best.y : clamp(H + top - player.y, top + 60, H - 50);
        diveTo = { x: clamp(tx, 60, W - 60), y: clamp(ty + 14, top + 50, H - 40), at: time + DIVE_WARN };
        ctx.banner('GLIMMER DIVES', '#bfe6ff');
        ctx.sfx('splash');
        splashFx.push({ x: npc.x, y: npc.y, at: time });
      }
      if (diveTo && time >= diveTo.at) {
        const d = diveTo;
        diveTo = null;
        nextDive = time + diveEvery;
        if (alive(npc)) {
          ctx.nudge(npc, d.x - npc.x, d.y - npc.y);
          splashFx.push({ x: d.x, y: d.y, at: time });
          ctx.sfx('geyser');
          if (alive(player) && dist(player.x, player.y, d.x, d.y) < SPLASH_R) {
            ctx.hit(player, ctx.hard ? 12 : 9, player.x, player.y);
            ctx.nudge(player, (player.x - d.x) * 0.6, (player.y - d.y) * 0.6);
          }
        }
      }
      splashFx = splashFx.filter((s) => time - s.at < 700);
    },

    onPlayerHurt() { spend(player); },
    onNpcHurt() { spend(npc); },
    playerTakenMult: () => takenMult(player),
    npcTakenMult: () => takenMult(npc),

    npcSeek() {
      const h = holds.get(npc);
      if (h && h.souls < MAX) {
        let best: Boat | null = null;
        let bd = Infinity;
        for (const b of boats) {
          if (!b.lantern) continue;
          const lead = b.x + b.vx * 0.8;
          if (lead < 30 || lead > W - 30) continue;
          const d = dist(npc.x, npc.y, lead, b.y) + dist(player.x, player.y, lead, b.y) * 0.25;
          if (d < bd) { bd = d; best = b; }
        }
        if (best) return { x: clamp(best.x + best.vx * 0.8, 60, W - 60), y: clamp(best.y, top + 40, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 220, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The shallows over the whole floor, and the three deeper channels of current.
      g.fillStyle(LAKE, 0.22); g.fillRect(0, top, W, H - top);
      for (const y of laneY) {
        g.fillStyle(LAKE_DEEP, 0.32); g.fillRect(0, y - 34, W, 68);
        g.fillStyle(LAKE_DEEP, 0.2); g.fillRect(0, y - 44, W, 88);
        for (let i = 0; i < 10; i++) {
          const ph = ((time / 3200) + i * 0.1) % 1;
          const dir = laneY.indexOf(y) % 2 === 0 ? 1 : -1;
          const x = dir > 0 ? ph * W : W - ph * W;
          g.lineStyle(1.2, LAKE_LIT, 0.35 * Math.sin(ph * Math.PI));
          g.lineBetween(x, y + ((i * 13) % 50) - 25, x - dir * 30, y + ((i * 13) % 50) - 25);
        }
      }
      // Ripples round each fighter as they wade.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const ph = (time / 900) % 1;
        g.lineStyle(1.2, LAKE_LIT, 0.4 * (1 - ph)); g.strokeEllipse(f.x, f.y + 8, 30 + ph * 40, 10 + ph * 14);
      }
      // The lantern-light on the water under each boat.
      for (const b of boats) if (b.lantern) { g.fillStyle(SOUL, 0.16); g.fillEllipse(b.x, b.y + 12, 70, 18); }
      // Where Glimmer will come up: bubbles rising, a ring tightening.
      if (diveTo) {
        const k = clamp(1 - (diveTo.at - time) / DIVE_WARN, 0, 1);
        g.lineStyle(2, LAKE_LIT, 0.4 + k * 0.5); g.strokeCircle(diveTo.x, diveTo.y, SPLASH_R * (1.4 - k * 0.4));
        g.fillStyle(LAKE_DEEP, 0.25 + k * 0.2); g.fillCircle(diveTo.x, diveTo.y, SPLASH_R);
        for (let i = 0; i < 7; i++) {
          const ph = ((time / 400) + i / 7) % 1;
          g.fillStyle(LAKE_LIT, 0.7 * (1 - ph)); g.fillCircle(diveTo.x + Math.cos(i * 2.3) * 30, diveTo.y + Math.sin(i * 2.3) * 18 - ph * 10, 2 + ph * 2);
        }
      }
    },

    drawAir(g, time) {
      for (const b of boats) {
        const sink = b.sinkAt ? clamp(1 - (b.sinkAt - time) / 2600, 0, 1) : 0;
        paperBoat(g, b.x, b.y + sink * 6, 1, b.vx > 0 ? 1 : -1, sink);
        if (b.lantern) {
          soulLantern(g, b.x + (b.vx > 0 ? 1 : -1) * 2, b.y - 40, 0.95, 1, time / 1000);
          g.lineStyle(1, SOUL_LIT, 0.25 + Math.sin(time / 200 + b.seed) * 0.15); g.strokeCircle(b.x, b.y - 18, BOAT_R + 4);
        }
      }
      // Each keeper's souls, circling: a gold ring under yours, violet under Glimmer's.
      for (const [f, h] of holds) {
        if (!alive(f) || h.souls <= 0) continue;
        const ring = f === player ? MINE : FOE;
        for (let i = 0; i < h.souls; i++) {
          const a = h.spin + (i / h.souls) * Math.PI * 2;
          const x = f.x + Math.cos(a) * ORBIT_R, y = f.y - 8 + Math.sin(a) * ORBIT_R * 0.55;
          g.lineStyle(1.5, ring, 0.7); g.strokeCircle(x, y, 9);
          soulWisp(g, x, y, 6, time / 1000 + i, SOUL, 0.95, false, a + Math.PI / 2);
        }
      }
      // Splashes: a crown of water and spray.
      for (const s of splashFx) {
        const k = (time - s.at) / 700;
        g.lineStyle(3 * (1 - k), LAKE_LIT, 1 - k); g.strokeEllipse(s.x, s.y + 6, 30 + k * 110, 12 + k * 40);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const r = 14 + k * 50;
          g.fillStyle(lit(LAKE_LIT, 0.4), 1 - k); g.fillCircle(s.x + Math.cos(a) * r, s.y - Math.sin(k * Math.PI) * 30 + Math.sin(a) * r * 0.4, 3);
        }
      }
    },

    drawHud(g) {
      for (const [f, x, d] of [[player, 24, 1], [npc, W - 24, -1]] as [Fighter, number, number][]) {
        const h = holds.get(f);
        if (!h) continue;
        for (let i = 0; i < MAX; i++) {
          const cx = x + d * i * 26, cy = top + 22;
          g.fillStyle(0x000000, 0.4); g.fillCircle(cx, cy + 8, 12);
          if (i < h.souls) { glow(g, cx, cy + 8, 14, SOUL, 0.08, 2); soulLantern(g, cx, cy - 4, 0.75, 1, 0); }
          else soulLantern(g, cx, cy - 4, 0.75, 0, 0);
        }
        g.lineStyle(2, f === player ? MINE : FOE, 0.8); g.lineBetween(x - 10 * d, top + 40, x + d * (MAX * 26 - 16), top + 40);
      }
    },
  };
}

export const LANTERN_LAKE: GimmickDef = {
  id: 'lantern-lantern-lake',
  rules: 'Touch a boat\'s lantern to free its soul. Each soul takes a hit for you, then flies at your foe. Glimmer dives for them too.',
  make,
};
