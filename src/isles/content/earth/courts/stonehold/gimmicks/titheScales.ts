import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { blockStack, burierSeal, shard, titheWeight } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, GRANITE, GRANITE_DARK, IRON_LIT, REGENT, SANDSTONE, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Tithe Scales — Weigher Ballast.
 *
 * A great brass balance stands over the yard, one pan for each fighter — yours on the left, his
 * on the right, each pan resting on the floor at the foot of its chain. Every hit you take drops a
 * tithe-stone into your pan. The beam tips toward the heavier side, and whoever's pan is heavier
 * is weighed down: slowed, and hurt more by every blow. Every so often Ballast calls the Weighing
 * and the heavier pan crashes down, hurting its fighter by the difference.
 *
 * The way out is the chain. Strike your own pan's chain and the pan tips and spills, every stone
 * in it skittering out across the floor at the other fighter. Let Ballast fill his pan and then
 * make him chase you from it; or take your licks, strike your chain, and pay him back the whole
 * Tithe at once.
 */

const PAN_R = 46;
/** The chain's strike radius, hung just above the pan's rim. */
const CHAIN_R = 44;
const MAX_STONES = 12;
const WEIGH_EVERY = 11000;
const WEIGH_WARN = 1600;

interface Pan { owner: Fighter; x: number; y: number; stones: number; lastAdd: number; spillAt: number }
interface Flung { x: number; y: number; vx: number; vy: number; at: number; target: Fighter; spin: number; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const fx = W / 2, fy = top + 26;
  const panY = top + 190;
  const pans: Pan[] = [
    { owner: player, x: fx - 300, y: panY, stones: 0, lastAdd: -9999, spillAt: -9999 },
    { owner: npc, x: fx + 300, y: panY, stones: 0, lastAdd: -9999, spillAt: -9999 },
  ];
  const panOf = (f: Fighter) => (f === player ? pans[0] : pans[1]);
  const flung: Flung[] = [];
  let tilt = 0;
  let nextWeigh = 0;
  let weighWarn = false;
  let weighAt = -9999;
  let started = false;
  let ownHit = false;

  const diff = () => pans[0].stones - pans[1].stones;
  /** How much heavier this fighter's pan is (0 if lighter). */
  const over = (f: Fighter) => Math.max(0, f === player ? diff() : -diff());

  function addStone(f: Fighter, time: number): void {
    const p = panOf(f);
    if (time - p.lastAdd < 350 || p.stones >= MAX_STONES) return;
    p.lastAdd = time;
    p.stones++;
    ctx.sfx('anvil');
  }

  function spill(f: Fighter, time: number): void {
    const p = panOf(f);
    if (p.stones <= 0 || time - p.spillAt < 800) return;
    const other = f === player ? npc : player;
    const a = Math.atan2(other.y - p.y, other.x - p.x);
    for (let i = 0; i < p.stones; i++) {
      const b = a + (i / Math.max(1, p.stones - 1) - 0.5) * 0.9 + (rng() - 0.5) * 0.08;
      const v = 300 + rng() * 80;
      flung.push({ x: p.x, y: p.y - 10, vx: Math.cos(b) * v, vy: Math.sin(b) * v, at: time, target: other, spin: rng() * 6, done: false });
    }
    ctx.float(p.x, p.y - 60, `SPILT ${p.stones}`, f === player ? '#a8e0ff' : '#ffb8a0');
    ctx.sfx('chain');
    p.stones = 0;
    p.spillAt = time;
  }

  // Each pan's chain is a thing its owner strikes; shots fly on through the links.
  const chains = pans.map((p) => ctx.target({
    x: p.x, y: p.y - 50, r: CHAIN_R, passThrough: true,
    onStruck: (by) => { if ((by === 'player') === (p.owner === player)) spill(p.owner, ctx.scene.time.now); },
  }));

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextWeigh = time + WEIGH_EVERY; }
      tilt += (clamp(diff() / 6, -1, 1) - tilt) * Math.min(1, dt * 4);
      // The Weighing.
      if (!weighWarn && time >= nextWeigh - WEIGH_WARN) { weighWarn = true; ctx.banner('BALLAST CALLS THE WEIGHING', '#e8c870'); ctx.sfx('countdown-tick'); }
      if (time >= nextWeigh) {
        nextWeigh = time + WEIGH_EVERY;
        weighWarn = false;
        weighAt = time;
        const d = diff();
        if (d !== 0) {
          const f = d > 0 ? player : npc;
          const dmg = Math.min(18, Math.abs(d) * 3);
          ownHit = true;
          if (f === player) tk.hitPlayer(dmg, f.x, f.y); else ctx.hit(f, dmg, f.x, f.y);
          ownHit = false;
          ctx.root(f, 600);
          ctx.float(f.x, f.y - 50, 'OVERWEIGHT', '#e8c870');
          ctx.sfx('gravity-slam');
        } else ctx.float(fx, fy + 60, 'EVEN WEIGHT', '#e8c870');
      }
      // Flung stones skitter at their target.
      for (const s of flung) {
        if (s.done) continue;
        s.x += s.vx * dt; s.y += s.vy * dt; s.spin += dt * 10;
        s.vx *= 1 - dt * 0.6; s.vy *= 1 - dt * 0.6;
        if (alive(s.target) && dist(s.x, s.y, s.target.x, s.target.y) < 24) {
          s.done = true;
          ownHit = true;
          if (s.target === player) tk.hitPlayer(2, s.x, s.y); else ctx.hit(s.target, 2, s.x, s.y);
          ownHit = false;
        }
        if (time - s.at > 1400 || s.x < 0 || s.x > W || s.y < top || s.y > H) s.done = true;
      }
      for (let i = flung.length - 1; i >= 0; i--) if (flung[i].done) flung.splice(i, 1);
    },

    onPlayerHurt() { if (!ownHit) addStone(player, ctx.scene.time.now); },
    onNpcHurt() { if (!ownHit) addStone(npc, ctx.scene.time.now); },

    destroy() { for (const c of chains) c.remove(); },

    playerSpeedMult() { return 1 - Math.min(0.4, over(player) * 0.06); },
    npcSpeedMult() { return 1 - Math.min(0.4, over(npc) * 0.06); },
    playerTakenMult() { return 1 + Math.min(0.45, over(player) * 0.06); },
    npcTakenMult() { return 1 + Math.min(0.45, over(npc) * 0.06); },

    npcSeek() {
      // Heavy: go and stand under his chain, so his next blow strikes it and spills the lot at you.
      const p = pans[1];
      if (p.stones >= 2 && over(npc) > 0) return { x: p.x - 20, y: p.y + 10 };
      if (p.stones >= 4) return { x: p.x - 20, y: p.y + 10 };
      return null;
    },

    drawGround(g, time) {
      for (const p of pans) {
        // The pan's footing: a shadow round where it rests.
        g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x, p.y + 10, PAN_R * 2.6, PAN_R * 0.9);
      }
      // The Weighing's shock under whoever was heavy.
      if (time - weighAt < 600) {
        const k = (time - weighAt) / 600;
        g.lineStyle(4 * (1 - k), BRASS_LIT, 1 - k); g.strokeEllipse(fx, H - 60, 900 * k, 200 * k);
      }
    },

    drawAir(g, time) {
      // The balance: a post, the beam tipped toward the heavier side, chains to each pan.
      const ang = tilt * 0.22;
      const half = 300;
      const lx = fx - Math.cos(ang) * half, ly = fy + Math.sin(ang) * half;
      const rx = fx + Math.cos(ang) * half, ry = fy - Math.sin(ang) * half;
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(fx - 8, fy, 16, 40);
      g.fillStyle(BRASS_DARK, 1); g.fillTriangle(fx - 22, fy + 40, fx + 22, fy + 40, fx, fy - 8);
      g.fillStyle(BRASS, 1); g.fillTriangle(fx - 18, fy + 38, fx + 18, fy + 38, fx, fy - 4);
      g.lineStyle(9, BRASS_DARK, 1); g.lineBetween(lx, ly, rx, ry);
      g.lineStyle(5, BRASS, 1); g.lineBetween(lx, ly, rx, ry);
      g.lineStyle(1.5, BRASS_LIT, 0.8); g.lineBetween(lx, ly - 2, rx, ry - 2);
      burierSeal(g, fx, fy, 9, REGENT, 1);
      // The pointer, swinging over a little scale.
      g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(fx, fy, fx + Math.sin(ang) * 30, fy - Math.cos(ang) * 30);
      for (const [p, ex, ey] of [[pans[0], lx, ly], [pans[1], rx, ry]] as [Pan, number, number][]) {
        const sag = (p === pans[0] ? 1 : -1) * tilt * 14;
        const py = p.y - 26 + Math.max(0, sag);
        const spilling = time - p.spillAt < 500;
        // Three chains from the beam's end down to the pan's rim.
        for (const k of [-1, 0, 1]) {
          const tx = p.x + k * PAN_R * 0.8, ty = py - (k === 0 ? 4 : 0);
          const n = 14;
          for (let i = 0; i <= n; i++) {
            const cx = ex + (tx - ex) * (i / n), cy = ey + (ty - ey) * (i / n);
            g.lineStyle(1.5, IRON_LIT, 0.9); g.strokeEllipse(cx, cy, 3, 4.5);
          }
        }
        // The pan: a broad brass dish, tipped and empty while spilling.
        const tip = spilling ? (p === pans[0] ? 0.4 : -0.4) * (1 - (time - p.spillAt) / 500) : 0;
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(p.x, py + 8, PAN_R * 2.1, 22 + tip * 10);
        g.fillStyle(BRASS, 1); g.fillEllipse(p.x, py + 4, PAN_R * 2, 20);
        g.fillStyle(dim(BRASS, 0.3), 1); g.fillEllipse(p.x, py + 2, PAN_R * 1.7, 13);
        g.fillStyle(BRASS_LIT, 0.6); g.fillEllipse(p.x - PAN_R * 0.5, py + 1, PAN_R * 0.5, 4);
        // The tithe-stones heaped in it.
        for (let i = 0; i < p.stones; i++) {
          const row = i < 5 ? 0 : i < 9 ? 1 : 2;
          const inRow = row === 0 ? i : row === 1 ? i - 5 : i - 9;
          const nIn = row === 0 ? 5 : row === 1 ? 4 : 3;
          const sx = p.x + (inRow - (nIn - 1) / 2) * 14, sy = py - row * 9;
          g.fillStyle(GRANITE_DARK, 1); g.fillRect(sx - 7, sy - 8, 13, 10);
          g.fillStyle(i % 2 ? GRANITE : SANDSTONE, 1); g.fillRect(sx - 7, sy - 9, 12, 8);
          g.fillStyle(lit(i % 2 ? GRANITE : SANDSTONE, 0.3), 1); g.fillRect(sx - 7, sy - 9, 12, 2);
        }
        // The owner's weight tag hanging off the rim.
        titheWeight(g, p.x + (p === pans[0] ? -PAN_R - 6 : PAN_R + 6), py + 24, 0.8);
      }
      for (const s of flung) shard(g, s.x, s.y, 5, s.spin, s.spin % 2 > 1 ? GRANITE : SANDSTONE);
      // Overweight fighters drag a stone of tithe behind them.
      for (const f of [player, npc]) {
        const o = over(f);
        if (!alive(f) || o <= 0) continue;
        g.lineStyle(1.5, IRON_LIT, 0.7); g.lineBetween(f.x, f.y + 6, f.x - 12, f.y + 22);
        blockStack(g, f.x - 14, f.y + 30, 1, Math.min(3, Math.ceil(o / 2)), () => 0.3);
      }
      // The Weighing's telegraph: the beam flashes.
      if (weighWarn) {
        const k = clamp(1 - (nextWeigh - time) / WEIGH_WARN, 0, 1);
        g.lineStyle(3, BRASS_LIT, 0.3 + 0.5 * Math.abs(Math.sin(time / 90)) * k); g.lineBetween(lx, ly, rx, ry);
      }
    },

    drawHud(g, time) {
      // Stone counts on two little slates, and the weighing clock between.
      for (const [p, x] of [[pans[0], 24], [pans[1], W - 24 - 96]] as [Pan, number][]) {
        g.fillStyle(0x2a2a30, 0.85); g.fillRoundedRect(x, top + 6, 96, 16, 5);
        for (let i = 0; i < MAX_STONES; i++) {
          g.fillStyle(i < p.stones ? (i % 2 ? GRANITE : SANDSTONE) : 0x44444c, i < p.stones ? 1 : 0.5);
          g.fillRect(x + 4 + i * 7.6, top + 9, 6, 10);
        }
      }
      const k = clamp(1 - (nextWeigh - time) / WEIGH_EVERY, 0, 1);
      g.fillStyle(0x2a2a30, 0.85); g.fillCircle(W / 2, top + 14, 10);
      g.fillStyle(BRASS, 0.9); g.slice(W / 2, top + 14, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
    },
  };
}

export const TITHE_SCALES: GimmickDef = {
  id: 'stonehold-tithe-scales',
  rules: 'Every hit you take drops a tithe-stone in your pan; the heavier side is slowed and takes more. Strike the chain of your own pan to spill its stones at your foe.',
  make,
};
