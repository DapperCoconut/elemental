import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, P, PCOL, dist } from '../util';

/**
 * DRUMHEAD COURT — Drum-Major Rennet Coyle.
 *
 * In the King's telling, Coyle beat the drum at every flogging on the drill square, and the fort
 * moved to his sticks. Here the whole room is on parade. A drum roll gives the order — HALT or
 * QUICK MARCH — and then the order is *enforced*: under HALT anyone who shifts more than a boot's
 * width (a dash counts) is lashed; under QUICK MARCH anyone who does not cover ground is lashed.
 * Each fighter's drill ring on the floor shows how close they are to the lash.
 *
 * The big field drum on the square is a strike target. Hit it between orders and you call the next
 * one yourself, short-warned — HALT while he is charging, MARCH while he is planted. He does the same
 * to you. Past half his strength the orders come in pairs, HALT then MARCH with no breath between.
 */

type Order = 'halt' | 'march';
type Phase = 'rest' | 'roll' | 'hold';

const HALT_SLACK = 26;
const MARCH_NEED = 90;
const LASH = 22;
const HOLD_MS = 1150;
const DRUM_R = 28;
const DRUM_COOL_MS = 5200;

export const DRUMHEAD: GimmickDef = {
  id: fallenId('powder', 'drumhead'),
  rules: 'The drum calls HALT or QUICK MARCH: under HALT, move and be lashed; under MARCH, stand and be lashed. Strike the drum to call the next order.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const drumAt: Pt = { x: W / 2, y: H - 74 };
    let phase: Phase = 'rest';
    let phaseAt = -1;
    let phaseLen = 2400;
    let order: Order = 'halt';
    /** True while the second order of a doubled pair is being drilled (it never chains a third). */
    let second = false;
    let calledBy: 'drum' | 'player' | 'npc' = 'drum';
    let drumReadyAt = 0;
    let drumHitAt = -9999;
    let lashes: { x: number; y: number; at: number }[] = [];
    /** Ground each side has covered since the order took hold. */
    const walked = { p: 0, n: 0 };
    const last = { px: 0, py: 0, nx: 0, ny: 0 };
    /** Smoothed walking pace of each side (px/s) — what the drum-striker reads to pick the order. */
    const pace = { p: 0, n: 0 };
    let botWantsDrum = false;
    let marchGoal: Pt = { x: W / 2, y: H / 2 };

    const doubled = (): boolean => ctx.npc.hp < ctx.npc.maxHp * 0.5;

    const startRoll = (o: Order, now: number, warnMs: number, by: 'drum' | 'player' | 'npc'): void => {
      phase = 'roll'; phaseAt = now; phaseLen = warnMs; order = o; calledBy = by;
      ctx.sfx('drum-hit');
      ctx.float(drumAt.x, drumAt.y - 64, o === 'halt' ? 'HALT!' : 'QUICK MARCH!', o === 'halt' ? PCOL.red : PCOL.brass);
    };

    const lash = (f: Fighter, now: number): void => {
      ctx.hit(f, LASH, f.x, f.y);
      ctx.flash(f.x, f.y, P.redcoat);
      ctx.sfx('whip');
      lashes.push({ x: f.x, y: f.y, at: now });
    };

    const target: StrikeTarget = ctx.target({
      x: drumAt.x, y: drumAt.y, r: DRUM_R,
      onStruck(by) {
        const now = ctx.tk.now;
        drumHitAt = now;
        if (phase !== 'rest' || now < drumReadyAt) return;
        drumReadyAt = now + DRUM_COOL_MS;
        // The striker calls the order that catches the other side as they stand right now.
        const other = by === 'player' ? ctx.npc : ctx.player;
        const isMoving = (other === ctx.npc ? pace.n : pace.p) > 50;
        startRoll(isMoving ? 'halt' : 'march', now, 560, by);
      },
    });

    return {
      update(time: number) {
        const dt = clock.tick(time);
        if (phaseAt < 0) { phaseAt = time; last.px = ctx.player.x; last.py = ctx.player.y; last.nx = ctx.npc.x; last.ny = ctx.npc.y; }
        const stepP = dist(ctx.player.x, ctx.player.y, last.px, last.py);
        const stepN = dist(ctx.npc.x, ctx.npc.y, last.nx, last.ny);
        if (dt > 0) {
          pace.p = pace.p * 0.85 + Math.min(600, stepP / dt) * 0.15;
          pace.n = pace.n * 0.85 + Math.min(600, stepN / dt) * 0.15;
        }
        if (dt > 0 && phase === 'hold') {
          walked.p += Math.min(stepP, 30) + (ctx.dashing(ctx.player) && order === 'halt' ? HALT_SLACK : 0);
          walked.n += Math.min(stepN, 30) + (ctx.dashing(ctx.npc) && order === 'halt' ? HALT_SLACK : 0);
          if (order === 'halt') {
            if (walked.p > HALT_SLACK && walked.p < 9000) { lash(ctx.player, time); walked.p = 9999; }
            if (walked.n > HALT_SLACK && walked.n < 9000) { lash(ctx.npc, time); walked.n = 9999; ctx.float(ctx.npc.x, ctx.npc.y - 46, 'OUT OF STEP', PCOL.spark); }
          }
        }
        last.px = ctx.player.x; last.py = ctx.player.y; last.nx = ctx.npc.x; last.ny = ctx.npc.y;
        lashes = lashes.filter((l) => time - l.at < 700);

        if (time - phaseAt < phaseLen) return;
        if (phase === 'rest') {
          startRoll(rng() < 0.5 ? 'halt' : 'march', time, doubled() ? 820 : 1050, 'drum');
          botWantsDrum = rng() < 0.45;
        } else if (phase === 'roll') {
          phase = 'hold'; phaseAt = time; phaseLen = HOLD_MS;
          walked.p = 0; walked.n = 0;
          ctx.sfx(order === 'halt' ? 'clang' : 'drum-hit');
          const a = rng() * Math.PI * 2;
          marchGoal = { x: ctx.tk.clampX(ctx.npc.x + Math.cos(a) * 220, 80), y: ctx.tk.clampY(ctx.npc.y + Math.sin(a) * 160, 80) };
        } else {
          if (order === 'march') {
            if (walked.p < MARCH_NEED) lash(ctx.player, time);
            if (walked.n < MARCH_NEED) { lash(ctx.npc, time); ctx.float(ctx.npc.x, ctx.npc.y - 46, 'DRAGGING HIS FEET', PCOL.spark); }
          }
          if (doubled() && calledBy === 'drum' && !second) {
            // The doubled drill: the opposite order follows with half a breath of warning.
            second = true;
            startRoll(order === 'halt' ? 'march' : 'halt', time, 560, 'drum');
          } else {
            second = false;
            phase = 'rest'; phaseAt = time; phaseLen = doubled() ? 1700 : 2500;
          }
        }
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        if (phase === 'roll' || phase === 'hold') {
          if (order === 'halt') return { x: n.x, y: n.y };
          return marchGoal;
        }
        // Between orders he goes to call one on you, when the drum is ready and you are on the move.
        if (botWantsDrum && ctx.tk.now >= drumReadyAt) return { x: drumAt.x, y: drumAt.y - DRUM_R - 18 };
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Parade-ground drill lines: whitewashed dressing marks in ranks across the square.
        for (let y = top + 60; y < H - 30; y += 92) {
          for (let x = 70; x < W - 40; x += 46) {
            g.fillStyle(P.saltpetre, 0.13); g.fillRect(x, y, 22, 3);
          }
        }
        // Drill rings round each fighter: HALT shows tolerance cracking, MARCH shows ground still owed.
        if (phase !== 'rest') {
          const live = phase === 'hold';
          for (const [f, w] of [[ctx.player, walked.p], [ctx.npc, walked.n]] as [Fighter, number][]) {
            const r = 34;
            g.lineStyle(3, 0x000000, 0.35); g.strokeCircle(f.x, f.y + 4, r);
            if (order === 'halt') {
              const k = live ? Math.max(0, 1 - Math.min(w, HALT_SLACK) / HALT_SLACK) : 1;
              g.lineStyle(3, P.redcoat, 0.85); g.beginPath(); g.arc(f.x, f.y + 4, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.strokePath();
              // Planted boot-prints inside the ring.
              g.fillStyle(P.saltpetre, 0.45); g.fillEllipse(f.x - 7, f.y + 6, 7, 13); g.fillEllipse(f.x + 7, f.y + 6, 7, 13);
            } else {
              const k = live ? Math.min(1, w / MARCH_NEED) : 0;
              g.lineStyle(3, P.brass, 0.9); g.beginPath(); g.arc(f.x, f.y + 4, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.strokePath();
              for (let i = 0; i < 4; i++) {
                const a = time / 300 + i * (Math.PI / 2);
                g.fillStyle(P.brass, 0.6); g.fillTriangle(
                  f.x + Math.cos(a) * (r + 8), f.y + 4 + Math.sin(a) * (r + 8),
                  f.x + Math.cos(a + 0.18) * (r + 2), f.y + 4 + Math.sin(a + 0.18) * (r + 2),
                  f.x + Math.cos(a - 0.18) * (r + 2), f.y + 4 + Math.sin(a - 0.18) * (r + 2));
              }
            }
          }
        }
        // The drum's shadow on the flags.
        g.fillStyle(0x000000, 0.32); g.fillEllipse(drumAt.x + 3, drumAt.y + 20, 76, 22);
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const { x, y } = drumAt;
        const shake = time - drumHitAt < 200 ? Math.sin(time / 15) * 2 : 0;
        const rolling = phase === 'roll';
        // The field drum: brass shell with rope tension-Vs, red hoops, a calfskin head.
        g.fillStyle(P.brassDark, 1); g.fillRect(x - 32, y - 22 + shake, 64, 34);
        g.fillStyle(P.brass, 1); g.fillRect(x - 30, y - 22 + shake, 60, 32);
        g.fillStyle(lit(P.brass, 0.35), 0.7); g.fillRect(x - 24, y - 20 + shake, 8, 28);
        g.lineStyle(1.5, P.saltpetre, 0.9);
        for (let i = 0; i < 6; i++) {
          const ax = x - 30 + i * 12;
          g.lineBetween(ax, y - 20 + shake, ax + 6, y + 9 + shake); g.lineBetween(ax + 12, y - 20 + shake, ax + 6, y + 9 + shake);
        }
        g.fillStyle(P.redcoat, 1); g.fillRect(x - 33, y + 8 + shake, 66, 6); g.fillRect(x - 33, y - 26 + shake, 66, 6);
        g.fillStyle(0xeadcc0, 1); g.fillEllipse(x, y - 26 + shake, 66, 18);
        g.fillStyle(dim(0xeadcc0, 0.12), 1); g.fillEllipse(x, y - 25 + shake, 44, 10);
        // The Brand-King's sigil painted on the shell.
        g.lineStyle(2, P.redcoat, 0.9); g.strokeCircle(x, y - 4 + shake, 7); g.lineBetween(x - 9, y - 4 + shake, x + 9, y - 4 + shake);
        // Sticks: crossed and resting, or beating a roll above the head.
        const beat = rolling ? Math.sin(time / 40) : 0;
        g.lineStyle(3, P.oakDark, 1);
        if (rolling || phase === 'hold') {
          g.lineBetween(x - 22, y - 58 - beat * 8, x - 8, y - 30 + shake);
          g.lineBetween(x + 22, y - 58 + beat * 8, x + 8, y - 30 + shake);
          g.fillStyle(P.saltpetre, 1); g.fillCircle(x - 8, y - 30 + shake, 3); g.fillCircle(x + 8, y - 30 + shake, 3);
        } else {
          g.lineBetween(x - 20, y - 40, x + 20, y - 30); g.lineBetween(x + 20, y - 40, x - 20, y - 30);
        }
        // Ready tell: a red cockade on the drum when it can be struck to call an order.
        if (phase === 'rest' && ctx.tk.now >= drumReadyAt) {
          const pulse = 0.6 + Math.sin(time / 160) * 0.3;
          g.fillStyle(P.redcoat, pulse); g.fillCircle(x + 26, y - 10, 6);
          g.fillStyle(P.saltpetre, pulse); g.fillCircle(x + 26, y - 10, 2.5);
        }
        // Lash marks: a whip's curl cracking over whoever broke step.
        for (const l of lashes) {
          const k = (time - l.at) / 700;
          g.lineStyle(3, P.oakDark, 1 - k);
          g.beginPath();
          for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const px = l.x - 40 + t * 80, py = l.y - 50 + Math.sin(t * 9 + k * 6) * 10 * (1 - t);
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.strokePath();
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The drum-major's mace as the order board: held level for HALT, thrust forward for MARCH.
        const cx = W / 2, cy = top + 22;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(cx - 90, cy - 16, 180, 32, 8);
        if (phase === 'rest') {
          const k = Math.min(1, (time - phaseAt) / phaseLen);
          g.fillStyle(P.brass, 0.5); g.fillRect(cx - 80, cy + 10, 160 * k, 3);
          g.lineStyle(3, P.brassDark, 1); g.lineBetween(cx - 50, cy + 6, cx + 40, cy - 6);
          g.fillStyle(P.brass, 1); g.fillCircle(cx + 44, cy - 7, 6);
          return;
        }
        const halt = order === 'halt';
        const col = halt ? P.redcoat : P.brass;
        const hot = phase === 'hold' ? 1 : 0.55 + Math.sin(time / 70) * 0.25;
        g.lineStyle(4, P.brassDark, 1);
        if (halt) g.lineBetween(cx - 60, cy, cx + 20, cy); else g.lineBetween(cx - 60, cy + 10, cx + 10, cy - 10);
        g.fillStyle(col, hot); g.fillCircle(halt ? cx + 26 : cx + 16, halt ? cy : cy - 12, 8);
        g.fillStyle(lit(col, 0.4), hot); g.fillCircle(halt ? cx + 24 : cx + 14, halt ? cy - 2 : cy - 14, 3);
        // Two boots: side by side (halt) or striding (march).
        g.fillStyle(col, hot);
        if (halt) { g.fillRoundedRect(cx + 44, cy - 10, 9, 20, 3); g.fillRoundedRect(cx + 57, cy - 10, 9, 20, 3); }
        else { g.fillRoundedRect(cx + 44, cy - 4, 9, 18, 3); g.fillRoundedRect(cx + 58, cy - 14, 9, 18, 3); }
        if (phase === 'hold') {
          const k = 1 - Math.min(1, (time - phaseAt) / phaseLen);
          g.fillStyle(col, 0.9); g.fillRect(cx - 80, cy + 11, 160 * k, 3);
        }
      },

      destroy() {
        target.remove();
      },
    };
  },
};
