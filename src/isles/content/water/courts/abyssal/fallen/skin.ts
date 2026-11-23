import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ABY, alive, clamp, dist, drawFish } from '../palette';

/**
 * Patch the Skin — Sealwright Fen's fight (the mender who sealed the houses that were left under).
 *
 * The arena's four walls are the skin of the city's bubble, and the trench sea leans on it from
 * outside. Any shot that strikes the skin **punctures** it — either side's — and the skin gives
 * on its own now and then. A puncture **weeps** first (drips and a faint lane show where it will
 * go), then fires a **jet**: a hard bar of seawater straight across the room that hurts and
 * shoves whoever is in it, and it keeps firing on a beat until someone seals it. Strike a
 * puncture to **seal** it with a gout of wax.
 *
 * The exploit is aim: a missed shot is a hole behind your foe. Fire past Fen into the wall at
 * his back and the jet comes through where he stands. Fen walks the walls sealing, and will
 * happily shoot holes behind you.
 *
 * Halfway **the skin thins**: the bubble shrinks a stride in from every wall, and the strip
 * beyond it is open sea — cold, slow, and hurting.
 */

const ID = fallenId('abyssal', 'skin');
const WEEP_MS = 1200;
const JET_MS = 1900;
const REST_MS = 2300;
const JET_HALF = 24;
const JET_DMG = 8;
const JET_TICK = 420;
const JET_PUSH = 150;
const MAX_HOLES = 6;
const SELF_TEAR_MS = 5200;
const SHRINK = 58;
const SEA_DMG = 7;

type G = Parameters<NonNullable<EncounterGimmick['drawGround']>>[0];
type Side = 'n' | 's' | 'e' | 'w';

interface Hole { side: Side; u: number; phase: 'weep' | 'jet' | 'rest'; since: number; target: StrikeTarget | null; hitAt: Map<Fighter, number> }
interface Seal { x: number; y: number; at: number }

export const SKIN: GimmickDef = {
  id: ID,
  rules: 'Shots that hit the bubble wall tear it; each hole weeps, then jets seawater across the room. Strike a hole to seal it. At half, it shrinks.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const holes: Hole[] = [];
    const seals: Seal[] = [];
    const seaAt = new Map<Fighter, number>([[ctx.player, 0], [ctx.npc, 0]]);
    let inset = 0;
    let thin = false;
    let now = 0;
    let tearAt = -1;

    /** Where a hole sits on the skin (u = 0..1 along its wall), and the inward normal. */
    const geo = (h: Hole): { x: number; y: number; nx: number; ny: number } => {
      const L = inset, R = W - inset, T = top + inset, B = H - inset;
      switch (h.side) {
        case 'n': return { x: L + (R - L) * h.u, y: T, nx: 0, ny: 1 };
        case 's': return { x: L + (R - L) * h.u, y: B, nx: 0, ny: -1 };
        case 'w': return { x: L, y: T + (B - T) * h.u, nx: 1, ny: 0 };
        default: return { x: R, y: T + (B - T) * h.u, nx: -1, ny: 0 };
      }
    };
    const inLane = (h: Hole, f: Fighter): boolean => {
      const g0 = geo(h);
      const along = (f.x - g0.x) * g0.nx + (f.y - g0.y) * g0.ny;
      const across = Math.abs((f.x - g0.x) * -g0.ny + (f.y - g0.y) * g0.nx);
      return along > -10 && across < JET_HALF + 20;
    };
    const inSea = (f: Fighter): boolean => thin && (f.x < inset || f.x > W - inset || f.y < top + inset || f.y > H - inset);

    const tear = (side: Side, u: number): void => {
      if (holes.length >= MAX_HOLES) return;
      const uu = clamp(u, 0.08, 0.92);
      if (holes.some((h) => h.side === side && Math.abs(h.u - uu) < 0.09)) return;
      const h: Hole = { side, u: uu, phase: 'weep', since: now, target: null, hitAt: new Map() };
      const g0 = geo(h);
      h.target = ctx.target({
        x: g0.x + g0.nx * 22, y: g0.y + g0.ny * 22, r: 22,
        onStruck: () => {
          const i = holes.indexOf(h);
          if (i < 0) return;
          holes.splice(i, 1);
          h.target?.remove(); h.target = null;
          const p = geo(h);
          seals.push({ x: p.x, y: p.y, at: now });
          ctx.sfx('sizzle');
        },
      });
      ctx.sfx('bubble');
    };

    return {
      update(time: number, dtIn: number) {
        const dt = Math.min(0.05, dtIn);
        now = time;
        if (tearAt < 0) tearAt = time + 2200;
        if (!thin && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          thin = true;
          ctx.banner('THE SKIN THINS', '#9fe4ff');
          ctx.sfx('frost-blast');
        }
        inset = thin ? Math.min(SHRINK, inset + dt * 40) : 0;
        for (const h of holes) { const p = geo(h); h.target?.moveTo(p.x + p.nx * 22, p.y + p.ny * 22); }
        // Shots that reach the skin tear it — and are spent on it.
        const probes: [number, number, Side, (x: number, y: number) => number][] = [];
        for (let x = 60; x < W; x += 110) {
          probes.push([x, top + inset + 18, 'n', (sx) => (sx - inset) / (W - inset * 2)]);
          probes.push([x, H - inset - 18, 's', (sx) => (sx - inset) / (W - inset * 2)]);
        }
        for (let y = top + 60; y < H; y += 110) {
          probes.push([inset + 18, y, 'w', (_sx, sy) => (sy - top - inset) / (H - top - inset * 2)]);
          probes.push([W - inset - 18, y, 'e', (_sx, sy) => (sy - top - inset) / (H - top - inset * 2)]);
        }
        for (const [px, py, side, toU] of probes) {
          for (const s of ctx.shotsNear(px, py, 62)) {
            const d = side === 'n' ? s.y - (top + inset) : side === 's' ? H - inset - s.y : side === 'w' ? s.x - inset : W - inset - s.x;
            if (d > 24) continue;
            s.block();
            tear(side, toU(s.x, s.y));
          }
        }
        if (time >= tearAt) {
          tearAt = time + SELF_TEAR_MS * (thin ? 0.75 : 1);
          if (holes.length < 3) {
            const sides: Side[] = ['n', 's', 'e', 'w'];
            tear(sides[Math.floor(ctx.rng() * 4)], 0.15 + ctx.rng() * 0.7);
          }
        }
        for (const h of holes) {
          const dur = h.phase === 'weep' ? WEEP_MS : h.phase === 'jet' ? JET_MS : REST_MS;
          if (time - h.since >= dur) {
            h.phase = h.phase === 'weep' ? 'jet' : h.phase === 'jet' ? 'rest' : 'weep';
            h.since = time;
            if (h.phase === 'jet') ctx.sfx('water-jet');
          }
          if (h.phase !== 'jet') continue;
          const p = geo(h);
          for (const f of [ctx.player, ctx.npc]) {
            if (!alive(f) || ctx.isAirborne(f) || !inLane(h, f)) continue;
            ctx.nudge(f, p.nx * JET_PUSH * dt, p.ny * JET_PUSH * dt);
            if (time >= (h.hitAt.get(f) ?? 0)) { h.hitAt.set(f, time + JET_TICK); ctx.hit(f, JET_DMG, f.x, f.y); }
          }
        }
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || !inSea(f) || time < (seaAt.get(f) ?? 0)) continue;
          seaAt.set(f, time + 500);
          ctx.hit(f, SEA_DMG, f.x, f.y);
          if (f === ctx.player) ctx.sfx('status-freeze');
        }
        while (seals.length && time - seals[0].at > 3200) seals.shift();
      },

      playerSpeedMult: () => (inSea(ctx.player) ? 0.55 : 1),
      npcSpeedMult: () => (inSea(ctx.npc) ? 0.55 : 1),

      npcSeek() {
        const n = ctx.npc;
        // Out of the open sea first.
        if (inSea(n)) return { x: clamp(n.x, inset + 60, W - inset - 60), y: clamp(n.y, top + inset + 60, H - inset - 60) };
        // Out of any lane that is jetting or about to.
        for (const h of holes) {
          if (h.phase === 'rest' || !inLane(h, n)) continue;
          const p = geo(h);
          const side = (n.x - p.x) * -p.ny + (n.y - p.y) * p.nx >= 0 ? 1 : -1;
          return { x: n.x + -p.ny * side * 90, y: n.y + p.nx * side * 90 };
        }
        // Then go and seal the nearest hole — from beside its lane, not in front of it.
        let best: Hole | null = null;
        for (const h of holes) {
          const p = geo(h);
          if (!best) { best = h; continue; }
          const q = geo(best);
          if (dist(n.x, n.y, p.x, p.y) < dist(n.x, n.y, q.x, q.y)) best = h;
        }
        if (!best) return null;
        const p = geo(best);
        return { x: p.x + p.nx * 40 + -p.ny * 54, y: p.y + p.ny * 40 + p.nx * 54 };
      },

      drawGround(g, time) {
        const t = time / 1000;
        if (inset > 1) {
          // Beyond the thinned skin: open trench sea, with the deep's fish drifting past.
          g.fillStyle(ABY.deep, 0.75);
          g.fillRect(0, top, W, inset); g.fillRect(0, H - inset, W, inset);
          g.fillRect(0, top + inset, inset, H - top - inset * 2); g.fillRect(W - inset, top + inset, inset, H - top - inset * 2);
          for (let i = 0; i < 6; i++) {
            const x = ((t * 30 + i * 170) % (W + 60)) - 30;
            drawFish(g, x, i % 2 ? top + inset * 0.5 : H - inset * 0.5, 0, 7, 0x1a2a3a, ABY.photo, 0.7);
          }
        }
        for (const h of holes) {
          const p = geo(h);
          const tx = -p.ny, ty = p.nx;
          const len = h.side === 'n' || h.side === 's' ? H - top - inset * 2 : W - inset * 2;
          if (h.phase === 'weep') {
            // The lane it will fire down, faintly, with chevrons running inward.
            const k = (now - h.since) / WEEP_MS;
            g.lineStyle(1.5, ABY.membrane, 0.2 + k * 0.45);
            g.lineBetween(p.x + tx * JET_HALF, p.y + ty * JET_HALF, p.x + tx * JET_HALF + p.nx * len, p.y + ty * JET_HALF + p.ny * len);
            g.lineBetween(p.x - tx * JET_HALF, p.y - ty * JET_HALF, p.x - tx * JET_HALF + p.nx * len, p.y - ty * JET_HALF + p.ny * len);
            for (let s = ((t * 120) % 60) + 30; s < len; s += 60) {
              const cx = p.x + p.nx * s, cy = p.y + p.ny * s;
              g.lineStyle(2, ABY.membrane, 0.25 + k * 0.3);
              g.lineBetween(cx + tx * 10 - p.nx * 8, cy + ty * 10 - p.ny * 8, cx, cy);
              g.lineBetween(cx - tx * 10 - p.nx * 8, cy - ty * 10 - p.ny * 8, cx, cy);
            }
          } else if (h.phase === 'rest') {
            // Spent: a puddle spreading at the foot of the hole.
            g.fillStyle(ABY.membraneDim, 0.3); g.fillEllipse(p.x + p.nx * 26, p.y + p.ny * 26, 50, 30);
          }
        }
        for (const s of seals) {
          // A wax seal pressed over a mended hole, cooling from amber to brown.
          const k = clamp((now - s.at) / 3200, 0, 1);
          const c = mixC(0xffb04a, 0x7a4a26, k);
          g.fillStyle(c, 1 - k * 0.5); g.fillCircle(s.x, s.y, 13);
          for (let i = 0; i < 7; i++) { const a = i * 0.9; g.fillCircle(s.x + Math.cos(a) * 12, s.y + Math.sin(a) * 12, 4); }
          g.lineStyle(1.5, mixC(c, 0x000000, 0.4), 1 - k * 0.5); g.strokeCircle(s.x, s.y, 7);
          g.lineBetween(s.x - 4, s.y, s.x + 4, s.y); g.lineBetween(s.x, s.y - 4, s.x, s.y + 4);
        }
      },

      drawAir(g, time) {
        const t = time / 1000;
        // The skin itself: a wobbling membrane just inside each wall, with light sliding along it.
        const L = inset, R = W - inset, T = top + inset, B = H - inset;
        const edge = (ax: number, ay: number, bx: number, by: number, ph: number): void => {
          const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
          g.lineStyle(3, ABY.membraneDim, 0.7); g.beginPath();
          for (let s = 0; s <= len; s += 16) {
            const w = Math.sin(s / 34 + t * 2 + ph) * 2.5;
            const x = ax + ux * s - uy * w, y = ay + uy * s + ux * w;
            if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.strokePath();
          const glint = ((t * 140 + ph * 200) % len);
          g.lineStyle(2, 0xffffff, 0.45); g.lineBetween(ax + ux * glint, ay + uy * glint, ax + ux * (glint + 40), ay + uy * (glint + 40));
        };
        edge(L + 4, T + 4, R - 4, T + 4, 0); edge(R - 4, T + 4, R - 4, B - 4, 1); edge(R - 4, B - 4, L + 4, B - 4, 2); edge(L + 4, B - 4, L + 4, T + 4, 3);
        for (const h of holes) {
          const p = geo(h);
          const tx = -p.ny, ty = p.nx;
          // The tear: a ragged slit with its lips curled inward.
          g.fillStyle(ABY.abyss, 1);
          g.fillTriangle(p.x + tx * 14, p.y + ty * 14, p.x - tx * 14, p.y - ty * 14, p.x + p.nx * 9, p.y + p.ny * 9);
          g.lineStyle(2, ABY.membrane, 0.9);
          g.lineBetween(p.x + tx * 14, p.y + ty * 14, p.x + p.nx * 9 + tx * 3, p.y + p.ny * 9 + ty * 3);
          g.lineBetween(p.x - tx * 14, p.y - ty * 14, p.x + p.nx * 9 - tx * 3, p.y + p.ny * 9 - ty * 3);
          if (h.phase === 'weep') {
            for (let i = 0; i < 4; i++) {
              const k = ((t * 1.8 + i * 0.25) % 1);
              g.fillStyle(ABY.membrane, 0.8 * (1 - k)); g.fillCircle(p.x + tx * (i - 1.5) * 6 + p.nx * k * 34, p.y + ty * (i - 1.5) * 6 + p.ny * k * 34, 2.2);
            }
          } else if (h.phase === 'jet') {
            // The jet: dark outer water, a bright core, foam knots running down it.
            const len = h.side === 'n' || h.side === 's' ? H - top - inset * 2 : W - inset * 2;
            const ex = p.x + p.nx * len, ey = p.y + p.ny * len;
            const wob = Math.sin(t * 30) * 2;
            g.lineStyle(JET_HALF * 2 + wob, ABY.membraneDim, 0.45); g.lineBetween(p.x, p.y, ex, ey);
            g.lineStyle(JET_HALF + wob, ABY.membrane, 0.55); g.lineBetween(p.x, p.y, ex, ey);
            g.lineStyle(6, 0xffffff, 0.75); g.lineBetween(p.x, p.y, ex, ey);
            for (let s = (t * 600) % 50; s < len; s += 50) {
              g.fillStyle(0xffffff, 0.6); g.fillCircle(p.x + p.nx * s + tx * Math.sin(s + t * 9) * 10, p.y + p.ny * s + ty * Math.sin(s + t * 9) * 10, 3);
            }
          }
        }
      },

      drawHud(g) {
        // Six pips for the skin's holes, and once it thins a membrane gauge between them.
        const cx = W / 2, y = top + 16;
        for (let i = 0; i < MAX_HOLES; i++) {
          const x = cx - 50 + i * 20;
          const h = holes[i];
          g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 8);
          g.lineStyle(1.5, ABY.membrane, 0.9); g.strokeCircle(x, y, 6);
          if (h) {
            g.fillStyle(h.phase === 'jet' ? 0xffffff : h.phase === 'weep' ? ABY.membrane : ABY.membraneDim, 1);
            g.fillTriangle(x - 4, y - 3, x + 4, y - 3, x, y + 4);
          }
        }
        if (thin) {
          g.lineStyle(2, 0xc8283c, 0.9); g.strokeRect(cx - 56, y + 12, 112, 6);
          g.fillStyle(ABY.membraneDim, 1); g.fillRect(cx - 55, y + 13, 110 * (1 - inset / SHRINK * 0.5), 4);
        }
      },

      destroy() { for (const h of holes) h.target?.remove(); holes.length = 0; },
    };
  },
};
