import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { Clock, P, PCOL, dist, drawPuff } from '../util';
import { dim, lit } from '../../../../../art/IsleArt';

/**
 * TWENTY PACES — Duelist Corvette.
 *
 * The room runs on a duelling clock. A drum counts twenty paces out loud (and lights twenty stones
 * along the duelling line, from the middle outward, as if two people were walking back to back);
 * on twenty the room cries DRAW! and for a heartbeat everything lands at triple weight. Then
 * everyone is reloading: a long, slow stretch where every hit lands at half.
 *
 * Two duelling marks sit at the ends of the line. Whoever is standing on a mark when DRAW! sounds
 * has *stood their ground* — they take only half again as much instead of triple. Corvette always
 * walks to her mark during the count. Beat her to it, or make her late, and the draw is yours.
 */

type Phase = 'pace' | 'draw' | 'reload';

const PACE_MS = 4400;
const DRAW_MS = 1350;
const RELOAD_MS = 3300;
const MARK_R = 36;

export const TWENTY_PACES: GimmickDef = {
  id: 'powder-draw',
  rules: 'Twenty paces, then DRAW!: all damage ×3 for a heartbeat, then a slow reload at ×0.5. Stand on a duelling mark at DRAW! to take only ×1.5.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top } = ctx;
    const midY = top + (H - top) * 0.52;
    const marks: Pt[] = [{ x: 140, y: midY }, { x: W - 140, y: midY }];
    let phase: Phase = 'pace';
    let phaseAt = -1;
    let lastPace = -1;
    /** Mark index Corvette is walking to this round. */
    let botMark = 1;
    /** Whether each side held a mark when the shot rang out. */
    let heldP = false;
    let heldN = false;
    const drawMult = 3;

    const onMark = (f: Fighter): number => marks.findIndex((m) => dist(m.x, m.y, f.x, f.y) < MARK_R);

    const enter = (ph: Phase, now: number): void => {
      phase = ph;
      phaseAt = now;
      if (ph === 'pace') {
        lastPace = -1;
        // Corvette picks the mark further from you — an honourable duellist keeps her distance.
        const p = ctx.player;
        botMark = dist(marks[0].x, marks[0].y, p.x, p.y) > dist(marks[1].x, marks[1].y, p.x, p.y) ? 0 : 1;
      } else if (ph === 'draw') {
        heldP = onMark(ctx.player) >= 0;
        heldN = onMark(ctx.npc) >= 0;
        // Only one duellist per mark: the second arrival is not standing anywhere honourable.
        if (heldP && heldN && onMark(ctx.player) === onMark(ctx.npc)) heldN = false;
        ctx.banner('DRAW!', PCOL.hot);
        ctx.sfx('countdown-go');
        ctx.sfx('musket');
        if (heldP) ctx.float(ctx.player.x, ctx.player.y - 46, 'STOOD YOUR GROUND', PCOL.green);
        if (heldN) ctx.float(ctx.npc.x, ctx.npc.y - 46, 'SHE STANDS HER GROUND', PCOL.red);
      } else {
        ctx.float(W / 2, top + 40, 'RELOAD', PCOL.smoke);
        ctx.sfx('reload');
      }
    };

    const takenFor = (held: boolean): number => {
      if (phase === 'draw') return held ? 1.5 : drawMult;
      if (phase === 'reload') return 0.5;
      return 1;
    };

    return {
      update(time: number) {
        clock.tick(time);
        if (phaseAt < 0) { enter('pace', time); return; }
        const t = time - phaseAt;
        if (phase === 'pace') {
          const pace = Math.floor((t / PACE_MS) * 20);
          if (pace !== lastPace && pace < 20) {
            lastPace = pace;
            ctx.sfx(pace >= 17 ? 'countdown-tick' : 'drum-hit');
            if (pace >= 17) ctx.float(W / 2, top + 30, `${pace + 1}…`, PCOL.brass);
          }
          if (t >= PACE_MS) enter('draw', time);
        } else if (phase === 'draw') {
          if (t >= DRAW_MS) enter('reload', time);
        } else if (t >= RELOAD_MS) {
          enter('pace', time);
        }
      },

      playerTakenMult: () => takenFor(heldP),
      npcTakenMult: () => takenFor(heldN),

      npcSeek(): Pt | null {
        if (phase === 'pace') {
          // If you are already on her mark, she takes the other one.
          const pm = onMark(ctx.player);
          const target = pm === botMark ? 1 - botMark : botMark;
          return marks[target];
        }
        if (phase === 'draw' && heldN) return marks[onMark(ctx.npc) >= 0 ? onMark(ctx.npc) : botMark];
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // The duelling line: a raked strip of sand between the marks.
        g.fillStyle(P.sand, 0.22); g.fillRect(marks[0].x, midY - 16, marks[1].x - marks[0].x, 32);
        g.lineStyle(1, P.saltpetre, 0.25); g.lineBetween(marks[0].x, midY, marks[1].x, midY);
        // Twenty pace stones, ten each way out of the middle.
        const t = time - phaseAt;
        const lit20 = phase === 'pace' ? Math.floor((t / PACE_MS) * 20) + 1 : phase === 'draw' ? 20 : 0;
        const span = (marks[1].x - marks[0].x) / 2 - MARK_R - 10;
        for (let i = 0; i < 10; i++) {
          const off = ((i + 1) / 10) * span;
          const on = lit20 >= (i + 1) * 2 - 1;
          for (const dir of [-1, 1]) {
            const x = W / 2 + dir * off;
            g.fillStyle(dim(P.saltpetre, 0.5), 1); g.fillEllipse(x, midY + 1, 12, 7);
            g.fillStyle(on ? P.spark : P.saltpetre, on ? 0.95 : 0.6); g.fillEllipse(x, midY, 10, 5);
            if (on && phase === 'pace') { g.fillStyle(P.spark, 0.15); g.fillCircle(x, midY, 12); }
          }
        }
        // Footprints walking outward (two pairs of boots, back to back).
        for (let i = 0; i < 6; i++) {
          for (const dir of [-1, 1]) {
            const x = W / 2 + dir * (30 + i * 52);
            g.fillStyle(P.earthDark, 0.25);
            g.fillEllipse(x, midY + (i % 2 ? 7 : -7), 9, 5);
          }
        }
        // The marks: brass-capped posts in a chalk circle.
        marks.forEach((m, i) => {
          const holder = onMark(ctx.player) === i ? 'p' : onMark(ctx.npc) === i ? 'n' : '';
          const ring = holder === 'p' ? P.spark : holder === 'n' ? P.redcoat : P.saltpetre;
          const warm = phase === 'pace' && t > PACE_MS - 1400;
          g.lineStyle(3, ring, warm ? 0.6 + Math.sin(time / 70) * 0.3 : 0.5); g.strokeCircle(m.x, m.y, MARK_R);
          g.lineStyle(1, ring, 0.3); g.strokeCircle(m.x, m.y, MARK_R - 6);
          g.fillStyle(dim(P.brass, 0.4), 1); g.fillCircle(m.x, m.y, 9);
          g.fillStyle(P.brass, 1); g.fillCircle(m.x, m.y - 1, 7);
          g.fillStyle(lit(P.brass, 0.5), 1); g.fillCircle(m.x - 2, m.y - 3, 2);
          if (phase === 'pace' && i === botMark) {
            // Her mark is chalked with a small "C".
            g.lineStyle(2, P.redcoat, 0.7);
            g.beginPath(); g.arc(m.x, m.y + MARK_R + 10, 6, 0.6, Math.PI * 2 - 0.6, false); g.strokePath();
          }
        });
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time - phaseAt;
        if (phase === 'draw') {
          // Crosshairs on both duellists; the unprotected one gets the big red one.
          for (const [f, held] of [[ctx.player, heldP], [ctx.npc, heldN]] as [Fighter, boolean][]) {
            const r = 30 + Math.sin(time / 40) * 3;
            g.lineStyle(held ? 1.5 : 3, held ? P.saltpetre : P.flame, held ? 0.5 : 0.9);
            g.strokeCircle(f.x, f.y, r);
            g.lineBetween(f.x - r - 8, f.y, f.x - r + 8, f.y); g.lineBetween(f.x + r - 8, f.y, f.x + r + 8, f.y);
            g.lineBetween(f.x, f.y - r - 8, f.x, f.y - r + 8); g.lineBetween(f.x, f.y + r - 8, f.x, f.y + r + 8);
          }
          if (t < 300) drawPuff(g, ctx.npc.x, ctx.npc.y - 30, 18 + t * 0.05, P.smoke, 0.5 * (1 - t / 300), 4);
        } else if (phase === 'reload') {
          // Powder horn + ramrod over each head, the rod going home as the reload completes.
          const k = Math.min(1, t / RELOAD_MS);
          for (const f of [ctx.player, ctx.npc]) {
            const x = f.x, y = f.y - 58;
            g.fillStyle(0x000000, 0.4); g.fillRoundedRect(x - 22, y - 4, 44, 8, 3);
            g.fillStyle(P.brass, 0.9); g.fillRoundedRect(x - 20, y - 2, 40 * k, 4, 2);
            g.lineStyle(2, P.oak, 1); g.lineBetween(x + 14, y - 22 + k * 12, x + 14, y - 6);
            g.fillStyle(P.saltpetre, 1); g.fillTriangle(x - 18, y - 10, x - 6, y - 16, x - 8, y - 6);
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time - phaseAt;
        // The duelling dial: twenty notches round a clock face, top-centre of the field.
        const cx = W / 2, cy = top + 18, R = 14;
        g.fillStyle(0x000000, 0.55); g.fillCircle(cx, cy, R + 5);
        const k = phase === 'pace' ? t / PACE_MS : phase === 'draw' ? 1 : 1 - t / RELOAD_MS;
        for (let i = 0; i < 20; i++) {
          const a = -Math.PI / 2 + (i / 20) * Math.PI * 2;
          const on = i / 20 < k;
          g.lineStyle(2, phase === 'reload' ? P.smoke : on ? P.spark : P.iron, on ? 1 : 0.6);
          g.lineBetween(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4), cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        }
        if (phase === 'draw') {
          // Red edges for the triple-damage beat.
          const a = 0.25 + Math.sin(time / 45) * 0.1;
          g.fillStyle(P.flame, a);
          g.fillRect(0, top, W, 6); g.fillRect(0, H - 6, W, 6); g.fillRect(0, top, 6, H - top); g.fillRect(W - 6, top, 6, H - top);
        }
      },
    };
  },
};
