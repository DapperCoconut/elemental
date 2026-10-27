import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from './shared';
import { live } from './shared';
import { BLUE, BLUE_LIT, BLUE_WASH, INK, INK_SOFT, PAPER, WHITE } from '../palette';
import { CSS_BLUE_LIT, CSS_PAPER } from '../palette';
import { mulberry } from '../../../../../art/IsleArt';

/**
 * Inkblot Test — Doctor Rorsch's fight.
 *
 * The arena is a folded card. A crease runs down the middle and everything that happens on one
 * side happens on the other:
 * • **Blots** drop onto the card in pairs — one where it lands and its twin at the mirror point —
 *   bloom, and stay a while as stinging ink pools. The twin lags a beat behind the original.
 * • **Mirrored**: whenever you stand at your foe's mirror image (or close to it), every blow either
 *   of you lands counts double. The card shows a dotted line between you when you are.
 * • **The Fold**: every so often Rorsch folds the card shut. The crease glows, and then both
 *   fighters are pressed through to their mirror positions on the other side.
 *
 * Rorsch hunts your mirror point, waiting to land his doubled blows; the counter is to choose the
 * moment. A pair of blots lands before its twin — read where the twin will fall and stand so that
 * your own mirror point is in it. Then the Fold, or Rorsch himself, does the rest.
 */

const BLOT_R = 54;
const MIRROR_TOL = 72;
const FOLD_WARN = 1600;

interface Blot { x: number; y: number; landAt: number; dieAt: number; seed: number; twin: boolean; lastHit: { p: number; n: number } }

export const INKBLOT_TEST: GimmickDef = {
  id: 'inkwell-inkblot',
  rules: 'The room is mirrored down the middle: blots fall in pairs, and a hit landed while you stand mirror-opposite your foe counts double.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const blotEvery = hard ? 2000 : 2600;
    const blotLife = hard ? 7000 : 6000;
    const sting = hard ? 6 : 5;
    const foldEvery = hard ? 10500 : 13000;
    const twinLag = 900;
    let blots: Blot[] = [];
    let nextBlot = ctx.scene.time.now + 1800;
    let foldAt = ctx.scene.time.now + foldEvery;
    let foldWarnFrom = 0;
    let foldFx = -99999;
    let mirrored = false;
    let mirrorFx = -99999;

    const mirrorOf = (p: Pt): Pt => ({ x: W - p.x, y: p.y });
    const fOf = (k: 'p' | 'n'): Fighter => (k === 'p' ? ctx.player : ctx.npc);
    const inBlot = (x: number, y: number, t: number): boolean =>
      blots.some((b) => t >= b.landAt && Phaser.Math.Distance.Between(x, y, b.x, b.y) < BLOT_R);

    const drop = (time: number): void => {
      // Aim near the player half the time, at the open card otherwise; never on the crease.
      const p = ctx.player;
      let x = ctx.rng() < 0.55 ? p.x + (ctx.rng() - 0.5) * 160 : 80 + ctx.rng() * (W - 160);
      if (Math.abs(x - W / 2) < BLOT_R + 10) x = W / 2 + (x < W / 2 ? -1 : 1) * (BLOT_R + 14);
      const y = Phaser.Math.Clamp(ctx.rng() < 0.55 ? p.y + (ctx.rng() - 0.5) * 140 : top + 60 + ctx.rng() * (H - top - 110), top + 50, H - 50);
      const seed = Math.floor(ctx.rng() * 1e6);
      const land = time + 700;
      blots.push({ x, y, landAt: land, dieAt: land + blotLife, seed, twin: false, lastHit: { p: 0, n: 0 } });
      const m = mirrorOf({ x, y });
      blots.push({ x: m.x, y: m.y, landAt: land + twinLag, dieAt: land + twinLag + blotLife, seed, twin: true, lastHit: { p: 0, n: 0 } });
    };

    /** One blot's shape: a seeded cluster of lobes, mirrored for the twin. */
    const drawBlot = (g: Phaser.GameObjects.Graphics, b: Blot, scale: number, alpha: number): void => {
      const r = mulberry(b.seed);
      const flip = b.twin ? -1 : 1;
      g.fillStyle(INK, alpha);
      for (let i = 0; i < 9; i++) {
        const a = r() * Math.PI * 2, d = r() * BLOT_R * 0.55, s = BLOT_R * (0.28 + r() * 0.32);
        g.fillEllipse(b.x + flip * Math.cos(a) * d * scale, b.y + Math.sin(a) * d * 0.8 * scale, s * 2 * scale, s * 1.6 * scale);
      }
      for (let i = 0; i < 6; i++) {
        const a = r() * Math.PI * 2, d = BLOT_R * (0.9 + r() * 0.5);
        g.fillCircle(b.x + flip * Math.cos(a) * d * scale, b.y + Math.sin(a) * d * 0.8 * scale, (2 + r() * 4) * scale);
      }
      g.fillStyle(WHITE, alpha * 0.55);
      g.fillEllipse(b.x - flip * BLOT_R * 0.2 * scale, b.y - BLOT_R * 0.2 * scale, 12 * scale, 4 * scale);
    };

    return {
      update(time) {
        if (time >= nextBlot) { nextBlot = time + blotEvery; drop(time); ctx.sfx('slime-splat'); }

        // Blots sting whoever stands in them.
        for (const b of blots) {
          if (time < b.landAt) continue;
          for (const k of ['p', 'n'] as const) {
            const f = fOf(k);
            if (!live(f) || time - b.lastHit[k] < 600) continue;
            if (Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y) < BLOT_R) {
              b.lastHit[k] = time;
              ctx.hit(f, sting, f.x, f.y);
            }
          }
        }
        blots = blots.filter((b) => time < b.dieAt);

        // Mirrored?
        const p = ctx.player, n = ctx.npc;
        const m = mirrorOf(n);
        const now = live(p) && live(n) && Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y) < MIRROR_TOL;
        if (now && !mirrored) { mirrorFx = time; ctx.float(W / 2, top + 30, 'MIRRORED — BLOWS COUNT DOUBLE', CSS_BLUE_LIT); ctx.sfx('prism'); }
        mirrored = now;

        // The Fold.
        if (!foldWarnFrom && time >= foldAt - FOLD_WARN) {
          foldWarnFrom = time;
          ctx.banner('THE FOLD', CSS_PAPER);
          ctx.sfx('portal');
        }
        if (foldWarnFrom && time >= foldAt) {
          foldWarnFrom = 0;
          foldAt = time + foldEvery;
          foldFx = time;
          ctx.sfx('teleport');
          for (const k of ['p', 'n'] as const) {
            const f = fOf(k);
            if (live(f)) ctx.nudge(f, W - 2 * f.x, 0);
          }
        }
      },

      playerTakenMult: () => (mirrored ? 2 : 1),
      npcTakenMult: () => (mirrored ? 2 : 1),

      npcSeek() {
        const p = ctx.player;
        const t = ctx.scene.time.now;
        // The player's mirror image, unless that is wet.
        let target = mirrorOf(p);
        target.y = Phaser.Math.Clamp(target.y, top + 40, H - 40);
        if (inBlot(target.x, target.y, t + 400)) {
          // Step off it along y, toward whichever side is dry.
          const up = { x: target.x, y: target.y - BLOT_R - 30 }, down = { x: target.x, y: target.y + BLOT_R + 30 };
          target = !inBlot(up.x, up.y, t) && up.y > top + 30 ? up : down;
        }
        // About to fold: get where the fold will land him clear of blots.
        if (foldWarnFrom) {
          const n = ctx.npc;
          const after = mirrorOf(n);
          if (inBlot(after.x, after.y, t + FOLD_WARN)) return { x: n.x, y: n.y + (n.y < (top + H) / 2 ? BLOT_R * 2 : -BLOT_R * 2) };
        }
        return target;
      },

      drawGround(g, time) {
        // The crease: a pressed groove down the middle of the card.
        const fk = foldWarnFrom ? Phaser.Math.Clamp((time - foldWarnFrom) / FOLD_WARN, 0, 1) : 0;
        g.lineStyle(6 + fk * 10, INK_SOFT, 0.14 + fk * 0.25); g.lineBetween(W / 2, top, W / 2, H);
        g.lineStyle(1.5, fk ? BLUE : INK, 0.5 + fk * 0.5); g.lineBetween(W / 2, top, W / 2, H);
        if (fk > 0) {
          // The two halves start to lift toward each other — shading slides in from the edges.
          g.fillStyle(INK, 0.12 * fk); g.fillRect(0, top, W / 2 * fk * 0.5, H - top); g.fillRect(W - W / 2 * fk * 0.5, top, W / 2 * fk * 0.5, H - top);
          g.lineStyle(2, BLUE_LIT, fk); g.lineBetween(W / 2 * fk * 0.5, top, W / 2 * fk * 0.5, H); g.lineBetween(W - W / 2 * fk * 0.5, top, W - W / 2 * fk * 0.5, H);
        }
        // Blots: a wet ring where they will land, then the blot itself, drying grey at the end.
        for (const b of blots) {
          if (time < b.landAt) {
            const k = 1 - (b.landAt - time) / (b.twin ? 700 + twinLag : 700);
            g.lineStyle(2, b.twin ? BLUE : INK, 0.3 + 0.6 * Phaser.Math.Clamp(k, 0, 1));
            g.strokeCircle(b.x, b.y, BLOT_R * (1.3 - 0.3 * Phaser.Math.Clamp(k, 0, 1)));
            if (b.twin) { g.fillStyle(BLUE_WASH, 0.18); g.fillCircle(b.x, b.y, BLOT_R); }
            continue;
          }
          const age = time - b.landAt;
          const grow = Phaser.Math.Clamp(age / 220, 0, 1);
          const fade = Phaser.Math.Clamp((b.dieAt - time) / 700, 0, 1);
          drawBlot(g, b, 0.6 + 0.4 * grow, 0.92 * fade);
        }
        // Mirrored: a dotted blue line joining you through the crease.
        if (mirrored) {
          const p = ctx.player, n = ctx.npc;
          const len = Math.hypot(n.x - p.x, n.y - p.y);
          const ux = (n.x - p.x) / (len || 1), uy = (n.y - p.y) / (len || 1);
          g.fillStyle(BLUE, 0.8);
          for (let d = (time / 12) % 18; d < len; d += 18) g.fillCircle(p.x + ux * d, p.y + uy * d, 2.5);
        }
      },

      drawAir(g, time) {
        // A falling drop over every blot about to land.
        for (const b of blots) {
          if (time >= b.landAt) continue;
          const left = b.landAt - time;
          if (left > 600) continue;
          const k = left / 600;
          g.fillStyle(INK, 1); g.fillEllipse(b.x, b.y - k * 160, 10, 14);
          g.fillStyle(WHITE, 0.8); g.fillCircle(b.x - 2, b.y - k * 160 - 3, 2);
        }
        // The fold flash: the card slapping shut and open again.
        const since = time - foldFx;
        if (since >= 0 && since < 380) {
          const k = since / 380;
          const w = (W / 2) * (1 - Math.abs(1 - k * 2));
          g.fillStyle(PAPER, 0.85); g.fillRect(W / 2 - w, top, w * 2, H - top);
          g.lineStyle(3, INK, 0.9); g.strokeRect(W / 2 - w, top, w * 2, H - top);
        }
        // Mirrored: the two of you ringed in blue.
        if (mirrored) {
          const p = ctx.player, n = ctx.npc;
          const pulse = 1 + Math.sin(time / 90) * 0.08;
          g.lineStyle(2.5, BLUE, 0.9); g.strokeCircle(p.x, p.y, 28 * pulse); g.strokeCircle(n.x, n.y, 28 * pulse);
          const since2 = time - mirrorFx;
          if (since2 < 300) { g.lineStyle(4, BLUE_LIT, 1 - since2 / 300); g.strokeCircle(p.x, p.y, 28 + since2 / 6); g.strokeCircle(n.x, n.y, 28 + since2 / 6); }
        }
      },

      drawHud(g, time) {
        // The fold clock: a little card closing like a book; and a x2 lamp when mirrored.
        const t = ctx.scene.time.now;
        const k = Phaser.Math.Clamp(1 - (foldAt - t) / foldEvery, 0, 1);
        const x = W / 2, y = 112;
        const open = (1 - k) * 34 + 2;
        g.fillStyle(INK, 0.7); g.fillRect(x - 40, y - 16, 80, 32);
        g.fillStyle(PAPER, 1); g.fillRect(x - open, y - 12, open, 24); g.fillRect(x, y - 12, open, 24);
        g.lineStyle(1.5, INK, 1); g.lineBetween(x, y - 12, x, y + 12);
        g.fillStyle(INK, 1); g.fillCircle(x - open * 0.5, y, 4); g.fillCircle(x + open * 0.5, y, 4);
        g.fillStyle(mirrored ? BLUE : INK, mirrored ? 0.7 + 0.3 * Math.sin(time / 80) : 0.5);
        g.fillCircle(x + 58, y, 9);
        g.lineStyle(2, WHITE, 1);
        g.lineBetween(x + 54, y - 4, x + 62, y + 4); g.lineBetween(x + 62, y - 4, x + 54, y + 4);
      },
    };
  },
};
