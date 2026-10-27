import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { Clock, P, PCOL, dist, drawPuff } from '../util';
import { dim, lit } from '../../../../../art/IsleArt';

/**
 * MINEFIELD DRILL — Sapper Ironsides.
 *
 * The floor is sown with buried mines nobody can see. On a drill clock a sapper's sweep — a long
 * detector pole with a humming dish — crosses the room, and every mine it passes pops up a red
 * pennant for a few seconds. Then the flags fold away and the field goes back to guesswork.
 *
 * A mine does not care whose boot is on it: step within reach and it clicks, and half a second
 * later it goes. That half second is enough to step off if you hear it. Ironsides buries fresh
 * mines where he walks — a raw mound of earth gives each one away for a moment — so the field
 * keeps changing, and he can be walked across his own handiwork. Sharp eyes may spot the faint
 * scuffs of the older mines between sweeps.
 */

interface Mine {
  x: number; y: number;
  /** Visible until this time (sweep reveal). */
  shownUntil: number;
  /** Planted at — fresh dirt is visible for a moment, and it is not live until it arms. */
  planted: number;
  armed: boolean;
  trippedAt: number;
  dead: boolean;
  byNpc: boolean;
}
interface Crater { x: number; y: number; at: number; seed: number }

const TRIP_R = 22;
const BLAST_R = 74;
const FUSE_MS = 460;
const SWEEP_MS = 1700;
const SHOW_MS = 3600;

export const MINEFIELD_DRILL: GimmickDef = {
  id: 'powder-mines',
  rules: 'Hidden mines everywhere; a detector sweep flags them for a moment. A mine clicks under anyone — step off before it goes.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const mines: Mine[] = [];
    const craters: Crater[] = [];
    const damage = ctx.hard ? 26 : 22;
    const sweepEvery = ctx.hard ? 8600 : 7400;
    let nextSweep = -1;
    let sweepAt = -99999;
    let sweepDir = 1;
    let nextPlant = -1;
    let started = false;

    const clearOf = (x: number, y: number): boolean => {
      if (dist(x, y, ctx.player.x, ctx.player.y) < 110 || dist(x, y, ctx.npc.x, ctx.npc.y) < 110) return false;
      return mines.every((m) => m.dead || dist(m.x, m.y, x, y) > 80);
    };
    const sow = (now: number, count: number): void => {
      for (let i = 0, tries = 0; i < count && tries < 400; tries++) {
        const x = 70 + rng() * (W - 140), y = top + 40 + rng() * (H - top - 80);
        if (!clearOf(x, y)) continue;
        mines.push({ x, y, shownUntil: 0, planted: now - 5000, armed: true, trippedAt: 0, dead: false, byNpc: false });
        i++;
      }
    };
    const sweepX = (now: number): number => {
      const k = (now - sweepAt) / SWEEP_MS;
      return sweepDir > 0 ? -20 + k * (W + 40) : W + 20 - k * (W + 40);
    };

    const blow = (m: Mine, now: number): void => {
      m.dead = true;
      ctx.tk.boom(m.x, m.y, BLAST_R, P.flame);
      ctx.flash(m.x, m.y, P.spark);
      ctx.sfx('explosion-medium');
      craters.push({ x: m.x, y: m.y, at: now, seed: rng() * 10 });
      if (craters.length > 18) craters.shift();
      for (const f of [ctx.player, ctx.npc]) {
        if (!f.active || f.hp <= 0) continue;
        if (dist(f.x, f.y, m.x, m.y) > BLAST_R + 12) continue;
        ctx.hit(f, damage, f.x, f.y);
        const a = Math.atan2(f.y - m.y, f.x - m.x);
        ctx.nudge(f, Math.cos(a) * 40, Math.sin(a) * 40);
        if (f === ctx.npc && m.byNpc) ctx.float(f.x, f.y - 44, 'HOIST BY HIS OWN', PCOL.spark);
      }
      // Neighbours close by go with it.
      for (const o of mines) {
        if (!o.dead && o.trippedAt === 0 && dist(o.x, o.y, m.x, m.y) < BLAST_R * 0.7) o.trippedAt = now - FUSE_MS + 160;
      }
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        if (!started) {
          started = true;
          sow(time, ctx.hard ? 15 : 12);
          nextSweep = time + 1200;
          nextPlant = time + 4500;
        }
        if (dt === 0) return;
        if (time >= nextSweep) {
          sweepAt = time; sweepDir = -sweepDir; nextSweep = time + sweepEvery;
          ctx.sfx('sonic-pulse');
          ctx.float(W / 2, top + 26, 'SWEEP!', PCOL.green);
        }
        const sweeping = time - sweepAt < SWEEP_MS;
        const sx = sweepX(time);
        // Ironsides digs in a fresh one where he stands.
        if (time >= nextPlant && mines.filter((m) => !m.dead).length < 17) {
          nextPlant = time + (ctx.hard ? 4200 : 5200) + rng() * 1200;
          const n = ctx.npc;
          if (mines.every((m) => m.dead || dist(m.x, m.y, n.x, n.y) > 60)) {
            mines.push({ x: n.x, y: n.y + 8, shownUntil: 0, planted: time, armed: false, trippedAt: 0, dead: false, byNpc: true });
            ctx.sfx('trap-set');
          }
        }
        for (const m of mines) {
          if (m.dead) continue;
          if (sweeping && Math.abs(sx - m.x) < 26) m.shownUntil = time + SHOW_MS;
          if (!m.armed) {
            // Arms once it has settled and nobody is standing on it.
            if (time - m.planted > 1500 && dist(m.x, m.y, ctx.player.x, ctx.player.y) > 40 && dist(m.x, m.y, ctx.npc.x, ctx.npc.y) > 40) m.armed = true;
            continue;
          }
          if (m.trippedAt === 0) {
            for (const f of [ctx.player, ctx.npc]) {
              if (!f.active || f.hp <= 0) continue;
              if (dist(f.x, f.y, m.x, m.y) < TRIP_R) {
                m.trippedAt = time;
                m.shownUntil = time + 2000;
                ctx.sfx('trap-snap');
                ctx.float(m.x, m.y - 26, '*click*', PCOL.red);
                break;
              }
            }
          } else if (time - m.trippedAt >= FUSE_MS) {
            blow(m, time);
          }
        }
        for (let i = mines.length - 1; i >= 0; i--) if (mines[i].dead) mines.splice(i, 1);
        // The drill keeps the field stocked.
        if (mines.length < (ctx.hard ? 9 : 7)) sow(time, 1);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        const now = ctx.tk.now;
        // He knows his own mines and any that are flagged — and gets clear of a clicking one.
        for (const m of mines) {
          const known = m.byNpc || now < m.shownUntil || m.trippedAt > 0;
          if (!known) continue;
          const d = dist(m.x, m.y, n.x, n.y);
          const keep = m.trippedAt > 0 ? BLAST_R + 20 : 56;
          if (d < keep) {
            const a = Math.atan2(n.y - m.y, n.x - m.x);
            return { x: n.x + Math.cos(a) * 90, y: n.y + Math.sin(a) * 90 };
          }
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Drill-ground grid pegs, the way a sapper squares a field before sowing it.
        for (let x = 80; x < W; x += 120) {
          for (let y = top + 50; y < H; y += 110) {
            g.fillStyle(P.saltpetre, 0.18); g.fillRect(x - 1, y - 4, 2, 8); g.fillRect(x - 4, y - 1, 8, 2);
          }
        }
        for (const c of craters) {
          const a = Math.max(0.35, 1 - (time - c.at) / 20000);
          g.fillStyle(P.earthDark, 0.6 * a); g.fillCircle(c.x, c.y, 30);
          g.fillStyle(0x140d08, 0.55 * a); g.fillCircle(c.x, c.y + 2, 19);
          for (let i = 0; i < 9; i++) {
            const ang = c.seed + i * 0.7;
            g.fillStyle(P.earth, 0.5 * a); g.fillCircle(c.x + Math.cos(ang) * 36, c.y + Math.sin(ang) * 28, 3 + (i % 3));
          }
        }
        for (const m of mines) {
          const fresh = time - m.planted;
          if (fresh < 1600) {
            // A raw mound of turned earth — the only honest tell he gives.
            const a = 1 - fresh / 1600;
            g.fillStyle(P.earthDark, 0.85 * a); g.fillEllipse(m.x, m.y, 30, 14);
            g.fillStyle(lit(P.earth, 0.1), 0.7 * a); g.fillEllipse(m.x - 3, m.y - 3, 18, 7);
          } else {
            // Faint scuffing that a careful eye can catch.
            g.fillStyle(P.earthDark, 0.09); g.fillEllipse(m.x, m.y, 22, 9);
          }
          const shown = time < m.shownUntil || m.trippedAt > 0;
          if (!shown) continue;
          const a = Math.min(1, (m.shownUntil - time) / 700);
          // The mine: an iron pan with a pressure plate and four prongs.
          g.fillStyle(dim(P.iron, 0.4), a); g.fillEllipse(m.x, m.y + 1, 22, 11);
          g.fillStyle(P.iron, a); g.fillEllipse(m.x, m.y - 1, 18, 9);
          g.fillStyle(P.ironLit, a); g.fillEllipse(m.x, m.y - 2, 8, 4);
          for (let i = 0; i < 4; i++) {
            const pa = i * (Math.PI / 2) + 0.4;
            g.lineStyle(1.5, P.ironLit, a);
            g.lineBetween(m.x + Math.cos(pa) * 4, m.y - 2 + Math.sin(pa) * 2, m.x + Math.cos(pa) * 7, m.y - 6 + Math.sin(pa) * 3);
          }
          g.lineStyle(1.5, m.trippedAt > 0 ? P.flame : P.redcoat, 0.5 * a); g.strokeCircle(m.x, m.y, TRIP_R);
          if (m.trippedAt > 0) {
            const k = (time - m.trippedAt) / FUSE_MS;
            g.fillStyle(P.flame, 0.15 + k * 0.25); g.fillCircle(m.x, m.y, BLAST_R * k);
            g.lineStyle(2, P.flame, 0.8); g.strokeCircle(m.x, m.y, BLAST_R);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        for (const m of mines) {
          if (!(time < m.shownUntil) || m.trippedAt > 0) continue;
          // Red pennant on a wire stake, flapping.
          const a = Math.min(1, (m.shownUntil - time) / 700);
          const rise = Math.min(1, (SHOW_MS - (m.shownUntil - time)) / 200);
          const top2 = m.y - 30 * rise;
          g.lineStyle(1.5, P.ironLit, a); g.lineBetween(m.x + 9, m.y, m.x + 9, top2);
          const flap = Math.sin(time / 90 + m.x) * 3;
          g.fillStyle(P.redcoat, a);
          g.fillTriangle(m.x + 9, top2, m.x + 9, top2 + 9, m.x + 24, top2 + 4 + flap);
        }
        if (time - sweepAt < SWEEP_MS) {
          const sx = sweepX(time);
          // The detector pole: a long rod across the field with a ringing dish on it.
          g.lineStyle(14, 0x9ee07a, 0.08); g.lineBetween(sx, top, sx, H);
          g.lineStyle(2, 0x9ee07a, 0.65); g.lineBetween(sx, top, sx, H);
          for (let y = top + 30; y < H; y += 90) {
            const ring = ((time / 4 + y) % 60) / 60;
            g.lineStyle(1.5, 0x9ee07a, 0.5 * (1 - ring));
            g.beginPath(); g.arc(sx, y, 10 + ring * 30, -0.7, 0.7, false); g.strokePath();
            g.beginPath(); g.arc(sx, y, 10 + ring * 30, Math.PI - 0.7, Math.PI + 0.7, false); g.strokePath();
            g.fillStyle(P.brass, 0.9); g.fillEllipse(sx, y, 12, 6);
          }
          drawPuff(g, sx - sweepDir * 20, H - 20, 10, P.sand, 0.25, 2);
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The drill bell: a bar that fills toward the next sweep.
        const k = Math.max(0, Math.min(1, 1 - (nextSweep - time) / sweepEvery));
        const x = W - 150, y = top + 10;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x, y, 130, 10, 4);
        g.fillStyle(0x9ee07a, 0.85); g.fillRoundedRect(x + 2, y + 2, 126 * k, 6, 3);
        g.fillStyle(P.brass, 1); g.fillCircle(x - 8, y + 5, 5);
      },
    };
  },
};
