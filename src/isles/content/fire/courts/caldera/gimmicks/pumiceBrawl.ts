import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { CAL, dist, makeClock } from '../palette';

/**
 * Pumice Brawl — Rhyo the Pumice Golem.
 *
 * Pumice is rock full of air: light enough to bounce. Big porous boulders carom round the
 * room off the walls and off each other, picking up a little speed on every bounce. One that
 * reaches a fighter clouts them and *shoves* them along its line; shoved into a wall, they
 * take the slam too.
 *
 * Rhyo is made of the stuff. He goes looking for a stone, catches it on his fist (it freezes
 * there for a beat with a dotted line showing where it is going) and bats it straight at you.
 * Every few seconds he also coughs a fresh boulder out of his chest. But batting costs him:
 * for a couple of seconds after a swing his arms are spent, and the stones clout *him* — so
 * the trick is to wait out his swing and stand where the next stone has to go through him.
 */

const STONE_R = 21;
const WALL_SLAM_PAD = 34;

interface Stone {
  x: number; y: number;
  vx: number; vy: number;
  spin: number;
  seed: number;
  holes: { a: number; r: number; s: number }[];
  /** Held on Rhyo's fist until this time, then fired along (hx, hy). */
  heldUntil: number;
  hx: number; hy: number;
  hit: Map<Fighter, number>;
  trail: Pt[];
}

export const pumiceBrawlGimmick: GimmickDef = {
  id: 'caldera-pumice',
  rules: 'Pumice boulders ricochet and shove whoever they hit — into walls hurts more. Rhyo bats them at you, then is open.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng, hard } = ctx;
    const tick = makeClock();
    const fx0 = 26, fx1 = W - 26, fy0 = top + 16, fy1 = H - 18;
    const maxStones = hard ? 4 : 3;
    const batCd = hard ? 2000 : 2600;
    const spitEvery = hard ? 5200 : 6800;
    const hitDmg = hard ? 12 : 11;
    const slamDmg = 8;
    const baseSpeed = 200;

    const stones: Stone[] = [];
    const makeStone = (x: number, y: number, a: number, speed: number): Stone => ({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, spin: 0, seed: Math.floor(rng() * 9999),
      holes: Array.from({ length: 9 }, () => ({ a: rng() * Math.PI * 2, r: rng() * 0.75, s: 1.5 + rng() * 2.6 })),
      heldUntil: 0, hx: 0, hy: 0, hit: new Map(), trail: [],
    });
    stones.push(makeStone(W * 0.3, top + 120, 0.6, baseSpeed));
    stones.push(makeStone(W * 0.7, H - 120, Math.PI + 0.7, baseSpeed));
    if (hard) stones.push(makeStone(W * 0.5, top + 80, 2.2, baseSpeed));

    let batReadyAt = 2000;
    let spitAt = -1;
    let spitAim: { a: number; until: number } | null = null;
    let nowT = 0;
    let started = false;

    const shove = (f: Fighter, s: Stone, now: number, who: 'player' | 'npc'): void => {
      const sp = Math.hypot(s.vx, s.vy) || 1;
      const ux = s.vx / sp, uy = s.vy / sp;
      ctx.hit(f, hitDmg, f.x, f.y);
      ctx.nudge(f, ux * 80, uy * 80);
      ctx.sfx('stone-slam');
      // Pinned against a wall: the slam lands too.
      if (f.x < fx0 + WALL_SLAM_PAD || f.x > fx1 - WALL_SLAM_PAD || f.y < fy0 + WALL_SLAM_PAD || f.y > fy1 - WALL_SLAM_PAD) {
        ctx.hit(f, slamDmg, f.x, f.y);
        ctx.float(f.x, f.y - 46, 'SLAMMED', who === 'player' ? '#ff9a7a' : '#ffe08a');
        ctx.sfx('hit-heavy');
      }
      // The stone caroms off the body.
      const nx = s.x - f.x, ny = s.y - f.y;
      const nl = Math.hypot(nx, ny) || 1;
      const dot = (s.vx * nx + s.vy * ny) / nl;
      s.vx -= 2 * dot * (nx / nl); s.vy -= 2 * dot * (ny / nl);
      s.hit.set(f, now);
    };

    const batOk = (now: number): boolean => now >= batReadyAt;

    return {
      update(time: number) {
        const dt = tick(time);
        nowT = time;
        if (!started) { started = true; batReadyAt = time + 2000; spitAt = time + spitEvery; }
        const n = ctx.npc;
        // Rhyo coughs up a fresh stone (telegraphed by an aim line from his chest).
        if (spitAim && time >= spitAim.until) {
          stones.push(makeStone(n.x + Math.cos(spitAim.a) * 36, n.y + Math.sin(spitAim.a) * 36, spitAim.a, 235));
          ctx.sfx('rock-throw');
          spitAim = null;
        }
        if (!spitAim && time >= spitAt) {
          spitAt = time + spitEvery;
          if (stones.length < maxStones && n.active && n.hp > 0) {
            spitAim = { a: Math.atan2(ctx.player.y - n.y, ctx.player.x - n.x), until: time + 650 };
            ctx.float(n.x, n.y - 54, 'HRRK', '#d8cfc0');
          }
        }
        for (const s of stones) {
          if (s.heldUntil > 0) {
            // On Rhyo's fist.
            s.x = n.x + s.hx * 34; s.y = n.y + s.hy * 34;
            if (time >= s.heldUntil) {
              s.heldUntil = 0;
              s.vx = s.hx * 330; s.vy = s.hy * 330;
              s.hit.set(n, time);
              ctx.sfx('whoosh');
            }
            continue;
          }
          s.x += s.vx * dt; s.y += s.vy * dt;
          s.spin += (Math.hypot(s.vx, s.vy) / STONE_R) * dt * (s.vx >= 0 ? 1 : -1);
          let bounced = false;
          if (s.x < fx0 + STONE_R) { s.x = fx0 + STONE_R; s.vx = Math.abs(s.vx); bounced = true; }
          if (s.x > fx1 - STONE_R) { s.x = fx1 - STONE_R; s.vx = -Math.abs(s.vx); bounced = true; }
          if (s.y < fy0 + STONE_R) { s.y = fy0 + STONE_R; s.vy = Math.abs(s.vy); bounced = true; }
          if (s.y > fy1 - STONE_R) { s.y = fy1 - STONE_R; s.vy = -Math.abs(s.vy); bounced = true; }
          const sp = Math.hypot(s.vx, s.vy) || 1;
          let target = sp;
          if (bounced) { target = Math.min(310, sp * 1.05); ctx.sfx('land'); }
          else target = sp + (baseSpeed - sp) * Math.min(1, dt * 0.25);
          s.vx *= target / sp; s.vy *= target / sp;
          s.trail.push({ x: s.x, y: s.y });
          if (s.trail.length > 10) s.trail.shift();
          // Fighters.
          for (const [f, who] of [[ctx.player, 'player'], [n, 'npc']] as [Fighter, 'player' | 'npc'][]) {
            if (!f.active || f.hp <= 0) continue;
            if (time - (s.hit.get(f) ?? -9999) < 650) continue;
            if (dist(s.x, s.y, f.x, f.y) > STONE_R + 20) continue;
            if (who === 'npc' && batOk(time)) {
              // Caught on the fist — and sent at you.
              const a = Math.atan2(ctx.player.y - n.y, ctx.player.x - n.x);
              s.heldUntil = time + 420; s.hx = Math.cos(a); s.hy = Math.sin(a);
              batReadyAt = time + batCd;
              ctx.float(n.x, n.y - 54, 'BATTER UP', '#ffe08a');
              ctx.sfx('clang');
              continue;
            }
            shove(f, s, time, who);
          }
        }
        // Stones knock off each other with a dull clack.
        for (let i = 0; i < stones.length; i++) {
          for (let j = i + 1; j < stones.length; j++) {
            const a = stones[i], b = stones[j];
            if (a.heldUntil || b.heldUntil) continue;
            const d = dist(a.x, a.y, b.x, b.y);
            if (d >= STONE_R * 2 || d < 0.01) continue;
            const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
            const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (rel <= 0) continue;
            a.vx -= rel * nx; a.vy -= rel * ny;
            b.vx += rel * nx; b.vy += rel * ny;
            const push = (STONE_R * 2 - d) / 2;
            a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
            ctx.sfx('rock-throw');
          }
        }
      },

      npcSeek(): Pt | null {
        if (!batOk(nowT)) return null;
        // Step into the path of the nearest loose stone, a beat ahead of it.
        const n = ctx.npc;
        let best: Pt | null = null;
        let bestD = 340;
        for (const s of stones) {
          if (s.heldUntil) continue;
          const ahead = { x: s.x + s.vx * 0.35, y: s.y + s.vy * 0.35 };
          const d = dist(n.x, n.y, ahead.x, ahead.y);
          if (d < bestD) { bestD = d; best = ahead; }
        }
        return best ? { x: Phaser.Math.Clamp(best.x, fx0 + 40, fx1 - 40), y: Phaser.Math.Clamp(best.y, fy0 + 40, fy1 - 40) } : null;
      },

      drawGround(g, time) {
        // Dust skids behind every stone, and its shadow.
        for (const s of stones) {
          for (let i = 0; i < s.trail.length; i++) {
            const q = s.trail[i];
            g.fillStyle(CAL.ashLight, (i / s.trail.length) * 0.18);
            g.fillCircle(q.x, q.y + 8, 6 + i * 0.8);
          }
          g.fillStyle(0x000000, 0.32); g.fillEllipse(s.x, s.y + 14, STONE_R * 2.1, STONE_R * 0.7);
        }
        // Rhyo's bat telegraph: a dotted line from the held stone to where it will go.
        for (const s of stones) {
          if (!s.heldUntil) continue;
          const k = 1 - Math.max(0, (s.heldUntil - time) / 420);
          for (let i = 1; i < 22; i++) {
            const d = i * 30;
            const x = s.x + s.hx * d, y = s.y + s.hy * d;
            if (x < 0 || x > W || y < top || y > H) break;
            g.fillStyle(0xffe08a, 0.35 + k * 0.5);
            g.fillCircle(x, y, 3 + k * 1.5);
          }
        }
        if (spitAim) {
          const n = ctx.npc;
          g.lineStyle(2, CAL.pumice, 0.5);
          for (let i = 1; i < 12; i++) {
            const d = i * 34;
            g.strokeCircle(n.x + Math.cos(spitAim.a) * d, n.y + Math.sin(spitAim.a) * d, 4);
          }
        }
      },

      drawAir(g, time) {
        for (const s of stones) {
          const held = s.heldUntil > 0;
          // The boulder: pale porous rock, pocked with holes that turn as it rolls.
          g.fillStyle(CAL.pumiceDark, 1); g.fillCircle(s.x, s.y, STONE_R + 2);
          g.fillStyle(CAL.pumice, 1); g.fillCircle(s.x - 1, s.y - 1, STONE_R);
          g.fillStyle(mixC(CAL.pumice, 0xffffff, 0.35), 0.8); g.fillEllipse(s.x - 6, s.y - 9, 14, 7);
          for (const h of s.holes) {
            const a = h.a + s.spin;
            const r = h.r * STONE_R * 0.85;
            const hx = s.x + Math.cos(a) * r, hy = s.y + Math.sin(a) * r * 0.9;
            const facing = 1 - (r / STONE_R) * 0.5;
            g.fillStyle(CAL.pumiceDark, 0.9); g.fillEllipse(hx, hy, h.s * 2 * facing, h.s * 1.6);
            g.fillStyle(0x4a4239, 0.8); g.fillCircle(hx + 0.5, hy + 0.5, h.s * 0.55);
          }
          if (held) {
            const k = (s.heldUntil - time) / 420;
            g.lineStyle(3, 0xffe08a, 0.5 + (1 - k) * 0.5);
            g.strokeCircle(s.x, s.y, STONE_R + 6 + k * 8);
          }
          // Speed lines on a fast stone.
          const sp = Math.hypot(s.vx, s.vy);
          if (!held && sp > 250) {
            const ux = s.vx / sp, uy = s.vy / sp;
            g.lineStyle(2, 0xf2eadf, 0.45);
            for (const o of [-10, 0, 10]) {
              g.lineBetween(s.x - ux * 26 - uy * o, s.y - uy * 26 + ux * o, s.x - ux * 44 - uy * o, s.y - uy * 44 + ux * o);
            }
          }
        }
      },

      drawHud(g, time) {
        // Rhyo's arm: a little fist icon over his head that greys out while his swing recovers.
        const n = ctx.npc;
        if (!n.active) return;
        const ready = batOk(time);
        const k = ready ? 1 : 1 - (batReadyAt - time) / batCd;
        const x = n.x, y = n.y - 70;
        g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 10);
        g.fillStyle(ready ? 0xffe08a : CAL.ash, 0.9); g.fillCircle(x, y, 7);
        if (!ready) {
          g.lineStyle(2, 0xffe08a, 0.9);
          g.beginPath(); g.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
        }
      },

      destroy() { stones.length = 0; },
    };
  },
};
