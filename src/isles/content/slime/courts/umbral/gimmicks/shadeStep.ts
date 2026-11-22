import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { LEAF, LEAF_LIT } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Shade Step — Stalker Grim.
 *
 * The yard lies under the canopy's last few gaps, so the floor is pale except where the great
 * trees throw their shadows: six cold pools of dark, swaying a little as the leaves move. Every
 * pool is one pool — in Umbral they say all shade is joined underneath, like water under ice.
 *
 * Dash out of a shadow and you do not come out where you were going: you come up out of another
 * shadow — the one your aim points toward — in a burst of rime that nails anyone standing there.
 * Grim does it all fight, slipping from pool to pool and coming up behind you; the pool he is
 * coming out of frosts over first. Learn the frost, and when Grim leaves a pool, dash in after him.
 */

const POOL_RX = 70;
const POOL_RY = 42;
const DASH_SPEED = 560;
const BURST_R = 86;
const STEP_GUARD_MS = 500;

interface Pool { bx: number; by: number; x: number; y: number; ph: number; frostAt: number; burstAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const pools: Pool[] = [];
  // Six pools: two rows of three, jittered, so there is always one a dash away.
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const bx = W * (0.2 + c * 0.3) + (rng() - 0.5) * 70, by = top + (H - top) * (r ? 0.72 : 0.3) + (rng() - 0.5) * 40;
      pools.push({ bx, by, x: bx, y: by, ph: rng() * 6, frostAt: -1, burstAt: -9999 });
    }
  }
  const inPool = (x: number, y: number): Pool | null => {
    for (const p of pools) { const dx = (x - p.x) / POOL_RX, dy = (y - p.y) / POOL_RY; if (dx * dx + dy * dy < 1) return p; }
    return null;
  };
  const prev = new Map<Fighter, Pt>([[player, { x: player.x, y: player.y }], [npc, { x: npc.x, y: npc.y }]]);
  const lastStep = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  /** Grim's own hop: the pool he means to come out of, and when. */
  let hopTo: Pool | null = null;
  let hopAt = 0;
  let nextHop = 0;
  let started = false;

  function arrive(f: Fighter, from: Pool | null, to: Pool, time: number): void {
    const foe = f === player ? npc : player;
    ctx.nudge(f, to.x - f.x, to.y - f.y);
    prev.set(f, { x: to.x, y: to.y });
    lastStep.set(f, time);
    to.burstAt = time;
    if (from) from.burstAt = time;
    ctx.sfx('frost-blast');
    ctx.float(to.x, to.y - 40, 'SHADE STEP', '#bfe4ff');
    if (alive(foe) && dist(foe.x, foe.y, to.x, to.y) < BURST_R) {
      ctx.hit(foe, ctx.hard ? 11 : 9, foe.x, foe.y);
      ctx.root(foe, 450);
      ctx.float(foe.x, foe.y - 52, 'RIMED', '#dff4ff');
    }
    if (ctx.hard && f === npc) ctx.tk.spawnPool({ x: to.x, y: to.y, radius: 48, lifeMs: 1800, damage: 3, tickMs: 500 });
  }

  /** The pool a dash out of `from` arrives in: the one the stepper's aim points at most nearly. */
  function aimedPool(f: Fighter, from: Pool): Pool {
    const a = ctx.facing(f);
    let best = pools.find((p) => p !== from) ?? from;
    let bs = Infinity;
    for (const p of pools) {
      if (p === from) continue;
      const da = Math.abs(wrapAngle(Math.atan2(p.y - from.y, p.x - from.x) - a));
      if (da < bs) { bs = da; best = p; }
    }
    return best;
  }

  /** Where Grim likes to come up: the pool nearest *behind* the player, away from where he stands. */
  function ambushPool(): Pool {
    let best = pools[0];
    let bs = Infinity;
    const here = inPool(npc.x, npc.y);
    for (const p of pools) {
      if (p === here) continue;
      const s = dist(p.x, p.y, player.x, player.y) - dist(p.x, p.y, npc.x, npc.y) * 0.15;
      if (s < bs) { bs = s; best = p; }
    }
    return best;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextHop = time + 2600; }
      // The canopy sways: the pools drift on a slow figure-eight.
      for (const p of pools) {
        p.x = clamp(p.bx + Math.sin(time / 2600 + p.ph) * 26, 70, W - 70);
        p.y = clamp(p.by + Math.sin(time / 1700 + p.ph * 2) * 12, top + 50, H - 40);
      }
      // Any dash that starts in a pool comes up in another.
      if (dt > 0) {
        for (const f of [player, npc]) {
          const pv = prev.get(f) ?? { x: f.x, y: f.y };
          const speed = dist(pv.x, pv.y, f.x, f.y) / dt;
          const from = inPool(pv.x, pv.y);
          if (alive(f) && from && speed > DASH_SPEED && time - (lastStep.get(f) ?? 0) > STEP_GUARD_MS) {
            const to = f === player ? aimedPool(f, from) : ambushPool();
            arrive(f, from, to, time);
            continue;
          }
          prev.set(f, { x: f.x, y: f.y });
        }
      }
      // Grim's own step: when he has stood in shade a moment, the pool behind you frosts, then he rises there.
      if (hopTo && time >= hopAt) {
        const from = inPool(npc.x, npc.y);
        if (alive(npc) && from) arrive(npc, from, hopTo, time);
        hopTo.frostAt = -1;
        hopTo = null;
        nextHop = time + (ctx.hard ? 3000 : 3800) + rng() * 1200;
      } else if (!hopTo && time >= nextHop && alive(npc) && inPool(npc.x, npc.y)) {
        hopTo = ambushPool();
        hopTo.frostAt = time;
        hopAt = time + ctx.tk.warn(ctx.hard ? 750 : 950);
        ctx.sfx('hush');
      }
    },

    npcSeek() {
      // Into the nearest shade, and wait there.
      let best = pools[0];
      let bs = Infinity;
      for (const p of pools) { const d = dist(p.x, p.y, npc.x, npc.y) + dist(p.x, p.y, player.x, player.y) * 0.25; if (d < bs) { bs = d; best = p; } }
      return { x: best.x, y: best.y };
    },

    drawGround(g, time) {
      // The pale yard between: the canopy gaps.
      for (const p of pools) {
        const burst = clamp((time - p.burstAt) / 600, 0, 1);
        // A tree-shadow: a pool of overlapping leaf-shapes, dappled at the edge.
        g.fillStyle(0x05030a, 0.55); g.fillEllipse(p.x, p.y, POOL_RX * 2, POOL_RY * 2);
        for (let i = 0; i < 9; i++) {
          const a = p.ph + i * 0.7 + Math.sin(time / 1900 + i) * 0.08;
          const ex = p.x + Math.cos(a) * POOL_RX * 0.9, ey = p.y + Math.sin(a) * POOL_RY * 0.9;
          g.fillStyle(0x05030a, 0.4); g.fillEllipse(ex, ey, 34, 18);
        }
        // Dapples of light coming through the leaves inside the shade.
        for (let i = 0; i < 5; i++) {
          const dx = Math.sin(time / 1400 + i * 2 + p.ph) * POOL_RX * 0.5, dy = Math.cos(time / 1700 + i * 1.3) * POOL_RY * 0.4;
          g.fillStyle(lit(LEAF_LIT, 0.3), 0.08); g.fillEllipse(p.x + dx, p.y + dy, 10, 6);
        }
        // The pool the stalker is coming up in: rime creeping in from the rim.
        if (p.frostAt >= 0) {
          const k = clamp((time - p.frostAt) / Math.max(1, hopAt - p.frostAt), 0, 1);
          g.lineStyle(2 + k * 2, 0xdff4ff, 0.3 + k * 0.6); g.strokeEllipse(p.x, p.y, POOL_RX * 2 * (1.05 - k * 0.3), POOL_RY * 2 * (1.05 - k * 0.3));
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const r0 = 1 - k * 0.55;
            g.lineStyle(1.5, 0xeaf8ff, 0.5 + k * 0.4);
            g.lineBetween(p.x + Math.cos(a) * POOL_RX, p.y + Math.sin(a) * POOL_RY, p.x + Math.cos(a) * POOL_RX * r0, p.y + Math.sin(a) * POOL_RY * r0);
          }
        }
        if (burst < 1) {
          g.lineStyle(3 * (1 - burst), 0xdff4ff, 1 - burst); g.strokeEllipse(p.x, p.y, (POOL_RX * 2 + 40) * (0.6 + burst * 0.6), (POOL_RY * 2 + 30) * (0.6 + burst * 0.6));
        }
      }
      // Who is standing in shade: a faint cold ring under them.
      for (const f of [player, npc]) {
        if (!alive(f) || !inPool(f.x, f.y)) continue;
        g.lineStyle(1.5, 0xbfe4ff, 0.45); g.strokeEllipse(f.x, f.y + 14, 40, 14);
      }
    },

    drawAir(g, time) {
      // Leaf-tips at the top edge of each pool's tree, hanging into the yard.
      for (const p of pools) {
        for (let i = 0; i < 4; i++) {
          const x = p.x - 40 + i * 26 + Math.sin(time / 900 + i + p.ph) * 4, y = p.y - POOL_RY - 30 - (i % 2) * 8;
          g.fillStyle(LEAF, 0.55); g.fillEllipse(x, y, 16, 7);
        }
        // Ice-crystals rising out of a frosting pool.
        if (p.frostAt >= 0) {
          for (let i = 0; i < 8; i++) {
            const k = ((time - p.frostAt) / 500 + i / 8) % 1;
            const x = p.x + Math.cos(i * 2.1) * POOL_RX * 0.6, y = p.y + Math.sin(i * 2.1) * POOL_RY * 0.5 - k * 50;
            g.fillStyle(0xeaf8ff, 0.8 * (1 - k)); g.fillRect(x - 1, y - 3, 2, 6); g.fillRect(x - 3, y - 1, 6, 2);
          }
          glow(g, p.x, p.y, 40, 0xbfe4ff, 0.04, 3);
        }
      }
    },
  };
}

export const SHADE_STEP: GimmickDef = {
  id: 'umbral-shade-step',
  rules: 'Tree-shadows lie on the floor, all joined underneath. Dash out of one and you rise from the shadow you aim at, rime-nailing whoever stands there. Grim hops pool to pool — the frost shows where.',
  make,
};
