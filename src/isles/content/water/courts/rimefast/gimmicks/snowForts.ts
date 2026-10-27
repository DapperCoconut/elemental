import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { Clock, R, RCOL, alive, dist, drawSnowball, jit, segHitsRect } from '../util';

/**
 * SNOW FORTS — Quartermaster Drift.
 *
 * Two snow forts face each other across the ice — yours on the west, Drift's on the east — each
 * a wall of packed blocks with wings. The walls are real: you cannot walk through them, and any
 * hit that has to pass through a standing block to reach you is mostly soaked by the snow (and
 * chips the block). Three chips and a block slumps into a drift.
 *
 * Snowball heaps lie in the no-man's-land between. Walk over one to scoop up its snowballs; while
 * you carry some you throw them at your foe on your own, a few a second. A clear line means a
 * fast straight throw; a wall in the way means a lob over it, slower, with its landing shown on
 * the ice. A snowball stings and slows whoever it catches. Stand beside a chipped block to pack
 * it back up — Drift does, between volleys.
 *
 * Drift is a quartermaster: he keeps his wall in repair and his arms full. Out-scoop him in the
 * middle, then knock his wall flat before he can pack it.
 */

type Side = 'player' | 'npc';

interface Block { x: number; y: number; w: number; h: number; hp: number; owner: Side; seed: number; packT: number; hitAt: number }
interface Heap { x: number; y: number; balls: number; regrowT: number }
interface Ball {
  from: Side;
  x0: number; y0: number; x1: number; y1: number;
  at: number; landAt: number;
  lob: boolean;
  done: boolean;
}

const BLOCK_W = 30;
const BLOCK_H = 42;
const BLOCK_HP = 3;
const COVER_MULT = 0.3;
const CARRY_MAX = 5;
const THROW_MS = 820;
const STRAIGHT_SPEED = 560;
const LOB_MS = 900;

export const SNOW_FORTS: GimmickDef = {
  id: 'rimefast-snow-forts',
  rules: 'Snow-fort walls block movement and soak hits through them (three chips and a block falls). Scoop snowballs from the heaps — you throw them yourself. Stand by a chipped block to pack it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const midY = top + (H - top) / 2;
    const blocks: Block[] = [];
    const buildFort = (wallX: number, back: 1 | -1, owner: Side): void => {
      // The front wall: a column of blocks with a firing gap in the middle.
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        blocks.push({ x: wallX - BLOCK_W / 2, y: midY + i * BLOCK_H - BLOCK_H / 2, w: BLOCK_W, h: BLOCK_H, hp: BLOCK_HP, owner, seed: rng() * 100, packT: 0, hitAt: -9999 });
      }
      // Wings going back from the ends of the wall.
      for (const end of [-1, 1]) {
        for (let k = 1; k <= 2; k++) {
          blocks.push({
            x: wallX + back * k * BLOCK_W - BLOCK_W / 2, y: midY + end * 3 * BLOCK_H - BLOCK_H / 2,
            w: BLOCK_W, h: BLOCK_H, hp: BLOCK_HP, owner, seed: rng() * 100, packT: 0, hitAt: -9999,
          });
        }
      }
    };
    const westWall = 250, eastWall = W - 250;
    buildFort(westWall, -1, 'player');
    buildFort(eastWall, 1, 'npc');
    const heaps: Heap[] = [
      { x: W / 2, y: top + 70, balls: 3, regrowT: 0 },
      { x: W / 2, y: H - 60, balls: 3, regrowT: 0 },
      { x: W / 2 - 130, y: midY, balls: 2, regrowT: 0 },
      { x: W / 2 + 130, y: midY, balls: 2, regrowT: 0 },
    ];
    const balls: Ball[] = [];
    const carry: Record<Side, number> = { player: 1, npc: 1 };
    const nextThrow: Record<Side, number> = { player: 0, npc: 0 };
    const slowUntil: Record<Side, number> = { player: 0, npc: 0 };
    const ballDamage = ctx.hard ? 9 : 7;
    let now = 0;
    /** True while a snowball's own damage is landing — it must not chip a wall it flew over. */
    let ownHit = false;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const other = (s: Side): Side => (s === 'player' ? 'npc' : 'player');
    const standing = (): Block[] => blocks.filter((b) => b.hp > 0);

    /** First standing block on the line between two points, nearest the start. */
    const blockOnLine = (ax: number, ay: number, bx: number, by: number): Block | null => {
      let best: Block | null = null, bd = Infinity;
      for (const b of standing()) {
        if (!segHitsRect(ax, ay, bx, by, b.x, b.y, b.w, b.h)) continue;
        const d = dist(ax, ay, b.x + b.w / 2, b.y + b.h / 2);
        if (d < bd) { bd = d; best = b; }
      }
      return best;
    };

    const chip = (b: Block): void => {
      b.hp--;
      b.hitAt = now;
      b.packT = 0;
      if (b.hp <= 0) {
        ctx.sfx('stone-slam');
        ctx.float(b.x + b.w / 2, b.y - 8, 'WALL DOWN', b.owner === 'player' ? RCOL.red : RCOL.green);
      } else ctx.sfx('hit-light');
    };

    /** Keep fighters out of standing blocks — the walls are packed hard. */
    const pushOut = (f: Fighter): void => {
      const r = 18;
      for (const b of standing()) {
        const cx = Math.max(b.x, Math.min(b.x + b.w, f.x));
        const cy = Math.max(b.y, Math.min(b.y + b.h, f.y));
        const dx = f.x - cx, dy = f.y - cy;
        const d = Math.hypot(dx, dy);
        if (d >= r) continue;
        if (d > 0.001) ctx.nudge(f, (dx / d) * (r - d), (dy / d) * (r - d));
        else {
          // Dead centre inside a block: out by the shortest side.
          const left = f.x - b.x, right = b.x + b.w - f.x, up = f.y - b.y, down = b.y + b.h - f.y;
          const m = Math.min(left, right, up, down);
          if (m === left) ctx.nudge(f, -(left + r), 0);
          else if (m === right) ctx.nudge(f, right + r, 0);
          else if (m === up) ctx.nudge(f, 0, -(up + r));
          else ctx.nudge(f, 0, down + r);
        }
      }
    };

    const throwBall = (s: Side): void => {
      const f = fighterOf(s), t = fighterOf(other(s));
      const blocked = blockOnLine(f.x, f.y - 10, t.x, t.y - 10);
      const d = dist(f.x, f.y, t.x, t.y);
      if (!blocked) {
        balls.push({ from: s, x0: f.x, y0: f.y - 14, x1: t.x, y1: t.y - 8, at: now, landAt: now + (d / STRAIGHT_SPEED) * 1000, lob: false, done: false });
      } else {
        // Lob over the wall — it lands where they are *now*, so a step aside dodges it.
        balls.push({ from: s, x0: f.x, y0: f.y - 14, x1: t.x + (rng() - 0.5) * 20, y1: t.y + (rng() - 0.5) * 20, at: now, landAt: now + LOB_MS, lob: true, done: false });
      }
      carry[s]--;
      ctx.sfx('whoosh');
    };

    const resolve = (b: Ball): void => {
      b.done = true;
      const target = other(b.from);
      if (!b.lob) {
        // Straight throws are stopped by any block that stood up in the way since they left the hand.
        const wall = blockOnLine(b.x0, b.y0 + 4, b.x1, b.y1);
        if (wall) { chip(wall); return; }
      }
      const f = fighterOf(target);
      if (!alive(f)) return;
      const r = b.lob ? 34 : 30;
      if (dist(f.x, f.y - 8, b.x1, b.y1) < r) {
        // The cover rule is for blows through the wall; a ball that came over it lands in full.
        const thrower = fighterOf(b.from);
        const covered = !!blockOnLine(thrower.x, thrower.y - 6, f.x, f.y - 6);
        ownHit = true;
        try { ctx.hit(f, covered ? ballDamage / COVER_MULT : ballDamage, f.x, f.y); } finally { ownHit = false; }
        slowUntil[target] = now + 1200;
        ctx.sfx('slime-splat');
        ctx.float(f.x, f.y - 44, 'SPLAT', RCOL.snow);
      } else ctx.sfx('land');
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighterOf(s);
          if (!alive(f)) continue;
          pushOut(f);
          // Scoop.
          for (const h of heaps) {
            if (h.balls > 0 && carry[s] < CARRY_MAX && dist(h.x, h.y, f.x, f.y) < 36) {
              const n = Math.min(h.balls, CARRY_MAX - carry[s]);
              h.balls -= n; carry[s] += n;
              ctx.sfx('land');
              ctx.float(f.x, f.y - 42, `+${n} SNOWBALL${n > 1 ? 'S' : ''}`, s === 'player' ? RCOL.snow : RCOL.steel);
            }
          }
          // Throw on your own, a beat apart, while the foe is in range.
          const t = fighterOf(other(s));
          if (carry[s] > 0 && time >= nextThrow[s] && alive(t) && dist(f.x, f.y, t.x, t.y) < 560) {
            throwBall(s);
            nextThrow[s] = time + THROW_MS * (s === 'npc' ? 1.08 : 1);
          }
          // Pack a chipped block you stand beside.
          for (const b of blocks) {
            if (b.hp <= 0 || b.hp >= BLOCK_HP) continue;
            const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
            if (dist(cx, cy, f.x, f.y) < 52 && time - b.hitAt > 900) {
              b.packT += dt;
              if (b.packT > 1.6) { b.hp++; b.packT = 0; ctx.sfx('stone-rise'); ctx.float(cx, b.y - 6, 'PACKED', RCOL.snow); }
            }
          }
        }
        for (const h of heaps) {
          if (h.balls >= 3) continue;
          h.regrowT += dt;
          if (h.regrowT > 3.6) { h.regrowT = 0; h.balls++; }
        }
        for (const b of balls) if (!b.done && time >= b.landAt) resolve(b);
        for (let i = balls.length - 1; i >= 0; i--) if (balls[i].done && time > balls[i].landAt + 400) balls.splice(i, 1);
      },

      /** A hit that has to go through a standing block is mostly soaked by the snow. */
      playerTakenMult: () => (blockOnLine(ctx.npc.x, ctx.npc.y - 6, ctx.player.x, ctx.player.y - 6) ? COVER_MULT : 1),
      npcTakenMult: () => (blockOnLine(ctx.player.x, ctx.player.y - 6, ctx.npc.x, ctx.npc.y - 6) ? COVER_MULT : 1),

      onPlayerHurt() {
        if (ownHit) return;
        const b = blockOnLine(ctx.npc.x, ctx.npc.y - 6, ctx.player.x, ctx.player.y - 6);
        if (b) chip(b);
      },
      onNpcHurt() {
        if (ownHit) return;
        const b = blockOnLine(ctx.player.x, ctx.player.y - 6, ctx.npc.x, ctx.npc.y - 6);
        if (b) chip(b);
      },

      playerSpeedMult: () => (slowUntil.player > now ? 0.72 : 1),
      npcSpeedMult: () => (slowUntil.npc > now ? 0.72 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // Arms empty: run for the fullest heap on his half, or any heap.
        if (carry.npc === 0) {
          let best: Heap | null = null, bd = Infinity;
          for (const h of heaps) {
            if (h.balls === 0) continue;
            const d = dist(h.x, h.y, n.x, n.y) - (h.x > W / 2 ? 60 : 0);
            if (d < bd) { bd = d; best = h; }
          }
          if (best) return { x: best.x, y: best.y };
        }
        // A chipped block of his own: go and pack it.
        for (const b of blocks) {
          if (b.owner !== 'npc' || b.hp <= 0 || b.hp >= BLOCK_HP) continue;
          if (now - b.hitAt < 900) continue;
          return { x: b.x + b.w + 26, y: b.y + b.h / 2 };
        }
        // Otherwise fight from behind his wall, level with you.
        const y = Math.max(midY - 2.5 * BLOCK_H, Math.min(midY + 2.5 * BLOCK_H, p.y));
        const cover = standing().some((b) => b.owner === 'npc' && Math.abs(b.y + b.h / 2 - y) < BLOCK_H * 0.7 && b.x > W / 2);
        if (cover) return { x: eastWall + 56, y };
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Trodden snow inside each fort, and the flags on poles behind the walls.
        for (const [x, owner] of [[westWall - 60, 'player'], [eastWall + 60, 'npc']] as [number, Side][]) {
          g.fillStyle(R.snowShade, 0.35); g.fillEllipse(x, midY, 150, 300);
          const fx = x + (owner === 'player' ? -40 : 40), fy = top + 60;
          g.lineStyle(2, R.timberDark, 1); g.lineBetween(fx, fy + 40, fx, fy - 20);
          const flap = Math.sin(time / 160 + x) * 4;
          g.fillStyle(owner === 'player' ? R.scarf : R.livery, 1);
          g.fillPoints([{ x: fx, y: fy - 20 }, { x: fx + 26, y: fy - 16 + flap }, { x: fx + 26, y: fy - 4 + flap }, { x: fx, y: fy - 6 }], true);
        }
        // Rubble drifts where blocks have fallen.
        for (const b of blocks) {
          if (b.hp > 0) continue;
          g.fillStyle(R.snowBlue, 0.7); g.fillEllipse(b.x + b.w / 2 + 3, b.y + b.h - 4, b.w * 1.6, 16);
          g.fillStyle(R.snow, 0.9); g.fillEllipse(b.x + b.w / 2, b.y + b.h - 7, b.w * 1.4, 13);
        }
        // Heaps: a mound of balls, up to three, re-rolled as they regrow.
        for (const h of heaps) {
          g.fillStyle(R.snowBlue, 0.55); g.fillEllipse(h.x + 2, h.y + 6, 52, 18);
          g.fillStyle(R.snow, 0.85); g.fillEllipse(h.x, h.y + 4, 46, 14);
          const pos = [[-9, 0], [9, 0], [0, -9]];
          for (let i = 0; i < h.balls; i++) drawSnowball(g, h.x + pos[i][0], h.y - 2 + pos[i][1], 7);
          if (h.balls === 0) { g.lineStyle(1, R.snowBlue, 0.6); g.strokeEllipse(h.x, h.y + 2, 30 + (h.regrowT / 3.6) * 14, 10); }
        }
        // Lob landing marks.
        for (const b of balls) {
          if (b.done || !b.lob) continue;
          const k = Math.min(1, (time - b.at) / LOB_MS);
          g.lineStyle(1.5, b.from === 'npc' ? R.scarf : R.iceDark, 0.5 + k * 0.4); g.strokeCircle(b.x1, b.y1 + 8, 34 * (1.2 - k * 0.2));
          g.fillStyle(0x000000, 0.1 + k * 0.2); g.fillEllipse(b.x1, b.y1 + 8, 8 + k * 14, 4 + k * 6);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The walls themselves stand up over the fighters' feet: drawn in the air so they hide
        // whoever crouches behind them.
        const sorted = standing().slice().sort((a, b) => a.y - b.y);
        for (const b of sorted) {
          const shake = time - b.hitAt < 160 ? Math.sin(time / 15) * 2 : 0;
          const x = b.x + shake, y = b.y;
          g.fillStyle(0x000000, 0.2); g.fillEllipse(x + b.w / 2 + 4, y + b.h, b.w * 1.4, 12);
          g.fillStyle(R.snowBlue, 1); g.fillRect(x, y - 10, b.w, b.h + 8);
          g.fillStyle(R.snow, 1); g.fillRect(x, y - 14, b.w, b.h * 0.42);
          g.fillStyle(lit(R.snowShade, 0.3), 1); g.fillRect(x, y - 14 + b.h * 0.42, b.w, b.h * 0.58 - 4);
          g.lineStyle(1, dim(R.snowBlue, 0.15), 0.9); g.lineBetween(x, y - 14 + b.h * 0.42, x + b.w, y - 14 + b.h * 0.42);
          // Chips: bites out of the top and cracks down the face.
          const chips = BLOCK_HP - b.hp;
          for (let i = 0; i < chips; i++) {
            const cx = x + 6 + jit(b.seed, i) * (b.w - 12);
            g.fillStyle(R.snowBlue, 1); g.fillCircle(cx, y - 13, 5 + i);
            g.lineStyle(1, R.iceDark, 0.7); g.lineBetween(cx, y - 6, cx + (jit(b.seed, i + 5) - 0.5) * 10, y + b.h * 0.6);
          }
          if (b.packT > 0) {
            g.fillStyle(R.snow, 0.8); g.fillRect(x, y - 18, b.w * (b.packT / 1.6), 3);
          }
        }
        // Snowballs in flight: straight throws streak, lobs arc high.
        for (const b of balls) {
          if (b.done) continue;
          const k = Math.min(1, (time - b.at) / Math.max(1, b.landAt - b.at));
          const x = b.x0 + (b.x1 - b.x0) * k;
          const y = b.y0 + (b.y1 - b.y0) * k - (b.lob ? Math.sin(k * Math.PI) * 120 : 0);
          if (!b.lob) { g.lineStyle(3, R.frost, 0.35); g.lineBetween(x, y, x - (b.x1 - b.x0) * 0.06, y - (b.y1 - b.y0) * 0.06); }
          drawSnowball(g, x, y, 6);
        }
        // What each side is carrying: snowballs stacked in the crook of an arm.
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighterOf(s);
          if (!alive(f) || carry[s] === 0) continue;
          for (let i = 0; i < carry[s]; i++) drawSnowball(g, f.x - (carry[s] - 1) * 5 + i * 10, f.y - 46, 4.2);
        }
      },
    };
  },
};
