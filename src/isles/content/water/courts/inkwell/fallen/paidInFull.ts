import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef } from '../gimmicks/shared';
import { live } from '../gimmicks/shared';
import type { G } from '../../../../../art/IsleArt';
import { BLUE, BLUE_DEEP, BLUE_LIT, CSS_BLUE, CSS_PAPER, GREY, INK, INK_SOFT, PAPER, PAPER_SHADE, WHITE } from '../palette';
import { inkBlot, queenSeal, scribble } from '../inkArt';
import { mulberry } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Paid in Full — Tally-Clerk Ossory's fight (bind).
 *
 * The night before the tide the clerks go door to door and blot from the registry every house
 * that cannot show a Dry Tithe receipt. Here the Blotting comes on a clock: a tide of ink rises
 * from the foot of the page, and when it rolls over the floor, whoever holds no receipt is
 * BLOTTED — hurt and held fast in a pool of ink. A receipt is spent at each Blotting.
 *
 * Receipts flutter down from the tithe-house press one at a time; walk over one to take it (one
 * each). A receipt is paper: every blow its holder takes smudges it, and the third smudge voids
 * it. So the fight is a race to the slips, and then a fight over them — beat on Ossory while she
 * holds hers and she goes into the ink unpaid.
 *
 * At half health the ledger is audited: Blottings come faster, receipts drift on the draught
 * from the canal, and two smudges void one.
 */

const ID = fallenId('inkwell', 'paid-in-full');
const PICK_R = 34;
const BLOT_DMG = 19;
const BLOT_ROOT = 1000;
const SMUDGE_GAP = 380;
const FALL_MS = 650;

interface Slip { x: number; y: number; vx: number; vy: number; born: number; seed: number }
interface Holder { has: boolean; smudges: number; lastSmudge: number; seed: number; blottedAt: number; paidAt: number }

export const PAID_IN_FULL: GimmickDef = {
  id: ID,
  rules: 'When the ink tide rolls in, anyone without a Dry Tithe receipt is blotted. Grab the falling slips; every blow you take smudges yours.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    let slips: Slip[] = [];
    let audit = false;
    let every = 9000;
    let blotAt = ctx.scene.time.now + 8000;
    let lastCheckAt = -9999;
    let nextSlipAt = ctx.scene.time.now + 900;
    const holders: Record<'p' | 'n', Holder> = {
      p: { has: false, smudges: 0, lastSmudge: 0, seed: 1, blottedAt: -9999, paidAt: -9999 },
      n: { has: false, smudges: 0, lastSmudge: 0, seed: 2, blottedAt: -9999, paidAt: -9999 },
    };
    const pairs = (): [Fighter, Holder, 'p' | 'n'][] => [[ctx.player, holders.p, 'p'], [ctx.npc, holders.n, 'n']];

    const drop = (time: number, nearPlayer: boolean): void => {
      let x = 80 + ctx.rng() * (W - 160), y = top + 60 + ctx.rng() * (H - top - 120);
      if (nearPlayer) {
        const a = ctx.rng() * Math.PI * 2;
        x = ctx.tk.clampX(ctx.player.x + Math.cos(a) * 220, 70);
        y = ctx.tk.clampY(ctx.player.y + Math.sin(a) * 160, 70);
      }
      slips.push({ x, y, vx: 0, vy: 0, born: time, seed: Math.floor(ctx.rng() * 1e6) });
      ctx.sfx('whoosh');
    };

    const smudge = (h: Holder, f: Fighter, k: 'p' | 'n'): void => {
      const t = ctx.scene.time.now;
      if (!h.has || t - h.lastSmudge < SMUDGE_GAP) return;
      h.lastSmudge = t;
      h.smudges++;
      if (h.smudges >= (audit ? 2 : 3)) {
        h.has = false;
        h.smudges = 0;
        ctx.sfx('slime-splat');
        ctx.float(f.x, f.y - 50, k === 'n' ? 'OSSORY\'S RECEIPT VOID' : 'RECEIPT VOID', k === 'n' ? CSS_BLUE : CSS_PAPER);
      }
    };

    const blotting = (time: number): void => {
      ctx.sfx('splash');
      lastCheckAt = time;
      for (const [f, h, k] of pairs()) {
        if (!live(f)) continue;
        if (h.has) {
          h.has = false; h.smudges = 0; h.paidAt = time;
          ctx.float(f.x, f.y - 50, 'PAID', CSS_BLUE);
        } else {
          h.blottedAt = time;
          ctx.hit(f, BLOT_DMG, f.x, f.y);
          ctx.root(f, BLOT_ROOT);
          ctx.float(f.x, f.y - 50, k === 'n' ? 'OSSORY BLOTTED' : 'BLOTTED', CSS_PAPER);
        }
      }
      blotAt = time + every;
    };

    /** A Dry Tithe receipt: perforated paper slip, ruled text, the blue tithe stamp. */
    const slip = (g: G, x: number, y: number, tilt: number, seed: number, smudges: number, a = 1): void => {
      const c = Math.cos(tilt), s = Math.sin(tilt);
      const P = (u: number, v: number): Phaser.Geom.Point => new Phaser.Geom.Point(x + u * c - v * s, y + u * s + v * c);
      const w = 26, h = 16;
      const outline: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 6; i++) outline.push(P(-w / 2 + (i / 6) * w, -h / 2 + (i % 2 ? 2 : 0)));
      outline.push(P(w / 2, h / 2));
      outline.push(P(-w / 2, h / 2));
      g.fillStyle(INK, 0.5 * a); g.fillPoints(outline.map((p) => new Phaser.Geom.Point(p.x + 2, p.y + 2)), true);
      g.fillStyle(PAPER, a); g.fillPoints(outline, true);
      g.lineStyle(1, INK, a); g.strokePoints(outline, true);
      const r = mulberry(seed);
      for (let i = 0; i < 2; i++) { const p = P(-w / 2 + 3, -2 + i * 5); g.lineStyle(1, INK, 0.7 * a); g.lineBetween(p.x, p.y, p.x + (10 + r() * 6) * c, p.y + (10 + r() * 6) * s); }
      const sp = P(w / 2 - 6, 2);
      queenSeal(g, sp.x, sp.y, 4, a);
      for (let i = 0; i < smudges; i++) { const p = P(-6 + i * 7, 3); g.fillStyle(INK, 0.75 * a); g.fillEllipse(p.x, p.y, 9, 5); }
    };

    return {
      update(time, dt) {
        if (!audit && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          audit = true;
          every = 7000;
          blotAt = Math.min(blotAt, time + every);
          ctx.banner('AUDIT — the tide comes faster, the slips blow loose, two smudges void one.', CSS_BLUE);
        }
        // The press drops a slip while there are fewer than two loose, and always one in good time.
        if (time >= nextSlipAt && slips.length < 2) { drop(time, false); nextSlipAt = time + (audit ? 2000 : 2600); }
        if (blotAt - time < 4800 && slips.length === 0 && !holders.p.has) drop(time, true);

        for (const sl of slips) {
          if (audit && time - sl.born > FALL_MS) {
            sl.vx += Math.sin(time / 900 + sl.seed) * 40 * dt;
            sl.vy += Math.cos(time / 1300 + sl.seed) * 30 * dt;
            sl.vx = Phaser.Math.Clamp(sl.vx, -60, 60); sl.vy = Phaser.Math.Clamp(sl.vy, -45, 45);
            sl.x = ctx.tk.clampX(sl.x + sl.vx * dt, 60); sl.y = ctx.tk.clampY(sl.y + sl.vy * dt, 60);
          }
        }
        for (const [f, h] of pairs()) {
          if (h.has || !live(f)) continue;
          const i = slips.findIndex((sl) => time - sl.born > FALL_MS && Phaser.Math.Distance.Between(f.x, f.y, sl.x, sl.y) < PICK_R);
          if (i >= 0) { h.has = true; h.smudges = 0; h.seed = slips[i].seed; slips.splice(i, 1); ctx.sfx('sparkle'); }
        }
        if (time >= blotAt) blotting(time);
        if (blotAt - time < 3000 && Math.floor((blotAt - time) / 1000) !== Math.floor((blotAt - time + dt * 1000) / 1000)) ctx.sfx('countdown-tick');
      },

      onPlayerHurt() { smudge(holders.p, ctx.player, 'p'); },
      onNpcHurt() { smudge(holders.n, ctx.npc, 'n'); },

      npcSeek() {
        const n = ctx.npc;
        if (holders.n.has) return null;
        const t = ctx.scene.time.now;
        let best: Slip | null = null;
        for (const sl of slips) {
          if (!best || Phaser.Math.Distance.Between(n.x, n.y, sl.x, sl.y) < Phaser.Math.Distance.Between(n.x, n.y, best.x, best.y)) best = sl;
        }
        if (best && (blotAt - t < 6000 || Phaser.Math.Distance.Between(n.x, n.y, best.x, best.y) < 260)) return { x: best.x, y: best.y };
        return null;
      },

      drawGround(g, time) {
        // The rising ink tide along the foot of the page, its crest curling as the Blotting nears.
        const k = Phaser.Math.Clamp(1 - (blotAt - time) / every, 0, 1);
        const crest = H - 8 - k * k * 70;
        g.fillStyle(INK, 0.9);
        g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 24) g.lineTo(x, crest + Math.sin(x / 40 + time / 260) * 6);
        g.lineTo(W, H); g.closePath(); g.fillPath();
        g.lineStyle(2, WHITE, 0.45);
        for (let x = 12; x < W; x += 48) {
          const y = crest + Math.sin(x / 40 + time / 260) * 6;
          g.beginPath(); g.arc(x, y + 6, 7, Math.PI * 1.1, Math.PI * 1.9); g.strokePath();
        }
        // The wash just after a Blotting: a sheet of ink drawing back down the page.
        const since = time - lastCheckAt;
        if (since < 700) {
          const a = 1 - since / 700;
          g.fillStyle(INK, 0.55 * a); g.fillRect(0, top + (H - top) * (since / 700), W, (H - top) * (1 - since / 700));
        }
        for (const [f, h] of pairs()) {
          if (time - h.blottedAt < BLOT_ROOT) inkBlot(g, f.x, f.y + 14, 34, mulberry(h.seed + 9), INK, 0.9);
        }
        // Loose slips: a shadow, then the paper fluttering down onto it.
        for (const sl of slips) {
          const fall = Phaser.Math.Clamp((time - sl.born) / FALL_MS, 0, 1);
          g.fillStyle(INK, 0.25 + fall * 0.2); g.fillEllipse(sl.x, sl.y + 6, 24 * (0.5 + fall * 0.5), 7);
          if (fall >= 1) { g.lineStyle(1.5, BLUE, 0.4 + 0.3 * Math.sin(time / 160 + sl.seed)); g.strokeCircle(sl.x, sl.y, PICK_R - 6); }
        }
      },

      drawAir(g, time) {
        for (const sl of slips) {
          const fall = Phaser.Math.Clamp((time - sl.born) / FALL_MS, 0, 1);
          const y = sl.y - (1 - fall) * 160;
          const tilt = Math.sin(time / 120 + sl.seed) * (1 - fall) * 0.9 + Math.sin(sl.seed) * 0.3;
          slip(g, sl.x + Math.sin(time / 150 + sl.seed) * (1 - fall) * 18, y, tilt, sl.seed, 0);
        }
        // Held receipts are pinned to the chest; paid ones flash the stamp.
        for (const [f, h] of pairs()) {
          if (h.has) {
            g.lineStyle(1, GREY, 1); g.lineBetween(f.x - 4, f.y - 20, f.x + 2, f.y - 14);
            slip(g, f.x, f.y - 10, Math.sin(time / 300) * 0.15, h.seed, h.smudges);
          }
          const paid = time - h.paidAt;
          if (paid < 600) { queenSeal(g, f.x, f.y - 30 - paid / 30, 12, 1 - paid / 600); }
        }
      },

      drawHud(g, time) {
        // The tally ledger: a dial counting to the Blotting, and two receipt boxes.
        const cx = W / 2, cy = 116;
        const k = Phaser.Math.Clamp(1 - (blotAt - time) / every, 0, 1);
        g.fillStyle(PAPER, 1); g.fillCircle(cx, cy, 15);
        g.lineStyle(2, INK, 1); g.strokeCircle(cx, cy, 15);
        g.fillStyle(k > 0.75 ? BLUE : INK_SOFT, 1);
        g.slice(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        g.lineStyle(1, BLUE_LIT, 0.6); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.lineBetween(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, cx + Math.cos(a) * 18, cy + Math.sin(a) * 18); }
        for (const [k2, x] of [['p', cx - 70], ['n', cx + 70]] as ['p' | 'n', number][]) {
          const h = holders[k2];
          g.fillStyle(h.has ? PAPER : PAPER_SHADE, h.has ? 1 : 0.4); g.fillRect(x - 20, cy - 10, 40, 20);
          g.lineStyle(1.5, h.has ? BLUE_DEEP : INK, 1); g.strokeRect(x - 20, cy - 10, 40, 20);
          if (h.has) {
            scribble(g, x - 16, cy - 3, 22, mulberry(h.seed), INK, 0.6);
            g.fillStyle(BLUE, 1); g.fillCircle(x + 12, cy + 4, 4);
            for (let i = 0; i < h.smudges; i++) { g.fillStyle(INK, 0.9); g.fillEllipse(x - 10 + i * 9, cy + 5, 8, 4); }
          }
        }
      },
    };
  },
};
