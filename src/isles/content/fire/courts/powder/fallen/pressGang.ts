import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, P, PCOL, dist, drawPuff, drawSpark } from '../util';

/**
 * THE PRESS GANG — Press-Master Halloran.
 *
 * Halloran filled the Prince's gun crews: he walked the town at night with a gang-chain and took
 * whoever he caught. In this telling he caught you. The two of you are shackled together on an iron
 * gang-chain; walk past its length and you drag each other. Serge cartridge bags — the powder charges
 * for the guns — lie about the floor.
 *
 * On a clock Halloran lights the slow-match wound along the chain: the chain smoulders (its links
 * glow — that is the warning), then the match flashes down its whole length and every cartridge bag
 * the chain is lying across goes up, scorching anyone beside it. Keep bags off the line near you; put
 * one under the line at his feet. Past half his strength the chain is shortened and he hauls on it.
 */

interface Bag { x: number; y: number; bornAt: number; seed: number }

const LEN = 300;
const LEN_SHORT = 220;
const MATCH_EVERY = 6200;
const SMOULDER_MS = 1300;
const BAG_R = 22;
const BLAST_R = 76;
const BLAST = 26;
const HAUL_EVERY = 5200;
const HAUL_WARN = 650;

/** Distance from point p to segment a-b. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

export const PRESS_GANG: GimmickDef = {
  id: fallenId('powder', 'press-gang'),
  rules: 'You are chained to him. When the chain smoulders, every cartridge bag lying across it blows — keep them off the line by you, under it by him.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const bags: Bag[] = [];
    let blasts: { x: number; y: number; at: number }[] = [];
    let matchAt = -1;
    let smoulderAt = -1;
    let flashAt = -9999;
    let nextHaul = -1;
    let haulWarnAt = -1;

    const late = (): boolean => ctx.npc.hp < ctx.npc.maxHp * 0.5;
    const len = (): number => (late() ? LEN_SHORT : LEN);
    const onChain = (b: Bag): boolean =>
      segDist(b.x, b.y, ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < BAG_R + 6;

    const lay = (now: number): void => {
      for (let tries = 0; tries < 60; tries++) {
        const x = 90 + rng() * (W - 180), y = top + 70 + rng() * (H - top - 130);
        if (dist(x, y, ctx.player.x, ctx.player.y) < 90 || dist(x, y, ctx.npc.x, ctx.npc.y) < 90) continue;
        if (bags.some((b) => dist(b.x, b.y, x, y) < 110)) continue;
        bags.push({ x, y, bornAt: now, seed: rng() * 10 });
        return;
      }
    };

    const flash = (now: number): void => {
      flashAt = now;
      ctx.sfx('sizzle');
      for (let i = bags.length - 1; i >= 0; i--) {
        const b = bags[i];
        if (now - b.bornAt < 900 || !onChain(b)) continue;
        bags.splice(i, 1);
        blasts.push({ x: b.x, y: b.y, at: now });
        ctx.tk.boom(b.x, b.y, BLAST_R, P.flame);
        ctx.sfx('explosion-medium');
        for (const f of [ctx.player, ctx.npc]) {
          if (f.hp <= 0 || dist(f.x, f.y, b.x, b.y) > BLAST_R + 12) continue;
          ctx.hit(f, BLAST, f.x, f.y);
          if (f === ctx.npc) ctx.float(f.x, f.y - 46, 'PRESSED INTO SERVICE', PCOL.spark);
        }
      }
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        if (matchAt < 0) {
          matchAt = time + 3800; nextHaul = time + HAUL_EVERY;
          for (let i = 0; i < 6; i++) lay(time - 2000);
        }
        if (dt === 0) return;
        blasts = blasts.filter((b) => time - b.at < 800);
        // The chain: past its length, both ends are dragged toward each other.
        const p = ctx.player, n = ctx.npc;
        const d = dist(p.x, p.y, n.x, n.y);
        if (d > len()) {
          const e = Math.min(12, (d - len()) / 2);
          const ux = (n.x - p.x) / d, uy = (n.y - p.y) / d;
          ctx.nudge(p, ux * e, uy * e);
          ctx.nudge(n, -ux * e, -uy * e);
        }
        // The match: smoulder (warning), then flash.
        if (smoulderAt < 0 && time >= matchAt) { smoulderAt = time; ctx.sfx('status-burn'); }
        if (smoulderAt > 0 && time - smoulderAt >= SMOULDER_MS) {
          flash(time);
          smoulderAt = -1;
          matchAt = time + (late() ? MATCH_EVERY * 0.8 : MATCH_EVERY);
        }
        // Late: Halloran hauls the chain in — you are pulled toward him for a moment.
        if (late()) {
          if (haulWarnAt < 0 && time >= nextHaul) { haulWarnAt = time; ctx.sfx('chain'); }
          if (haulWarnAt > 0 && time - haulWarnAt >= HAUL_WARN) {
            haulWarnAt = -1; nextHaul = time + HAUL_EVERY;
            ctx.tk.pull(n.x, n.y, 130, 650);
            ctx.float(p.x, p.y - 44, 'HAUL!', PCOL.red);
          }
        } else nextHaul = Math.max(nextHaul, time + 1500);
        const want = late() ? 8 : 6;
        if (bags.length < want && rng() < dt * 0.6) lay(time);
      },

      npcSeek(): Pt | null {
        const p = ctx.player, n = ctx.npc;
        const live = smoulderAt > 0 || matchAt - ctx.tk.now < 1800;
        // Get clear of a bag on the line near his own feet.
        for (const b of bags) {
          if (dist(b.x, b.y, n.x, n.y) < BLAST_R + 30 && onChain(b) && live) {
            const a = Math.atan2(n.y - b.y, n.x - b.x) + 0.8;
            return { x: ctx.tk.clampX(n.x + Math.cos(a) * 120, 70), y: ctx.tk.clampY(n.y + Math.sin(a) * 120, 70) };
          }
        }
        if (!live) return null;
        // Lay the chain over a bag beside you: stand on the far side of it, inside the chain's length.
        let best: Pt | null = null, bestD = 1e9;
        for (const b of bags) {
          const db = dist(b.x, b.y, p.x, p.y);
          if (db > BLAST_R + 10) continue;
          const a = Math.atan2(b.y - p.y, b.x - p.x);
          const r = Math.min(len() - 20, db + 150);
          const q = { x: ctx.tk.clampX(p.x + Math.cos(a) * r, 70), y: ctx.tk.clampY(p.y + Math.sin(a) * r, 70) };
          const dq = dist(q.x, q.y, n.x, n.y);
          if (dq < bestD) { bestD = dq; best = q; }
        }
        return best;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Cobbles of the night street where the gang walks.
        for (let y = top + 14; y < H; y += 34) {
          for (let x = ((y / 34) % 2) * 22; x < W; x += 44) {
            g.fillStyle(dim(P.earth, 0.25), 0.22); g.fillEllipse(x, y, 34, 22);
          }
        }
        // Cartridge bags: serge tubes tied at the neck, stencilled with their charge.
        for (const b of bags) {
          const a = Math.min(1, (time - b.bornAt) / 400);
          const hot = smoulderAt > 0 && onChain(b);
          g.fillStyle(0x000000, 0.3 * a); g.fillEllipse(b.x + 2, b.y + 9, 40, 12);
          g.fillStyle(0xc8b48a, a); g.fillRoundedRect(b.x - 18, b.y - 9, 34, 18, 8);
          g.fillStyle(lit(0xc8b48a, 0.2), a); g.fillRoundedRect(b.x - 14, b.y - 7, 24, 5, 3);
          g.lineStyle(1, dim(0xc8b48a, 0.35), a); for (let k = -12; k <= 10; k += 5) g.lineBetween(b.x + k, b.y - 8, b.x + k + 2, b.y + 8);
          // Tied neck and tuft.
          g.fillStyle(0x8a6a3a, a); g.fillRect(b.x + 15, b.y - 4, 4, 8);
          g.fillStyle(0xc8b48a, a); g.fillTriangle(b.x + 19, b.y, b.x + 26, b.y - 6, b.x + 26, b.y + 6);
          g.fillStyle(P.redcoat, 0.8 * a); g.fillRect(b.x - 8, b.y - 2, 3, 5); g.fillRect(b.x - 3, b.y - 2, 3, 5);
          if (hot) {
            g.lineStyle(2, P.flame, 0.5 + Math.sin(time / 60) * 0.3); g.strokeCircle(b.x, b.y, BLAST_R);
            g.fillStyle(P.flame, 0.08); g.fillCircle(b.x, b.y, BLAST_R);
          }
        }
        for (const bl of blasts) {
          const k = (time - bl.at) / 800;
          g.fillStyle(0x140d08, 0.45 * (1 - k)); g.fillCircle(bl.x, bl.y, 36);
          drawPuff(g, bl.x, bl.y - k * 30, 30 + k * 20, P.smoke, 0.5 * (1 - k), bl.x);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The gang-chain: oval links between the two shackles, sagging when slack.
        const p = ctx.player, n = ctx.npc;
        const ax = p.x, ay = p.y - 4, bx = n.x, by = n.y - 4;
        const d = dist(ax, ay, bx, by);
        const slack = Math.max(0, 1 - d / len());
        const links = Math.max(6, Math.floor(d / 14));
        const smoulder = smoulderAt > 0 ? (time - smoulderAt) / SMOULDER_MS : 0;
        const flashK = Math.max(0, 1 - (time - flashAt) / 300);
        const haul = haulWarnAt > 0;
        for (let i = 0; i <= links; i++) {
          const t = i / links;
          const x = ax + (bx - ax) * t;
          const y = ay + (by - ay) * t + Math.sin(t * Math.PI) * (slack * 40 + 4) - (haul ? Math.sin(time / 30) * 2 : 0);
          const glow = smoulder > 0 ? Math.min(1, smoulder * 1.4 - t * 0.3 + Math.sin(time / 50 + i) * 0.15) : 0;
          const col = glow > 0 ? lit(P.flame, glow * 0.3) : P.ironLit;
          g.lineStyle(2.5, dim(P.iron, 0.3), 1);
          g.strokeEllipse(x, y, i % 2 ? 6 : 10, i % 2 ? 10 : 6);
          g.lineStyle(1.5, col, 1);
          g.strokeEllipse(x, y, i % 2 ? 6 : 10, i % 2 ? 10 : 6);
          if (glow > 0.3 && i % 3 === 0) { g.fillStyle(P.smoke, 0.25 * glow); g.fillCircle(x, y - 8 - (time / 20 + i * 7) % 14, 3); }
          if (flashK > 0) { g.fillStyle(P.sparkHot, flashK); g.fillCircle(x, y, 4); }
        }
        // Shackles at both ends.
        for (const [x, y] of [[ax, ay], [bx, by]]) {
          g.lineStyle(4, P.iron, 1); g.strokeCircle(x, y + 6, 9);
          g.lineStyle(1.5, P.ironLit, 1); g.strokeCircle(x, y + 6, 9);
        }
        // Halloran's end carries the match.
        if (smoulderAt > 0) drawSpark(g, bx + 8, by - 8, time, 1);
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The slow-match: a coil of cord burning down toward the next flash.
        const x = W - 176, y = top + 10;
        const span = late() ? MATCH_EVERY * 0.8 : MATCH_EVERY;
        const k = smoulderAt > 0 ? 1 : Math.max(0, 1 - (matchAt - time) / span);
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, 160, 18, 6);
        g.lineStyle(3, 0x6a5a40, 1); g.lineBetween(x + 10 + 140 * k, y + 9, x + 150, y + 9);
        g.lineStyle(3, 0x1a1410, 1); g.lineBetween(x + 10, y + 9, x + 10 + 140 * k, y + 9);
        drawSpark(g, x + 10 + 140 * k, y + 9, time, 0.7);
        // Chain length gauge: links shown, red when you are at full stretch.
        const d = dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y);
        const taut = d >= len() - 6;
        for (let i = 0; i < 8; i++) {
          g.lineStyle(2, taut ? P.redcoat : P.ironLit, Math.min(1, d / len()) > i / 8 ? 1 : 0.3);
          g.strokeEllipse(x + 16 + i * 18, y + 30, i % 2 ? 8 : 14, i % 2 ? 12 : 7);
        }
      },
    };
  },
};
