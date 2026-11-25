import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { HW, alive, clamp, dist, leaf } from '../palette';

/**
 * Berries on the Bough — Sorrel Gall, the mistletoe-wife, who cuts the kissing-boughs for the
 * Midwinter dance. In the true world she cut the parasite off the short households' boughs for
 * nothing. In the star's telling she seeded it on them, so the boughs gave less sap and came up
 * short at the scales — and she was paid for every white ring that followed.
 *
 * Mistletoe clumps grow on the bark of the yard. Each one drinks from whichever fighter stands
 * nearest it (in reach), down a sticky white strand, a little at a time, and swells with what it
 * takes — its berries fill out one by one. Full, it whitens and bursts: sticky berries fly out in
 * a star and hold whoever they hit; a berry that misses roots where it lands as a new clump.
 *
 * Strike a clump to cut it: everything it drank goes into whoever cut it. So the play is to stand
 * where the foe is the nearer, let the clumps fatten on them, and cut the fat ones. When clumps run
 * low a mistle-thrush drops a seed (its shadow first). Past half health it is Midwinter: the clumps
 * drink faster, and more of them may grow.
 */

const ID = fallenId('heartwood', 'mistletoe');
const REACH = 160;
const FULL = 18;
const BERRY_R = 8;

interface Clump { x: number; y: number; store: number; burstAt: number; nextSip: number; sipAt: number; sipOn: Fighter | null; tgt: StrikeTarget | null; seed: number }
interface Berry { x: number; y: number; vx: number; vy: number; left: number }
interface Drop { x: number; y: number; at: number; landAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng, tk } = ctx;
  const mid = (top + H) / 2;
  let clumps: Clump[] = [];
  let berries: Berry[] = [];
  let drops: Drop[] = [];
  let midwinter = false;
  let now = 0;
  let nextThrush = 5000;

  const cap = (): number => (midwinter ? 6 : 5);
  const hurt = (f: Fighter, n: number, x: number, y: number): void => {
    if (f === ctx.player) tk.hitPlayer(n, x, y);
    else ctx.hit(f, n * 1.25, x, y);
  };
  const nearestTo = (c: Clump): Fighter | null => {
    let best: Fighter | null = null, bd = REACH;
    for (const f of [ctx.player, ctx.npc]) {
      if (!alive(f) || ctx.isAirborne(f)) continue;
      const d = dist(f.x, f.y, c.x, c.y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  };

  const grow = (x: number, y: number, store = 0): void => {
    if (clumps.length >= cap()) return;
    if (clumps.some((c) => dist(c.x, c.y, x, y) < 90)) return;
    const c: Clump = { x, y, store, burstAt: 0, nextSip: now + 900, sipAt: -1e9, sipOn: null, tgt: null, seed: rng() * 10 };
    c.tgt = ctx.target({
      x, y: y - 14, r: 24,
      onStruck: (by) => {
        if (!clumps.includes(c)) return;
        const gain = Math.max(3, Math.round(c.store));
        if (by === 'player') ctx.heal(ctx.player, gain); else tk.healBoss(gain, c.x, c.y - 30);
        ctx.float(c.x, c.y - 44, 'CUT', '#f6f3ea');
        ctx.sfx('snap');
        ctx.flash(c.x, c.y - 14, HW.leafGreen);
        c.tgt?.remove();
        clumps = clumps.filter((q) => q !== c);
      },
    });
    clumps.push(c);
  };

  grow(W * 0.3, top + 150); grow(W * 0.7, H - 130); grow(W * 0.5, mid - 10);

  const burst = (c: Clump): void => {
    const a0 = rng() * Math.PI;
    for (let i = 0; i < 6; i++) {
      const a = a0 + (i / 6) * Math.PI * 2;
      berries.push({ x: c.x, y: c.y - 14, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, left: 230 });
    }
    c.store = 4; c.burstAt = 0;
    ctx.sfx('slime-splat');
    ctx.flash(c.x, c.y - 14, HW.whitewash);
  };

  return {
    update(time, dtIn) {
      const dt = Math.min(0.05, dtIn);
      now = time;
      if (!midwinter && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        midwinter = true;
        ctx.banner('MIDWINTER', '#f6f3ea');
        ctx.sfx('holy-chord');
      }
      for (const c of [...clumps]) {
        if (c.burstAt && time >= c.burstAt) { burst(c); continue; }
        if (c.burstAt || time < c.nextSip) continue;
        c.nextSip = time + (midwinter ? 520 : 700);
        const f = nearestTo(c);
        if (!f) continue;
        hurt(f, 2, f.x, f.y);
        c.store += 2; c.sipAt = time; c.sipOn = f;
        if (c.store >= FULL) { c.burstAt = time + tk.warn(1000); ctx.sfx('spore'); }
      }
      for (const b of [...berries]) {
        const step = 230 * dt;
        b.x += (b.vx / 230) * step; b.y += (b.vy / 230) * step; b.left -= step;
        let spent = false;
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || dist(b.x, b.y, f.x, f.y) > BERRY_R + 20) continue;
          hurt(f, 6, f.x, f.y);
          ctx.root(f, 700);
          ctx.sfx('slime-splat');
          spent = true;
          break;
        }
        const out = b.x < 40 || b.x > W - 40 || b.y < top + 30 || b.y > H - 30;
        if (spent || out) { berries = berries.filter((q) => q !== b); continue; }
        if (b.left <= 0) { grow(b.x, b.y + 14); berries = berries.filter((q) => q !== b); }
      }
      // The thrush brings a seed when the bark runs bare (always, at Midwinter).
      if (time >= nextThrush && (clumps.length < 2 || (midwinter && clumps.length < cap()))) {
        let x = 0, y = 0;
        for (let k = 0; k < 8; k++) {
          x = 90 + rng() * (W - 180); y = top + 80 + rng() * (H - top - 150);
          if (dist(x, y, ctx.player.x, ctx.player.y) > 120 && dist(x, y, ctx.npc.x, ctx.npc.y) > 120) break;
        }
        drops.push({ x, y, at: time, landAt: time + tk.warn(1100) });
        ctx.sfx('wings');
        nextThrush = time + (midwinter ? 4000 : 5000);
      } else if (time >= nextThrush) nextThrush = time + 1000;
      for (const d of [...drops]) if (time >= d.landAt) { grow(d.x, d.y, 2); drops = drops.filter((q) => q !== d); }
    },

    npcSeek() {
      const n = ctx.npc;
      const fat = clumps.filter((c) => !c.burstAt && (c.store >= 14 || (c.store >= 8 && n.hp < n.maxHp * 0.7)))
        .sort((a, b) => dist(n.x, n.y, a.x, a.y) - dist(n.x, n.y, b.x, b.y))[0];
      if (fat) return { x: fat.x + (n.x < fat.x ? -36 : 36), y: fat.y };
      const bursting = clumps.find((c) => c.burstAt && dist(n.x, n.y, c.x, c.y) < 260);
      const drinking = clumps.find((c) => nearestTo(c) === n);
      const away = bursting ?? drinking;
      if (away) {
        const a = Math.atan2(n.y - away.y, n.x - away.x);
        return { x: tk.clampX(away.x + Math.cos(a) * (REACH + 90)), y: tk.clampY(away.y + Math.sin(a) * (REACH + 90)) };
      }
      return null;
    },

    drawGround(g, time) {
      // Reach rings, faint, and the burst star chalked while a clump whitens.
      for (const c of clumps) {
        g.lineStyle(1, HW.leafGreen, 0.16); g.strokeCircle(c.x, c.y, REACH);
        if (c.burstAt) {
          const k = clamp(1 - (c.burstAt - time) / 1000, 0, 1);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + time / 2000;
            g.lineStyle(2, HW.whitewash, 0.2 + k * 0.4);
            g.lineBetween(c.x, c.y - 14, c.x + Math.cos(a) * 230 * k, c.y - 14 + Math.sin(a) * 230 * k);
          }
        }
        shadow(g, c.x, c.y + 4, 46, 14, 0.3);
      }
      for (const d of drops) {
        const k = clamp((time - d.at) / (d.landAt - d.at), 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.25); g.fillEllipse(d.x, d.y, 20 + 30 * (1 - k), 8 + 10 * (1 - k));
      }
    },

    drawAir(g, time) {
      // The strands: sticky viscin from clump to whoever it is drinking, beaded and sagging.
      for (const c of clumps) {
        const f = nearestTo(c);
        if (!f) continue;
        const fresh = clamp(1 - (time - c.sipAt) / 400, 0, 1);
        const sag = 18 + 6 * Math.sin(time / 300 + c.seed);
        let lx = c.x, ly = c.y - 14;
        for (let i = 1; i <= 10; i++) {
          const k = i / 10;
          const x = c.x + (f.x - c.x) * k, y = c.y - 14 + (f.y - 14 - c.y + 14) * k + Math.sin(k * Math.PI) * sag;
          g.lineStyle(1.5 + fresh * 2, HW.whitewash, 0.45 + fresh * 0.45); g.lineBetween(lx, ly, x, y);
          if (i % 3 === 0) { g.fillStyle(HW.whitewash, 0.8); g.fillCircle(x, y + 2, 1.8 + fresh); }
          lx = x; ly = y;
        }
        if (fresh > 0) { g.fillStyle(0xd8262a, fresh * 0.8); g.fillCircle(f.x + (c.x - f.x) * (1 - fresh), f.y - 14 + (c.y - f.y) * (1 - fresh), 3); }
      }
      for (const c of clumps) drawClump(g, c, time);
      for (const b of berries) {
        g.fillStyle(HW.whitewash, 0.95); g.fillCircle(b.x, b.y, BERRY_R);
        g.fillStyle(0xffffff, 1); g.fillCircle(b.x - 2.5, b.y - 2.5, 2.4);
        g.lineStyle(1, HW.lichen, 0.9); g.strokeCircle(b.x, b.y, BERRY_R);
        g.lineStyle(1.5, HW.whitewash, 0.5); g.lineBetween(b.x, b.y, b.x - b.vx * 0.06, b.y - b.vy * 0.06);
      }
      for (const d of drops) {
        const k = clamp((time - d.at) / (d.landAt - d.at), 0, 1);
        drawThrush(g, d.x - 200 * (1 - k), d.y - 140 * (1 - k) - 40, time);
      }
    },

    drawHud(g) {
      // One sprig per clump, its bar how full it is; red if it is drinking from you.
      const n = clumps.length;
      const x0 = W / 2 - n * 22, y = H - 26;
      g.fillStyle(HW.mossDark, 0.85); g.fillRoundedRect(x0 - 12, y - 14, n * 44 + 24, 28, 8);
      g.lineStyle(1.5, midwinter ? HW.whitewash : HW.moss, 0.9); g.strokeRoundedRect(x0 - 12, y - 14, n * 44 + 24, 28, 8);
      clumps.forEach((c, i) => {
        const x = x0 + 22 + i * 44;
        const onMe = nearestTo(c) === ctx.player;
        g.fillStyle(HW.leafGreen, 1); g.fillEllipse(x - 12, y - 2, 8, 5); g.fillEllipse(x - 6, y - 5, 8, 5);
        g.fillStyle(0x1a1a10, 1); g.fillRect(x - 2, y - 3, 22, 6);
        g.fillStyle(onMe ? 0xd8262a : HW.whitewash, 1); g.fillRect(x - 2, y - 3, 22 * clamp(c.store / FULL, 0, 1), 6);
      });
    },

    destroy() { for (const c of clumps) c.tgt?.remove(); clumps = []; berries = []; drops = []; },
  };
}

/** A mistletoe clump on a bark knob: forked yellow-green twigs, paired leaves, white berries. */
function drawClump(g: G, c: Clump, time: number): void {
  const x = c.x, y = c.y;
  const swell = clamp(c.store / FULL, 0, 1);
  const white = c.burstAt ? 0.5 + 0.5 * Math.sin(time / 60) : 0;
  g.fillStyle(HW.barkShade, 1); g.fillEllipse(x, y, 30, 12);
  g.fillStyle(HW.heartLit, 1); g.fillEllipse(x, y - 2, 12, 6);
  const r = 18 + swell * 8;
  if (white) glow(g, x, y - 16, r + 14, HW.whitewash, 0.06 * white, 3);
  // Forking twigs, each fork ending in a pair of leathery leaves.
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.42 + Math.sin(time / 900 + c.seed + i) * 0.05;
    const mx = x + Math.cos(a) * r * 0.5, my = y - 6 + Math.sin(a) * r * 0.5;
    const ex = x + Math.cos(a) * r, ey = y - 8 + Math.sin(a) * r * 0.9;
    g.lineStyle(2.4, 0x9aa04a, 1); g.lineBetween(x, y - 4, mx, my); g.lineBetween(mx, my, ex, ey);
    leaf(g, ex + Math.cos(a - 0.5) * 5, ey + Math.sin(a - 0.5) * 5, a - 0.5, 11, HW.leafGreen, 1);
    leaf(g, ex + Math.cos(a + 0.5) * 5, ey + Math.sin(a + 0.5) * 5, a + 0.5, 11, 0xb4b84a, 1);
  }
  // Berries in the forks: one for every three sips, white and glassy.
  const nB = Math.min(8, Math.floor(c.store / 2.25));
  for (let i = 0; i < nB; i++) {
    const a = -Math.PI / 2 + (i - (nB - 1) / 2) * 0.34;
    const bx = x + Math.cos(a) * r * 0.55, by = y - 8 + Math.sin(a) * r * 0.5;
    const br = 3.2 + swell * 1.6 + white * 1.5;
    g.fillStyle(white ? 0xffffff : HW.whitewash, 0.95); g.fillCircle(bx, by, br);
    g.fillStyle(HW.lichen, 0.8); g.fillCircle(bx + br * 0.3, by + br * 0.3, 0.9);
  }
}

/** A mistle-thrush in flight: speckled breast, wings beating, a seed in its beak. */
function drawThrush(g: G, x: number, y: number, time: number): void {
  const beat = Math.sin(time / 50);
  g.fillStyle(0x8a7a5a, 1); g.fillEllipse(x, y, 22, 11);
  g.fillStyle(0xe8dcc0, 1); g.fillEllipse(x + 2, y + 2, 14, 6);
  for (let i = 0; i < 4; i++) { g.fillStyle(0x3a2e20, 1); g.fillCircle(x - 3 + i * 3, y + 2 + (i % 2), 1); }
  g.fillStyle(0x6a5a3e, 1);
  g.fillTriangle(x - 4, y - 2, x + 4, y - 2, x - 2, y - 14 * beat - 2);
  g.fillTriangle(x + 9, y - 1, x + 15, y - 1, x + 12, y + 2);
  g.fillStyle(HW.whitewash, 1); g.fillCircle(x + 16, y, 2);
  g.fillStyle(0x6a5a3e, 1); g.fillTriangle(x - 10, y, x - 18, y - 3, x - 18, y + 3);
}

export const FALLEN_MISTLETOE: GimmickDef = {
  id: ID,
  rules: 'Mistletoe drinks from the nearest fighter and bursts sticky berries when full. Strike a clump to cut it and take all it drank.',
  make,
};
