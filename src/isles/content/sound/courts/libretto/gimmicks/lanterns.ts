import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { paperLantern } from '../art';
import { GLOW, GLOW_LIT, OAK_DARK, PAPER_FOX } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Paper Lanterns — Lamplighter Wick.
 *
 * Wick lights the lantern-strings of Lantern Street every dusk, and he has let his lanterns
 * loose in here: cream paper globes drifting through the room on the warm air, unlit. Strike
 * one and it catches — it stops dead and hangs where it is, burning everyone who comes near it
 * until the paper is gone, and then it falls in a last shower of sparks. A lit lantern sets the
 * drifting ones beside it alight a moment later.
 *
 * Every so often Wick flicks his taper: a spark runs through the air to the lantern nearest *you*
 * and lights it. But fire belongs to whoever is standing next to it. Strike the lanterns that
 * drift past him; chain them round him; and keep moving out of your own.
 */

const BURN_R = 74;
const CATCH_R = 96;
const MAX_DRIFT = 7;

interface Lantern {
  x: number; y: number; vx: number; vy: number;
  state: 'drift' | 'lit' | 'ash';
  litAt: number;
  /** Set alight by a neighbour at this time (a moment's delay). */
  catchAt: number;
  ashAt: number;
  seed: number;
  t: StrikeTarget | null;
  ticks: Map<Fighter, number>;
}

interface Taper { to: Lantern; at: number; fromX: number; fromY: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const lanterns: Lantern[] = [];
  const burnMs = ctx.hard ? 8000 : 7000;
  const tick = ctx.hard ? 5 : 4;
  const taperEvery = ctx.hard ? 4800 : 6000;
  let nextSpawn = 0;
  let nextTaper = 0;
  let taper: Taper | null = null;
  let started = false;

  function light(l: Lantern, time: number, who: string): void {
    if (l.state !== 'drift') return;
    l.state = 'lit';
    l.litAt = time;
    l.vx = 0; l.vy = 0;
    l.t?.remove(); l.t = null;
    ctx.float(l.x, l.y - 34, who, '#ffc870');
    ctx.sfx('flame-burst');
  }

  function spawn(anywhere = false): void {
    const fromLeft = rng() < 0.5;
    const x = anywhere ? 120 + rng() * (W - 240) : fromLeft ? -20 : W + 20;
    const y = top + 70 + rng() * (H - top - 150);
    const sp = 26 + rng() * 18;
    const l: Lantern = {
      x, y, vx: (anywhere ? (rng() < 0.5 ? 1 : -1) : fromLeft ? 1 : -1) * sp, vy: (rng() - 0.5) * 16,
      state: 'drift', litAt: 0, catchAt: 0, ashAt: 0, seed: rng() * 10, t: null, ticks: new Map(),
    };
    l.t = ctx.target({
      x, y, r: 20,
      onStruck: (by) => light(l, ctx.scene.time.now, by === 'player' ? 'ALIGHT' : 'WICK LIGHTS IT'),
    });
    lanterns.push(l);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < 4; i++) spawn(true);
        nextSpawn = time + 2600;
        nextTaper = time + taperEvery;
      }
      if (time >= nextSpawn) {
        nextSpawn = time + 2600;
        if (lanterns.filter((l) => l.state === 'drift').length < MAX_DRIFT) spawn();
      }
      // Wick's taper: a spark to the lantern nearest you.
      if (!taper && time >= nextTaper && alive(npc)) {
        nextTaper = time + taperEvery;
        let best: Lantern | null = null;
        let bd = 300;
        for (const l of lanterns) { if (l.state !== 'drift') continue; const d = dist(l.x, l.y, player.x, player.y); if (d < bd) { bd = d; best = l; } }
        if (best) { taper = { to: best, at: time, fromX: npc.x, fromY: npc.y - 20 }; ctx.sfx('sizzle'); }
      }
      if (taper && time - taper.at > 950) { light(taper.to, time, 'THE TAPER'); taper = null; }

      for (let i = lanterns.length - 1; i >= 0; i--) {
        const l = lanterns[i];
        if (l.state === 'drift') {
          l.x += l.vx * dt;
          l.y += (l.vy + Math.sin(time / 700 + l.seed) * 10) * dt;
          if (l.y < top + 50 || l.y > H - 50) l.vy = -l.vy;
          l.y = clamp(l.y, top + 40, H - 40);
          l.t?.moveTo(l.x, l.y);
          if (l.catchAt && time >= l.catchAt) light(l, time, 'CATCHES');
          if (l.x < -60 || l.x > W + 60) { l.t?.remove(); lanterns.splice(i, 1); }
          continue;
        }
        if (l.state === 'lit') {
          // Burn whoever stands near it, both sides alike.
          for (const f of [player, npc]) {
            if (!alive(f) || dist(f.x, f.y, l.x, l.y) > BURN_R) continue;
            const last = l.ticks.get(f) ?? 0;
            if (time - last < 500) continue;
            l.ticks.set(f, time);
            ctx.hit(f, tick, f.x, f.y);
          }
          // Set the drifting neighbours going.
          for (const o of lanterns) {
            if (o.state === 'drift' && !o.catchAt && dist(o.x, o.y, l.x, l.y) < CATCH_R) o.catchAt = time + 900;
          }
          if (time - l.litAt > burnMs) {
            l.state = 'ash';
            l.ashAt = time;
            for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, l.x, l.y) < 60) ctx.hit(f, 7, l.x, l.y);
            ctx.sfx('explosion-small');
          }
          continue;
        }
        if (time - l.ashAt > 900) lanterns.splice(i, 1);
      }
    },

    npcSeek() {
      // Keep clear of anything burning; hang about where a drifting lantern is passing you.
      let tx = player.x, ty = player.y;
      let bd = Infinity;
      for (const l of lanterns) {
        if (l.state !== 'drift') continue;
        const d = dist(l.x, l.y, player.x, player.y);
        if (d < bd) { bd = d; tx = l.x; ty = l.y; }
      }
      const a = Math.atan2(ty - player.y, tx - player.x) + Math.PI;
      let x = player.x + Math.cos(a) * 230, y = player.y + Math.sin(a) * 200;
      for (const l of lanterns) {
        if (l.state !== 'lit') continue;
        const d = dist(l.x, l.y, x, y);
        if (d < BURN_R + 50) { x += ((x - l.x) / (d || 1)) * (BURN_R + 60 - d); y += ((y - l.y) / (d || 1)) * (BURN_R + 60 - d); }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const l of lanterns) {
        if (l.state === 'drift') { g.fillStyle(0x000000, 0.16); g.fillEllipse(l.x, l.y + 34, 22, 7); continue; }
        if (l.state === 'lit') {
          const k = clamp((time - l.litAt) / burnMs, 0, 1);
          g.fillStyle(GLOW, 0.1 + Math.sin(time / 90 + l.seed) * 0.03); g.fillCircle(l.x, l.y + 10, BURN_R);
          g.lineStyle(2, 0xff8a3a, 0.55);
          for (let i = 0; i < 16; i++) {
            const a0 = (i / 16) * Math.PI * 2 + time / 900;
            g.beginPath(); g.arc(l.x, l.y + 10, BURN_R, a0, a0 + 0.2, false); g.strokePath();
          }
          // The burn-out clock.
          g.lineStyle(3, 0xffd070, 0.6); g.beginPath(); g.arc(l.x, l.y + 10, BURN_R - 8, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2, false); g.strokePath();
        } else {
          const k = clamp((time - l.ashAt) / 900, 0, 1);
          g.fillStyle(0x2a1a10, 0.5 * (1 - k)); g.fillEllipse(l.x, l.y + 30, 34, 10);
        }
      }
      // Lit-to-be: a ring of smoke round a lantern a neighbour is setting going.
      for (const l of lanterns) {
        if (l.state !== 'drift' || !l.catchAt) continue;
        const k = clamp(1 - (l.catchAt - time) / 900, 0, 1);
        g.lineStyle(2, 0xff8a3a, 0.3 + k * 0.5); g.strokeCircle(l.x, l.y, 24 - k * 6);
      }
    },

    drawAir(g, time) {
      for (const l of lanterns) {
        if (l.state === 'drift') {
          g.lineStyle(1, OAK_DARK, 0.5); g.lineBetween(l.x, l.y - 18, l.x, l.y - 28);
          paperLantern(g, l.x, l.y, 13, 0);
          continue;
        }
        if (l.state === 'lit') {
          const k = clamp((time - l.litAt) / burnMs, 0, 1);
          paperLantern(g, l.x, l.y + Math.sin(time / 300 + l.seed) * 1.5, 13, 0.9 + Math.sin(time / 50 + l.seed) * 0.1, k);
          // Flames licking up through the holes, embers rising.
          for (let i = 0; i < 3 + Math.floor(k * 4); i++) {
            const a = l.seed + i * 2.1;
            const fx = l.x + Math.cos(a) * 7, fy = l.y - 4 + Math.sin(a) * 6;
            const h = 8 + Math.sin(time / 70 + i) * 4 + k * 8;
            g.fillStyle(0xff8a3a, 0.85); g.fillTriangle(fx - 4, fy, fx + 4, fy, fx, fy - h);
            g.fillStyle(GLOW_LIT, 0.8); g.fillTriangle(fx - 2, fy, fx + 2, fy, fx, fy - h * 0.6);
          }
          for (let i = 0; i < 6; i++) {
            const ph = ((time / 900) + i / 6 + l.seed) % 1;
            g.fillStyle(0xffb050, 1 - ph); g.fillCircle(l.x + Math.sin(ph * 9 + i) * 14, l.y - 20 - ph * 60, 1.6);
          }
          continue;
        }
        // Ash: the frame falling, the paper in flakes.
        const k = clamp((time - l.ashAt) / 900, 0, 1);
        if (k < 0.25) { g.fillStyle(0xffd070, 0.6 * (1 - k * 4)); g.fillCircle(l.x, l.y, 30 + k * 120); }
        for (let i = 0; i < 9; i++) {
          const a = i * 0.7 + l.seed;
          g.fillStyle(i % 3 ? 0x2a1a10 : PAPER_FOX, 1 - k);
          g.fillRect(l.x + Math.cos(a) * k * 40, l.y + Math.sin(a) * 10 + k * 34, 4, 3);
        }
        g.lineStyle(2, OAK_DARK, 1 - k); g.strokeEllipse(l.x, l.y + k * 28, 18, 6);
      }
      // The taper's spark, running on a dotted line from Wick.
      if (taper) {
        const k = clamp((time - taper.at) / 950, 0, 1);
        const tx = taper.to.x, ty = taper.to.y;
        for (let i = 0; i < 18; i++) {
          const t = i / 18;
          g.fillStyle(0xffb050, t < k ? 0.15 : 0.5); g.fillCircle(taper.fromX + (tx - taper.fromX) * t, taper.fromY + (ty - taper.fromY) * t - Math.sin(t * Math.PI) * 40, 1.6);
        }
        const sx = taper.fromX + (tx - taper.fromX) * k, sy = taper.fromY + (ty - taper.fromY) * k - Math.sin(k * Math.PI) * 40;
        g.fillStyle(GLOW_LIT, 1); g.fillCircle(sx, sy, 4);
        g.fillStyle(0xff8a3a, 0.5); g.fillCircle(sx, sy, 8);
        g.lineStyle(2, 0xff8a3a, 0.8); g.strokeCircle(tx, ty, 22);
      }
    },
  };
}

export const PAPER_LANTERNS: GimmickDef = {
  id: 'libretto-lanterns',
  rules: 'Strike a drifting lantern to light it: it hangs there and burns anyone near, then sets its neighbours going. Wick\'s taper lights the one nearest you.',
  make,
};
