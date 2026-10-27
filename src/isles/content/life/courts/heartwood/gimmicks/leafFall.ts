import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { HW, alive, clamp, dist, leaf, makeClock } from '../palette';

/**
 * Leaf Fall — Autumn-Keeper Russet.
 *
 * Leaves fall all fight long, and where they settle they bank into drifts that grow as you
 * watch. Burrow into a full drift and you are hidden — the leaves close over you, the other
 * side loses you, and the drift cushions every blow (you take 45% less). But Russet keeps the
 * wind. Every few seconds she calls a gust: a wide band of moving air drawn across the yard from
 * one wall, swirling leaves showing which way it blows. When it comes through, every drift in
 * it is torn apart — whoever was hiding is thrown downwind, bared and buffeted, and takes a
 * quarter more for a moment — and the leaves pile again where the gust drops them, downwind.
 *
 * The gust hurts anyone in it, Russet included, and it does not care who called it. Hide on
 * the far side of the yard from where she means to blow; when she hides, call her own wind
 * down on her by fighting near the gust's line.
 */

interface Drift { x: number; y: number; size: number }
interface Gust { y0: number; y1: number; dir: number; warnAt: number; firesAt: number; endsAt: number; hit: Set<Fighter>; blown: boolean }
interface Fallen { x: number; y: number; tx: number; ty: number; at: number; dur: number; spin: number; color: number }

export const leafFallGimmick: GimmickDef = {
  id: 'heartwood-leaf-fall',
  rules: 'Leaves pile into drifts: inside a full one you are hidden and cushioned. Russet\'s gusts tear drifts apart — and bare whoever hid there.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard, rng } = ctx;
    const tick = makeClock();
    const DRIFT_R = 58;
    const HIDE_AT = 0.7;
    const GUST_HALF = hard ? 110 : 95;
    const GUST_WARN = hard ? 1300 : 1500;
    const GUST_MS = 650;
    const GUST_EVERY = hard ? 5200 : 6200;
    const GUST_DMG = hard ? 12 : 10;
    const BARED_MS = 1800;
    const COLORS = [HW.leafGold, HW.leafButter, HW.leafRust, HW.leafRed, HW.leafGreen];

    const drifts: Drift[] = [];
    const spots: Pt[] = [
      { x: W * 0.18, y: top + 120 }, { x: W * 0.5, y: top + 100 }, { x: W * 0.82, y: top + 130 },
      { x: W * 0.3, y: H - 110 }, { x: W * 0.7, y: H - 120 },
    ];
    for (const s of spots) drifts.push({ x: s.x, y: s.y, size: 0.4 + rng() * 0.3 });
    let gust: Gust | null = null;
    let nextGust = 3200;
    let falling: Fallen[] = [];
    const bared = new Map<Fighter, number>([[ctx.player, 0], [ctx.npc, 0]]);
    let now = 0;
    let lastSeen: Pt = { x: W / 2, y: (top + H) / 2 };

    const driftOf = (f: Fighter): Drift | null => {
      if (!alive(f)) return null;
      for (const d of drifts) if (d.size >= HIDE_AT && dist(f.x, f.y, d.x, d.y) < DRIFT_R * d.size) return d;
      return null;
    };
    const hidden = (f: Fighter): boolean => driftOf(f) !== null;
    const isBared = (f: Fighter): boolean => now < (bared.get(f) ?? 0);
    const taken = (f: Fighter): number => (isBared(f) ? 1.25 : hidden(f) ? 0.55 : 1);

    const callGust = (): void => {
      // Russet aims her wind through the drift the player is in (or nearest to them).
      const p = ctx.player;
      const target = driftOf(p) ?? drifts.reduce((a, b) => (dist(a.x, a.y, p.x, p.y) < dist(b.x, b.y, p.x, p.y) ? a : b));
      const cy = clamp((target.y + p.y) / 2 + (rng() - 0.5) * 60, top + GUST_HALF, H - GUST_HALF);
      const dir = rng() < 0.5 ? 1 : -1;
      gust = { y0: cy - GUST_HALF, y1: cy + GUST_HALF, dir, warnAt: now, firesAt: now + GUST_WARN, endsAt: now + GUST_WARN + GUST_MS, hit: new Set(), blown: false };
      ctx.sfx('gust');
    };

    const blowAway = (g: Gust): void => {
      for (const d of drifts) {
        if (d.y < g.y0 || d.y > g.y1 || d.size < 0.15) continue;
        // The leaves go downwind and settle into a new drift against the far side.
        const nx = clamp(d.x + g.dir * (220 + rng() * 140), 70, W - 70);
        for (let i = 0; i < 14; i++) {
          falling.push({ x: d.x + (rng() - 0.5) * 60, y: d.y + (rng() - 0.5) * 30, tx: nx + (rng() - 0.5) * 50, ty: d.y + (rng() - 0.5) * 30, at: now, dur: 700 + rng() * 400, spin: rng() * 10, color: COLORS[Math.floor(rng() * COLORS.length)] });
        }
        const moved = d.size * 0.85;
        d.size = 0;
        const existing = drifts.find((q) => q !== d && dist(q.x, q.y, nx, d.y) < 90);
        if (existing) existing.size = Math.min(1.25, existing.size + moved);
        else { d.x = nx; d.size = moved; }
      }
    };

    return {
      update(time: number) {
        const dt = tick(time);
        now = time;
        if (!hidden(ctx.player)) lastSeen = { x: ctx.player.x, y: ctx.player.y };
        // Leaves keep falling; drifts grow.
        for (const d of drifts) d.size = Math.min(1.25, d.size + dt * (hard ? 0.075 : 0.09));
        if (rng() < dt * 6) {
          const d = drifts[Math.floor(rng() * drifts.length)];
          falling.push({ x: d.x + (rng() - 0.5) * 120, y: top - 10, tx: d.x + (rng() - 0.5) * DRIFT_R, ty: d.y + (rng() - 0.5) * 20, at: time, dur: 1800 + rng() * 900, spin: rng() * 10, color: COLORS[Math.floor(rng() * COLORS.length)] });
        }
        falling = falling.filter((f) => time - f.at < f.dur);
        if (!gust && time >= nextGust) callGust();
        const gg = gust;
        if (gg && time >= gg.firesAt) {
          if (!gg.blown) { gg.blown = true; blowAway(gg); ctx.sfx('tornado'); }
          for (const f of [ctx.player, ctx.npc]) {
            if (!alive(f) || gg.hit.has(f) || f.y < gg.y0 - 10 || f.y > gg.y1 + 10) continue;
            gg.hit.add(f);
            ctx.hit(f, GUST_DMG, f.x, f.y);
            ctx.nudge(f, gg.dir * 90, 0);
            bared.set(f, time + BARED_MS);
            ctx.float(f.x, f.y - 50, 'BARED', '#e9bc33');
          }
          if (time >= gg.endsAt) { gust = null; nextGust = time + GUST_EVERY; }
        }
      },

      playerTakenMult: () => taken(ctx.player),
      npcTakenMult: () => taken(ctx.npc),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        const gg = gust;
        // Get out of the wind's band.
        if (gg && now < gg.endsAt && n.y > gg.y0 - 30 && n.y < gg.y1 + 30) {
          const up = n.y - gg.y0 < gg.y1 - n.y;
          return { x: n.x, y: clamp(up ? gg.y0 - 60 : gg.y1 + 60, top + 40, H - 40) };
        }
        // The player has gone to ground: hunt round where they were last seen.
        if (hidden(ctx.player)) {
          const a = now / 900;
          return { x: clamp(lastSeen.x + Math.cos(a) * 140, 60, W - 60), y: clamp(lastSeen.y + Math.sin(a) * 90, top + 50, H - 50) };
        }
        // Hurt: burrow into the deepest drift away from the wind.
        if (n.hp < n.maxHp * 0.5 && !gg) {
          const best = drifts.filter((d) => d.size >= HIDE_AT).sort((a, b) => b.size - a.size)[0];
          if (best) return { x: best.x, y: best.y };
        }
        return null;
      },

      drawGround(g, time) {
        const gg = gust;
        if (gg) {
          const firing = time >= gg.firesAt;
          const k = firing ? 1 : (time - gg.warnAt) / (gg.firesAt - gg.warnAt);
          g.fillStyle(HW.mist, firing ? 0.28 : 0.08 + k * 0.14); g.fillRect(0, gg.y0, W, gg.y1 - gg.y0);
          g.lineStyle(2, HW.whitewash, 0.3 + k * 0.5);
          g.lineBetween(0, gg.y0, W, gg.y0); g.lineBetween(0, gg.y1, W, gg.y1);
          // Streamlines flowing the way the wind will blow.
          for (let i = 0; i < 9; i++) {
            const y = gg.y0 + ((i + 0.5) / 9) * (gg.y1 - gg.y0);
            const ph = ((time / (firing ? 250 : 700)) + i * 0.37) % 1;
            const x = gg.dir > 0 ? ph * W : W - ph * W;
            g.lineStyle(2, HW.whitewash, 0.35 + k * 0.3);
            g.lineBetween(x, y, x - gg.dir * 60, y + Math.sin(i + time / 200) * 4);
            g.lineBetween(x, y, x - gg.dir * 10, y - 6); g.lineBetween(x, y, x - gg.dir * 10, y + 6);
          }
          // The wall it blows from, shuddering.
          const wx = gg.dir > 0 ? 0 : W - 18;
          g.fillStyle(HW.leafRust, 0.25 + k * 0.4); g.fillRect(wx, gg.y0, 18, gg.y1 - gg.y0);
        }
        // Drift shadows.
        for (const d of drifts) {
          if (d.size < 0.1) continue;
          g.fillStyle(0x000000, 0.18); g.fillEllipse(d.x + 4, d.y + 8, DRIFT_R * 2.2 * d.size, DRIFT_R * 0.8 * d.size);
          if (d.size >= HIDE_AT) {
            g.lineStyle(1.5, HW.leafButter, 0.4); g.strokeEllipse(d.x, d.y, DRIFT_R * 2 * d.size, DRIFT_R * 1.0 * d.size);
          }
        }
      },

      drawAir(g, time) {
        const t = time / 1000;
        // The drifts sit over whoever is in them: that is what hidden means.
        for (let di = 0; di < drifts.length; di++) {
          const d = drifts[di];
          if (d.size < 0.1) continue;
          const r = DRIFT_R * d.size;
          g.fillStyle(HW.leafRust, 0.95); g.fillEllipse(d.x, d.y - 4, r * 2, r * 0.95);
          const n = Math.floor(22 + d.size * 26);
          for (let i = 0; i < n; i++) {
            const a = i * 2.39996 + di, rr = Math.sqrt((i + 0.5) / n);
            const lx = d.x + Math.cos(a) * r * 0.95 * rr, ly = d.y - 4 + Math.sin(a) * r * 0.45 * rr - (1 - rr) * r * 0.25;
            const shiver = Math.sin(t * 3 + i) * (hidden(ctx.player) && driftOf(ctx.player) === d ? 1.5 : 0.3);
            leaf(g, lx + shiver, ly, a + t * 0.05, 9 + d.size * 3, COLORS[(i + di) % COLORS.length], 1);
          }
        }
        // The keeper can still tell a drift with someone in it: it breathes.
        for (const f of [ctx.player, ctx.npc]) {
          const d = driftOf(f);
          if (!d) continue;
          const k = 0.5 + 0.5 * Math.sin(t * 2.5);
          g.fillStyle(HW.leafButter, 0.08 + k * 0.06); g.fillEllipse(d.x, d.y - 8, DRIFT_R * 1.4 * d.size, DRIFT_R * 0.6 * d.size);
        }
        // Falling and blown leaves.
        for (const f of falling) {
          const k = (time - f.at) / f.dur;
          const x = f.x + (f.tx - f.x) * k + Math.sin(k * 9 + f.spin) * 12, y = f.y + (f.ty - f.y) * k;
          leaf(g, x, y, f.spin + k * 8, 9, f.color, Math.min(1, (1 - k) * 4));
        }
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || !isBared(f)) continue;
          for (let i = 0; i < 3; i++) leaf(g, f.x + Math.cos(t * 4 + i * 2) * 22, f.y - 10 + Math.sin(t * 4 + i * 2) * 10, t * 6 + i, 8, HW.leafGold, 0.9);
        }
      },

      drawHud(g) {
        // Two leaf glyphs: lit while that side is hidden, red while bared.
        const glyph = (x: number, f: Fighter): void => {
          const y = top + 14;
          g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 11);
          leaf(g, x, y, -Math.PI / 4, 16, isBared(f) ? HW.leafRed : hidden(f) ? HW.leafButter : 0x5a5a4a, 1);
        };
        glyph(W / 2 - 40, ctx.player);
        glyph(W / 2 + 40, ctx.npc);
        if (gust && now < gust.firesAt) {
          g.fillStyle(HW.whitewash, 0.9);
          const x = W / 2, y = top + 14;
          g.fillTriangle(x - 8 * gust.dir, y - 6, x - 8 * gust.dir, y + 6, x + 8 * gust.dir, y);
        }
      },

      destroy() { falling = []; gust = null; },
    };
  },
};
