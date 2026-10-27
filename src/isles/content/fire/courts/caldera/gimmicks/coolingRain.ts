import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { CAL, dist, makeClock } from '../palette';

/**
 * Cooling Rain — Rainmaker Tull.
 *
 * Tull has smuggled weather into a volcano. Two small rainclouds (three in hard) wander the
 * floor; under one, the rain cools you — your skin crusts (you take less damage) but it is
 * heavy going (you walk slower). Everywhere *outside* the clouds the floor keeps bleeding
 * lava: cracks open, glow, and widen into pools that burn anyone standing in them. A cloud
 * passing over a pool quenches it in a burst of steam.
 *
 * Tull fights from under his clouds and, every so often, calls the nearest one to him. The
 * exploit: a cloud is thin. Every hit that lands on Tull while he is sheltering under it thins
 * it and blows it away from you; break it and it scatters, and he is standing in the lava
 * country with everyone else.
 */

const BASE_R = 94;
const MAX_POOLS = 9;
const POOL_TICK_MS = 450;

interface Cloud {
  x: number; y: number;
  tx: number; ty: number;
  r: number;
  speed: number;
  /** Called by Tull: hurrying until this time. */
  calledUntil: number;
  /** Scattered: reforms at this time. */
  goneUntil: number;
  /** Broken by blows; reforms elsewhere once `goneUntil` passes. */
  scattered: boolean;
  seed: number;
  lastThinAt: number;
}

interface Pool { x: number; y: number; r: number; maxR: number; bornAt: number; openAt: number; seed: number; quench: number }

export const coolingRainGimmick: GimmickDef = {
  id: 'caldera-rain',
  rules: 'Under a raincloud you take less damage but walk slower; outside, lava pools spread. Hit Tull under his cloud to break it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng, hard } = ctx;
    const tick = makeClock();
    const fx0 = 70, fx1 = W - 70, fy0 = top + 60, fy1 = H - 50;
    const randPt = (): Pt => ({ x: fx0 + rng() * (fx1 - fx0), y: fy0 + rng() * (fy1 - fy0) });
    const seedEvery = hard ? 1100 : 1500;
    const poolDmg = hard ? 7 : 6;
    let nowT = 0;

    const clouds: Cloud[] = [];
    for (let i = 0; i < (hard ? 3 : 2); i++) {
      const p = { x: W * (0.25 + i * 0.5 / Math.max(1, (hard ? 2 : 1))), y: top + 160 + i * 140 };
      const t = randPt();
      clouds.push({ x: p.x, y: p.y, tx: t.x, ty: t.y, r: BASE_R, speed: 42, calledUntil: 0, goneUntil: 0, scattered: false, seed: Math.floor(rng() * 9999), lastThinAt: 0 });
    }
    const pools: Pool[] = [];
    let seedAt = 1500;
    let callAt = 5000;
    let started = false;
    const lastBurn = new Map<Fighter, number>();

    const live = (c: Cloud): boolean => nowT >= c.goneUntil;
    const cloudOver = (x: number, y: number): Cloud | null => {
      for (const c of clouds) if (live(c) && dist(c.x, c.y, x, y) < c.r * 0.92) return c;
      return null;
    };

    return {
      update(time: number) {
        const dt = tick(time);
        nowT = time;
        if (!started) { started = true; seedAt = time + 1500; callAt = time + 5000; }
        // Clouds drift toward a wandering target; a called cloud hurries to Tull.
        for (const c of clouds) {
          if (!live(c)) continue;
          if (c.scattered) {
            // Reform somewhere far from Tull.
            c.scattered = false;
            let best = randPt();
            for (let k = 0; k < 6; k++) {
              const q = randPt();
              if (dist(q.x, q.y, ctx.npc.x, ctx.npc.y) > dist(best.x, best.y, ctx.npc.x, ctx.npc.y)) best = q;
            }
            c.x = best.x; c.y = best.y; c.tx = best.x; c.ty = best.y; c.r = BASE_R * 0.4;
            ctx.float(c.x, c.y - 120, 'the rain gathers', '#9cc6ea');
          }
          c.r = Math.min(BASE_R, c.r + 14 * dt);
          const called = time < c.calledUntil;
          if (called) { c.tx = ctx.npc.x; c.ty = ctx.npc.y; }
          const d = dist(c.x, c.y, c.tx, c.ty);
          if (d < 12 && !called) { const t = randPt(); c.tx = t.x; c.ty = t.y; }
          const sp = called ? 82 : c.speed;
          if (d > 1) { c.x += ((c.tx - c.x) / d) * sp * dt; c.y += ((c.ty - c.y) / d) * sp * dt; }
          c.x = Phaser.Math.Clamp(c.x, fx0, fx1); c.y = Phaser.Math.Clamp(c.y, fy0, fy1);
        }
        // Tull calls the rain.
        if (time >= callAt) {
          callAt = time + (hard ? 5200 : 6800);
          let near: Cloud | null = null;
          for (const c of clouds) if (live(c) && (!near || dist(c.x, c.y, ctx.npc.x, ctx.npc.y) < dist(near.x, near.y, ctx.npc.x, ctx.npc.y))) near = c;
          if (near && ctx.npc.active) {
            near.calledUntil = time + 2600;
            ctx.float(ctx.npc.x, ctx.npc.y - 50, 'Tull calls the rain', '#9cc6ea');
            ctx.sfx('rain');
          }
        }
        // The floor bleeds: new cracks open outside the clouds and widen into pools.
        if (time >= seedAt) {
          seedAt = time + seedEvery;
          for (let k = 0; k < 8; k++) {
            const q = randPt();
            if (cloudOver(q.x, q.y)) continue;
            if (dist(q.x, q.y, ctx.player.x, ctx.player.y) < 60) continue;
            if (pools.some((p) => dist(p.x, p.y, q.x, q.y) < p.r + 30)) continue;
            pools.push({ x: q.x, y: q.y, r: 10, maxR: 52 + rng() * 22, bornAt: time, openAt: time + 1000, seed: Math.floor(rng() * 9999), quench: 0 });
            if (pools.length > MAX_POOLS) pools.shift();
            break;
          }
        }
        for (let i = pools.length - 1; i >= 0; i--) {
          const p = pools[i];
          const c = cloudOver(p.x, p.y);
          if (c) {
            p.quench = Math.min(1, p.quench + dt * 2);
            p.r -= 34 * dt;
            if (p.quench > 0.2 && Math.floor(time / 300) !== Math.floor((time - dt * 1000) / 300)) ctx.sfx('sizzle');
            if (p.r < 8) { pools.splice(i, 1); ctx.float(p.x, p.y - 10, 'quenched', '#dfe6ea'); }
            continue;
          }
          p.quench = Math.max(0, p.quench - dt);
          if (time >= p.openAt) p.r = Math.min(p.maxR, p.r + 16 * dt);
        }
        // Pools burn whoever stands in them.
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active || f.hp <= 0) continue;
          const inPool = pools.some((p) => time >= p.openAt && dist(p.x, p.y, f.x, f.y) < p.r - 4);
          if (!inPool) continue;
          const last = lastBurn.get(f) ?? 0;
          if (time - last >= POOL_TICK_MS) { lastBurn.set(f, time); ctx.hit(f, poolDmg, f.x, f.y); }
        }
      },

      onNpcHurt() {
        const c = cloudOver(ctx.npc.x, ctx.npc.y);
        if (!c || nowT - c.lastThinAt < 160) return;
        c.lastThinAt = nowT;
        c.r -= BASE_R * 0.085;
        // The cloud tears away from the side the blow came from.
        const a = Math.atan2(c.y - ctx.player.y, c.x - ctx.player.x);
        c.x += Math.cos(a) * 14; c.y += Math.sin(a) * 14;
        c.tx = c.x + Math.cos(a) * 160; c.ty = c.y + Math.sin(a) * 160;
        c.calledUntil = 0;
        if (c.r < BASE_R * 0.5) {
          c.goneUntil = nowT + (hard ? 3600 : 4600);
          c.scattered = true;
          ctx.float(c.x, c.y - 30, 'CLOUD BROKEN', '#cfe4f5');
          ctx.sfx('gust');
          ctx.flash(c.x, c.y, CAL.steam);
        }
      },

      playerSpeedMult: () => (cloudOver(ctx.player.x, ctx.player.y) ? 0.8 : 1),
      npcSpeedMult: () => (cloudOver(ctx.npc.x, ctx.npc.y) ? 0.8 : 1),
      playerTakenMult: () => (cloudOver(ctx.player.x, ctx.player.y) ? 0.7 : 1),
      npcTakenMult: () => (cloudOver(ctx.npc.x, ctx.npc.y) ? 0.7 : 1),

      npcSeek(): Pt | null {
        if (cloudOver(ctx.npc.x, ctx.npc.y)) return null;
        let near: Cloud | null = null;
        for (const c of clouds) if (live(c) && (!near || dist(c.x, c.y, ctx.npc.x, ctx.npc.y) < dist(near.x, near.y, ctx.npc.x, ctx.npc.y))) near = c;
        return near ? { x: near.x, y: near.y } : null;
      },

      drawGround(g, time) {
        // Lava pools: first a hairline crack, then a widening molten mouth with a crust rim.
        for (const p of pools) {
          if (time < p.openAt) {
            const k = (time - p.bornAt) / (p.openAt - p.bornAt);
            g.lineStyle(2, CAL.lavaLit, 0.4 + k * 0.5);
            for (let i = 0; i < 3; i++) {
              const a = p.seed + i * 2.1;
              g.lineBetween(p.x, p.y, p.x + Math.cos(a) * 26 * k, p.y + Math.sin(a) * 14 * k);
            }
            g.fillStyle(CAL.lavaHot, 0.5 * k); g.fillCircle(p.x, p.y, 4);
            continue;
          }
          const q = p.quench;
          g.fillStyle(CAL.crust, 1); g.fillEllipse(p.x, p.y, p.r * 2 + 12, p.r * 1.2 + 8);
          g.fillStyle(mixC(CAL.lava, CAL.crustMid, q), 1); g.fillEllipse(p.x, p.y, p.r * 2, p.r * 1.2);
          g.fillStyle(mixC(CAL.lavaLit, CAL.crustLit, q), 0.8); g.fillEllipse(p.x - p.r * 0.15, p.y - p.r * 0.1, p.r * 1.1, p.r * 0.55);
          for (let i = 0; i < 3; i++) {
            const s = p.seed + i * 37;
            const ph = (time / 1100 + (s % 50) / 50) % 1;
            g.lineStyle(1.5, CAL.lavaHot, (1 - ph) * (1 - q));
            g.strokeEllipse(p.x + Math.sin(s) * p.r * 0.5, p.y + Math.cos(s) * p.r * 0.3, 4 + ph * 10, 2 + ph * 5);
          }
        }
        // Cloud shadows: the wet, cooled patch under each cloud, splashing.
        for (const c of clouds) {
          if (!live(c)) continue;
          g.fillStyle(CAL.rainDark, 0.42); g.fillEllipse(c.x, c.y, c.r * 2, c.r * 1.25);
          g.fillStyle(0x6f8aa3, 0.14); g.fillEllipse(c.x - c.r * 0.2, c.y - c.r * 0.1, c.r * 1.2, c.r * 0.6);
          g.lineStyle(2, 0x9cc6ea, 0.45); g.strokeEllipse(c.x, c.y, c.r * 2, c.r * 1.25);
          for (let i = 0; i < 10; i++) {
            const s = c.seed + i * 113;
            const ph = (time / 520 + (s % 37) / 37) % 1;
            const sx = c.x + Math.sin(s * 1.9) * c.r * 0.75, sy = c.y + Math.cos(s * 2.7) * c.r * 0.45;
            g.lineStyle(1.2, 0xcfe4f5, (1 - ph) * 0.7);
            g.strokeEllipse(sx, sy, 3 + ph * 14, 1.5 + ph * 6);
          }
        }
      },

      drawAir(g, time) {
        // Steam off quenching pools.
        for (const p of pools) {
          if (p.quench <= 0.05) continue;
          for (let i = 0; i < 4; i++) {
            const ph = (time / 700 + i / 4) % 1;
            g.fillStyle(CAL.steam, (1 - ph) * 0.35 * p.quench);
            g.fillCircle(p.x + Math.sin(time / 200 + i) * 10, p.y - ph * 50, 8 + ph * 12);
          }
        }
        // The clouds themselves, hanging over their shadows, raining down onto them.
        for (const c of clouds) {
          const reforming = !live(c);
          if (reforming) continue;
          const k = c.r / BASE_R;
          const cy = c.y - 118;
          for (let i = 0; i < 26; i++) {
            const s = c.seed + i * 59;
            const ph = (time / 380 + (s % 41) / 41) % 1;
            const rx = c.x + Math.sin(s * 1.3) * c.r * 0.8;
            const ry = cy + 20 + ph * 110;
            g.lineStyle(1.3, 0xa9cce8, 0.55);
            g.lineBetween(rx, ry, rx - 2, ry + 10);
          }
          const puffs = [[-0.55, 0.1, 0.42], [-0.2, -0.18, 0.5], [0.22, -0.12, 0.48], [0.55, 0.08, 0.4], [0, 0.12, 0.55]];
          for (const [ox, oy, rr] of puffs) {
            g.fillStyle(0x55687c, 0.85); g.fillCircle(c.x + ox * c.r, cy + oy * c.r * 0.6 + 6, rr * c.r * 0.62);
          }
          for (const [ox, oy, rr] of puffs) {
            g.fillStyle(mixC(0x8ea6bd, 0xdbe8f2, 0.3 + (1 - k) * 0.3), 0.92); g.fillCircle(c.x + ox * c.r, cy + oy * c.r * 0.6, rr * c.r * 0.56);
          }
          g.fillStyle(0xffffff, 0.35); g.fillCircle(c.x - c.r * 0.22, cy - c.r * 0.22, c.r * 0.16);
          // Thin cloud: tatters showing it is about to break.
          if (k < 0.8) {
            g.lineStyle(2, 0x2e4256, 0.6);
            g.lineBetween(c.x - c.r * 0.3, cy - 4, c.x + c.r * 0.1, cy + 10);
          }
        }
      },

      destroy() { pools.length = 0; lastBurn.clear(); },
    };
  },
};
