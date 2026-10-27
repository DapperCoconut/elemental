import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { BRASS, BRASS_DARK, BRASS_LIT, IRON, PLASMA, PLASMA_CORE, PLASMA_LIT } from '../palette';

/**
 * Arc Pylons — Pylon-Keeper Ampere's fight.
 *
 * Six Tesla pylons stand round the edge of the room. They fire arcs *between pairs*, across
 * the floor, in a sequence that is printed on the pylons themselves: the next three pairs
 * carry numbered pips (1 = next), and the pair about to fire draws a crackling guide line
 * before the arc lands. An arc hurts **anyone** it crosses — Ampere included.
 *
 * Every fourth discharge is a **Crossfire**: two pairs fire together, and their lines cross.
 *
 * Ampere knows the sequence too, and steps out of a live line. The exploit is the order
 * itself: you can read three arcs ahead, so stand where the foe has to cross a line to reach
 * you, and let the pylons do the hitting.
 */

interface Arc { a: number; b: number; firesAt: number; endsAt: number; hit: Set<Fighter> }

const HALF_W = 20;

function segDist(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Phaser.Math.Clamp(((px - a.x) * dx + (py - a.y) * dy) / len2, 0, 1);
  return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
}

export const ARC_PYLONS: GimmickDef = {
  id: 'corona-arc-pylons',
  rules: 'Pylons arc between pairs in the order lit on them (1 = next). Arcs hit both of you — make the foe cross.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const pylons: Pt[] = [
      { x: 70, y: top + 50 }, { x: W / 2, y: top + 34 }, { x: W - 70, y: top + 50 },
      { x: W - 70, y: H - 46 }, { x: W / 2, y: H - 32 }, { x: 70, y: H - 46 },
    ];
    /** Only pairs that cross open floor — never two neighbours along one wall. */
    const pairs: [number, number][] = [
      [0, 3], [2, 5], [1, 4], [0, 4], [1, 5], [1, 3], [2, 4], [0, 2], [5, 3], [0, 3], [2, 5],
    ];
    const warnMs = hard ? 950 : 1150;
    const fireMs = 420;
    const gapMs = hard ? 650 : 900;
    const dmg = hard ? 20 : 16;

    const queue: [number, number][] = [];
    const refill = (): void => {
      while (queue.length < 5) {
        let p = pairs[Math.floor(ctx.rng() * pairs.length)];
        const last = queue[queue.length - 1];
        if (last && last[0] === p[0] && last[1] === p[1]) p = pairs[(pairs.indexOf(p) + 3) % pairs.length];
        queue.push(p);
      }
    };
    refill();

    const live: Arc[] = [];
    let nextAt = ctx.scene.time.now + 2200;
    let count = 0;

    const fire = (time: number): void => {
      count++;
      const crossfire = count % 4 === 0;
      const take = crossfire ? 2 : 1;
      if (crossfire) ctx.banner('CROSSFIRE', '#e6d2ff');
      for (let i = 0; i < take; i++) {
        const p = queue.shift();
        if (!p) break;
        live.push({ a: p[0], b: p[1], firesAt: time + warnMs, endsAt: time + warnMs + fireMs, hit: new Set() });
      }
      refill();
      ctx.sfx('electric-charge');
      nextAt = time + warnMs + fireMs + gapMs;
    };

    /** Ampere's escape: the nearest point a lane-width and a half off any armed line. */
    const escape = (f: Fighter): Pt | null => {
      for (const arc of live) {
        const A = pylons[arc.a], B = pylons[arc.b];
        const d = segDist(f.x, f.y, A, B);
        if (d < HALF_W + 46) {
          const dx = B.x - A.x, dy = B.y - A.y;
          const len = Math.hypot(dx, dy) || 1;
          let nx = -dy / len, ny = dx / len;
          // Step to whichever side of the line the player is NOT on — make *them* cross.
          const side = (ctx.player.x - A.x) * nx + (ctx.player.y - A.y) * ny;
          if (side > 0) { nx = -nx; ny = -ny; }
          return { x: f.x + nx * 110, y: f.y + ny * 110 };
        }
      }
      return null;
    };

    return {
      update(time) {
        if (time >= nextAt) fire(time);
        for (let i = live.length - 1; i >= 0; i--) {
          const arc = live[i];
          if (time >= arc.endsAt) { live.splice(i, 1); continue; }
          if (time < arc.firesAt) continue;
          if (!arc.hit.size && time - arc.firesAt < 40) ctx.sfx('plasma-arc');
          const A = pylons[arc.a], B = pylons[arc.b];
          for (const f of [ctx.player, ctx.npc]) {
            if (arc.hit.has(f) || !f.active || f.hp <= 0) continue;
            if (segDist(f.x, f.y, A, B) < HALF_W + 14) {
              arc.hit.add(f);
              ctx.hit(f, dmg, f.x, f.y);
              ctx.float(f.x, f.y - 30, 'ARCED', f === ctx.npc ? '#e6d2ff' : '#ffb070');
              ctx.sfx('status-shock');
            }
          }
        }
      },

      npcSeek() {
        return escape(ctx.npc);
      },

      drawGround(g, time) {
        for (const arc of live) {
          const A = pylons[arc.a], B = pylons[arc.b];
          if (time < arc.firesAt) {
            // The guide: a scorched corridor on the glass that brightens to the strike.
            const k = 1 - (arc.firesAt - time) / warnMs;
            g.lineStyle(HALF_W * 2, PLASMA, 0.06 + k * 0.14);
            g.lineBetween(A.x, A.y, B.x, B.y);
            g.lineStyle(1.5, PLASMA_LIT, 0.3 + k * 0.5);
            g.lineBetween(A.x, A.y, B.x, B.y);
          } else {
            g.lineStyle(HALF_W * 2 + 10, PLASMA, 0.18);
            g.lineBetween(A.x, A.y, B.x, B.y);
          }
        }
        // Pylon footings: brass plates with a copper coil ring.
        for (const p of pylons) {
          g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x, p.y + 6, 50, 16);
          g.fillStyle(BRASS_DARK, 1); g.fillEllipse(p.x, p.y + 4, 40, 13);
          g.lineStyle(2, BRASS, 0.8); g.strokeEllipse(p.x, p.y + 4, 40, 13);
        }
      },

      drawAir(g, time) {
        // Pylons: iron mast, three brass coil collars, a glowing terminal ball.
        for (let i = 0; i < pylons.length; i++) {
          const p = pylons[i];
          g.fillStyle(IRON, 1); g.fillRect(p.x - 4, p.y - 46, 8, 48);
          for (let c = 0; c < 3; c++) {
            const cy = p.y - 12 - c * 12;
            g.fillStyle(BRASS_DARK, 1); g.fillEllipse(p.x, cy + 1, 22 - c * 4, 7);
            g.fillStyle(BRASS, 1); g.fillEllipse(p.x, cy, 20 - c * 4, 6);
          }
          const armed = live.some((a) => a.a === i || a.b === i);
          const ball = p.y - 54;
          g.fillStyle(PLASMA, armed ? 0.35 : 0.12); g.fillCircle(p.x, ball, armed ? 16 : 11);
          g.fillStyle(armed ? PLASMA_CORE : PLASMA_LIT, 1); g.fillCircle(p.x, ball, 7);
          // Idle crackle round the ball.
          if (armed || ((time / 140 + i) | 0) % 5 === 0) {
            const a = time / 60 + i;
            g.lineStyle(1.5, PLASMA_LIT, 0.8);
            g.lineBetween(p.x, ball, p.x + Math.cos(a) * 14, ball + Math.sin(a) * 14);
          }
          // Sequence pips: one pip per place in the queue this pylon takes part in.
          for (let q = 0; q < Math.min(3, queue.length); q++) {
            if (queue[q][0] !== i && queue[q][1] !== i) continue;
            const px = p.x + 18;
            const py = ball - 6;
            const n = q + 1;
            g.fillStyle(0x000000, 0.6); g.fillCircle(px + q * 11, py, 6);
            g.fillStyle(q === 0 ? PLASMA_CORE : q === 1 ? PLASMA_LIT : PLASMA, 1);
            // n dots inside the pip — 1, 2 or 3.
            for (let d = 0; d < n; d++) g.fillCircle(px + q * 11 + (d - (n - 1) / 2) * 3, py, 1.4);
            g.lineStyle(1.5, q === 0 ? BRASS_LIT : BRASS, 1); g.strokeCircle(px + q * 11, py, 6);
          }
        }
        // Live arcs: a jagged bolt redrawn every frame, plus a white core.
        for (const arc of live) {
          if (time < arc.firesAt) continue;
          const A = { x: pylons[arc.a].x, y: pylons[arc.a].y - 54 };
          const B = { x: pylons[arc.b].x, y: pylons[arc.b].y - 54 };
          const dx = B.x - A.x, dy = B.y - A.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const segs = Math.max(6, Math.floor(len / 40));
          for (const [w, c, al] of [[7, PLASMA, 0.5], [2.5, PLASMA_CORE, 1]] as [number, number, number][]) {
            g.lineStyle(w, c, al);
            g.beginPath(); g.moveTo(A.x, A.y);
            for (let s = 1; s < segs; s++) {
              const t = s / segs;
              const j = Math.sin(time / 23 + s * 7.3) * 12;
              g.lineTo(A.x + dx * t + nx * j, A.y + dy * t + ny * j);
            }
            g.lineTo(B.x, B.y); g.strokePath();
          }
        }
      },
    };
  },
};
