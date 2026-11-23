import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { GREEN, OBS, poly, lit, mixC } from '../art';
import { WHO, type Who, alive, clamp, dist, fighterOf, stepDt } from './util';

/**
 * Decree of Brine and Syrup — Councilor Candida Brine, Seat of Sugar (gum / Savor).
 *
 * The Confection Court's Sweet-Tax was hers: a tithe paid in sugar, the pruned candied whole and
 * set on the Empress's table. What is cut is *preserved*. Two pools wander the glass — a greengage
 * SYRUP that holds you (much slower) but candies you (you take 25% less), and a BRINE that stings
 * (you take 30% more) but sharpens (cooldowns run half again as fast). Over each pool floats its
 * cruet: strike a cruet and the pool rolls away from you, fast — tip the brine onto her, or the
 * syrup round her feet.
 *
 * Savor perfected flips between sugar and salt with every dodge, and plays both pools; she will
 * tip them at you too. Whoever reads the cruets owns the floor.
 */

type Kind = 'syrup' | 'brine';

interface Pool {
  kind: Kind;
  x: number; y: number;
  vx: number; vy: number;
  goal: Pt; goalAt: number;
  cruet: StrikeTarget | null;
  tippedAt: number;
  tipA: number;
  seed: number;
}

const ROLL = 380;
const DRIFT = 38;
const SYRUP = { col: 0xb9d85a, deep: 0x6a8a1e, lit: 0xeaffa8 };
const BRINE = { col: 0xdfe8f0, deep: 0x8aa0b8, lit: 0xffffff };

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const R = ctx.hard ? 132 : 120;
  const pick = (): Pt => ({ x: R + 20 + ctx.rng() * (W - 2 * R - 40), y: top + R * 0.7 + ctx.rng() * Math.max(10, H - top - R * 1.4) });
  const pools: Pool[] = [
    { kind: 'syrup', x: W * 0.3, y: (top + H) / 2, vx: 0, vy: 0, goal: pick(), goalAt: 0, cruet: null, tippedAt: -9999, tipA: 0, seed: 1.3 },
    { kind: 'brine', x: W * 0.7, y: (top + H) / 2, vx: 0, vy: 0, goal: pick(), goalAt: 0, cruet: null, tippedAt: -9999, tipA: 0, seed: 4.1 },
  ];
  const told: Record<Who, Record<Kind, number>> = { player: { syrup: -9999, brine: -9999 }, npc: { syrup: -9999, brine: -9999 } };
  const now = () => ctx.scene.time.now;
  const inPool = (w: Who, kind: Kind): boolean => {
    const f = fighterOf(ctx, w);
    const p = pools.find((q) => q.kind === kind);
    return !!p && dist(f.x, f.y, p.x, p.y) < R;
  };
  const taken = (w: Who) => (inPool(w, 'syrup') ? 0.75 : 1) * (inPool(w, 'brine') ? 1.3 : 1);
  const speed = (w: Who) => (inPool(w, 'syrup') ? 0.6 : 1);
  const rate = (w: Who) => (inPool(w, 'brine') ? 1.5 : 1);

  const tip = (p: Pool, by: Who) => {
    const t = now();
    if (t - p.tippedAt < 600) return;
    const f = fighterOf(ctx, by);
    const a = Math.atan2(p.y - f.y, p.x - f.x);
    p.vx = Math.cos(a) * ROLL; p.vy = Math.sin(a) * ROLL;
    p.tippedAt = t; p.tipA = a;
    p.goal = { x: clamp(p.x + Math.cos(a) * 260, R, W - R), y: clamp(p.y + Math.sin(a) * 200, top + R * 0.6, H - R * 0.6) };
    p.goalAt = t + 5000;
    ctx.float(p.x, p.y - 50, p.kind === 'syrup' ? 'THE SYRUP ROLLS' : 'THE BRINE ROLLS', p.kind === 'syrup' ? '#eaffa8' : '#ffffff');
    ctx.sfx(p.kind === 'syrup' ? 'slime-splat' : 'splash');
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      for (const p of pools) {
        if (!p.cruet) p.cruet = ctx.target({ x: p.x, y: p.y - 30, r: 22, passThrough: true, onStruck: (by) => tip(p, by) });
        if (time >= p.goalAt) { p.goal = pick(); p.goalAt = time + 4500 + ctx.rng() * 2500; }
        // Drift toward the goal; a tipped pool rolls on its own momentum and slows.
        const a = Math.atan2(p.goal.y - p.y, p.goal.x - p.x);
        const d = dist(p.x, p.y, p.goal.x, p.goal.y);
        const fr = Math.min(1, dt * 2.2);
        p.vx += ((d > 8 ? Math.cos(a) * DRIFT : 0) - p.vx) * fr;
        p.vy += ((d > 8 ? Math.sin(a) * DRIFT : 0) - p.vy) * fr;
        p.x = clamp(p.x + p.vx * dt, R * 0.6, W - R * 0.6);
        p.y = clamp(p.y + p.vy * dt, top + R * 0.5, H - R * 0.5);
        p.cruet.moveTo(p.x, p.y - 30);
      }
      // The pools shoulder each other apart rather than sit as one.
      const [s, b] = pools;
      const sep = dist(s.x, s.y, b.x, b.y);
      if (sep < R * 1.1 && sep > 1) {
        const push = (R * 1.1 - sep) * 0.5 * Math.min(1, dt * 3);
        const ux = (b.x - s.x) / sep, uy = (b.y - s.y) / sep;
        s.x -= ux * push; s.y -= uy * push; b.x += ux * push; b.y += uy * push;
      }
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        for (const kind of ['syrup', 'brine'] as Kind[]) {
          if (inPool(w, kind) && time - told[w][kind] > 3500) {
            told[w][kind] = time;
            ctx.float(f.x, f.y - 56, kind === 'syrup' ? 'CANDIED' : 'SALTED', kind === 'syrup' ? '#eaffa8' : '#ffffff');
          }
        }
      }
    },

    playerTakenMult() { return taken('player'); },
    npcTakenMult() { return taken('npc'); },
    playerSpeedMult() { return speed('player'); },
    npcSpeedMult() { return speed('npc'); },
    playerCooldownRate() { return rate('player'); },
    npcCooldownRate() { return rate('npc'); },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      // Tip a pool onto the player: stand behind its cruet, on the far side from them.
      for (const pool of pools) {
        const want = pool.kind === 'brine' ? !inPool('player', 'brine') : !inPool('player', 'syrup');
        if (!want) continue;
        const dp = dist(pool.x, pool.y, p.x, p.y);
        if (dp < 300 && dist(n.x, n.y, pool.x, pool.y) < 280) {
          const a = Math.atan2(pool.y - p.y, pool.x - p.x);
          return { x: clamp(pool.x + Math.cos(a) * 48, 40, W - 40), y: clamp(pool.y - 30 + Math.sin(a) * 48, top + 40, H - 40) };
        }
      }
      // Hurt: into the syrup's candy. Healthy: never stand in the brine, and keep out of the syrup's drag.
      const syrup = pools[0], brine = pools[1];
      if (n.hp / n.maxHp < 0.4 && !inPool('npc', 'syrup')) return { x: syrup.x, y: syrup.y };
      if (inPool('npc', 'brine')) {
        const a = Math.atan2(n.y - brine.y, n.x - brine.x);
        return { x: clamp(brine.x + Math.cos(a) * (R + 50), 40, W - 40), y: clamp(brine.y + Math.sin(a) * (R + 50), top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const p of pools) {
        const c = p.kind === 'syrup' ? SYRUP : BRINE;
        const t = time / 1000;
        // The body of the pool: lumpy, layered, glossy — and shoved into a smear when it rolls.
        const roll = clamp(1 - (time - p.tippedAt) / 900, 0, 1);
        const sx = 1 + roll * 0.25, sy = 1 - roll * 0.12;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x + 6, p.y + 10, R * 2.1 * sx, R * 1.5 * sy);
        for (let i = 0; i < 9; i++) {
          const a = p.seed + i * 0.7 + t * 0.15;
          const rr = R * (0.55 + 0.12 * Math.sin(i * 2.1 + t * 0.8));
          g.fillStyle(i % 3 === 0 ? c.deep : c.col, p.kind === 'syrup' ? 0.3 : 0.22);
          g.fillEllipse(p.x + Math.cos(a) * R * 0.38 * sx, p.y + Math.sin(a) * R * 0.28 * sy, rr * 1.4 * sx, rr * sy);
        }
        g.fillStyle(c.col, p.kind === 'syrup' ? 0.32 : 0.24); g.fillEllipse(p.x, p.y, R * 1.9 * sx, R * 1.35 * sy);
        // Slow rings outward from the middle.
        for (let k = 0; k < 3; k++) {
          const ph = ((t * 0.35) + k / 3) % 1;
          g.lineStyle(1.5, c.lit, 0.35 * (1 - ph)); g.strokeEllipse(p.x, p.y, R * 1.9 * ph * sx, R * 1.35 * ph * sy);
        }
        g.lineStyle(2, c.lit, 0.55); g.strokeEllipse(p.x, p.y, R * 2 * sx, R * 1.42 * sy);
        if (p.kind === 'syrup') {
          // Bubbles rising and popping in the syrup.
          for (let i = 0; i < 7; i++) {
            const ph = ((t * 0.6) + i * 0.143) % 1;
            const bx = p.x + Math.cos(i * 2.4 + p.seed) * R * 0.6, by = p.y + Math.sin(i * 2.4 + p.seed) * R * 0.4;
            g.lineStyle(1.2, SYRUP.lit, 0.7 * (1 - ph)); g.strokeCircle(bx, by, 2 + ph * 6);
          }
          g.fillStyle(0xffffff, 0.25); g.fillEllipse(p.x - R * 0.35, p.y - R * 0.3, R * 0.5, R * 0.12);
        } else {
          // A crust of salt crystals round the rim, glinting.
          for (let i = 0; i < 26; i++) {
            const a = (i / 26) * Math.PI * 2 + p.seed;
            const rx = p.x + Math.cos(a) * R * 0.98 * sx, ry = p.y + Math.sin(a) * R * 0.7 * sy;
            const s = 3 + ((i * 7) % 4);
            poly(g, [rx, ry - s, rx + s, ry, rx, ry + s * 0.6, rx - s, ry], BRINE.col, 0.95);
            g.fillStyle(0xffffff, 0.5 + 0.5 * Math.sin(t * 3 + i)); g.fillCircle(rx - 1, ry - 1, 1);
          }
          for (let i = 0; i < 12; i++) {
            const tw = Math.sin(t * 2.6 + i * 1.9);
            if (tw < 0.6) continue;
            g.fillStyle(0xffffff, tw); g.fillCircle(p.x + Math.cos(i * 2.7) * R * 0.6, p.y + Math.sin(i * 2.7) * R * 0.45, 1.6);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const p of pools) {
        const c = p.kind === 'syrup' ? SYRUP : BRINE;
        // The cruet: a little stoppered bottle of black glass, its pool's colour inside, bobbing.
        const k = clamp(1 - (time - p.tippedAt) / 700, 0, 1);
        const bob = Math.sin(time / 380 + p.seed) * 4;
        const x = p.x, y = p.y - 30 + bob;
        const tilt = k * 0.9 * Math.sign(Math.cos(p.tipA) || 1);
        const rot = (dx: number, dy: number): [number, number] => [x + dx * Math.cos(tilt) - dy * Math.sin(tilt), y + dx * Math.sin(tilt) + dy * Math.cos(tilt)];
        g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x, p.y + 4, 30, 8);
        const body = [rot(-11, 10), rot(11, 10), rot(13, -6), rot(5, -14), rot(5, -24), rot(-5, -24), rot(-5, -14), rot(-13, -6)].flat();
        poly(g, body, OBS.glass, 1);
        const liquid = [rot(-10, 9), rot(10, 9), rot(11.5, -4), rot(-11.5, -4)].flat();
        poly(g, liquid, c.col, 0.85);
        g.lineStyle(1.2, OBS.edge, 0.8);
        g.strokePoints(body.reduce<{ x: number; y: number }[]>((acc, v, i) => (i % 2 === 0 ? [...acc, { x: v, y: body[i + 1] }] : acc), []), true);
        const [kx, ky] = rot(0, -27);
        g.fillStyle(OBS.seam, 1); g.fillCircle(kx, ky, 4);
        g.fillStyle(OBS.seamLit, 1); g.fillCircle(kx - 1, ky - 1, 1.5);
        const [hx, hy] = rot(-6, 0);
        g.fillStyle(0xffffff, 0.45); g.fillRect(hx, hy - 6, 2, 10);
        g.fillStyle(lit(c.col, 0.5), 0.12 + 0.06 * Math.sin(time / 200)); g.fillCircle(x, y - 4, 22);
        if (k > 0) {
          // A spill from the lip as it tips.
          const [lx, ly] = rot(0, -24);
          for (let i = 0; i < 5; i++) { g.fillStyle(c.col, k); g.fillCircle(lx + Math.cos(p.tipA) * i * 6, ly + i * 4, 3 - i * 0.4); }
        }
      }
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        if (inPool(w, 'syrup')) {
          // Candied: a gloss of syrup over the body, and strings of it at the feet.
          g.lineStyle(3, SYRUP.col, 0.55); g.strokeCircle(f.x, f.y - 4, 24);
          g.fillStyle(0xffffff, 0.35); g.fillEllipse(f.x - 9, f.y - 16, 10, 4);
          for (let i = 0; i < 3; i++) { g.lineStyle(1.5, SYRUP.col, 0.7); g.lineBetween(f.x - 10 + i * 10, f.y + 14, f.x - 10 + i * 10 + Math.sin(time / 200 + i) * 3, f.y + 26); }
        }
        if (inPool(w, 'brine')) {
          // Salted: crystals stinging on the skin.
          for (let i = 0; i < 6; i++) {
            const a = i * 1.05 + time / 700;
            const rx = f.x + Math.cos(a) * 22, ry = f.y - 4 + Math.sin(a) * 22;
            poly(g, [rx, ry - 4, rx + 4, ry, rx, ry + 3, rx - 4, ry], BRINE.col, 0.95);
          }
          g.lineStyle(1, mixC(BRINE.col, GREEN.vineLit, 0.2), 0.5); g.strokeCircle(f.x, f.y - 4, 28);
        }
      }
    },

    destroy() { for (const p of pools) p.cruet?.remove(); },
  };
}

export const DECREE_BRINE_SYRUP: GimmickDef = {
  id: 'bench-life-brine-syrup',
  rules: 'Syrup holds and candies (much slower, take 25% less); brine stings and sharpens (take 30% more, cooldowns ×1.5). Strike a cruet and its pool rolls away from you.',
  make,
};
