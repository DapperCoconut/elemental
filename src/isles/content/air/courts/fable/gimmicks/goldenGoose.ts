import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { GIM_GOOSE } from '../encounters';
import { FOE_C, GILT, GILT_LIT, INK, MINE_C, clamp, dist, frameClock, goldenEgg, goose, segDist } from '../util';

/**
 * Golden Goose — Goosegirl Hen's goose, Marigold, lays golden eggs on the green, and every egg is
 * owed to the King. **Walk over an egg to pick it up.** Each one you carry makes your blows land
 * harder — and makes you slower, because gold is heavy. Take a hit and an egg jolts loose and
 * rolls away for anyone to grab.
 *
 * Marigold can count. Every few seconds she stretches her neck, honks, and **charges whoever is
 * carrying the most eggs** — straight down a line she shows you first — bowling them over and
 * knocking two eggs loose.
 *
 * The rule the player can turn: greed is a target. Let Hen fill her apron, keep one fewer than
 * her, and the goose does your work. Or carry the most, hit hard, and sidestep the lane.
 */

type Side = 'p' | 'n';
interface Egg { x: number; y: number; vx: number; vy: number; at: number; readyAt: number }
type GState = 'walk' | 'honk' | 'charge' | 'shake';

const MAX_CARRY = 5;
const PICK_R = 26;

function makeGoldenGoose(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const tick = frameClock();
  const layEvery = hard ? 2200 : 2600;
  const chargeEvery = hard ? 5600 : 7000;
  const aimMs = hard ? 950 : 1150;
  const speed = hard ? 560 : 500;
  const t0 = ctx.scene.time.now;

  const gs = {
    x: W / 2, y: top + 140, dir: 1, ph: 0, state: 'walk' as GState, until: 0,
    tx: W / 2, ty: top + 200, ax: 1, ay: 0, travelled: 0, target: 'p' as Side, hitP: false, hitN: false,
  };
  let eggs: Egg[] = [];
  const carry: Record<Side, number> = { p: 0, n: 0 };
  let nextLay = t0 + 1200;
  let nextCharge = t0 + chargeEvery;
  let selfHit = false;
  let honkAt = -9999;
  const lostAt: Record<Side, number> = { p: -9999, n: -9999 };

  const fighter = (s: Side): Fighter => (s === 'p' ? ctx.player : ctx.npc);
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  const pickWalk = (): void => {
    gs.tx = clamp(gs.x + (ctx.rng() - 0.5) * 360, 80, W - 80);
    gs.ty = clamp(gs.y + (ctx.rng() - 0.5) * 240, top + 70, H - 60);
  };

  /** Knock `n` eggs out of a carrier: they roll out in a burst and can be grabbed after a beat. */
  const spill = (s: Side, n: number, time: number): void => {
    const f = fighter(s);
    const k = Math.min(n, carry[s]);
    for (let i = 0; i < k; i++) {
      const a = ctx.rng() * Math.PI * 2;
      eggs.push({ x: f.x, y: f.y + 10, vx: Math.cos(a) * 180, vy: Math.sin(a) * 120, at: time, readyAt: time + 500 });
    }
    carry[s] -= k;
    if (k > 0) { lostAt[s] = time; ctx.sfx('jackpot'); }
  };

  const hurt = (s: Side, amount: number): void => {
    if (selfHit || amount < 3 || carry[s] <= 0) return;
    spill(s, 1, ctx.scene.time.now);
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;

      // Eggs roll to a stop; carriers scoop them up.
      for (let i = eggs.length - 1; i >= 0; i--) {
        const e = eggs[i];
        e.x = clamp(e.x + e.vx * dt, 40, W - 40); e.y = clamp(e.y + e.vy * dt, top + 40, H - 40);
        e.vx *= Math.pow(0.04, dt); e.vy *= Math.pow(0.04, dt);
        if (time < e.readyAt) continue;
        for (const s of ['p', 'n'] as Side[]) {
          const f = fighter(s);
          if (!alive(f) || carry[s] >= MAX_CARRY || dist(f.x, f.y + 10, e.x, e.y) > PICK_R) continue;
          carry[s]++;
          eggs.splice(i, 1);
          ctx.float(f.x, f.y - 50, `GOLD ×${carry[s]}`, s === 'p' ? '#ffe08a' : '#ffc070');
          ctx.sfx('money');
          break;
        }
      }

      if (gs.state === 'walk') {
        const d = dist(gs.x, gs.y, gs.tx, gs.ty);
        if (d < 8) pickWalk();
        else {
          const k = Math.min(1, (70 * dt) / d);
          gs.x += (gs.tx - gs.x) * k; gs.y += (gs.ty - gs.y) * k;
          gs.dir = gs.tx > gs.x ? 1 : -1; gs.ph += dt * 9;
        }
        if (time >= nextLay && eggs.length < 6) {
          nextLay = time + layEvery;
          eggs.push({ x: gs.x - gs.dir * 16, y: gs.y + 8, vx: -gs.dir * 40, vy: 0, at: time, readyAt: time + 300 });
          ctx.sfx('boing');
        }
        if (time >= nextCharge) {
          nextCharge = time + chargeEvery;
          if (carry.p === 0 && carry.n === 0) {
            // Nobody greedy: she honks at nothing and lays a spare.
            honkAt = time;
            eggs.push({ x: gs.x, y: gs.y + 8, vx: 0, vy: 60, at: time, readyAt: time + 300 });
          } else {
            gs.target = carry.p > carry.n ? 'p' : carry.n > carry.p ? 'n'
              : dist(gs.x, gs.y, ctx.player.x, ctx.player.y) <= dist(gs.x, gs.y, ctx.npc.x, ctx.npc.y) ? 'p' : 'n';
            gs.state = 'honk'; gs.until = time + ctx.tk.warn(aimMs); honkAt = time;
            ctx.float(gs.x, gs.y - 44, 'HONK!', '#ffffff');
            ctx.sfx('screech');
          }
        }
      } else if (gs.state === 'honk') {
        const t = fighter(gs.target);
        const elapsed = ctx.tk.warn(aimMs) - (gs.until - time);
        if (elapsed < ctx.tk.warn(aimMs) * 0.65) { gs.ax = t.x - gs.x; gs.ay = t.y - gs.y; }
        gs.dir = gs.ax >= 0 ? 1 : -1;
        if (time >= gs.until) {
          const L = Math.hypot(gs.ax, gs.ay) || 1;
          gs.ax /= L; gs.ay /= L; gs.travelled = 0; gs.hitP = false; gs.hitN = false;
          gs.state = 'charge';
          ctx.sfx('whoosh');
        }
      } else if (gs.state === 'charge') {
        const step = speed * dt;
        gs.x += gs.ax * step; gs.y += gs.ay * step; gs.travelled += step; gs.ph += dt * 30;
        for (const s of ['p', 'n'] as Side[]) {
          const f = fighter(s);
          if (!alive(f) || (s === 'p' ? gs.hitP : gs.hitN) || dist(f.x, f.y, gs.x, gs.y) > 34) continue;
          if (s === 'p') gs.hitP = true; else gs.hitN = true;
          selfHit = true; ctx.hit(f, hard ? 14 : 12, f.x, f.y); selfHit = false;
          ctx.nudge(f, gs.ax * 60 - gs.ay * 30, gs.ay * 60 + gs.ax * 30);
          spill(s, 2, time);
          ctx.float(f.x, f.y - 52, 'GOOSED', s === 'p' ? '#ffb27a' : '#9ae8ff');
        }
        const out = gs.x < 50 || gs.x > W - 50 || gs.y < top + 40 || gs.y > H - 40;
        if (out || gs.travelled > 720) {
          gs.x = clamp(gs.x, 50, W - 50); gs.y = clamp(gs.y, top + 40, H - 40);
          gs.state = 'shake'; gs.until = time + 700;
        }
      } else if (time >= gs.until) {
        gs.state = 'walk'; pickWalk();
      }
    },

    // Every carried egg: +10% to your blows, and 7% off your stride.
    npcTakenMult: () => 1 + carry.p * 0.1,
    playerTakenMult: () => 1 + carry.n * 0.1,
    playerSpeedMult: () => 1 - carry.p * 0.07,
    npcSpeedMult: () => 1 - carry.n * 0.07,

    onPlayerHurt(amount) { hurt('p', amount); },
    onNpcHurt(amount) { hurt('n', amount); },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      if ((gs.state === 'honk' || gs.state === 'charge') && gs.target === 'n') {
        // Step off the line, sideways.
        const nx = -gs.ay, ny = gs.ax;
        const side = (n.x - gs.x) * nx + (n.y - gs.y) * ny >= 0 ? 1 : -1;
        if (segDist(n.x, n.y, gs.x, gs.y, gs.x + gs.ax * 800, gs.y + gs.ay * 800) < 90 || gs.state === 'honk') {
          return { x: clamp(n.x + nx * side * 150, 60, W - 60), y: clamp(n.y + ny * side * 150, top + 50, H - 50) };
        }
      }
      // Greedy, but not so greedy she becomes the goose's mark.
      if (carry.n >= MAX_CARRY || carry.n > carry.p + 1) return null;
      let best: Egg | null = null, bd = Infinity;
      for (const e of eggs) { const d = dist(n.x, n.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      return best && bd < 420 ? { x: best.x, y: best.y - 10 } : null;
    },

    drawGround(g, time) {
      const ts = time / 1000;
      for (const e of eggs) goldenEgg(g, e.x, e.y, 1.1, ts + e.at, time < e.readyAt ? 0.6 : 1);
      // The charge lane while she aims.
      if (gs.state === 'honk') {
        const c = clamp(1 - (gs.until - time) / ctx.tk.warn(aimMs), 0, 1);
        const L = Math.hypot(gs.ax, gs.ay) || 1;
        const ux = gs.ax / L, uy = gs.ay / L, nx = -uy, ny = ux, hw = 34, len = 720;
        const col = gs.target === 'p' ? 0xff7a4a : 0x6ac8ff;
        g.fillStyle(col, 0.07 + c * 0.13);
        g.fillTriangle(gs.x + nx * hw, gs.y + ny * hw, gs.x - nx * hw, gs.y - ny * hw, gs.x + ux * len + nx * hw, gs.y + uy * len + ny * hw);
        g.fillTriangle(gs.x - nx * hw, gs.y - ny * hw, gs.x + ux * len - nx * hw, gs.y + uy * len - ny * hw, gs.x + ux * len + nx * hw, gs.y + uy * len + ny * hw);
        // Webbed footprints marching down the lane.
        for (let d = 30; d < len * c; d += 34) {
          const x = gs.x + ux * d + nx * ((d / 34) % 2 ? 8 : -8), y = gs.y + uy * d + ny * ((d / 34) % 2 ? 8 : -8);
          g.fillStyle(0xe08a2a, 0.5);
          g.fillTriangle(x + ux * 7, y + uy * 7, x - ux * 3 + nx * 6, y - uy * 3 + ny * 6, x - ux * 3 - nx * 6, y - uy * 3 - ny * 6);
        }
        g.lineStyle(2, col, 0.4 + c * 0.5);
        g.lineBetween(gs.x + nx * hw, gs.y + ny * hw, gs.x + ux * len + nx * hw, gs.y + uy * len + ny * hw);
        g.lineBetween(gs.x - nx * hw, gs.y - ny * hw, gs.x + ux * len - nx * hw, gs.y + uy * len - ny * hw);
      }
      if (gs.state === 'charge') {
        for (let i = 0; i < 6; i++) {
          const ph = ((time / 120) + i / 6) % 1;
          g.fillStyle(0xffffff, 0.5 * (1 - ph)); g.fillCircle(gs.x - gs.ax * (24 + ph * 50) + Math.sin(i * 2) * 8, gs.y + 10 - gs.ay * (24 + ph * 50), 3);
        }
      }
    },

    drawAir(g, time) {
      const honk = gs.state === 'honk' ? 1 : time - honkAt < 500 ? 1 - (time - honkAt) / 500 : 0;
      goose(g, gs.x, gs.y, gs.state === 'charge' || gs.state === 'honk' ? (gs.ax >= 0 ? 1 : -1) : gs.dir, 1.6, gs.ph, true, honk);
      // Honk rings.
      if (gs.state === 'honk' && Math.floor(time / 160) % 2 === 0) {
        g.lineStyle(2, 0xffffff, 0.6); g.beginPath(); g.arc(gs.x + gs.dir * 30, gs.y - 34, 16, -0.8, 0.8, gs.dir < 0); g.strokePath();
      }
      // Feathers flying off a charge.
      if (gs.state === 'shake') { for (let i = 0; i < 4; i++) { g.fillStyle(0xfff4c0, 0.8); g.fillEllipse(gs.x + Math.sin(time / 90 + i * 2) * 26, gs.y - 30 - i * 6, 7, 3); } }
      // Eggs riding on each carrier: a little gold stack over the head.
      for (const s of ['p', 'n'] as Side[]) {
        const f = fighter(s);
        if (!alive(f)) continue;
        for (let i = 0; i < carry[s]; i++) goldenEgg(g, f.x - (carry[s] - 1) * 6 + i * 12, f.y - 52, 0.7, time / 1000 + i, 0.95);
        // Whom she is after.
        if (gs.state === 'honk' && gs.target === s) {
          const col = s === 'p' ? 0xff7a4a : 0x6ac8ff;
          g.lineStyle(2, col, 0.9); g.strokeCircle(f.x, f.y - 70, 9);
          g.fillStyle(col, 0.9); g.fillTriangle(f.x - 6, f.y - 64, f.x + 6, f.y - 64, f.x, f.y - 56);
        }
        if (time - lostAt[s] < 400) { g.lineStyle(2, GILT_LIT, 1 - (time - lostAt[s]) / 400); g.strokeCircle(f.x, f.y, 20 + (time - lostAt[s]) / 8); }
      }
    },

    drawHud(g) {
      // Egg tallies: yours left, Hen's right, the greedier side lit.
      const x = W / 2, y = top + 14;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 92, y - 10, 184, 24, 6);
      for (const [s, dx, col] of [['p', -1, MINE_C], ['n', 1, FOE_C]] as const) {
        g.fillStyle(col, 1); g.fillCircle(x + dx * 82, y + 2, 4);
        for (let i = 0; i < MAX_CARRY; i++) {
          const ex = x + dx * (68 - i * 12);
          g.fillStyle(i < carry[s] ? GILT : 0x000000, i < carry[s] ? 1 : 0.35); g.fillEllipse(ex, y + 2, 8, 11);
          g.lineStyle(1, INK, 0.7); g.strokeEllipse(ex, y + 2, 8, 11);
        }
      }
      g.fillStyle(0xf4e0a0, 1); g.fillCircle(x, y + 2, 6);
      g.fillStyle(0xf0902a, 1); g.fillTriangle(x + 4, y, x + 4, y + 4, x + 10, y + 2);
    },
  };
}

export const GOLDEN_GOOSE: GimmickDef = {
  id: GIM_GOOSE,
  rules: 'Walk over golden eggs to carry them: each makes your hits 10% harder and you slower. A hit knocks one loose. The goose charges whoever carries the most.',
  make: makeGoldenGoose,
};
