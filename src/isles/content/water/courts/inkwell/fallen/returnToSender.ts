import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from '../gimmicks/shared';
import { live } from '../gimmicks/shared';
import type { StrikeTarget, Striker } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { BLUE, BLUE_DEEP, BLUE_LIT, CSS_BLUE, CSS_PAPER, INK, PAPER, PAPER_SHADE, WHITE } from '../palette';
import { queenSeal, splashRing } from '../inkArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Return to Sender — Process-Server Marit's fight (echo).
 *
 * Every eviction in the Reach is a sealed writ, and the process-server's job is to put it into
 * your hand. Marit folds her writs into paper darts and throws them: each one hunts its addressee,
 * a little slower than a walk at first. When a writ reaches whoever it is addressed to, they are
 * SERVED — stamped, stunned for a moment, and hurt by every address the writ has carried.
 *
 * But a writ is only paper. Strike one that is addressed to you and it is RETURNED TO SENDER:
 * it turns round, re-addressed to the other fighter, a little faster, carrying one more stamp.
 * Marit returns them too (she strikes whatever is in reach when she casts). A long rally builds a
 * writ that hurts — be the one who returns it last.
 *
 * At half health Marit serves in pairs.
 */

const ID = fallenId('inkwell', 'return-to-sender');
const DRAW_MS = 600;
const BASE_SPEED = 165;
const STEP_SPEED = 38;
const MAX_SPEED = 330;
const TURN = 2.1;
const LIFE_MS = 7500;
const SERVE_R = 26;
const SERVE_BASE = 9;
const SERVE_PER_STAMP = 6;
const STUN_MS = 700;

interface Writ {
  x: number; y: number; ang: number; speed: number;
  to: Striker; stamps: number; born: number; flyAt: number; lastTurnAt: number;
  trail: Pt[]; target: StrikeTarget | null; dead: boolean;
}

export const RETURN_TO_SENDER: GimmickDef = {
  id: ID,
  rules: 'Marit throws homing writs. One that reaches you serves you (stun + damage). Strike one aimed at you to send it back, faster and heavier.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const writs: Writ[] = [];
    let nextAt = ctx.scene.time.now + 2400;
    let pairs = false;
    const served = { p: 0, n: 0 };
    const sparks: { x: number; y: number; at: number }[] = [];

    const fighterOf = (s: Striker): Fighter => (s === 'player' ? ctx.player : ctx.npc);

    const launch = (time: number, spread: number): void => {
      const n = ctx.npc;
      const w: Writ = {
        x: n.x, y: n.y - 10, ang: Math.atan2(ctx.player.y - n.y, ctx.player.x - n.x) + spread,
        speed: BASE_SPEED, to: 'player', stamps: 1, born: time, flyAt: time + DRAW_MS, lastTurnAt: -9999,
        trail: [], target: null, dead: false,
      };
      w.target = ctx.target({
        x: w.x, y: w.y, r: 18, passThrough: true,
        onStruck(by) {
          const t = ctx.scene.time.now;
          if (w.dead || t < w.flyAt || by !== w.to || t - w.lastTurnAt < 250) return;
          w.lastTurnAt = t;
          w.to = by === 'player' ? 'npc' : 'player';
          w.stamps++;
          w.speed = Math.min(MAX_SPEED, w.speed + STEP_SPEED);
          const o = fighterOf(w.to);
          w.ang = Math.atan2(o.y - w.y, o.x - w.x);
          w.born = t;
          sparks.push({ x: w.x, y: w.y, at: t });
          ctx.sfx('snap-back');
          ctx.float(w.x, w.y - 26, 'RETURN TO SENDER', by === 'player' ? CSS_BLUE : CSS_PAPER);
        },
      });
      writs.push(w);
      ctx.sfx('whoosh');
    };

    const retire = (w: Writ): void => { w.dead = true; w.target?.remove(); w.target = null; };

    /** A folded writ-dart: two paper wings, a centre crease, the seal, one stamp per address. */
    const dart = (g: G, w: Writ, time: number): void => {
      const c = Math.cos(w.ang), s = Math.sin(w.ang);
      const P = (u: number, v: number): Pt => ({ x: w.x + u * c - v * s, y: w.y + u * s + v * c });
      const nose = P(16, 0), tail = P(-12, 0), l = P(-14, -11), r = P(-14, 11);
      g.fillStyle(INK, 0.3); g.fillTriangle(nose.x + 3, nose.y + 8, l.x + 3, l.y + 8, r.x + 3, r.y + 8);
      g.fillStyle(PAPER, 1); g.fillTriangle(nose.x, nose.y, l.x, l.y, tail.x, tail.y);
      g.fillStyle(PAPER_SHADE, 1); g.fillTriangle(nose.x, nose.y, r.x, r.y, tail.x, tail.y);
      g.lineStyle(1.3, INK, 1);
      g.lineBetween(nose.x, nose.y, l.x, l.y); g.lineBetween(nose.x, nose.y, r.x, r.y);
      g.lineBetween(l.x, l.y, tail.x, tail.y); g.lineBetween(r.x, r.y, tail.x, tail.y);
      g.lineBetween(nose.x, nose.y, tail.x, tail.y);
      const sp = P(-2, 0);
      queenSeal(g, sp.x, sp.y, 4);
      for (let i = 0; i < Math.min(w.stamps, 6); i++) {
        const p = P(-6 - (i % 3) * 3, (i < 3 ? -1 : 1) * (5 + (i % 3)));
        g.fillStyle(w.to === 'npc' ? BLUE : INK, 1); g.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4);
      }
      // The address tag: a blue ring on the addressee shows who it is hunting.
      const o = fighterOf(w.to);
      if (time >= w.flyAt) { g.lineStyle(1, w.to === 'player' ? BLUE_DEEP : BLUE_LIT, 0.35); g.lineBetween(w.x, w.y, o.x, o.y); }
    };

    return {
      update(time, dt) {
        if (!pairs && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          pairs = true;
          ctx.banner('Marit serves in pairs now. Return them both.', CSS_BLUE);
        }
        if (time >= nextAt && live(ctx.npc) && writs.filter((w) => !w.dead).length < 5) {
          nextAt = time + (pairs ? 2900 : 3300);
          if (pairs) { launch(time, -0.6); launch(time, 0.6); } else launch(time, 0);
        }
        for (const w of writs) {
          if (w.dead) continue;
          if (time < w.flyAt) {
            w.x = ctx.npc.x; w.y = ctx.npc.y - 10;
            w.target?.moveTo(w.x, w.y);
            continue;
          }
          const o = fighterOf(w.to);
          const want = Math.atan2(o.y - w.y, o.x - w.x);
          w.ang = Phaser.Math.Angle.RotateTo(w.ang, want, TURN * dt);
          w.x += Math.cos(w.ang) * w.speed * dt;
          w.y += Math.sin(w.ang) * w.speed * dt;
          w.trail.push({ x: w.x, y: w.y });
          if (w.trail.length > 14) w.trail.shift();
          w.target?.moveTo(w.x, w.y);
          if (live(o) && Phaser.Math.Distance.Between(w.x, w.y, o.x, o.y) < SERVE_R) {
            ctx.hit(o, SERVE_BASE + SERVE_PER_STAMP * (w.stamps - 1), o.x, o.y);
            ctx.stun(o, STUN_MS);
            ctx.sfx('judgement');
            ctx.float(o.x, o.y - 52, w.to === 'npc' ? 'MARIT IS SERVED' : 'SERVED', w.to === 'npc' ? CSS_BLUE : CSS_PAPER);
            served[w.to === 'npc' ? 'n' : 'p']++;
            sparks.push({ x: o.x, y: o.y, at: time });
            retire(w);
          } else if (time - w.born > LIFE_MS || w.x < 10 || w.x > ctx.W - 10 || w.y < ctx.top || w.y > ctx.H - 6) {
            sparks.push({ x: w.x, y: w.y, at: time });
            retire(w);
          }
        }
        for (let i = writs.length - 1; i >= 0; i--) if (writs[i].dead) writs.splice(i, 1);
        while (sparks.length && time - sparks[0].at > 500) sparks.shift();
      },

      npcSeek() {
        // Side-step a writ addressed to her, at right angles to its flight.
        const n = ctx.npc;
        for (const w of writs) {
          if (w.to !== 'npc' || w.dead) continue;
          const d = Phaser.Math.Distance.Between(w.x, w.y, n.x, n.y);
          if (d > 240) continue;
          const side = Math.sin(w.ang) * (n.x - w.x) - Math.cos(w.ang) * (n.y - w.y) > 0 ? 1 : -1;
          return { x: ctx.tk.clampX(n.x - Math.sin(w.ang) * side * 150), y: ctx.tk.clampY(n.y + Math.cos(w.ang) * side * 150) };
        }
        return null;
      },

      drawGround(g) {
        for (const w of writs) {
          // A shadow under each dart, and the dotted line of its flight drawn on the page.
          g.fillStyle(INK, 0.25); g.fillEllipse(w.x + 4, w.y + 16, 22, 6);
          for (let i = 0; i < w.trail.length; i += 2) {
            const p = w.trail[i];
            g.fillStyle(w.to === 'npc' ? BLUE : INK, 0.15 + (i / w.trail.length) * 0.4);
            g.fillCircle(p.x, p.y + 14, 1.6);
          }
        }
      },

      drawAir(g, time) {
        for (const w of writs) {
          if (time < w.flyAt) {
            // Drawn from the satchel: the dart lifts out and the aim is ruled on the page.
            const k = (time - (w.flyAt - DRAW_MS)) / DRAW_MS;
            g.lineStyle(1.5, BLUE, 0.3 + k * 0.5);
            for (let d = 20; d < 140 * k + 20; d += 14) g.lineBetween(w.x + Math.cos(w.ang) * d, w.y + Math.sin(w.ang) * d, w.x + Math.cos(w.ang) * (d + 7), w.y + Math.sin(w.ang) * (d + 7));
          }
          // A paper ribbon trailing behind it.
          g.lineStyle(2, w.to === 'npc' ? BLUE_LIT : WHITE, 0.7);
          g.beginPath();
          w.trail.forEach((p, i) => { const yy = p.y + Math.sin(i * 0.9 + time / 80) * 2; if (i === 0) g.moveTo(p.x, yy); else g.lineTo(p.x, yy); });
          g.strokePath();
          dart(g, w, time);
        }
        for (const s of sparks) {
          const k = (time - s.at) / 500;
          splashRing(g, s.x, s.y, 10 + k * 26, 1 - k, 8, BLUE);
          g.lineStyle(2, INK, 1 - k); g.strokeRect(s.x - 10 - k * 8, s.y - 7 - k * 6, 20 + k * 16, 14 + k * 12);
        }
      },

      drawHud(g) {
        // The process-book: tally marks of writs served on each side, in fives.
        const y = 104;
        for (const [k, x0] of [['p', ctx.W / 2 - 140], ['n', ctx.W / 2 + 40]] as ['p' | 'n', number][]) {
          g.fillStyle(PAPER, 0.95); g.fillRect(x0, y - 9, 100, 20);
          g.lineStyle(1, INK, 1); g.strokeRect(x0, y - 9, 100, 20);
          const n = Math.min(served[k], 15);
          for (let i = 0; i < n; i++) {
            const grp = Math.floor(i / 5), j = i % 5, gx = x0 + 8 + grp * 30;
            g.lineStyle(1.6, k === 'n' ? BLUE : INK, 1);
            if (j < 4) g.lineBetween(gx + j * 5, y - 6, gx + j * 5, y + 8);
            else g.lineBetween(gx - 3, y + 6, gx + 19, y - 4);
          }
        }
      },

      destroy() { for (const w of writs) retire(w); },
    };
  },
};
