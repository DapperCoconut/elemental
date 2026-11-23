import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, P, PCOL, dist, drawSpark } from '../util';

/**
 * FLASH IN THE PAN — Sweeper Agnes Mull.
 *
 * Agnes swept the magazine floor. In the King's telling she swept the sweepings under the doors of
 * people she wanted gone, and then she sent for the guard. The fight is fought in powder dust. Every
 * ability anyone casts kicks a puff of black dust up off the flags where they stand, and Agnes's broom
 * leaves a trail of it behind her wherever she walks. Dust settles slowly and lies there.
 *
 * Dust does nothing until it meets a spark — and then the whole connected drift flashes at once,
 * scorching everyone standing in it. Sparks come from two places: the Tithe brazier lobs an ember on a
 * clock (its landing mark shows where), and the two flintlock strikers on the walls throw a spark
 * into any dust beside them when struck. Her own broom trail is a fuse that runs back to her feet.
 * Past half her strength a draught gets up and the dust drifts across the room.
 */

const CELL = 40;
const BURN_MS = 520;
const SPREAD_MS = 70;
const SCORCH = 16;
const LIGHT_AT = 0.3;
const EMBER_EVERY = 6800;
const EMBER_FLIGHT = 1250;
const FLINT_COOL = 3600;
const PRIME_MS = 480;

interface Flint { at: Pt; t: StrikeTarget; readyAt: number; primedAt: number }

export const FLASH_IN_THE_PAN: GimmickDef = {
  id: fallenId('powder', 'flash-pan'),
  rules: 'Every cast kicks up powder dust; her broom trails it. A spark flashes a whole drift — strike a wall flint to light her trail.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const cols = Math.ceil(W / CELL), rows = Math.ceil((H - top) / CELL);
    const dust = new Float32Array(cols * rows);
    /** When each cell caught (0 = not burning); spread happens SPREAD_MS after catching. */
    const burnAt = new Float64Array(cols * rows);
    const spread = new Uint8Array(cols * rows);
    /** Who has already been scorched by each burning cell, so a flash hits a body once. */
    const scorched = new WeakMap<Fighter, number>();
    let ember: { from: Pt; to: Pt; at: number } | null = null;
    let nextEmber = -1;
    let windAt = 0;
    const brazier: Pt = { x: W / 2, y: top + 30 };

    const idx = (c: number, r: number): number => r * cols + c;
    const cellOf = (x: number, y: number): [number, number] => [
      Math.max(0, Math.min(cols - 1, Math.floor(x / CELL))), Math.max(0, Math.min(rows - 1, Math.floor((y - top) / CELL))),
    ];
    const late = (): boolean => ctx.npc.hp < ctx.npc.maxHp * 0.5;

    const puff = (x: number, y: number, amount: number, rad: number): void => {
      const [c0, r0] = cellOf(x, y);
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          const c = c0 + dc, r = r0 + dr;
          if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
          const fall = 1 - Math.hypot(dc, dr) / (rad + 1);
          if (fall <= 0) continue;
          const i = idx(c, r);
          if (burnAt[i] > 0) continue;
          dust[i] = Math.min(1, dust[i] + amount * fall);
        }
      }
    };

    const ignite = (c: number, r: number, now: number): boolean => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
      const i = idx(c, r);
      if (burnAt[i] > 0 || dust[i] < LIGHT_AT) return false;
      burnAt[i] = now; spread[i] = 0;
      return true;
    };

    const igniteNear = (x: number, y: number, rad: number, now: number): boolean => {
      const [c0, r0] = cellOf(x, y);
      let any = false;
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) any = ignite(c0 + dc, r0 + dr, now) || any;
      if (any) ctx.sfx('flame-burst');
      return any;
    };

    const makeFlint = (x: number, y: number): Flint => {
      const fl: Flint = { at: { x, y }, readyAt: 0, primedAt: 0, t: null as unknown as StrikeTarget };
      fl.t = ctx.target({
        x, y, r: 24,
        onStruck() {
          const now = ctx.tk.now;
          if (now < fl.readyAt) return;
          fl.readyAt = now + FLINT_COOL;
          fl.primedAt = now;
          ctx.sfx('snap-back');
        },
      });
      return fl;
    };
    const midY = top + (H - top) / 2;
    const flints: Flint[] = [makeFlint(46, midY), makeFlint(W - 46, midY)];

    const dustAt = (f: Fighter): number => { const [c, r] = cellOf(f.x, f.y); return dust[idx(c, r)]; };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        if (nextEmber < 0) { nextEmber = time + 3600; windAt = time; }
        if (dt === 0) return;
        // Her broom: dust laid wherever she walks.
        puff(ctx.npc.x, ctx.npc.y + 10, 2.2 * dt, 0);
        // Slow settling, and late in the fight a draught that drifts every drift one cell east or west.
        for (let i = 0; i < dust.length; i++) if (burnAt[i] === 0) dust[i] = Math.max(0, dust[i] - 0.025 * dt);
        if (late() && time - windAt > 1300) {
          windAt = time;
          const dir = Math.sin(time / 9000) > 0 ? 1 : -1;
          for (let r = 0; r < rows; r++) {
            if (dir > 0) for (let c = cols - 1; c > 0; c--) { const i = idx(c, r); if (!burnAt[i]) dust[i] = dust[idx(c - 1, r)] * 0.92; }
            else for (let c = 0; c < cols - 1; c++) { const i = idx(c, r); if (!burnAt[i]) dust[i] = dust[idx(c + 1, r)] * 0.92; }
            dust[idx(dir > 0 ? 0 : cols - 1, r)] = 0;
          }
        }
        // The brazier's ember: a lobbed coal toward the player's ground.
        if (!ember && time >= nextEmber) {
          const p = ctx.player;
          ember = { from: { ...brazier }, to: { x: ctx.tk.clampX(p.x + (rng() - 0.5) * 80, 60), y: ctx.tk.clampY(p.y + (rng() - 0.5) * 80, 60) }, at: time };
          nextEmber = time + (late() ? EMBER_EVERY * 0.8 : EMBER_EVERY);
          ctx.sfx('fireball');
        }
        if (ember && time - ember.at >= EMBER_FLIGHT) {
          if (!igniteNear(ember.to.x, ember.to.y, 0, time)) ctx.sfx('sizzle');
          ember = null;
        }
        for (const fl of flints) {
          if (fl.primedAt > 0 && time - fl.primedAt >= PRIME_MS) {
            fl.primedAt = 0;
            ctx.flash(fl.at.x, fl.at.y, P.sparkHot);
            if (!igniteNear(fl.at.x + (fl.at.x < W / 2 ? CELL : -CELL), fl.at.y, 1, time)) ctx.sfx('sizzle');
          }
        }
        // Burning cells spread through connected dust, then go out leaving bare flags.
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = idx(c, r);
            const b = burnAt[i];
            if (b === 0) continue;
            if (!spread[i] && time - b >= SPREAD_MS) {
              spread[i] = 1;
              ignite(c + 1, r, time); ignite(c - 1, r, time); ignite(c, r + 1, time); ignite(c, r - 1, time);
            }
            if (time - b >= BURN_MS) { burnAt[i] = 0; dust[i] = 0; }
          }
        }
        for (const f of [ctx.player, ctx.npc]) {
          if (f.hp <= 0) continue;
          const [c, r] = cellOf(f.x, f.y);
          const b = burnAt[idx(c, r)];
          if (b > 0 && (scorched.get(f) ?? 0) < time - BURN_MS) {
            scorched.set(f, time);
            ctx.hit(f, SCORCH, f.x, f.y);
            ctx.sfx('status-burn');
            if (f === ctx.npc) ctx.float(f.x, f.y - 44, 'SWEPT UP', PCOL.spark);
          }
        }
      },

      onPlayerCast() { puff(ctx.player.x, ctx.player.y, 0.55, 1); },
      onNpcCast() { puff(ctx.npc.x, ctx.npc.y, 0.4, 1); },

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // Out of any dust she is standing in when a spark is coming.
        const danger = ember !== null || flints.some((f) => f.primedAt > 0);
        if (danger && dustAt(n) > LIGHT_AT * 0.7) {
          const [c0, r0] = cellOf(n.x, n.y);
          let best: Pt | null = null, bestD = 1e9;
          for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) {
            const c = c0 + dc, r = r0 + dr;
            if (c < 1 || r < 0 || c >= cols - 1 || r >= rows || dust[idx(c, r)] > 0.12) continue;
            const d = Math.hypot(dc, dr);
            if (d < bestD) { bestD = d; best = { x: c * CELL + CELL / 2, y: top + r * CELL + CELL / 2 }; }
          }
          return best;
        }
        // You are standing in a drift that runs to a ready flint: go and strike it.
        if (dustAt(p) > LIGHT_AT) {
          for (const fl of flints) {
            if (ctx.tk.now < fl.readyAt) continue;
            if (dist(fl.at.x, fl.at.y, p.x, p.y) < 420) return { x: fl.at.x + (fl.at.x < W / 2 ? 40 : -40), y: fl.at.y };
          }
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Magazine floor: copper-nailed oak boards (no iron to strike a spark).
        for (let y = top; y < H; y += 28) {
          g.lineStyle(1, dim(P.oak, 0.5), 0.35); g.lineBetween(0, y, W, y);
          for (let x = ((y / 28) % 2) * 60; x < W; x += 120) { g.fillStyle(0xb87333, 0.4); g.fillCircle(x + 6, y + 5, 1.5); g.fillCircle(x + 6, y + 23, 1.5); }
        }
        // Dust: grainy black drifts, densest at the heart of a cell.
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = idx(c, r);
            const d = dust[i];
            const x = c * CELL, y = top + r * CELL;
            if (d > 0.04 && burnAt[i] === 0) {
              g.fillStyle(P.powder, Math.min(0.55, d * 0.6)); g.fillRoundedRect(x + 2, y + 2, CELL - 4, CELL - 4, 12);
              const n = Math.floor(d * 7);
              for (let k = 0; k < n; k++) {
                const h = (i * 13 + k * 7) % 31;
                g.fillStyle(k % 2 ? P.powderLit : 0x0a0908, 0.7); g.fillCircle(x + 6 + (h % 28), y + 6 + ((h * 3) % 28), 1.4);
              }
              if (d > LIGHT_AT) { g.lineStyle(1, P.saltpetre, 0.08); g.strokeRoundedRect(x + 3, y + 3, CELL - 6, CELL - 6, 11); }
            }
            const b = burnAt[i];
            if (b > 0) {
              const k = (time - b) / BURN_MS;
              g.fillStyle(P.flame, 0.55 * (1 - k)); g.fillRect(x, y, CELL, CELL);
              for (let t = 0; t < 3; t++) {
                const fx = x + 8 + t * 12, fh = 14 + Math.sin(time / 40 + i + t) * 6;
                g.fillStyle(P.spark, 0.85 * (1 - k)); g.fillTriangle(fx - 5, y + CELL - 6, fx + 5, y + CELL - 6, fx, y + CELL - 6 - fh);
                g.fillStyle(P.sparkHot, 0.8 * (1 - k)); g.fillTriangle(fx - 2, y + CELL - 6, fx + 2, y + CELL - 6, fx, y + CELL - 6 - fh * 0.5);
              }
            }
          }
        }
        // The ember's landing mark: a scorched ring that tightens as the coal comes down.
        if (ember) {
          const k = (time - ember.at) / EMBER_FLIGHT;
          g.lineStyle(2, P.flame, 0.4 + k * 0.5); g.strokeCircle(ember.to.x, ember.to.y, 34 - k * 18);
          g.fillStyle(P.flame, 0.1 + k * 0.2); g.fillCircle(ember.to.x, ember.to.y, CELL * 0.6);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The Tithe brazier: iron basket on a tripod, coals heaped and glowing.
        const { x, y } = brazier;
        g.lineStyle(3, P.iron, 1);
        g.lineBetween(x - 16, y + 20, x - 8, y); g.lineBetween(x + 16, y + 20, x + 8, y); g.lineBetween(x, y + 22, x, y);
        g.fillStyle(P.iron, 1); g.fillEllipse(x, y, 34, 12);
        g.fillStyle(P.flame, 0.9); g.fillEllipse(x, y - 3, 26, 8);
        g.fillStyle(P.spark, 1); g.fillCircle(x - 6, y - 5, 3); g.fillCircle(x + 5, y - 6, 3.5);
        drawSpark(g, x, y - 10, time, 0.8);
        if (ember) {
          const k = (time - ember.at) / EMBER_FLIGHT;
          const ex = ember.from.x + (ember.to.x - ember.from.x) * k;
          const ey = ember.from.y + (ember.to.y - ember.from.y) * k - Math.sin(k * Math.PI) * 120;
          g.fillStyle(P.flame, 0.35); g.fillCircle(ex, ey, 9);
          g.fillStyle(P.sparkHot, 1); g.fillCircle(ex, ey, 4);
        }
        // Flintlock strikers on the walls: a cock with its flint, a frizzen and a priming pan.
        for (const fl of flints) {
          const s = fl.at.x < W / 2 ? 1 : -1;
          const fx = fl.at.x, fy = fl.at.y;
          const ready = ctx.tk.now >= fl.readyAt;
          g.fillStyle(P.oakDark, 1); g.fillRoundedRect(fx - 14, fy - 26, 28, 52, 5);
          g.fillStyle(P.oak, 1); g.fillRoundedRect(fx - 11, fy - 23, 22, 46, 4);
          g.fillStyle(P.brass, 1); g.fillRect(fx - 6 * s - 4, fy + 4, 16, 6);
          const cocked = ready && fl.primedAt === 0;
          const ca = cocked ? -0.9 : 0.3;
          g.lineStyle(4, P.ironLit, 1); g.lineBetween(fx - 4 * s, fy + 14, fx - 4 * s + Math.cos(ca) * 18 * s, fy + 14 + Math.sin(ca) * 18 - 14);
          g.fillStyle(0x3a3a36, 1); g.fillCircle(fx - 4 * s + Math.cos(ca) * 18 * s, fy + Math.sin(ca) * 18, 3.5);
          g.fillStyle(P.iron, 1); g.fillRect(fx + 6 * s - 2, fy - 12, 4, 18);
          if (fl.primedAt > 0) {
            const k = (ctx.tk.now - fl.primedAt) / PRIME_MS;
            g.fillStyle(P.smoke, 0.5 * (1 - k)); g.fillCircle(fx + 10 * s, fy - 6 - k * 14, 6 + k * 10);
            drawSpark(g, fx + 8 * s, fy + 2, time, 1.2);
          } else if (ready) {
            g.fillStyle(P.spark, 0.4 + Math.sin(time / 150) * 0.25); g.fillCircle(fx + 8 * s, fy + 6, 4);
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The next ember: a coal sliding along a grate bar toward the brazier.
        const x = 20, y = top + 12;
        const k = ember ? 1 : Math.max(0, 1 - (nextEmber - time) / (late() ? EMBER_EVERY * 0.8 : EMBER_EVERY));
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, 150, 14, 5);
        g.fillStyle(P.iron, 1); for (let i = 0; i < 8; i++) g.fillRect(x + 6 + i * 18, y + 3, 10, 8);
        g.fillStyle(P.flame, 0.9); g.fillCircle(x + 8 + 134 * k, y + 7, 5);
        g.fillStyle(lit(P.spark, 0.3), 1); g.fillCircle(x + 8 + 134 * k, y + 6, 2);
        // Your boots: how much dust you stand in right now.
        const d = dustAt(ctx.player);
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y + 20, 150, 10, 4);
        g.fillStyle(d > LIGHT_AT ? P.flame : P.powderLit, 1); g.fillRoundedRect(x + 2, y + 22, 146 * d, 6, 3);
        g.lineStyle(1, P.saltpetre, 0.6); g.lineBetween(x + 2 + 146 * LIGHT_AT, y + 20, x + 2 + 146 * LIGHT_AT, y + 30);
      },

      destroy() { for (const fl of flints) fl.t.remove(); },
    };
  },
};
