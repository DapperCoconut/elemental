import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ABY, alive, clamp, dist, segDist } from '../palette';

/**
 * Hooked and Landed — Gaffman Tull's fight (the trench fisher the prince paid in hooks).
 *
 * Four whalebone rods are socketed into the arena's walls, the way Tull fishes the trench.
 * By turns a rod **casts**: a baited hook flies out and drops where its quarry stands (a ripple
 * marks the spot while it is in the air), sits a moment with its line laid taut back to the rod
 * — the reel path, drawn — and then **reels in** fast. A hook that drops on you, or sweeps past
 * you on the reel, catches you and drags you to the rod, where you are **landed**: struck and
 * stunned at the wall. A dash or blink at the right moment slips the barb.
 *
 * The rods are not Tull's. A rod casts at the player unless someone has struck it: strike a rod
 * and its next cast goes for your foe; Tull strikes them back to turn them on you. Take the rods
 * and let him dodge his own trade.
 *
 * Halfway Tull **sets the longline**: two rods cast at once and the reel runs faster.
 */

const ID = fallenId('abyssal', 'longline');
const CAST_EVERY = 2700;
const CAST_EVERY_LONG = 2300;
const FLY_MS = 760;
const SIT_MS = 560;
const REEL = 300;
const REEL_LONG = 380;
const DROP_R = 36;
const CATCH_R = 26;
const BARB_DMG = 6;
const LAND_DMG = 16;
const LAND_STUN = 650;

type G = Parameters<NonNullable<EncounterGimmick['drawGround']>>[0];
type Owner = 'none' | 'player' | 'npc';

interface Rod { x: number; y: number; ax: number; ay: number; owner: Owner; target: StrikeTarget | null; reelSpin: number; lockUntil: number }
interface Hook { rod: Rod; phase: 'fly' | 'sit' | 'reel'; since: number; fromX: number; fromY: number; x: number; y: number; toX: number; toY: number; caught: Fighter | null }

export const LONGLINE: GimmickDef = {
  id: ID,
  rules: 'Rods cast hooks where you stand, then reel in along the line — caught, you are dragged and landed. Dash to slip it. Strike a rod to cast it at Tull.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const midY = top + (H - top) / 2;
    const cx = W / 2;
    const rodAt = (x: number, y: number): Rod => {
      const a = Math.atan2(midY - y, cx - x);
      return { x, y, ax: Math.cos(a), ay: Math.sin(a), owner: 'none', target: null, reelSpin: 0, lockUntil: 0 };
    };
    const rods: Rod[] = [rodAt(46, midY - 40), rodAt(W - 46, midY + 40), rodAt(cx + 120, top + 26), rodAt(cx - 120, H - 30)];
    const hooks: Hook[] = [];
    let now = 0;
    let nextAt = -1;
    let turn = 0;
    let long = false;

    const tip = (r: Rod): { x: number; y: number } => ({ x: r.x + r.ax * 56, y: r.y + r.ay * 56 - 18 });
    const hooked = (f: Fighter): boolean => hooks.some((h) => h.caught === f);
    const other = (f: Fighter): Fighter => (f === ctx.player ? ctx.npc : ctx.player);

    for (const r of rods) {
      r.target = ctx.target({
        x: r.x + r.ax * 20, y: r.y + r.ay * 20, r: 26,
        onStruck: (by) => {
          if (now < r.lockUntil) return;
          r.lockUntil = now + 700;
          r.owner = by;
          ctx.sfx('whip');
          ctx.flash(r.x, r.y, by === 'player' ? ABY.membrane : 0xffa040);
        },
      });
    }

    const cast = (r: Rod): void => {
      if (hooks.some((h) => h.rod === r)) return;
      const quarry = r.owner === 'player' ? ctx.npc : ctx.player;
      r.owner = 'none';
      const tp = tip(r);
      const x = clamp(quarry.x + (ctx.rng() - 0.5) * 50, 50, W - 50);
      const y = clamp(quarry.y + (ctx.rng() - 0.5) * 50, top + 30, H - 30);
      hooks.push({ rod: r, phase: 'fly', since: now, fromX: tp.x, fromY: tp.y, x: tp.x, y: tp.y, toX: x, toY: y, caught: null });
      ctx.sfx('whoosh');
    };

    const catchOn = (h: Hook, f: Fighter, dmg: number): void => {
      if (!alive(f) || hooked(f) || ctx.isAirborne(f)) return;
      h.caught = f;
      ctx.hit(f, dmg, f.x, f.y);
      ctx.sfx('trap-snap');
    };

    return {
      update(time: number, dtIn: number) {
        const dt = Math.min(0.05, dtIn);
        now = time;
        if (nextAt < 0) nextAt = time + 1200;
        if (!long && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          long = true;
          ctx.banner('THE LONGLINE IS SET', '#9fe4ff');
          ctx.sfx('reload');
        }
        if (time >= nextAt) {
          nextAt = time + (long ? CAST_EVERY_LONG : CAST_EVERY);
          cast(rods[turn % rods.length]);
          if (long) cast(rods[(turn + 2) % rods.length]);
          turn += 1 + Math.floor(ctx.rng() * 2);
        }
        for (const r of rods) if (hooks.some((h) => h.rod === r && h.phase === 'reel')) r.reelSpin += dt * 18;
        for (let i = hooks.length - 1; i >= 0; i--) {
          const h = hooks[i];
          const tp = tip(h.rod);
          if (h.phase === 'fly') {
            const k = (time - h.since) / FLY_MS;
            h.x = h.fromX + (h.toX - h.fromX) * k; h.y = h.fromY + (h.toY - h.fromY) * k;
            if (k >= 1) {
              h.phase = 'sit'; h.since = time; h.x = h.toX; h.y = h.toY;
              ctx.sfx('splash');
              for (const f of [ctx.player, ctx.npc]) if (dist(f.x, f.y, h.x, h.y) < DROP_R) { catchOn(h, f, BARB_DMG); break; }
            }
          } else if (h.phase === 'sit') {
            if (time - h.since >= SIT_MS) { h.phase = 'reel'; h.since = time; ctx.sfx('chain'); }
          } else {
            const speed = long ? REEL_LONG : REEL;
            const d = dist(h.x, h.y, tp.x, tp.y);
            const step = Math.min(d, speed * dt);
            h.x += ((tp.x - h.x) / (d || 1)) * step; h.y += ((tp.y - h.y) / (d || 1)) * step;
            if (!h.caught) {
              for (const f of [ctx.player, ctx.npc]) if (dist(f.x, f.y, h.x, h.y) < CATCH_R) { catchOn(h, f, BARB_DMG); break; }
            }
            if (d < 30) {
              const f = h.caught;
              if (f && alive(f)) {
                ctx.hit(f, LAND_DMG, f.x, f.y);
                ctx.stun(f, LAND_STUN);
                ctx.nudge(f, (cx - f.x) * 0.25, (midY - f.y) * 0.25);
                ctx.flash(f.x, f.y, ABY.membrane);
                ctx.sfx('stone-slam');
              }
              hooks.splice(i, 1);
              continue;
            }
          }
          const f = h.caught;
          if (f) {
            // A dash or a blink tears the barb free; otherwise the line has them.
            if (ctx.dashing(f) || !alive(f)) {
              h.caught = null;
              ctx.sfx('snap-back');
              ctx.flash(f.x, f.y, 0xe8e0c8);
            } else {
              ctx.nudge(f, h.x - f.x, h.y - f.y);
            }
          }
        }
      },

      npcSeek() {
        const n = ctx.npc;
        // Step off any laid line before it reels.
        for (const h of hooks) {
          if (h.phase === 'fly') {
            if (dist(n.x, n.y, h.toX, h.toY) < DROP_R + 50) {
              const a = Math.atan2(n.y - h.toY, n.x - h.toX);
              return { x: n.x + Math.cos(a) * 110, y: n.y + Math.sin(a) * 110 };
            }
            continue;
          }
          const tp = tip(h.rod);
          if (!h.caught && segDist(n.x, n.y, h.x, h.y, tp.x, tp.y) < CATCH_R + 46) {
            const lx = tp.x - h.x, ly = tp.y - h.y, L = Math.hypot(lx, ly) || 1;
            const nx = -ly / L, ny = lx / L;
            const side = (n.x - h.x) * nx + (n.y - h.y) * ny >= 0 ? 1 : -1;
            return { x: n.x + nx * side * 100, y: n.y + ny * side * 100 };
          }
        }
        // Then take back a rod the player has turned, or one not yet his.
        let best: Rod | null = null;
        for (const r of rods) {
          if (r.owner === 'npc') continue;
          const d = dist(n.x, n.y, r.x, r.y);
          if (d < 420 && (!best || r.owner === 'player' || d < dist(n.x, n.y, best.x, best.y))) best = r;
        }
        return best ? { x: best.x + best.ax * 60, y: best.y + best.ay * 60 } : null;
      },

      drawGround(g, time) {
        for (const h of hooks) {
          if (h.phase === 'fly') {
            // Where it will drop: ripples closing on the spot.
            const k = (time - h.since) / FLY_MS;
            g.lineStyle(2, ABY.membrane, 0.35 + 0.5 * k); g.strokeCircle(h.toX, h.toY, DROP_R + (1 - k) * 40);
            g.lineStyle(1, ABY.membrane, 0.4); g.strokeEllipse(h.toX, h.toY, DROP_R * 1.2, DROP_R * 0.5);
            g.fillStyle(ABY.membraneDim, 0.12); g.fillCircle(h.toX, h.toY, DROP_R);
          } else {
            // The reel path, laid on the floor as a lane of disturbed silt.
            const tp = tip(h.rod);
            const a = Math.atan2(tp.y - h.y, tp.x - h.x), nx = -Math.sin(a), ny = Math.cos(a);
            const w = CATCH_R;
            g.fillStyle(ABY.membraneDim, h.phase === 'sit' ? 0.16 : 0.1);
            g.fillTriangle(h.x + nx * w, h.y + ny * w, h.x - nx * w, h.y - ny * w, tp.x + nx * w, tp.y + ny * w);
            g.fillTriangle(h.x - nx * w, h.y - ny * w, tp.x + nx * w, tp.y + ny * w, tp.x - nx * w, tp.y - ny * w);
            const L = dist(h.x, h.y, tp.x, tp.y);
            for (let s = 20; s < L; s += 30) {
              const px = h.x + Math.cos(a) * s, py = h.y + Math.sin(a) * s;
              g.lineStyle(2, ABY.membrane, 0.4);
              g.lineBetween(px - Math.cos(a) * 6 + nx * 7, py - Math.sin(a) * 6 + ny * 7, px, py);
              g.lineBetween(px - Math.cos(a) * 6 - nx * 7, py - Math.sin(a) * 6 - ny * 7, px, py);
            }
          }
        }
        for (const r of rods) drawSocket(g, r);
      },

      drawAir(g, time) {
        for (const r of rods) drawRod(g, r, time / 1000);
        for (const h of hooks) {
          const tp = tip(h.rod);
          g.lineStyle(1.5, 0xe8e0c8, 0.85);
          if (h.phase === 'fly') {
            // Line paying out in an arc behind the flying hook.
            const k = (time - h.since) / FLY_MS;
            const lift = Math.sin(k * Math.PI) * 70;
            g.beginPath(); g.moveTo(tp.x, tp.y);
            for (let i = 1; i <= 12; i++) {
              const u = i / 12;
              g.lineTo(tp.x + (h.x - tp.x) * u, tp.y + (h.y - tp.y) * u - lift * u - Math.sin(u * Math.PI) * 14);
            }
            g.strokePath();
            drawHook(g, h.x, h.y - lift, time / 1000, null);
          } else {
            const sag = h.phase === 'sit' ? 10 : 0;
            g.beginPath(); g.moveTo(tp.x, tp.y);
            for (let i = 1; i <= 10; i++) {
              const u = i / 10;
              g.lineTo(tp.x + (h.x - tp.x) * u, tp.y + (h.y - tp.y) * u + Math.sin(u * Math.PI) * sag);
            }
            g.strokePath();
            if (h.phase === 'reel') { g.lineStyle(1, 0xffffff, 0.5 + Math.sin(time / 30) * 0.3); g.lineBetween(tp.x, tp.y, h.x, h.y); }
            drawHook(g, h.x, h.y, time / 1000, h.caught);
          }
        }
      },

      drawHud(g) {
        // Four rod pips: whose turn each rod is on.
        const y = top + 16;
        for (let i = 0; i < rods.length; i++) {
          const r = rods[i];
          const x = W / 2 - 45 + i * 30;
          const c = r.owner === 'player' ? ABY.membrane : r.owner === 'npc' ? 0xffa040 : ABY.boneMid;
          g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 11);
          g.lineStyle(3, c, 1); g.lineBetween(x - 6, y + 6, x + 5, y - 6);
          g.lineStyle(1.5, 0xe8e0c8, 1); g.beginPath(); g.arc(x + 4, y + 2, 3, 0, Math.PI, false); g.strokePath();
          if (hooks.some((h) => h.rod === r)) { g.lineStyle(1.5, 0xffffff, 0.8); g.strokeCircle(x, y, 10); }
        }
      },

      destroy() { for (const r of rods) r.target?.remove(); hooks.length = 0; },
    };
  },
};

/** A vertebra socket in the wall that a rod is set into. */
function drawSocket(g: G, r: Rod): void {
  g.fillStyle(0x000000, 0.4); g.fillEllipse(r.x + 2, r.y + 6, 44, 16);
  g.fillStyle(ABY.boneShadow, 1); g.fillEllipse(r.x, r.y + 2, 40, 18);
  g.fillStyle(ABY.boneMid, 1); g.fillEllipse(r.x, r.y, 36, 14);
  g.fillStyle(ABY.bone, 1); g.fillEllipse(r.x - 3, r.y - 2, 22, 7);
  g.fillStyle(ABY.boneShadow, 1); g.fillCircle(r.x, r.y, 5);
}

/** The whalebone rod itself: tapered shaft, line guides, the brass reel, and a pennant for whoever turned it. */
function drawRod(g: G, r: Rod, t: number): void {
  const bx = r.x, by = r.y - 2;
  const tx = r.x + r.ax * 56, ty = r.y + r.ay * 56 - 18;
  g.lineStyle(6, ABY.boneShadow, 1); g.lineBetween(bx, by, tx, ty);
  g.lineStyle(4, ABY.bone, 1); g.lineBetween(bx, by, (bx + tx) / 2, (by + ty) / 2);
  g.lineStyle(2.5, ABY.bone, 1); g.lineBetween((bx + tx) / 2, (by + ty) / 2, tx, ty);
  for (let i = 1; i <= 3; i++) {
    const u = i / 4;
    g.lineStyle(1, ABY.brass, 1); g.strokeCircle(bx + (tx - bx) * u, by + (ty - by) * u - 3, 2);
  }
  // The reel.
  const rx = bx + (tx - bx) * 0.2, ry = by + (ty - by) * 0.2 + 6;
  g.fillStyle(ABY.brassDark, 1); g.fillCircle(rx, ry, 7);
  g.fillStyle(ABY.brass, 1); g.fillCircle(rx, ry, 5);
  for (let i = 0; i < 3; i++) {
    const a = r.reelSpin + (i / 3) * Math.PI * 2;
    g.lineStyle(1, ABY.brassDark, 1); g.lineBetween(rx, ry, rx + Math.cos(a) * 5, ry + Math.sin(a) * 5);
  }
  g.lineStyle(1.5, ABY.iron, 1); g.lineBetween(rx, ry, rx + Math.cos(r.reelSpin) * 9, ry + Math.sin(r.reelSpin) * 9);
  // The tip bell.
  g.fillStyle(ABY.brass, 1); g.fillTriangle(tx - 3, ty + 4, tx + 3, ty + 4, tx, ty - 2);
  if (r.owner !== 'none') {
    const c = r.owner === 'player' ? ABY.membrane : 0xffa040;
    const px = bx + (tx - bx) * 0.6, py = by + (ty - by) * 0.6;
    const flap = Math.sin(t * 6) * 3;
    g.fillStyle(c, 0.95); g.fillTriangle(px, py, px, py - 10, px + 14, py - 5 + flap);
    g.fillStyle(mixC(c, 0x000000, 0.4), 1); g.fillTriangle(px, py - 10, px + 14, py - 5 + flap, px + 6, py - 7);
  }
}

/** A barbed whalebone hook with a cluster of glow-roe bait — or, with a catch, the line taut into them. */
function drawHook(g: G, x: number, y: number, t: number, caught: Fighter | null): void {
  if (caught) {
    g.lineStyle(1.5, 0xe8e0c8, 0.9); g.lineBetween(x, y, caught.x, caught.y - 10);
  }
  g.lineStyle(3, ABY.boneShadow, 1); g.beginPath(); g.arc(x, y + 6, 7, Math.PI * 0.1, Math.PI * 1.05, false); g.strokePath();
  g.lineStyle(2, ABY.bone, 1); g.beginPath(); g.arc(x, y + 6, 7, Math.PI * 0.1, Math.PI * 1.05, false); g.strokePath();
  g.lineStyle(2, ABY.bone, 1); g.lineBetween(x - 7, y + 5, x - 7, y - 6);
  g.fillStyle(ABY.bone, 1); g.fillTriangle(x + 7, y + 8, x + 9, y + 1, x + 4, y + 4);
  if (!caught) {
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0xff9a3a, 0.4); g.fillCircle(x + 5 + (i % 2) * 3, y + 11 + Math.floor(i / 2) * 3, 3.5);
      g.fillStyle(0xffc07a, 1); g.fillCircle(x + 5 + (i % 2) * 3, y + 11 + Math.floor(i / 2) * 3, 1.8 + Math.sin(t * 5 + i) * 0.3);
    }
  }
}
