import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { compassRose, ingot } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, IRON_DARK, NORTH, NORTH_LIT, SOUTH, SPARK } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Compass Rose — Navigator Bearing.
 *
 * The floor is the great compass rose of the Lodestar crossroads, and on its pin swings a needle
 * as long as a boat. It wanders, quivering; every few seconds it *settles* — swings round to one
 * fighter, holds, and fires a bolt down its north end, along the whole line, through anyone
 * standing on it.
 *
 * It settles on iron. Bars of it are dropped across the rose: walk over one and you carry it,
 * and the needle comes to *you*. That sounds bad, and it is half bad: the bar takes half the
 * bolt and is spent. The other half is the trick — the bolt runs the whole line from the pin, so
 * with iron in your pack, stand where Bearing is between you and the pin, and he takes it whole.
 * With nobody carrying, the needle takes whoever is nearest its point.
 */

const RAY_HALF = 24;
const BOLT_DMG = 14;
const SETTLE_MS = 1150;
const LOCK_MS = 350;
const MAX_INGOTS = 3;
const MAX_CARRY = 2;

interface Bar { x: number; y: number; bornAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const P: Pt = { x: W / 2, y: (top + H) / 2 + 10 };
  let needle = -Math.PI / 2;
  let swing = 0.7;
  let state: 'wander' | 'settle' | 'lock' = 'wander';
  let stateAt = 0;
  let target: Fighter | null = null;
  let nextSettle = 0;
  let boltAt = -9999;
  let boltA = 0;
  let nextBar = 0;
  let started = false;
  const bars: Bar[] = [];
  const carry = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const settleEvery = ctx.hard ? 4200 : 5200;

  const angleTo = (f: Fighter) => Math.atan2(f.y - P.y, f.x - P.x);
  const hurt = (f: Fighter, amount: number) => { if (f === player) tk.hitPlayer(amount, f.x, f.y); else ctx.hit(f, amount, f.x, f.y); };
  /** On the bolt's line: ahead of the pin along `a`, within the ray's half-width. */
  const onRay = (f: Fighter, a: number) => {
    const dx = f.x - P.x, dy = f.y - P.y;
    const along = dx * Math.cos(a) + dy * Math.sin(a);
    const perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
    return along > 20 && perp < RAY_HALF + 18;
  };

  function pickTarget(): Fighter | null {
    const live = [player, npc].filter(alive);
    if (!live.length) return null;
    const ci = (f: Fighter) => carry.get(f) ?? 0;
    const most = Math.max(...live.map(ci));
    const pool = most > 0 ? live.filter((f) => ci(f) === most) : live;
    return pool.reduce((b, f) => (Math.abs(wrapAngle(angleTo(f) - needle)) < Math.abs(wrapAngle(angleTo(b) - needle)) ? f : b), pool[0]);
  }

  function dropBar(time: number): void {
    for (let i = 0; i < 12; i++) {
      const a = rng() * Math.PI * 2, r = 130 + rng() * 220;
      const x = clamp(P.x + Math.cos(a) * r * 1.3, 60, W - 60), y = clamp(P.y + Math.sin(a) * r, top + 50, H - 40);
      if (bars.some((b) => dist(b.x, b.y, x, y) < 90)) continue;
      bars.push({ x, y, bornAt: time });
      ctx.sfx('anvil');
      return;
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSettle = time + 2600; nextBar = time + 600; }
      if (time >= nextBar) { nextBar = time + (ctx.hard ? 3000 : 3600); if (bars.length < MAX_INGOTS) dropBar(time); }

      // Picking up iron.
      for (let i = bars.length - 1; i >= 0; i--) {
        const b = bars[i];
        if (time - b.bornAt < 400) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || (carry.get(f) ?? 0) >= MAX_CARRY) continue;
          if (dist(b.x, b.y, f.x, f.y) < 34) {
            carry.set(f, (carry.get(f) ?? 0) + 1);
            bars.splice(i, 1);
            ctx.float(f.x, f.y - 48, 'IRON', '#c8d0e0');
            ctx.sfx('clang');
            break;
          }
        }
      }

      // The needle.
      if (state === 'wander') {
        swing += (rng() - 0.5) * dt * 3;
        swing = clamp(swing, -1.1, 1.1);
        needle = wrapAngle(needle + swing * dt);
        if (time >= nextSettle) {
          target = pickTarget();
          if (target) { state = 'settle'; stateAt = time; ctx.sfx('gear-turn'); ctx.float(P.x, P.y - 70, 'THE NEEDLE SETTLES', '#f0d48a'); }
          else nextSettle = time + 1000;
        }
      } else if (state === 'settle') {
        if (target && alive(target)) {
          const want = angleTo(target);
          const diff = wrapAngle(want - needle);
          needle = wrapAngle(needle + clamp(diff, -4 * dt, 4 * dt));
        }
        if (time - stateAt > tk.warn(SETTLE_MS)) { state = 'lock'; stateAt = time; ctx.sfx('beam-charge'); }
      } else if (state === 'lock') {
        if (time - stateAt > LOCK_MS) {
          boltAt = time;
          boltA = needle;
          ctx.sfx('thunder');
          for (const f of [player, npc]) {
            if (!alive(f) || !onRay(f, boltA)) continue;
            const c = carry.get(f) ?? 0;
            if (c > 0) {
              carry.set(f, c - 1);
              hurt(f, Math.round(BOLT_DMG / 2));
              ctx.float(f.x, f.y - 48, 'THE IRON TAKES IT', '#f0d48a');
            } else {
              hurt(f, BOLT_DMG);
              ctx.float(f.x, f.y - 48, 'TRUE NORTH', '#ff8a7a');
            }
          }
          state = 'wander';
          swing = (rng() < 0.5 ? -1 : 1) * 0.6;
          nextSettle = time + settleEvery;
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const mine = carry.get(npc) ?? 0, yours = carry.get(player) ?? 0;
      const pa = angleTo(player), pr = dist(P.x, P.y, player.x, player.y);
      // Carrying: stand behind you on the line, so the bolt goes through you to reach him.
      if (mine > yours) {
        const r = clamp(pr + 170, 180, 420);
        return { x: clamp(P.x + Math.cos(pa) * r, 60, W - 60), y: clamp(P.y + Math.sin(pa) * r, top + 50, H - 40) };
      }
      // Nobody carrying and you're not reaching for one: grab the nearest bar.
      if (yours === 0 && bars.length) {
        const b = bars.reduce((q, c) => (dist(c.x, c.y, npc.x, npc.y) < dist(q.x, q.y, npc.x, npc.y) ? c : q), bars[0]);
        if (dist(b.x, b.y, npc.x, npc.y) < 320) return { x: b.x, y: b.y };
      }
      // Otherwise stay well off the line the needle wants.
      const a = (target === player || yours > mine ? pa : needle) + Math.PI / 2;
      return { x: clamp(P.x + Math.cos(a) * 240, 60, W - 60), y: clamp(P.y + Math.sin(a) * 200, top + 50, H - 40) };
    },

    drawGround(g, time) {
      compassRose(g, P.x, P.y, 230, 0.78);
      // The settling line: where the bolt will run.
      if (state === 'settle' || state === 'lock') {
        const k = state === 'lock' ? 1 : clamp((time - stateAt) / tk.warn(SETTLE_MS), 0, 1);
        const ex = P.x + Math.cos(needle) * 1200, ey = P.y + Math.sin(needle) * 1200;
        g.lineStyle(RAY_HALF * 2, NORTH, 0.06 + k * 0.16); g.lineBetween(P.x, P.y, ex, ey);
        g.lineStyle(2, NORTH_LIT, 0.3 + k * 0.5); g.lineBetween(P.x + Math.cos(needle) * 140, P.y + Math.sin(needle) * 140, ex, ey);
        if (state === 'lock') {
          for (const off of [-1, 1]) {
            const nx = -Math.sin(needle) * RAY_HALF * off, ny = Math.cos(needle) * RAY_HALF * off;
            g.lineStyle(2, 0xffffff, 0.7); g.lineBetween(P.x + nx, P.y + ny, ex + nx, ey + ny);
          }
        }
      }
      // Bars of iron lying on the rose.
      for (const b of bars) {
        const k = clamp((time - b.bornAt) / 400, 0, 1);
        ingot(g, b.x, b.y - (1 - k) * 40, 1.1);
        if (k < 1) { g.fillStyle(0x000000, 0.25 * k); g.fillEllipse(b.x, b.y + 6, 30, 8); }
      }
    },

    drawAir(g, time) {
      // The needle: a long diamond, red to the north, blue to the south, on a brass pin.
      const L = 150, Wd = 13;
      const c = Math.cos(needle), s = Math.sin(needle);
      const quiver = state === 'lock' ? Math.sin(time / 15) * 0.02 : 0;
      const cq = Math.cos(needle + quiver), sq = Math.sin(needle + quiver);
      g.fillStyle(0x000000, 0.3);
      g.fillTriangle(P.x + cq * L + 6, P.y + sq * L + 10, P.x - sq * Wd + 6, P.y + cq * Wd + 10, P.x + sq * Wd + 6, P.y - cq * Wd + 10);
      g.fillStyle(NORTH, 1); g.fillTriangle(P.x + cq * L, P.y + sq * L, P.x - sq * Wd, P.y + cq * Wd, P.x + sq * Wd, P.y - cq * Wd);
      g.fillStyle(NORTH_LIT, 0.6); g.fillTriangle(P.x + cq * L, P.y + sq * L, P.x - sq * Wd * 0.4, P.y + cq * Wd * 0.4, P.x, P.y);
      g.fillStyle(SOUTH, 1); g.fillTriangle(P.x - cq * L * 0.8, P.y - sq * L * 0.8, P.x - sq * Wd, P.y + cq * Wd, P.x + sq * Wd, P.y - cq * Wd);
      g.fillStyle(lit(SOUTH, 0.3), 0.5); g.fillTriangle(P.x - cq * L * 0.8, P.y - sq * L * 0.8, P.x - sq * Wd * 0.4, P.y + cq * Wd * 0.4, P.x, P.y);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(P.x, P.y, 13);
      g.fillStyle(BRASS, 1); g.fillCircle(P.x, P.y - 1, 10);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(P.x - 3, P.y - 4, 3);
      if (state !== 'wander') glow(g, P.x + c * L, P.y + s * L, 24, NORTH_LIT, 0.08, 3);
      // The bolt.
      if (time - boltAt < 380) {
        const k = (time - boltAt) / 380;
        const ex = P.x + Math.cos(boltA) * 1200, ey = P.y + Math.sin(boltA) * 1200;
        g.lineStyle(RAY_HALF * 2 * (1 - k * 0.6), SPARK, 0.6 * (1 - k)); g.lineBetween(P.x, P.y, ex, ey);
        let px = P.x, py = P.y;
        for (let i = 1; i <= 14; i++) {
          const d = i * 80;
          const j = ((i * 37 + Math.floor(time / 30)) % 9 - 4) * 4;
          const nx = P.x + Math.cos(boltA) * d - Math.sin(boltA) * j, ny = P.y + Math.sin(boltA) * d + Math.cos(boltA) * j;
          g.lineStyle(3, 0xffffff, 1 - k); g.lineBetween(px, py, nx, ny);
          px = nx; py = ny;
        }
      }
      // What each fighter carries, stacked over their head.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const n = carry.get(f) ?? 0;
        for (let i = 0; i < n; i++) ingot(g, f.x, f.y - 56 - i * 10, 0.6);
        if (n > 0 && state !== 'wander' && target === f) {
          g.lineStyle(2, NORTH_LIT, 0.5 + Math.sin(time / 60) * 0.3); g.strokeCircle(f.x, f.y, 28);
        }
      }
      // A ring of iron dust on the rim, pointing where the needle points.
      g.lineStyle(1, IRON_DARK, 0.4); g.strokeCircle(P.x, P.y, 160);
    },
  };
}

export const COMPASS_ROSE: GimmickDef = {
  id: 'lodestar-compass-rose',
  rules: 'The needle settles on whoever carries iron (else the nearest) and fires down its whole line. Iron takes half the bolt — and anyone between you and the pin takes it all.',
  make,
};
